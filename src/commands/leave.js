// src/commands/leave.js
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { ensureGuildQueue, musicManager } from "../music/manager.js";
import { getShoukaku } from "../index.js";

export const data = new SlashCommandBuilder()
  .setName("나가기")
  .setDescription("봇을 음성 채널에서 내보냅니다.");

export async function execute(interaction) {
  const guildId = interaction.guild.id;
  const queue = ensureGuildQueue(guildId);

  if (!queue.player) {
    return interaction.reply({
      content: "⚠️ 현재 재생 중인 음악이 없습니다.",
      flags: 64,
    });
  }

  try {
    // ✅ Shoukaku v4 퇴장 방식
    const shoukaku = getShoukaku();
    await shoukaku.leaveVoiceChannel(guildId);

    queue.tracks = [];
    queue.playing = false;
    musicManager.delete(guildId);

    // Embed UI
    const embed = new EmbedBuilder()
      .setColor("#000000")
      .setTitle("👋 음성 채널 퇴장")
      .setDescription("봇이 음성 채널에서 퇴장했습니다.")
      .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

    return interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error("❌ leave 실행 중 오류:", err);
    return interaction.reply({
      content: "❌ 채널 퇴장 중 오류가 발생했습니다.",
      flags: 64,
    });
  }
}
