import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as classController from "../controllers/classController.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole("teacher"), classController.createClass);
router.get("/", classController.listMyClasses);
router.post("/join", requireRole("student"), classController.joinClass);
router.get("/:id", classController.getClass);

export default router;
