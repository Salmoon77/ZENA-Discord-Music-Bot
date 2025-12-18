// src/music/reconnect.js
import fs from "fs";
import { ChannelType, EmbedBuilder } from "discord.js";
import { getShoukaku, client } from "../index.js";
import { ensureGuildQueue, clearIdleNotices, bindPlayerEvents } from "./manager.js";

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_RESTORE_AGE_MS = 5 * 60 * 1000;

/**
 * ✅ 복구 재생시에만 볼륨 적용
 * - queue.volume (ensureGuildQueue에서 저장값으로 채워져 있어야 함)
 * - Shoukaku 구현별로 update / setFilters / rest.updatePlayer 순으로 시도
 */
async function applyRestoreVolume(guildId) {
  const q = ensureGuildQueue(guildId);
  if (!q?.player) return false;

  const v = Math.max(1, Math.min(100, Number(q.volume ?? 60)));
  const lavalinkVol = Math.round(v * 10); // 1~100 -> 10~1000
  const p = q.player;

  if (typeof p.update === "function") {
    await p.update({ volume: lavalinkVol });
    return true;
  }

  if (typeof p.setFilters === "function") {
    try {
      await p.setFilters({ volume: v / 100 });
    } catch {
      await p.setFilters({ volume: (v / 100) * 5 });
    }
    return true;
  }

  const rest = p.node?.rest || p.connection?.node?.rest;
  if (rest?.updatePlayer) {
    await rest.updatePlayer(guildId, { volume: lavalinkVol });
    return true;
  }

  return false;
}

async function unsuppressIfStage(channelId) {
  try {
    const ch = await client.channels.fetch(channelId).catch(() => null);
    if (!ch) return;

    if (ch.type === ChannelType.GuildStageVoice) {
      const me = await ch.guild.members.fetch(client.user.id).catch(() => null);
      if (me?.voice?.suppress) {
        await me.voice.setSuppressed(false).catch(() => {});
        await SLEEP(1000);
      }
    }
  } catch {}
}

async function hardRejoin(shoukaku, guildId, channelId) {
  const node = shoukaku.nodes.get("main") || [...shoukaku.nodes.values()][0];

  try {
    await node?.rest.destroyPlayer(guildId);
  } catch {}
  try {
    await shoukaku.leaveVoiceChannel(guildId);
  } catch {}
  await SLEEP(300);

  const player = await shoukaku.joinVoiceChannel({
    guildId,
    channelId,
    shardId: 0,
    deaf: true
  });

  await unsuppressIfStage(channelId);
  await SLEEP(2500);
  return player;
}

function readBackup(dataPath) {
  if (!fs.existsSync(dataPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {
    return null;
  }
}

function writeBackup(dataPath, backup) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(backup, null, 2));
  } catch {}
}

export async function reconnectPlayers() {
  const shoukaku = getShoukaku();
  const dataPath = "./data/queueBackup.json";

  const backup = readBackup(dataPath);
  if (!backup) {
    console.log("⚠️ queueBackup.json 없음/파싱 실패 — 복원할 데이터가 없습니다.");
    return;
  }

  const now = Date.now();
  let changed = false;

  for (const [guildId, info] of Object.entries(backup)) {
    const ts = Number(info.timestamp || 0);
    if (!ts || now - ts > MAX_RESTORE_AGE_MS) {
      console.log(`⏭️ ${guildId}: 백업이 너무 오래됨(>5분) → 복구 스킵`);
      delete backup[guildId];
      changed = true;
    }
  }
  if (changed) writeBackup(dataPath, backup);

  for (const [guildId, info] of Object.entries(backup)) {
    const voiceChannelId = info.voiceChannelId;
    const textChannelId = info.textChannelId;
    const paused = !!info.paused;

    const current = info.current;
    const queueArr = Array.isArray(info.queue) ? info.queue : [];

    if (!voiceChannelId) continue;
    if (!current?.encoded && queueArr.length === 0) continue;

    try {
      // 안내문구
      if (textChannelId) {
        const textChannel = await client.channels.fetch(textChannelId).catch(() => null);
        if (textChannel) {
          const emb = new EmbedBuilder()
            .setTitle("🔄 봇 재시작 감지")
            .setDescription("봇이 재시작되어 재생중이던 노래가 처음부터 다시 시작됩니다")
            .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

          await textChannel.send({ embeds: [emb] }).catch(() => {});
        }
      }

      console.log(`🎧 ${guildId}: 복구 시작 (queue=${queueArr.length})`);

      const q = ensureGuildQueue(guildId);
      q.reconnecting = true;
      q._closedHandled = false;
      q.voiceChannelId = voiceChannelId;
      q.textChannelId = textChannelId;

      // ✅ 대기열 복원
      q.tracks = queueArr.map((t) => ({
        encoded: t.encoded,
        info: t.info ?? { title: "Unknown" }
      }));

      await clearIdleNotices(guildId);

      const player = await hardRejoin(shoukaku, guildId, voiceChannelId);
      q.player = player;

      // ✅ 복구로 만든 player도 이벤트 바인딩
      bindPlayerEvents(guildId, player);

      // ✅ (선택) player 생성 직후 1회 적용
      await applyRestoreVolume(guildId).catch(() => {});
      setTimeout(() => applyRestoreVolume(guildId).catch(() => {}), 700);

      // ✅ 현재곡 "처음부터" 재생
      if (current?.encoded) {
        q.current = { encoded: current.encoded, info: current.info ?? { title: "Unknown" } };
        q.playing = true;

        await player.playTrack({
          track: { encoded: current.encoded },
          options: { startTime: 0 }
        });

        // ✅ playTrack 직후에도 1회 더 (play가 볼륨을 덮는 경우 방지)
        await applyRestoreVolume(guildId).catch(() => {});
        setTimeout(() => applyRestoreVolume(guildId).catch(() => {}), 700);

        if (paused) await player.setPaused(true).catch(() => {});
      } else {
        // current 없고 queue만 있으면 첫 곡부터
        const first = q.tracks.shift();
        if (first) {
          q.current = first;
          q.playing = true;

          await player.playTrack({
            track: { encoded: first.encoded },
            options: { startTime: 0 }
          });

          // ✅ 여기에도 동일 적용
          await applyRestoreVolume(guildId).catch(() => {});
          setTimeout(() => applyRestoreVolume(guildId).catch(() => {}), 700);

          if (paused) await player.setPaused(true).catch(() => {});
        }
      }

      setTimeout(() => {
        const q2 = ensureGuildQueue(guildId);
        q2.reconnecting = false;
        q2._closedHandled = false;
      }, 15000);

      console.log(`▶️ ${guildId}: 복구 완료 (남은 큐=${q.tracks.length})`);
    } catch (err) {
      console.error(`❌ ${guildId} 복구 실패:`, err);
      try {
        const q = ensureGuildQueue(guildId);
        q.reconnecting = false;
      } catch {}
    }
  }
}
