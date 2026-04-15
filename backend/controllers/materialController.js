import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { Material } from "../models/Material.js";
import { ClassModel } from "../models/Class.js";
import { cloudinary, configureCloudinary } from "../config/cloudinary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "uploads");

const useCloudinary = () => configureCloudinary();

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await fs.mkdir(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safe);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype.startsWith("text/");
    if (!ok) {
      return cb(new Error("Only PDF, DOC/DOCX, and text files are allowed"));
    }
    cb(null, true);
  },
});

async function uploadBufferToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "attendance-materials",
        resource_type: "raw",
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

export async function uploadMaterial(req, res) {
  try {
    const { id: classId } = req.params;
    const { title } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }
    const cls = await ClassModel.findById(classId);
    if (!cls) {
      return res.status(404).json({ message: "Class not found" });
    }
    if (cls.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the teacher can upload materials" });
    }

    let fileUrl;
    let publicId = null;

    if (useCloudinary()) {
      const result = await uploadBufferToCloudinary(
        await fs.readFile(req.file.path),
        req.file.originalname
      );
      fileUrl = result.secure_url;
      publicId = result.public_id;
      await fs.unlink(req.file.path).catch(() => {});
    } else {
      const base = (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(
        /\/$/,
        ""
      );
      fileUrl = `${base}/uploads/${req.file.filename}`;
    }

    const doc = await Material.create({
      class: classId,
      teacher: req.user.id,
      title: title.trim(),
      fileUrl,
      publicId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    return res.status(201).json({
      material: {
        id: doc._id,
        title: doc.title,
        fileUrl: doc.fileUrl,
        originalName: doc.originalName,
        createdAt: doc.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Upload failed" });
  }
}

export async function listMaterials(req, res) {
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
    const list = await Material.find({ class: classId }).sort({ createdAt: -1 }).lean();
    return res.json({
      materials: list.map((m) => ({
        id: m._id,
        title: m.title,
        fileUrl: m.fileUrl,
        originalName: m.originalName,
        mimeType: m.mimeType,
        size: m.size,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to list materials" });
  }
}
