// src/services/upload-pcap.services.ts
import { spawn } from "child_process";
import { createHash } from "crypto";
import { createReadStream, existsSync } from "fs";
import { promises as fsp } from "fs";
import path from "path";
import prisma from "../config/prisma";

/** Public types for controllers/UI */
export type Packet = {
  no: number;
  time: number;            // epoch seconds (float)
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info?: string;
};

export type PcapAnalysis = {
  sha256: string;
  originalName: string;
  size: number;
  packetCount: number;
  protocols: Record<string, number>;
  topTalkers: Array<[string, number]>;
  topConnections: Array<[string, number]>;
  preview: Packet[];
};

/** Validate uploaded file */
export function validatePcapUpload(
  file: Express.Multer.File,
  opts?: { maxBytes?: number }
) {
  const maxBytes =
    opts?.maxBytes ??
    (Number(process.env.MAX_UPLOAD_MB || 200) * 1024 * 1024);

  const ext = path.extname(file.originalname).toLowerCase();
  if (![".pcap", ".pcapng"].includes(ext)) {
    throw new Error("Unsupported file type. Only .pcap and .pcapng are allowed.");
  }
  if (file.size > maxBytes) {
    throw new Error(`File too large. Max ${Math.floor(maxBytes / (1024 * 1024))}MB`);
  }
}

/** Hash helper */
function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (c) => hash.update(c));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

/** Find tshark in env/common Windows paths/PATH */
function resolveTsharkBin(): string {
  const envPath = process.env.TSHARK_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\Wireshark\\tshark.exe",
      "C:\\Program Files (x86)\\Wireshark\\tshark.exe",
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
  }
  return "tshark"; // rely on PATH
}

/**
 * Run tshark and return full JSON decode.
 * (-T json ignores -e/-E, so we parse full layers and map below)
 */
async function runTsharkJSON(filePath: string): Promise<any[]> {
  const tsharkBin = resolveTsharkBin();
  const args = ["-r", filePath, "-T", "json"];

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const proc = spawn(tsharkBin, args, { windowsHide: true });

    proc.stdout.on("data", (d) => chunks.push(d));
    proc.stderr.on("data", () => {
      /* suppress noisy warnings */
    });

    proc.on("error", (err: any) => {
      if (err?.code === "ENOENT") {
        const hint =
          process.platform === "win32"
            ? 'TShark not found. Set TSHARK_PATH="C:\\Program Files\\Wireshark\\tshark.exe" or add Wireshark to PATH.'
            : "TShark not found. Install tshark and/or add it to PATH.";
        return reject(new Error(`Failed to spawn tshark (ENOENT). ${hint}`));
      }
      return reject(new Error(`Failed to spawn tshark: ${err?.message || err}`));
    });

    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`tshark exited with code ${code}`));
      try {
        const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        resolve(json);
      } catch (e: any) {
        reject(new Error(`Failed to parse tshark JSON: ${e.message}`));
      }
    });
  });
}

/** Map tshark JSON to our Packet[] */
function mapPackets(raw: any[]): Packet[] {
  const packets: Packet[] = [];

  for (const item of raw) {
    const L = item?._source?.layers ?? item?.layers ?? {};
    const get = (k: string) => {
      const v = L[k];
      return Array.isArray(v) ? v[0] : v;
    };

    const no = Number(get("frame.number")) || packets.length + 1;
    const timeEpoch = parseFloat(get("frame.time_epoch") || "0") || 0;
    const length = Number(get("frame.len")) || 0;

    const source = (get("ip.src") || "Unknown") as string;
    const destination = (get("ip.dst") || "Unknown") as string;

    let protocol: string = (get("_ws.col.Protocol") || "UNKNOWN") as string;
    if (Array.isArray(protocol)) protocol = protocol[0];

    // Build brief info from TCP/UDP ports and flags (if present)
    const tcpFlagsHex = get("tcp.flags");
    const tSrc = get("tcp.srcport");
    const tDst = get("tcp.dstport");
    const uSrc = get("udp.srcport");
    const uDst = get("udp.dstport");

    let info = "";
    if (tSrc || tDst) {
      const flags = (() => {
        if (!tcpFlagsHex) return "";
        const n = parseInt(String(tcpFlagsHex), 16);
        const f: string[] = [];
        if (n & 0x02) f.push("SYN");
        if (n & 0x10) f.push("ACK");
        if (n & 0x04) f.push("RST");
        if (n & 0x01) f.push("FIN");
        if (n & 0x08) f.push("PSH");
        if (n & 0x20) f.push("URG");
        return f.join(",");
      })();
      info = `TCP ${tSrc || "?"}->${tDst || "?"}${flags ? " [" + flags + "]" : ""}`;
    } else if (uSrc || uDst) {
      info = `UDP ${uSrc || "?"}->${uDst || "?"}`;
    }

    packets.push({
      no,
      time: timeEpoch,
      source,
      destination,
      protocol: String(protocol || "UNKNOWN"),
      length,
      info,
    });
  }

  return packets;
}

/** Summaries used by UI and DB */
function summarize(packets: Packet[], previewCount = 100) {
  const protocols: Record<string, number> = {};
  const talkers: Record<string, number> = {};
  const connections: Record<string, number> = {};

  for (const p of packets) {
    protocols[p.protocol] = (protocols[p.protocol] || 0) + 1;

    if (p.source !== "Unknown") {
      talkers[p.source] = (talkers[p.source] || 0) + 1;
    }
    if (p.destination !== "Unknown") {
      talkers[p.destination] = (talkers[p.destination] || 0) + 1;
    }

    const key = `${p.source} -> ${p.destination}`;
    connections[key] = (connections[key] || 0) + 1;
  }

  const topTalkers = Object.entries(talkers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topConnections = Object.entries(connections)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    packetCount: packets.length,
    protocols,
    topTalkers,
    topConnections,
    preview: packets.slice(0, previewCount),
  };
}

/** Main entry: analyze and (optionally) persist in Prisma */
export async function analyzeAndStorePcap(params: {
  filePath: string;
  originalName: string;
  uploadedById?: number;
  uploadedFolderName?: string; // <<< NEW
  persist?: boolean; // default true
}): Promise<PcapAnalysis> {
  const { filePath, originalName, uploadedById, uploadedFolderName, persist = true } = params;

  const stat = await fsp.stat(filePath);
  const size = stat.size;

  const sha256 = await computeSha256(filePath);
  const raw = await runTsharkJSON(filePath);
  const packets = mapPackets(raw);
  const sum = summarize(packets);

  const result: PcapAnalysis = {
    sha256,
    originalName,
    size,
    packetCount: sum.packetCount,
    protocols: sum.protocols,
    topTalkers: sum.topTalkers,
    topConnections: sum.topConnections,
    preview: sum.preview,
  };

  if (persist) {
    await prisma.pcap.upsert({
      where: { sha256 },
      update: {
        originalName,
        size,
        summaryJson: result as any,
        uploadedById: uploadedById ?? undefined,
        uploadedFolderName: uploadedFolderName ?? undefined, // <<< NEW
      },
      create: {
        sha256,
        originalName,
        size,
        summaryJson: result as any,
        uploadedById: uploadedById ?? undefined,
        uploadedFolderName: uploadedFolderName ?? "",         // <<< NEW
      },
    });
  }

  return result;
}

/** Query helpers for controllers */
export async function getPcapBySha(sha256: string) {
  return prisma.pcap.findUnique({ where: { sha256 } });
}

export async function listPcaps(limit = 50, cursor?: { id: number }) {
  return prisma.pcap.findMany({
    take: limit,
    ...(cursor ? { skip: 1, cursor } : {}),
    orderBy: { id: "desc" },
    select: {
      id: true,
      sha256: true,
      originalName: true,
      uploadedFolderName: true, // <<< NEW
      size: true,
      uploadedById: true,
      createdAt: true,
    },
  });
}


export async function listPcapFolders(params?: {
  limit?: number;
  order?: "asc" | "desc"; // asc = oldest first, desc = newest first
}) {
  const limit = Math.min(Math.max(params?.limit ?? 10, 1), 200);
  const order: "asc" | "desc" = params?.order ?? "desc";

  return prisma.pcap.findMany({
    take: limit,
    orderBy: { createdAt: order },
    select: {
      id: true,
      sha256: true,
      uploadedFolderName: true,
      originalName: true,
      size: true,
      uploadedById: true,
      createdAt: true,
    },
  });
}

/** Single most recent folder (by createdAt desc) */
export async function getLatestPcapFolder() {
  return prisma.pcap.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sha256: true,
      uploadedFolderName: true,
      originalName: true,
      size: true,
      uploadedById: true,
      createdAt: true,
    },
  });
}

/** Single oldest folder (by createdAt asc) */
export async function getOldestPcapFolder() {
  return prisma.pcap.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      sha256: true,
      uploadedFolderName: true,
      originalName: true,
      size: true,
      uploadedById: true,
      createdAt: true,
    },
  });
}