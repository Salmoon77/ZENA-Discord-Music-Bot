// src/music/leaveDebug.js
import { getShoukaku } from "../index.js";

const DEBUG_LEAVE_TRACE = process.env.DEBUG_LEAVE_TRACE === "true";

/**
 * leaveVoiceChannel() 호출 추적 + 안전 퇴장 헬퍼
 * - DEBUG_LEAVE_TRACE=true 일 때만 stack 출력
 */
export async function leaveWithReason(guildId, reason = "unknown") {
  if (DEBUG_LEAVE_TRACE) {
    const err = new Error(`[LEAVE] guild=${guildId} reason=${reason}`);
    console.warn(err.stack);
  }

  const shoukaku = getShoukaku();
  await shoukaku.leaveVoiceChannel(guildId).catch(() => {});
}
