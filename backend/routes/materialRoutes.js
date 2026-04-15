import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as materialController from "../controllers/materialController.js";

const router = Router();

router.use(authenticate);

router.post(
  "/classes/:id/materials",
  requireRole("teacher"),
  materialController.uploadMiddleware.single("file"),
  materialController.uploadMaterial
);
router.get("/classes/:id/materials", materialController.listMaterials);

export default router;
