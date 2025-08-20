// src/routes/pcap.routes.ts
import { Router } from "express";
import {
  uploadPcapController,
  getPcapByShaController,
  listPcapsController,
} from "../controllers/upload-pcap.services";
import { upload } from "../middlewares/upload.middleware";

const router = Router();


router.post("/upload", upload.single("pcap"), uploadPcapController as any);
router.get("/:sha256", getPcapByShaController as any);
router.get("/list", listPcapsController as any);

export default router;
