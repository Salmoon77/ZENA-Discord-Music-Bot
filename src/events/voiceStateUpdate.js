import { Events, EmbedBuilder } from "discord.js";
import { stopAll, musicManager } from "../music/manager.js";
import { getShoukaku } from "../index.js";

export const name = Events.VoiceStateUpdate;
export const once = false;

export async function execute(oldState, newState, client) {
  const guild = oldState.guild || newState.guild;
  const queue = musicManager.get(guild.id);
  if (!queue || !queue.player) return;

  const channelId = queue.voiceChannelId; // ✅ 우리가 저장한 channelId 사용
  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;

  // ✅ 봇 자신과 다른 봇은 제외, 사람만 카운트
  const humanMembers = channel.members.filter(
    m => !m.user.bot && m.id !== client.user.id
  );

  if (humanMembers.size === 0) {
    try {
      stopAll();

      const shoukaku = getShoukaku();
      await shoukaku.leaveVoiceChannel(guild.id);

      // ✅ 채팅 채널로 알림 전송
      if (queue.textChannelId) {
        try {
          const textChannel = await client.channels.fetch(queue.textChannelId);
          if (textChannel) {
            const embed = new EmbedBuilder()
              .setColor("#000000")
              .setTitle("👋 자동 퇴장")
              .setDescription("음성 채널에 유저가 없어 자동으로 퇴장했습니다.")
              .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

            await textChannel.send({ embeds: [embed] });
          }
        } catch (e) {
          console.error("❌ 자동 퇴장 알림 전송 실패:", e);
        }
      }
    } catch (err) {
      console.error("❌ 자동 퇴장 실패:", err);
    }
  }
}
