// src/music/manager.js
import { getShoukaku } from "../index.js";
import { EmbedBuilder } from "discord.js";
import { client } from "../index.js";
import { updateMusicEmbed } from "../lib/updateMusicEmbed.js";
import fs from "fs";
import { leaveWithReason } from "./leaveDebug.js";
import { getSavedVolume } from "../db/volumeStore.js";

const SAVE_PATH = "./data/queueBackup.json";

export const musicManager = new Map();

/**
 * ✅ 플레이어 볼륨 적용 (새곡 시작/재연결/재부팅복구 모두 공통)
 * - Shoukaku 구현 차이 때문에 update / setFilters / rest.updatePlayer 순으로 시도
 */
async function applyVolume(guildId) {
  const q = musicManager.get(guildId);
  if (!q?.player) return false;

  const v = Math.max(1, Math.min(100, Number(q.volume ?? 60)));
  const lavalinkVol = Math.round(v * 10); // 1~100 -> 10~1000
  const p = q.player;

  // 1) Shoukaku/Lavalink v4: update({ volume })
  if (typeof p.update === "function") {
    await p.update({ volume: lavalinkVol });
    return true;
  }

  // 2) 구현에 따라 setFilters({ volume }) 지원
  if (typeof p.setFilters === "function") {
    // 일부 구현은 0~1, 일부는 더 크게 받기도 해서 2번 시도
    try {
      await p.setFilters({ volume: v / 100 }); // 0.01~1.0
    } catch {
      await p.setFilters({ volume: (v / 100) * 5 });
    }
    return true;
  }

  // 3) REST fallback
  const rest = p.node?.rest || p.connection?.node?.rest;
  if (rest?.updatePlayer) {
    await rest.updatePlayer(guildId, { volume: lavalinkVol });
    return true;
  }

  return false;
}

// n번째 곡(1=현재, 2=다음...)으로 점프하기 위해 대기열 앞부분 제거
export function trimQueueToIndex(guildId, index) {
  const queue = musicManager.get(guildId);
  if (!queue) return "⚠️ 큐가 없습니다.";

  const i = Number(index);
  if (!Number.isInteger(i) || i < 1) return "⚠️ 올바른 번호를 입력해주세요. (1 이상)";

  // queue.tracks = '다음곡부터' 쌓인 대기열
  const waiting = queue.tracks?.length ?? 0;

  // ✅ 1=현재, 2=다음(제거 0개), 3=다다음(제거 1개) ...
  const needRemove = Math.max(0, i - 2);

  if (needRemove > waiting) {
    return `⚠️ 그 번호까지 갈 수 없습니다. 현재 대기열: ${waiting}곡 (현재곡 포함하면 최대 ${waiting + 1}번까지)`;
  }

  if (needRemove > 0) queue.tracks.splice(0, needRemove);
  return true;
}

/**
 * 길드별 큐 생성 또는 반환
 */
export function ensureGuildQueue(guildId) {
  if (!musicManager.has(guildId)) {
    musicManager.set(guildId, {
      tracks: [],
      current: null,
      playing: false,

      loop: 0, // 0=off / 1=track / 2=queue
      loopMode: "off",

      // ✅ 저장된 볼륨(재부팅 유지)
      volume: getSavedVolume(guildId, 60),

      player: null,
      nodeName: "main",
      textChannelId: null,
      voiceChannelId: null,

      _autoLeaveTimer: null,
      _closedHandled: false,
      reconnecting: false,

      idleNotices: {
        waitingMsgId: null,
        leaveMsgId: null,
        waitingTimer: null,
        leaveTimer: null
      }
    });
  }
  return musicManager.get(guildId);
}

export function getQueue(guildId) {
  return musicManager.get(guildId);
}

/** ===================== 백업/복구 ===================== */

/**
 * ✅ current + queue 전체 백업
 */
export function saveQueues() {
  const data = {};

  for (const [guildId, q] of musicManager.entries()) {
    if (!q.voiceChannelId) continue;

    const current =
      q.player && q.current && q.playing
        ? {
            encoded: q.current.encoded,
            info: {
              title: q.current.info?.title ?? "Unknown",
              identifier: q.current.info?.identifier ?? null
            }
          }
        : null;

    const queueArr = Array.isArray(q.tracks)
      ? q.tracks.map((t) => ({
          encoded: t.encoded,
          info: {
            title: t.info?.title ?? "Unknown",
            identifier: t.info?.identifier ?? null
          }
        }))
      : [];

    if (!current && queueArr.length === 0) continue;

    data[guildId] = {
      voiceChannelId: q.voiceChannelId,
      textChannelId: q.textChannelId,
      paused: !!q.player?.paused,
      timestamp: Date.now(),

      current,
      queue: queueArr
    };
  }

  fs.writeFileSync(SAVE_PATH, JSON.stringify(data, null, 2));
}

export function restoreQueues() {
  if (!fs.existsSync(SAVE_PATH)) return;
  const data = JSON.parse(fs.readFileSync(SAVE_PATH, "utf8"));

  for (const [guildId, saved] of Object.entries(data)) {
    const q = ensureGuildQueue(guildId);

    q.voiceChannelId = saved.voiceChannelId ?? q.voiceChannelId;
    q.textChannelId = saved.textChannelId ?? q.textChannelId;

    q.current = saved.current
      ? { encoded: saved.current.encoded, info: saved.current.info ?? { title: "Unknown" } }
      : null;

    q.tracks = Array.isArray(saved.queue)
      ? saved.queue.map((t) => ({
          encoded: t.encoded,
          info: t.info ?? { title: "Unknown" }
        }))
      : [];

    q.playing = false;
  }

  console.log("🔁 큐 상태 복원 완료");
}

export function clearBackup(guildId) {
  if (!fs.existsSync(SAVE_PATH)) return;
  const data = JSON.parse(fs.readFileSync(SAVE_PATH, "utf8"));
  delete data[guildId];
  fs.writeFileSync(SAVE_PATH, JSON.stringify(data, null, 2));
}

/** ===================== 내부 유틸 ===================== */

async function clearIdleNoticesInternal(q) {
  try {
    if (!q) return;

    if (q.idleNotices.waitingTimer) {
      clearTimeout(q.idleNotices.waitingTimer);
      q.idleNotices.waitingTimer = null;
    }
    if (q.idleNotices.leaveTimer) {
      clearTimeout(q.idleNotices.leaveTimer);
      q.idleNotices.leaveTimer = null;
    }

    if (q.textChannelId) {
      const channel = await client.channels.fetch(q.textChannelId).catch(() => null);
      if (channel) {
        if (q.idleNotices.waitingMsgId) {
          await channel.messages.delete(q.idleNotices.waitingMsgId).catch(() => {});
          q.idleNotices.waitingMsgId = null;
        }
        if (q.idleNotices.leaveMsgId) {
          await channel.messages.delete(q.idleNotices.leaveMsgId).catch(() => {});
          q.idleNotices.leaveMsgId = null;
        }
      }
    }
  } catch {}
}

function clearAutoLeaveTimer(q) {
  if (q && q._autoLeaveTimer) {
    clearTimeout(q._autoLeaveTimer);
    q._autoLeaveTimer = null;
  }
}

export async function clearIdleNotices(guildId) {
  const q = musicManager.get(guildId);
  await clearIdleNoticesInternal(q);
  clearAutoLeaveTimer(q);
}

/** =======================================================
 * ✅ player 이벤트 바인딩
 * ======================================================= */
export function bindPlayerEvents(guildId, player) {
  if (!player || player.__bound) return;
  player.__bound = true;

  // ▶ 트랙 종료 이벤트
player.on("end", async () => {
  const q = musicManager.get(guildId);
  if (!q) return;

  // 루프 처리
  if (q.current) {
    if (q.loop === 1) q.tracks.unshift(q.current);
    else if (q.loop === 2) q.tracks.push(q.current);
  }

  q.playing = false;
  q.current = null;

  // ✅ 다음 곡 넘어가기
  if (q.tracks.length) {
    await playNext(guildId).catch(console.error);
    return;
  }

  // 여기부터 "대기열이 비었음" 처리
  await updateMusicEmbed(client, guildId).catch(() => {});
  await clearIdleNoticesInternal(q);

  // ✅ 안내 메시지: "대기열이 비었다, 1분 후 나간다"
  // - 이미 1분 퇴장 타이머가 걸려있으면 중복 전송 방지
  if (!q._autoLeaveTimer && q.textChannelId) {
    const textChannel = await client.channels.fetch(q.textChannelId).catch(() => null);
    if (textChannel) {
      const embed = new EmbedBuilder()
        .setColor("#000000")
        .setTitle("📭 대기열이 비었습니다")
        .setDescription("대기열에 남아있는 노래가 없어 **1분 후 자동으로 퇴장합니다.**")
        .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

      await textChannel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  // ✅ 1분 후 자동 퇴장 (재생중/복구중이면 금지)
  clearAutoLeaveTimer(q);
  q._autoLeaveTimer = setTimeout(async () => {
    const qCheck = musicManager.get(guildId);
    if (!qCheck || !qCheck.player) return;

    // 1분 사이에 다시 재생/복구가 시작되면 나가지 않음
    if (qCheck.reconnecting || qCheck.playing || qCheck.current) return;

    // 1분 사이에 큐에 다시 곡이 들어오면 나가지 않음
    if (qCheck.tracks.length > 0) return;

    await leaveWithReason(guildId, "autoLeaveTimer:idle_queue_empty");
    qCheck.player = null;
    qCheck.current = null;
    clearAutoLeaveTimer(qCheck);
    await updateMusicEmbed(client, guildId).catch(() => {});
  }, 60 * 1000);
});


  // ⚠ 세션 종료 이벤트
  player.on("closed", async (reason) => {
    const q = musicManager.get(guildId);
    if (!q) return;

    if (q.reconnecting) {
      console.log(`🔁 Guild ${guildId}: reconnect 중 closed 무시`);
      return;
    }

    //console.warn(`⚠️ Guild ${guildId}: Lavalink 세션이 닫힘 (reason=${JSON.stringify(reason)})`);
    if (q._closedHandled) return;
    q._closedHandled = true;

    setTimeout(async () => {
      const still = musicManager.get(guildId);
      const hasPlayer = getShoukaku().players.get(guildId);

      if (still && !hasPlayer) {
        still.player = null;
        still.playing = false;
        still.current = null;
        musicManager.delete(guildId);
        await updateMusicEmbed(client, guildId).catch(() => {});
       // console.log(`✅ Guild ${guildId}: 세션 종료 및 큐 초기화 완료`);
      } else if (still) {
        still._closedHandled = false;
      }
    }, 1500);
  });
}

/** ===================== 음성 연결 ===================== */

export async function connectToChannel(guildId, channelId, shardId) {
  const shoukaku = getShoukaku();
  const node =
    shoukaku.nodes.get("main") ||
    shoukaku.idleNodes?.[0] ||
    [...shoukaku.nodes.values()][0];

  if (!node) throw new Error("❌ 사용할 수 있는 Lavalink 노드가 없습니다.");

  await clearIdleNotices(guildId);

  const existingPlayer = shoukaku.players.get(guildId);
  if (existingPlayer) {
    try {
      await leaveWithReason(guildId, "connectToChannel:cleanup_existing");
      if (existingPlayer.connection?.state !== "DISCONNECTED") {
        existingPlayer.connection?.disconnect?.();
      }
      await existingPlayer.destroy?.().catch(() => {});
    } catch (err) {
      console.warn(`[Lavalink] 기존 플레이어 종료 실패:`, err);
    }
  }

  let player;
  try {
    player = await shoukaku.joinVoiceChannel({
      guildId,
      channelId,
      shardId,
      deaf: true
    });
  } catch (e) {
    if (String(e?.message || e).includes("existing connection")) {
      await leaveWithReason(guildId, "connectToChannel:existing_connection");
      player = await shoukaku.joinVoiceChannel({
        guildId,
        channelId,
        shardId,
        deaf: true
      });
    } else {
      throw e;
    }
  }

  const queue = ensureGuildQueue(guildId);
  queue.voiceChannelId = channelId;
  queue.player = player;
  queue._closedHandled = false;

  // ✅ 여기서도 바인딩
  bindPlayerEvents(guildId, player);

  // ✅ 새로 만든 player에도 볼륨 1회 적용
  await applyVolume(guildId).catch(() => {});
  setTimeout(() => applyVolume(guildId).catch(() => {}), 700);

  return player;
}

/** ===================== 검색/재생 ===================== */

export async function resolveTracks(node, query) {
  const identifier = query.startsWith("http") ? query : `ytsearch:${query}`;
  const res = await node.rest.resolve(identifier);
  if (!res) return [];

  if (Array.isArray(res.data)) return res.data;
  if (res.data?.tracks && Array.isArray(res.data.tracks)) return res.data.tracks;
  if (Array.isArray(res.tracks)) return res.tracks;
  if (res.data?.encoded && res.data?.info) return [res.data];
  return [];
}

export async function playNext(guildId) {
  const queue = ensureGuildQueue(guildId);
  if (queue.playing) return;

  const next = queue.tracks.shift();
  if (!next) return;

  queue.current = next;
  queue.playing = true;

  if (!queue.player) throw new Error("⚠️ 플레이어가 초기화되지 않았습니다.");

  await clearIdleNoticesInternal(queue);
  clearAutoLeaveTimer(queue);

  await queue.player.playTrack({ track: { encoded: next.encoded } });

  // ✅ 새 곡 시작할 때마다 볼륨 강제 적용 (핵심)
  await applyVolume(guildId).catch(() => {});
  setTimeout(() => applyVolume(guildId).catch(() => {}), 700);

  try {
    if (queue.textChannelId) {
      const channel = await client.channels.fetch(queue.textChannelId);
      const adderemb = new EmbedBuilder()
        .setColor("#000000")
        .setTitle("🎵 노래 재생을 시작합니다!")
        .setDescription("`" + (next.info?.title ?? "Unknown") + "`")
        .setImage(
          next.info?.identifier
            ? "https://img.youtube.com/vi/" + next.info.identifier + "/mqdefault.jpg"
            : null
        )
        .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

      const msg = await channel.send({ embeds: [adderemb] }).catch(() => null);
      if (msg) {
        const MusicChannel = (await import("../models/Musicchannel.js")).default;
        const isMusicChannel = await MusicChannel.findOne({ channelId: channel.id });
        if (isMusicChannel) setTimeout(() => msg.delete().catch(() => {}), 3000);
      }
      await updateMusicEmbed(client, guildId).catch(() => {});
    }
  } catch (e) {
    console.error("❌ 임베드 전송 실패:", e);
  }
}

/** ===================== 컨트롤 ===================== */

export function togglePause(guildId) {
  const queue = getQueue(guildId);
  if (!queue || !queue.player) return false;

  if (queue.player.paused) {
    queue.player.setPaused(false);
    updateMusicEmbed(client, guildId).catch(() => {});
    return "▶️ 재생을 다시 시작했습니다.";
  } else {
    queue.player.setPaused(true);
    updateMusicEmbed(client, guildId).catch(() => {});
    return "⏸️ 음악을 일시정지했습니다.";
  }
}

export function toggleLoop(guildId) {
  const queue = getQueue(guildId);
  if (!queue) return false;

  if (queue.loop === 0) {
    queue.loop = 1;
    queue.loopMode = "track";
    updateMusicEmbed(client, guildId).catch(() => {});
    return "🔂 현재 곡 반복 활성화";
  } else if (queue.loop === 1) {
    queue.loop = 2;
    queue.loopMode = "queue";
    updateMusicEmbed(client, guildId).catch(() => {});
    return "🔁 대기열 반복 활성화";
  } else {
    queue.loop = 0;
    queue.loopMode = "off";
    updateMusicEmbed(client, guildId).catch(() => {});
    return "➡️ 반복 모드 해제";
  }
}

export async function stop(guildId) {
  const queue = getQueue(guildId);
  if (!queue || !queue.player) return false;

  queue.tracks = [];
  queue.player.stopTrack();
  queue.playing = false;
  queue.current = null;

  await updateMusicEmbed(client, guildId).catch(() => {});
  await clearIdleNoticesInternal(queue);

  clearAutoLeaveTimer(queue);
  queue._autoLeaveTimer = setTimeout(async () => {
    const qCheck = musicManager.get(guildId);
    if (!qCheck || !qCheck.player) return;
    if (qCheck.reconnecting || qCheck.playing || qCheck.current) return;

    if (!qCheck.tracks.length) {
      await leaveWithReason(guildId, "stop:autoLeaveTimer");
      qCheck.player = null;
      qCheck.current = null;
      clearAutoLeaveTimer(qCheck);
      await updateMusicEmbed(client, guildId).catch(() => {});
    }
  }, 60 * 1000);

  return true;
}

export function skipCurrent(guildId) {
  const queue = getQueue(guildId);
  if (!queue || !queue.player) return "⚠️ 현재 재생 중인 음악이 없습니다.";
  queue.player.stopTrack();
  updateMusicEmbed(client, guildId).catch(() => {});
  return "⏭️ 현재 트랙을 건너뛰었습니다.";
}

export function stopAll() {
  for (const [guildId, queue] of musicManager.entries()) {
    if (queue.player) {
      queue.tracks = [];
      queue.player.stopTrack();
      queue.playing = false;
      queue.current = null;
    }
    musicManager.delete(guildId);
    updateMusicEmbed(client, guildId).catch(() => {});
  }
  return "⏹️ 모든 서버의 음악 재생을 중지했습니다.";
}
