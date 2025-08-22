// src/controllers/upload-pcap.controller.ts
import { Request, Response } from "express";
import path from "path";
import {
  analyzeAndStorePcap,
  getPcapBySha,
  listPcaps,
  validatePcapUpload,
} from "../services/upload-pcap.services";
import { movePcapIntoNextFolder, getPcapBaseDir } from "../utils/pcapStorage";
import prisma from "../config/prisma";

export async function uploadPcapController(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    validatePcapUpload(req.file);

    const uploadedById =
      (req as any).user?.id !== undefined ? Number((req as any).user.id) : undefined;
    console.log("Uploaded by ID:", uploadedById);

    // Move uploaded tmp file into next pcapN/ folder
    const { folder, destPath } = await movePcapIntoNextFolder(
      req.file.path,
      req.file.originalname
    );
    const folderName = path.basename(folder); // e.g., "pcap12"

    const analysis = await analyzeAndStorePcap({
      filePath: destPath, // Use moved path
      originalName: req.file.originalname,
      uploadedById,
      uploadedFolderName: folderName, // <<< SAVE the folder name
      persist: true,
    });

    return res.status(201).json({ message: "PCAP analyzed", data: analysis });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || "Failed to analyze PCAP" });
  }
}

export async function getPcapByShaController(req: Request, res: Response) {
  try {
    const { sha256 } = req.params;
    const rec = await getPcapBySha(sha256);
    if (!rec) return res.status(404).json({ message: "PCAP not found" });
    return res.json({ data: rec });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || "Failed to fetch PCAP" });
  }
}

/** GET /pcap?limit=50&cursorId=123 */
export async function listPcapsController(req: Request, res: Response) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
    const cursorId = req.query.cursorId ? Number(req.query.cursorId) : undefined;
    const rows = await listPcaps(limit, cursorId ? { id: cursorId } : undefined);
    return res.json({ data: rows });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || "Failed to list PCAPs" });
  }
}

/**
 * GET /pcap/file/:folderName
 * Streams the original PCAP file stored inside the given folder name (e.g. pcap12)
 */
export async function getPcapFileByFolderNameController(req: Request, res: Response) {
  try {
    const { folderName } = req.params;
    if (!folderName || !/^pcap\d+$/.test(folderName)) {
      return res.status(400).json({ message: "Invalid folder name." });
    }

    // Find the record that has this uploadedFolderName
    const rec = await prisma.pcap.findFirst({
      where: { uploadedFolderName: folderName },
      select: { originalName: true },
    });

    if (!rec) {
      return res.status(404).json({ message: "PCAP not found for this folder name." });
    }

    const baseDir = getPcapBaseDir();
    const filePath = path.join(baseDir, folderName, rec.originalName);

    // Stream the file if it exists
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ message: "File not found on disk." });
      }
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || "Failed to fetch PCAP file" });
  }
}
