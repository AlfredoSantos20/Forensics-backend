// src/routes/pcap.routes.ts
import { Router } from "express";
import {
  uploadPcapController,
  getPcapByShaController,
  listPcapsController,
} from "../controllers/upload-pcap.services";
import { upload } from "../middlewares/upload.middleware";
import { Roles } from "../middlewares/role.middleware";
import { UserRole } from '@prisma/client';
import { authenticateToken } from "../middlewares/auth.middleware";
const router = Router();


router.post("/upload", upload.single("pcap"), authenticateToken, uploadPcapController as any);
router.get("/:sha256", getPcapByShaController as any);
router.get("/list", listPcapsController as any);

export default router;
