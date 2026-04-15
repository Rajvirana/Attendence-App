import mongoose from "mongoose";

const attendanceSessionSchema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    active: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ class: 1, active: 1 });

export const AttendanceSession = mongoose.model("AttendanceSession", attendanceSessionSchema);
