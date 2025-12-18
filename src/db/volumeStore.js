// src/db/volumeStore.js
import { promises as fs } from "fs";
import path from "path";

// ✅ 항상 "프로젝트 루트/data/volume.json"로 고정
const ROOT = path.resolve(process.cwd()); // package.json 있는 곳에서 실행되는 게 정상
const DATA_DIR = path.join(ROOT, "data");
const FILE = path.join(DATA_DIR, "volume.json");

let cache = {};

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function loadVolumeStore() {
  await ensureDir();
  try {
    const raw = await fs.readFile(FILE, "utf8");
    cache = JSON.parse(raw || "{}");
  } catch {
    cache = {};
  }

  console.log("[VOLUME] store path =", FILE); // ✅ 이거 꼭 로그로 확인해
  return cache;
}

export function getSavedVolume(guildId, fallback = 60) {
  const v = cache?.[guildId];
  return Number.isInteger(v) ? v : fallback;
}

export async function saveVolume(guildId, volume) {
  await ensureDir();
  const v = Math.max(1, Math.min(100, Number(volume)));
  cache[guildId] = v;

  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(cache, null, 2), "utf8");
  await fs.rename(tmp, FILE);
  return v;
}
