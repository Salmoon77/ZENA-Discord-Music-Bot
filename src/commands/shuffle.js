import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getQueue } from "../music/manager.js";

export const data = new SlashCommandBuilder()
  .setName("셔플")
  .setDescription("대기열을 무작위로 섞습니다.");

export async function execute(interaction) {
  const guildId = interaction.guild.id;
  const queue = getQueue(guildId);

  if (!queue || !queue.tracks || queue.tracks.length < 2) {
    return interaction.reply({
      content: "⚠️ 셔플할 대기열이 없습니다. (곡이 2개 이상 필요합니다.)",
      ephemeral: true,
    });
  }

  // ✅ Fisher-Yates Shuffle
  for (let i = queue.tracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
  }

  // ✅ Embed UI
  const embed = new EmbedBuilder()
    .setColor("#000000")
    .setTitle("🔀 대기열 셔플")
    .setDescription(`대기열의 **${queue.tracks.length}곡**이 무작위로 섞였습니다.`)
    .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

  return interaction.reply({ embeds: [embed] });
}
