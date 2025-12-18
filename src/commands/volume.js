// src/commands/volume.js
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { musicManager } from "../music/manager.js";     
import { setGuildVolume } from "../music/setVolume.js";  

export const data = new SlashCommandBuilder()
  .setName("볼륨")
  .setDescription("노래 볼륨을 1~100으로 설정합니다.")
  .addIntegerOption(opt =>
    opt
      .setName("value")
      .setDescription("1~100")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  );

export async function execute(interaction) {
  const value = interaction.options.getInteger("value", true);
  const guildId = interaction.guildId;

  const queue = musicManager.get(guildId);
  if (!queue || !queue.player) {
    return interaction.reply({
      ephemeral: true,
      content: "현재 재생중인 노래가 없습니다.",
    });
  }

  const ok = await setGuildVolume(guildId, value);

  if (!ok) {
    return interaction.reply({
      ephemeral: true,
      content: "볼륨 변경 실패",
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("🔊 볼륨 설정 완료")
    .setDescription(`현재 볼륨: **${value}** / 100`)
    .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

  return interaction.reply({ embeds: [embed] });
}
