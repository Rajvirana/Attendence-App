import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    publicId: { type: String },
    originalName: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number },
  },
  { timestamps: true }
);

export const Material = mongoose.model("Material", materialSchema);
