import mongoose from "mongoose";
import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { AttendanceSession } from "../models/AttendanceSession.js";
import { ClassModel } from "../models/Class.js";
import { emitSessionStats } from "../utils/socketEmit.js";

async function getIo(req) {
  return req.app.get("io");
}

export async function startSession(req, res) {
  try {
    const { id: classId } = req.params;
    const cls = await ClassModel.findById(classId);
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
    if (cls.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the class teacher can start attendance" });
    }
    await AttendanceSession.updateMany(
      { class: classId, active: true },
      { $set: { active: false, endedAt: new Date() } }
    );
    const session = await AttendanceSession.create({
      class: classId,
      teacher: req.user.id,
      active: true,
      startedAt: new Date(),
    });
    const io = await getIo(req);
    io.to(`class:${classId}`).emit("session:started", {
      sessionId: String(session._id),
      classId: String(classId),
      startedAt: session.startedAt,
    });
    await emitSessionStats(io, session._id, classId);
    return res.status(201).json({
      session: {
        id: session._id,
        classId: session.class,
        active: true,
        startedAt: session.startedAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to start attendance session" });
  }
}

export async function stopSession(req, res) {
  try {
    const { id: classId } = req.params;
    const cls = await ClassModel.findById(classId);
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
    if (cls.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the class teacher can stop attendance" });
    }
    const session = await AttendanceSession.findOneAndUpdate(
      { class: classId, active: true },
      { $set: { active: false, endedAt: new Date() } },
      { new: true }
    );
    if (!session) {
      return res.status(400).json({ message: "No active attendance session" });
    }
    const io = await getIo(req);
    io.to(`class:${classId}`).emit("session:ended", {
      sessionId: String(session._id),
      classId: String(classId),
      endedAt: session.endedAt,
    });
    await emitSessionStats(io, session._id, classId);
    return res.json({
      session: {
        id: session._id,
        active: false,
        endedAt: session.endedAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to stop session" });
  }
}

export async function getActiveSession(req, res) {
  try {
    const { id: classId } = req.params;
    const cls = await ClassModel.findById(classId).lean();
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
    const isTeacher = cls.teacher.toString() === req.user.id;
    const isStudent = cls.students.some((s) => s.toString() === req.user.id);
    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: "Access denied" });
    }
    const session = await AttendanceSession.findOne({ class: classId, active: true }).lean();
    let myRecord = null;
    if (session && isStudent) {
      myRecord = await AttendanceRecord.findOne({
        session: session._id,
        student: req.user.id,
      }).lean();
    }
    let presentCount = 0;
    let markedCount = 0;
    if (session) {
      presentCount = await AttendanceRecord.countDocuments({ session: session._id, present: true });
      markedCount = await AttendanceRecord.countDocuments({ session: session._id });
    }
    return res.json({
      session: session
        ? {
            id: session._id,
            active: session.active,
            startedAt: session.startedAt,
            presentCount,
            markedCount,
            totalStudents: cls.students.length,
            myPresent: myRecord?.present ?? null,
            myMarked: Boolean(myRecord),
          }
        : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to load session" });
  }
}

export async function markSelf(req, res) {
  try {
    const { sessionId } = req.params;
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can mark their own attendance" });
    }
    const session = await AttendanceSession.findById(sessionId);
    if (!session || !session.active) {
      return res.status(400).json({ message: "Attendance is not open for this session" });
    }
    const cls = await ClassModel.findById(session.class);
    if (!cls.students.some((s) => s.toString() === req.user.id)) {
      return res.status(403).json({ message: "You are not enrolled in this class" });
    }
    try {
      await AttendanceRecord.create({
        session: session._id,
        class: session.class,
        student: req.user.id,
        present: true,
        source: "self",
        markedAt: new Date(),
      });
    } catch (e) {
      if (e.code === 11000) {
        return res.status(400).json({ message: "You already marked attendance for this session" });
      }
      throw e;
    }
    const io = await getIo(req);
    await emitSessionStats(io, session._id, session.class);
    return res.status(201).json({ message: "Attendance recorded" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to mark attendance" });
  }
}

export async function manualMark(req, res) {
  try {
    const { sessionId } = req.params;
    const { studentId, present } = req.body;
    if (typeof present !== "boolean" || !studentId) {
      return res.status(400).json({ message: "studentId and present (boolean) are required" });
    }
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    const cls = await ClassModel.findById(session.class);
    if (cls.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the teacher can manually set attendance" });
    }
    if (!cls.students.some((s) => s.toString() === studentId)) {
      return res.status(400).json({ message: "Student is not in this class" });
    }
    await AttendanceRecord.findOneAndUpdate(
      { session: session._id, student: studentId },
      {
        $set: {
          class: session.class,
          present,
          source: "manual",
          markedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const io = await getIo(req);
    await emitSessionStats(io, session._id, session.class);
    return res.json({ message: "Attendance updated" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update attendance" });
  }
}

export async function getLogs(req, res) {
  try {
    const { id: classId } = req.params;
    const { date } = req.query;
    const cls = await ClassModel.findById(classId).populate("students", "name email").lean();
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
    if (cls.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the teacher can view full logs" });
    }
    const filter = { class: new mongoose.Types.ObjectId(classId) };
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      const sessions = await AttendanceSession.find({
        class: classId,
        startedAt: { $gte: start, $lte: end },
      })
        .select("_id startedAt endedAt active")
        .lean();
      const ids = sessions.map((s) => s._id);
      filter.session = { $in: ids };
    }
    const records = await AttendanceRecord.find(filter)
      .populate("student", "name email")
      .populate("session", "startedAt endedAt active")
      .sort({ markedAt: -1 })
      .lean();
    return res.json({
      class: { id: cls._id, name: cls.name },
      records: records.map((r) => ({
        id: r._id,
        student: r.student,
        present: r.present,
        source: r.source,
        markedAt: r.markedAt,
        session: r.session,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to load logs" });
  }
}

/** Student: attendance history for a class */
export async function getSessionRecords(req, res) {
  try {
    const { sessionId } = req.params;
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    const cls = await ClassModel.findById(session.class);
    if (!cls || cls.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    const records = await AttendanceRecord.find({ session: session._id })
      .populate("student", "name email")
      .lean();
    return res.json({
      records: records.map((r) => ({
        id: r._id,
        student: r.student,
        present: r.present,
        source: r.source,
        markedAt: r.markedAt,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to load session records" });
  }
}

export async function getMyClassHistory(req, res) {
  try {
    const { id: classId } = req.params;
    const cls = await ClassModel.findById(classId).lean();
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
    if (!cls.students.some((s) => s.toString() === req.user.id)) {
      return res.status(403).json({ message: "Not enrolled in this class" });
    }
    const records = await AttendanceRecord.find({
      class: classId,
      student: req.user.id,
    })
      .populate("session", "startedAt endedAt active")
      .sort({ markedAt: -1 })
      .limit(100)
      .lean();
    return res.json({
      records: records.map((r) => ({
        id: r._id,
        present: r.present,
        source: r.source,
        markedAt: r.markedAt,
        session: r.session,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to load history" });
  }
}
