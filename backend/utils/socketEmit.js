import { AttendanceRecord } from "../models/AttendanceRecord.js";
import { ClassModel } from "../models/Class.js";

export async function emitSessionStats(io, sessionId, classId) {
  if (!io || !sessionId) return;
  const presentCount = await AttendanceRecord.countDocuments({ session: sessionId, present: true });
  const markedCount = await AttendanceRecord.countDocuments({ session: sessionId });
  const cls = await ClassModel.findById(classId).select("students").lean();
  const totalStudents = cls?.students?.length ?? 0;
  const payload = {
    sessionId: String(sessionId),
    classId: String(classId),
    presentCount,
    markedCount,
    totalStudents,
  };
  io.to(`session:${sessionId}`).emit("attendance:update", payload);
  io.to(`class:${classId}`).emit("attendance:update", payload);
}
