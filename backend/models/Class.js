import mongoose from "mongoose";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    code: { type: String, unique: true, uppercase: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

classSchema.pre("save", async function preSave(next) {
  if (this.isNew && !this.code) {
    let candidate = generateCode();
    for (let i = 0; i < 10; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const clash = await this.constructor.findOne({ code: candidate });
      if (!clash) break;
      candidate = generateCode();
    }
    this.code = candidate;
  }
  next();
});

export const ClassModel = mongoose.model("Class", classSchema);
