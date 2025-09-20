// src/commands/skip.js
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { skipCurrent } from "../music/manager.js";

export const data = new SlashCommandBuilder()
  .setName("스킵")
  .setDescription("현재 곡을 스킵합니다.");

export async function execute(interaction) {
  try {
    const result = skipCurrent(interaction.guild.id);
    if (typeof result === "string" && result.startsWith("⚠️")) {
      return interaction.reply({ content: result, flags: 64 });
    }

    // ✅ Embed UI
    const embed = new EmbedBuilder()
      .setColor("#000000")
      .setTitle("⏭️ 트랙 스킵")
      .setDescription("현재 곡을 건너뛰었습니다.")
      .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

    return interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error("❌ skip 실행 중 오류:", err);
    return interaction.reply({
      content: "❌ 스킵 중 오류가 발생했습니다.",
      flags: 64,
    });
  }
}
