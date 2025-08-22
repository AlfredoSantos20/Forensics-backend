// src/utils/pcapStorage.ts
import path from "path";
import { promises as fsp } from "fs";

const BASE_DIR =
  process.env.PCAP_BASE_DIR || path.join(process.cwd(), "uploads", "pcaps");

export function getPcapBaseDir() {
  return BASE_DIR;
}

async function ensureBaseDir() {
  await fsp.mkdir(BASE_DIR, { recursive: true });
}

/** Allocate the next available folder name: pcap1, pcap2, ... */
export async function allocatePcapFolder(): Promise<string> {
  await ensureBaseDir();

  for (let i = 1; i < 1_000_000_000; i++) {
    const dir = path.join(BASE_DIR, `pcap${i}`);
    try {
      await fsp.mkdir(dir); // atomic for the single attempt; throws if exists
      return dir;
    } catch (e: any) {
      if (e?.code === "EEXIST") continue;
      throw e;
    }
  }
  throw new Error("Failed to allocate PCAP folder after many attempts.");
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
}

/** Safe move (handles cross-device by copy+unlink if needed) */
async function moveFile(src: string, dest: string) {
  try {
    await fsp.rename(src, dest);
  } catch (e: any) {
    if (e?.code === "EXDEV") {
      await fsp.copyFile(src, dest);
      await fsp.unlink(src);
    } else {
      throw e;
    }
  }
}

/** Allocate folder and move uploaded file into it. */
export async function movePcapIntoNextFolder(tmpPath: string, originalName: string) {
  const folder = await allocatePcapFolder();
  const safeName = sanitizeName(originalName || path.basename(tmpPath));
  const destPath = path.join(folder, safeName);
  await moveFile(tmpPath, destPath);
  return { folder, destPath };
}
