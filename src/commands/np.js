// src/commands/np.js
import { SlashCommandBuilder } from "discord.js";
import { getQueue } from "../music/manager.js";
import { nowPlayingEmbed } from "../lib/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("현재재생")
  .setDescription("현재 재생 중인 곡을 표시합니다.");

export async function execute(interaction) {
  if (!interaction.guildId) {
    return interaction.reply({
      content: "⚠️ 서버에서만 사용 가능합니다.",
      ephemeral: true,
    });
  }

  const q = getQueue(interaction.guildId);

  if (!q || !q.player || !q.playing || !q.current) {
    return interaction.reply({
      content: "⏹️ 현재 재생 중인 곡이 없어요.",
      ephemeral: true,
    });
  }

  // ✅ lib/embeds.js → nowPlayingEmbed 사용
  const embed = nowPlayingEmbed(q.current, q);

  await interaction.reply({ embeds: [embed] });
}
