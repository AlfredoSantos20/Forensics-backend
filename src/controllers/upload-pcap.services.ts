import { Request, Response } from "express";
import {
  analyzeAndStorePcap,
  getPcapBySha,
  listPcaps,
  validatePcapUpload,
} from "../services/upload-pcap.services";

/** POST /pcap/upload (multer middleware must set req.file) */
export async function uploadPcapController(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    validatePcapUpload(req.file);

    const uploadedById =
      (req as any).user?.id !== undefined ? Number((req as any).user.id) : undefined;

    const analysis = await analyzeAndStorePcap({
      filePath: req.file.path,
      originalName: req.file.originalname,
      uploadedById,
      persist: true,
    });

    return res.status(201).json({ message: "PCAP analyzed", data: analysis });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || "Failed to analyze PCAP" });
  }
}

/** GET /pcap/:sha256 */
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
