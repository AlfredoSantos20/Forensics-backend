import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "pcap");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ts = new Date().toISOString().replace(/[-:T.Z]/g, "");
      cb(null, `${ts}_${file.originalname}`);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});
