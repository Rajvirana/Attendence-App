import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as attendanceController from "../controllers/attendanceController.js";

const router = Router();

router.use(authenticate);

router.post("/classes/:id/sessions/start", requireRole("teacher"), attendanceController.startSession);
router.post("/classes/:id/sessions/stop", requireRole("teacher"), attendanceController.stopSession);
router.get("/classes/:id/sessions/active", attendanceController.getActiveSession);
router.post("/sessions/:sessionId/mark", requireRole("student"), attendanceController.markSelf);
router.patch("/sessions/:sessionId/manual", requireRole("teacher"), attendanceController.manualMark);
router.get("/classes/:id/logs", requireRole("teacher"), attendanceController.getLogs);
router.get("/sessions/:sessionId/records", requireRole("teacher"), attendanceController.getSessionRecords);
router.get("/classes/:id/my-attendance", requireRole("student"), attendanceController.getMyClassHistory);

export default router;
