import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads");

import authRoutes from "./routes/authRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import materialRoutes from "./routes/materialRoutes.js";

const app = express();

function parseOrigins() {
  const raw = process.env.CLIENT_URL || "";
  if (!raw.trim()) {
    return true;
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

app.use(
  cors({
    origin: parseOrigins(),
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "attendance-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/classes", classRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", materialRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message === "Unauthorized") {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message || "Server error" });
});

export default app;
