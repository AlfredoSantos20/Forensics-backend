// src/routes/pcap.routes.ts
import { Router } from "express";
import {
  uploadPcapController,
  getPcapByShaController,
  listPcapsController,
  getPcapFileByFolderNameController,
  getRecentPcapFoldersController, 
  getOldPcapFoldersController,    
  getLatestPcapFolderController,  
  getOldestPcapFolderController,  
} from "../controllers/upload-pcap.controllers";
import { upload } from "../middlewares/upload.middleware";
import { Roles } from "../middlewares/role.middleware";
import { UserRole } from '@prisma/client';
import { authenticateToken } from "../middlewares/auth.middleware";
const router = Router();


router.post("/upload", upload.single("pcap"), authenticateToken, uploadPcapController as any);
router.get("/:sha256", getPcapByShaController as any);
router.get("/list", listPcapsController as any);

router.get("/file/:folderName",authenticateToken, getPcapFileByFolderNameController as any);


router.get("/folders/recent",authenticateToken,  getRecentPcapFoldersController as any);
router.get("folders/old",authenticateToken, getOldPcapFoldersController as any);


router.get("folders/latest",authenticateToken, getLatestPcapFolderController as any);
router.get("folders/oldest",authenticateToken,  getOldestPcapFolderController as any);

export default router;
