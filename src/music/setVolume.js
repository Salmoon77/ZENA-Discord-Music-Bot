// src/music/setVolume.js
import { musicManager } from "./manager.js";
import { saveVolume } from "../db/volumeStore.js";

export async function setGuildVolume(guildId, volume) {
  const queue = musicManager.get(guildId);
  if (!queue?.player) return false;

  const v = Math.max(1, Math.min(100, Number(volume)));
  const lavalinkVol = Math.round(v * 10);

  const p = queue.player;

  if (typeof p.update === "function") {
    await p.update({ volume: lavalinkVol });
  } else if (typeof p.setFilters === "function") {
    // 구현별 차이 대비
    try {
      await p.setFilters({ volume: v / 100 });
    } catch {
      await p.setFilters({ volume: (v / 100) * 5 });
    }
  } else {
    return false;
  }

  queue.volume = v;

  // ✅ 여기서 영구 저장
  await saveVolume(guildId, v);

  return true;
}
