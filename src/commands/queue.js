import { SlashCommandBuilder } from "discord.js";
import { ensureGuildQueue, getQueue } from "../music/manager.js";
import { queueEmbed } from "../lib/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("대기열")
  .setDescription("현재 음악 대기열을 확인합니다.");

export async function execute(interaction) {
  if (!interaction.inGuild()) {
    return interaction.reply({
      content: "⚠️ 서버에서만 사용 가능합니다.",
      ephemeral: true,
    });
  }

  const guildId = interaction.guildId;
  const q = getQueue(guildId) ?? ensureGuildQueue(guildId);

  const embed = queueEmbed(q); // lib/embeds.js 활용

  await interaction.reply({ embeds: [embed] });
}
