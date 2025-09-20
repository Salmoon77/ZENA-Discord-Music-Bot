// src/commands/pause.js
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { togglePause } from "../music/manager.js";

export const data = new SlashCommandBuilder()
  .setName("일시정지")
  .setDescription("일시정지/재개 토글");

export async function execute(interaction) {
  const result = togglePause(interaction.guild.id);
  if (!result) {
    return interaction.reply({
      content: "⚠️ 현재 재생 중인 음악이 없습니다.",
      flags: 64,
    });
  }

  // ✅ Embed UI
  const embed = new EmbedBuilder()
    .setColor("#000000")
    .setTitle("⏯️ 일시정지 / 재개")
    .setDescription(result) // "▶️ 재생을 다시 시작했습니다." or "⏸️ 음악을 일시정지했습니다."
    .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

  return interaction.reply({ embeds: [embed] });
}
