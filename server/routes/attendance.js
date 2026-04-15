import { Router } from "express";
import { Attendance } from "../models/Attendance.js";
import { User } from "../models/User.js";
import { authRequired, adminOnly } from "../middleware/auth.js";

const router = Router();

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

router.use(authRequired);

router.get("/today", async (req, res) => {
  try {
    const date = req.query.date || todayKey();
    let doc = await Attendance.findOne({ user: req.userId, date }).lean();
    if (!doc) {
      doc = { user: req.userId, date, checkInAt: null, checkOutAt: null, note: "" };
    }
    res.json({ record: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load today's attendance" });
  }
});

router.post("/check-in", async (req, res) => {
  try {
    const date = todayKey();
    const { note } = req.body;
    const existing = await Attendance.findOne({ user: req.userId, date });
    if (existing?.checkInAt) {
      return res.status(400).json({ message: "Already checked in today" });
    }
    const record = existing
      ? await Attendance.findByIdAndUpdate(
          existing._id,
          { checkInAt: new Date(), note: note ?? existing.note ?? "" },
          { new: true }
        )
      : await Attendance.create({
          user: req.userId,
          date,
          checkInAt: new Date(),
          note: note || "",
        });
    res.json({ record });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: "Attendance record conflict" });
    }
    console.error(err);
    res.status(500).json({ message: "Check-in failed" });
  }
});

router.post("/check-out", async (req, res) => {
  try {
    const date = todayKey();
    const doc = await Attendance.findOne({ user: req.userId, date });
    if (!doc?.checkInAt) {
      return res.status(400).json({ message: "Check in first" });
    }
    if (doc.checkOutAt) {
      return res.status(400).json({ message: "Already checked out today" });
    }
    doc.checkOutAt = new Date();
    await doc.save();
    res.json({ record: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Check-out failed" });
  }
});

router.get("/my", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const list = await Attendance.find({ user: req.userId })
      .sort({ date: -1 })
      .limit(limit)
      .lean();
    res.json({ records: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load history" });
  }
});

router.get("/team", adminOnly, async (req, res) => {
  try {
    const date = req.query.date || todayKey();
    const users = await User.find({ role: "user" }).select("name email").lean();
    const ids = users.map((u) => u._id);
    const records = await Attendance.find({ user: { $in: ids }, date }).lean();
    const byUser = new Map(records.map((r) => [r.user.toString(), r]));
    const rows = users.map((u) => {
      const r = byUser.get(u._id.toString());
      return {
        user: { id: u._id, name: u.name, email: u.email },
        attendance: r || null,
      };
    });
    res.json({ date, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load team attendance" });
  }
});

router.get("/stats", adminOnly, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const pipeline = [
      { $match: { createdAt: { $gte: thirtyDaysAgo }, checkInAt: { $ne: null } } },
      { $group: { _id: "$date", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ];
    const byDay = await Attendance.aggregate(pipeline);
    const totalUsers = await User.countDocuments({ role: "user" });
    res.json({ byDay, totalUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load stats" });
  }
});

export default router;
