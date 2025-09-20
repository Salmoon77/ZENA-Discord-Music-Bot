// src/music/manager.js
import { getShoukaku } from "../index.js";
import { EmbedBuilder } from "discord.js";
import { client } from "../index.js";
import { updateMusicEmbed } from "../lib/updateMusicEmbed.js";

export const musicManager = new Map();

export function ensureGuildQueue(guildId) {
  if (!musicManager.has(guildId)) {
    musicManager.set(guildId, {
      tracks: [],
      current: null,
      playing: false,
      // 0=off / 1=track / 2=queue
      loop: 0,
      loopMode: "off",
      player: null,
      nodeName: "main",
      textChannelId: null,
      voiceChannelId: null,
      // ⏳ 안내/퇴장 임베드 추적용 상태
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

/** 내부 유틸: 타이머/안내메시지 정리 */
async function clearIdleNoticesInternal(q) {
  try {
    if (!q) return;

    // 타이머 클리어
    if (q.idleNotices.waitingTimer) {
      clearTimeout(q.idleNotices.waitingTimer);
      q.idleNotices.waitingTimer = null;
    }
    if (q.idleNotices.leaveTimer) {
      clearTimeout(q.idleNotices.leaveTimer);
      q.idleNotices.leaveTimer = null;
    }

    // 메시지 삭제
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
  } catch {
    // 조용히 무시
  }
}

/** 외부에서 즉시 지우고 싶을 때 호출용 */
export async function clearIdleNotices(guildId) {
  const q = musicManager.get(guildId);
  await clearIdleNoticesInternal(q);
}

/**
 * 음성 채널 연결
 */
export async function connectToChannel(guildId, channelId, shardId) {
  const shoukaku = getShoukaku();
  const node =
    shoukaku.nodes.get("main") ||
    shoukaku.idleNodes?.[0] ||
    [...shoukaku.nodes.values()][0];

  if (!node) throw new Error("❌ 사용할 수 있는 Lavalink 노드가 없습니다.");

  const player = await shoukaku.joinVoiceChannel({
    guildId,
    channelId,
    shardId,
    deaf: true
  });

  const queue = ensureGuildQueue(guildId);
  queue.voiceChannelId = channelId;

  if (!player.__bound) {
    player.__bound = true;

    // ▶ end: 트랙 종료
    player.on("end", async () => {
      const q = musicManager.get(guildId);
      if (!q) return;

      // 루프 모드 처리
      if (q.current) {
        if (q.loop === 1) q.tracks.unshift(q.current); // track loop
        else if (q.loop === 2) q.tracks.push(q.current); // queue loop
      }

      q.playing = false;
      q.current = null;

      if (q.tracks.length) {
        await playNext(guildId).catch(console.error);
        return;
      }

      // 대기열 없음 → 즉시 embed 갱신
      await updateMusicEmbed(client, guildId);

      // ✅ "대기열 비어있음" 안내 전송 + 뮤직채널이면 1분 뒤 삭제
      if (q.textChannelId) {
        try {
          const channel = await client.channels.fetch(q.textChannelId);
          const waitingEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setTitle("⏳ 대기열이 비어있습니다.")
            .setDescription("1분 후 자동으로 음성 채널에서 퇴장합니다.")
            .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

          const msg = await channel.send({ embeds: [waitingEmbed] });

          // 이전 안내 정리
          await clearIdleNoticesInternal(q);
          q.idleNotices.waitingMsgId = msg.id;

          // 뮤직채널이면 1분 뒤 삭제
          const MusicChannel = (await import("../models/Musicchannel.js")).default;
          const isMusicChannel = await MusicChannel.findOne({ channelId: channel.id });
          if (isMusicChannel) {
            q.idleNotices.waitingTimer = setTimeout(async () => {
              const ch = await client.channels.fetch(q.textChannelId).catch(() => null);
              if (ch && q.idleNotices.waitingMsgId) {
                await ch.messages.delete(q.idleNotices.waitingMsgId).catch(() => {});
              }
              q.idleNotices.waitingMsgId = null;
              q.idleNotices.waitingTimer = null;
            }, 60 * 1000);
          }
        } catch (e) {
          console.error("❌ 안내 메시지 전송 실패:", e);
        }
      }

      // 5분 후 자동 퇴장
      setTimeout(async () => {
        const qCheck = musicManager.get(guildId);
        if (qCheck && !qCheck.tracks.length && qCheck.player) {
          try {
            const shoukaku2 = getShoukaku();
            await shoukaku2.leaveVoiceChannel(guildId);
            qCheck.player = null;
            qCheck.current = null;

            await updateMusicEmbed(client, guildId);

            // ✅ "자동 퇴장" 안내 + 뮤직채널이면 1분 뒤 삭제
            if (qCheck.textChannelId) {
              const channel = await client.channels.fetch(qCheck.textChannelId);
              const leaveEmbed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("👋 자동 퇴장")
                .setDescription("1분 동안 대기열이 없어 음성 채널에서 퇴장했습니다.")
                .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

              const msg = await channel.send({ embeds: [leaveEmbed] });

              // 이전 leave 안내 정리(혹시 있다면)
              if (qCheck.idleNotices.leaveTimer) {
                clearTimeout(qCheck.idleNotices.leaveTimer);
                qCheck.idleNotices.leaveTimer = null;
              }
              qCheck.idleNotices.leaveMsgId = msg.id;

              const MusicChannel = (await import("../models/Musicchannel.js")).default;
              const isMusicChannel = await MusicChannel.findOne({ channelId: channel.id });
              if (isMusicChannel) {
                qCheck.idleNotices.leaveTimer = setTimeout(async () => {
                  const ch = await client.channels.fetch(qCheck.textChannelId).catch(() => null);
                  if (ch && qCheck.idleNotices.leaveMsgId) {
                    await ch.messages.delete(qCheck.idleNotices.leaveMsgId).catch(() => {});
                  }
                  qCheck.idleNotices.leaveMsgId = null;
                  qCheck.idleNotices.leaveTimer = null;
                }, 10 * 1000);
              }
            }
          } catch (e) {
            console.error("❌ 음성 채널 퇴장 실패:", e);
          }
        }
      }, 1 * 60 * 1000);
    });

    // ⚠ exception: 재생 에러
    player.on("exception", async (e) => {
      console.error(`[Player Exception @ ${guildId}]`, e);
      const q = musicManager.get(guildId);
      if (!q) return;
      q.playing = false;
      q.current = null;
      await updateMusicEmbed(client, guildId);
      playNext(guildId).catch(console.error);
    });

    // ❌ closed: 연결 닫힘
    player.on("closed", async () => {
      const q = musicManager.get(guildId);
      if (!q) return;
      q.player = null;
      q.playing = false;
      q.current = null;
      await updateMusicEmbed(client, guildId);
    });
  }

  return player;
}

/**
 * 트랙 검색
 */
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

/**
 * 다음 곡 재생
 */
export async function playNext(guildId) {
  const queue = ensureGuildQueue(guildId);
  if (queue.playing) return;

  const next = queue.tracks.shift();
  if (!next) return;

  queue.current = next;
  queue.playing = true;

  if (!queue.player) throw new Error("⚠️ 플레이어가 초기화되지 않았습니다.");

  // ✅ 재생 시작 시, 대기/퇴장 안내는 즉시 정리
  await clearIdleNoticesInternal(queue);

  await queue.player.playTrack({ track: { encoded: next.encoded } });

  try {
    if (queue.textChannelId) {
      const channel = await client.channels.fetch(queue.textChannelId);

      const adderemb = new EmbedBuilder()
        .setColor("#000000")
        .setTitle("🎵 노래 재생을 시작합니다!")
        .setDescription("`" + next.info.title + "`")
        .setImage("https://img.youtube.com/vi/" + next.info.identifier + "/mqdefault.jpg")
        .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

      const msg = await channel.send({ embeds: [adderemb] });

      // 뮤직채널이면 3초 뒤 삭제
      const MusicChannel = (await import("../models/Musicchannel.js")).default;
      const isMusicChannel = await MusicChannel.findOne({ channelId: channel.id });
      if (isMusicChannel) {
        setTimeout(() => msg.delete().catch(() => {}), 3000);
      }

      await updateMusicEmbed(client, guildId);
    }
  } catch (e) {
    console.error("❌ 임베드 전송 실패:", e);
  }
}

/**
 * 일시정지 / 재개
 */
export function togglePause(guildId) {
  const queue = getQueue(guildId);
  if (!queue || !queue.player) return false;

  if (queue.player.paused) {
    queue.player.setPaused(false);
    updateMusicEmbed(client, guildId);
    return "▶️ 재생을 다시 시작했습니다.";
  } else {
    queue.player.setPaused(true);
    updateMusicEmbed(client, guildId);
    return "⏸️ 음악을 일시정지했습니다.";
  }
}

/**
 * 반복 모드
 */
export function toggleLoop(guildId) {
  const queue = getQueue(guildId);
  if (!queue) return false;

  if (queue.loop === 0) {
    queue.loop = 1;
    queue.loopMode = "track";
    updateMusicEmbed(client, guildId);
    return "🔂 현재 곡 반복 활성화";
  } else if (queue.loop === 1) {
    queue.loop = 2;
    queue.loopMode = "queue";
    updateMusicEmbed(client, guildId);
    return "🔁 대기열 반복 활성화";
  } else {
    queue.loop = 0;
    queue.loopMode = "off";
    updateMusicEmbed(client, guildId);
    return "➡️ 반복 모드 해제";
  }
}

/**
 * 중지
 */
export async function stop(guildId) {
  const queue = getQueue(guildId);
  if (!queue || !queue.player) return false;

  queue.tracks = [];
  queue.player.stopTrack();
  queue.playing = false;
  queue.current = null;

  await updateMusicEmbed(client, guildId);

  // ✅ "재생이 중지되었습니다" 안내 + 뮤직채널이면 1분 뒤 삭제
  if (queue.textChannelId) {
    try {
      const channel = await client.channels.fetch(queue.textChannelId);
      const waitingEmbed = new EmbedBuilder()
        .setColor("#000000")
        .setTitle("⏹️ 재생이 중지되었습니다.")
        .setDescription("대기열이 비어있습니다. 1분 후 자동으로 음성 채널에서 퇴장합니다.")
        .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

      const msg = await channel.send({ embeds: [waitingEmbed] });

      // 이전 안내 정리 후 갱신
      await clearIdleNoticesInternal(queue);
      queue.idleNotices.waitingMsgId = msg.id;

      const MusicChannel = (await import("../models/Musicchannel.js")).default;
      const isMusicChannel = await MusicChannel.findOne({ channelId: channel.id });
      if (isMusicChannel) {
        queue.idleNotices.waitingTimer = setTimeout(async () => {
          const ch = await client.channels.fetch(queue.textChannelId).catch(() => null);
          if (ch && queue.idleNotices.waitingMsgId) {
            await ch.messages.delete(queue.idleNotices.waitingMsgId).catch(() => {});
          }
          queue.idleNotices.waitingMsgId = null;
          queue.idleNotices.waitingTimer = null;
        }, 60 * 1000);
      }
    } catch (e) {
      console.error("❌ stop 안내 메시지 전송 실패:", e);
    }
  }

  // 5분 뒤 자동 퇴장 + 퇴장 안내(뮤직채널이면 1분 뒤 삭제)
  setTimeout(async () => {
    const qCheck = musicManager.get(guildId);
    if (qCheck && !qCheck.tracks.length && qCheck.player) {
      try {
        const shoukaku2 = getShoukaku();
        await shoukaku2.leaveVoiceChannel(guildId);
        qCheck.player = null;
        qCheck.current = null;

        await updateMusicEmbed(client, guildId);

        if (qCheck.textChannelId) {
          const channel = await client.channels.fetch(qCheck.textChannelId);
          const leaveEmbed = new EmbedBuilder()
            .setColor("#000000")
            .setTitle("👋 자동 퇴장")
            .setDescription("1분 동안 대기열이 없어 음성 채널에서 퇴장했습니다.")
            .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

          const msg = await channel.send({ embeds: [leaveEmbed] });

          // 이전 leave 안내 정리
          if (qCheck.idleNotices.leaveTimer) {
            clearTimeout(qCheck.idleNotices.leaveTimer);
            qCheck.idleNotices.leaveTimer = null;
          }
          qCheck.idleNotices.leaveMsgId = msg.id;

          const MusicChannel = (await import("../models/Musicchannel.js")).default;
          const isMusicChannel = await MusicChannel.findOne({ channelId: channel.id });
          if (isMusicChannel) {
            qCheck.idleNotices.leaveTimer = setTimeout(async () => {
              const ch = await client.channels.fetch(qCheck.textChannelId).catch(() => null);
              if (ch && qCheck.idleNotices.leaveMsgId) {
                await ch.messages.delete(qCheck.idleNotices.leaveMsgId).catch(() => {});
              }
              qCheck.idleNotices.leaveMsgId = null;
              qCheck.idleNotices.leaveTimer = null;
            }, 10 * 1000);
          }
        }
      } catch (e) {
        console.error("❌ 음성 채널 퇴장 실패:", e);
      }
    }
  }, 1 * 60 * 1000);

  return true;
}

/**
 * 스킵
 */
export function skipCurrent(guildId) {
  const queue = getQueue(guildId);
  if (!queue || !queue.player) return "⚠️ 현재 재생 중인 음악이 없습니다.";

  queue.player.stopTrack();
  updateMusicEmbed(client, guildId);
  return "⏭️ 현재 트랙을 건너뛰었습니다.";
}

/**
 * 전체 정지
 */
export function stopAll() {
  for (const [guildId, queue] of musicManager.entries()) {
    if (queue.player) {
      queue.tracks = [];
      queue.player.stopTrack();
      queue.playing = false;
      queue.current = null;
    }
    musicManager.delete(guildId);
  }
  return "⏹️ 모든 서버의 음악 재생을 중지했습니다.";
}
