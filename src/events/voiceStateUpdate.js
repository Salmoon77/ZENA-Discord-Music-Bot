// src/events/voiceStateUpdate.js
import { Events, EmbedBuilder } from "discord.js";
import { stop, musicManager } from "../music/manager.js";
import { leaveWithReason } from "../music/leaveDebug.js";

export const name = Events.VoiceStateUpdate;
export const once = false;

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

export async function execute(oldState, newState, client) {
  const guild = oldState.guild || newState.guild;
  if (!guild) return;

  const queue = musicManager.get(guild.id);
  if (!queue || !queue.player) return;

  // ✅ 복구 중이면 무시
  if (queue.reconnecting) return;

  // ✅ 큐 끝나서 1분 대기(자동퇴장 타이머) 중이면 여기서 즉시 퇴장 금지
  const idleWaiting =
    !queue.playing && !queue.current && (!queue.tracks || queue.tracks.length === 0) && !!queue._autoLeaveTimer;
  if (idleWaiting) return;

  const channelId = queue.voiceChannelId;
  if (!channelId) return;

  const channel =
    guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
  if (!channel || !channel.isVoiceBased()) return;

  const me =
    guild.members.me || (await guild.members.fetch(client.user.id).catch(() => null));
  if (!me?.voice?.channelId || me.voice.channelId !== channelId) return;

  const humans = channel.members.filter((m) => !m.user.bot && m.id !== client.user.id);
  if (humans.size > 0) return;

  // ✅ 즉시 퇴장 금지 → 4초 뒤 재확인
  await SLEEP(4000);

  const q2 = musicManager.get(guild.id);
  if (!q2 || !q2.player || q2.reconnecting) return;

  const channel2 = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel2 || !channel2.isVoiceBased()) return;

  const me2 =
    guild.members.me || (await guild.members.fetch(client.user.id).catch(() => null));
  if (!me2?.voice?.channelId || me2.voice.channelId !== channelId) return;

  const humans2 = channel2.members.filter((m) => !m.user.bot && m.id !== client.user.id);
  if (humans2.size > 0) return;

  // ✅ 여기까지 오면 진짜 사람 없음 → 즉시 퇴장 (이건 “사람 없을 때 바로 나가기” 정책 유지)
  try {
    await stop(guild.id).catch(() => {});
    await leaveWithReason(guild.id, "voiceStateUpdate:empty_after_delay");

    if (q2.textChannelId) {
      const textChannel = await client.channels.fetch(q2.textChannelId).catch(() => null);
      if (textChannel) {
        const embed = new EmbedBuilder()
          .setColor("#000000")
          .setTitle("👋 자동 퇴장")
          .setDescription("음성 채널에 유저가 없어 자동으로 퇴장했습니다.")
          .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

        await textChannel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("❌ 자동 퇴장 실패:", err);
  }
}
