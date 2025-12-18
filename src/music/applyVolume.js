// src/music/applyVolume.js
import { musicManager } from "./manager.js";

export async function applyVolume(guildId) {
  const queue = musicManager.get(guildId);
  if (!queue?.player) return false;

  const v = Math.max(1, Math.min(100, Number(queue.volume ?? 60)));
  const lavalinkVol = Math.round(v * 10);
  const p = queue.player;

  // update 우선
  if (typeof p.update === "function") {
    await p.update({ volume: lavalinkVol });
    return true;
  }

  // filters fallback
  if (typeof p.setFilters === "function") {
    try {
      await p.setFilters({ volume: v / 100 });
    } catch {
      await p.setFilters({ volume: (v / 100) * 5 });
    }
    return true;
  }

  // rest fallback
  const rest = p.node?.rest || p.connection?.node?.rest;
  if (rest?.updatePlayer) {
    await rest.updatePlayer(guildId, { volume: lavalinkVol });
    return true;
  }

  return false;
}
