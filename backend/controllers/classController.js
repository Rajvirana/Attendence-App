import { ClassModel } from "../models/Class.js";

export async function createClass(req, res) {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Class name is required" });
    }
    const doc = await ClassModel.create({
      name: name.trim(),
      description: description?.trim() || "",
      teacher: req.user.id,
    });
    return res.status(201).json({
      class: {
        id: doc._id,
        name: doc.name,
        description: doc.description,
        code: doc.code,
        studentCount: doc.students.length,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create class" });
  }
}

export async function listMyClasses(req, res) {
  try {
    if (req.user.role === "teacher") {
      const list = await ClassModel.find({ teacher: req.user.id })
        .sort({ updatedAt: -1 })
        .lean();
      return res.json({
        classes: list.map((c) => ({
          id: c._id,
          name: c.name,
          description: c.description,
          code: c.code,
          studentCount: c.students.length,
          updatedAt: c.updatedAt,
        })),
      });
    }
    const list = await ClassModel.find({ students: req.user.id })
      .populate("teacher", "name email")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({
      classes: list.map((c) => ({
        id: c._id,
        name: c.name,
        description: c.description,
        code: c.code,
        teacher: c.teacher,
        studentCount: c.students.length,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to list classes" });
  }
}

export async function getClass(req, res) {
  try {
    const doc = await ClassModel.findById(req.params.id)
      .populate("teacher", "name email")
      .populate("students", "name email")
      .lean();
    if (!doc) {
      return res.status(404).json({ message: "Class not found" });
    }
    const isTeacher = doc.teacher._id.toString() === req.user.id;
    const isStudent = doc.students.some((s) => s._id.toString() === req.user.id);
    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: "Access denied" });
    }
    return res.json({
      class: {
        id: doc._id,
        name: doc.name,
        description: doc.description,
        code: isTeacher ? doc.code : undefined,
        teacher: doc.teacher,
        students: doc.students,
        studentCount: doc.students.length,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to load class" });
  }
}

export async function joinClass(req, res) {
  try {
    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "Class code is required" });
    }
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Only students can join a class" });
    }
    const normalized = code.trim().toUpperCase();
    const doc = await ClassModel.findOne({ code: normalized });
    if (!doc) {
      return res.status(404).json({ message: "Invalid class code" });
    }
    const sid = req.user.id.toString();
    if (doc.students.some((id) => id.toString() === sid)) {
      return res.json({
        message: "Already enrolled",
        class: { id: doc._id, name: doc.name, code: doc.code },
      });
    }
    doc.students.push(req.user.id);
    await doc.save();
    return res.json({
      message: "Joined class",
      class: { id: doc._id, name: doc.name, code: doc.code },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to join class" });
  }
}
