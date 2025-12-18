// src/commands/stop.js
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { stop } from "../music/manager.js";
import { updateMusicEmbed } from "../lib/updateMusicEmbed.js"; 

export const data = new SlashCommandBuilder()
  .setName("정지")
  .setDescription("재생을 멈추고 큐를 비웁니다.");

export async function execute(interaction) {
  try {
    const guildId = interaction.guild.id;
    const result = await stop(guildId); // ✅ stopAll → stop
    if (result) {
      // ✅ Embed UI
      const embed = new EmbedBuilder()
        .setTitle("🛑 음악 정지")
        .setDescription("재생을 멈추고 대기열을 모두 비웠습니다.")
        .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

      // 🚨 여기서 뮤직채널 임베드 즉시 갱신
      await updateMusicEmbed(interaction.client, guildId);

      return interaction.reply({ embeds: [embed] });
    } else {
      return interaction.reply({
        content: "⚠️ 현재 재생 중인 음악이 없습니다.",
        flags: 64,
      });
    }
  } catch (err) {
    console.error("❌ stop 실행 중 오류:", err);
    return interaction.reply({
      content: "❌ 정지 중 오류가 발생했습니다.",
      flags: 64,
    });
  }
}
