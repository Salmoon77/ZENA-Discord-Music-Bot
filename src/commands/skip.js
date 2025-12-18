// src/commands/skip.js
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { skipCurrent, trimQueueToIndex } from "../music/manager.js";
import { updateMusicEmbed } from "../lib/updateMusicEmbed.js";

export const data = new SlashCommandBuilder()
  .setName("스킵")
  .setDescription("현재 곡을 스킵합니다. 번호를 지정하면 해당 번호 곡까지 스킵합니다.")
  .addIntegerOption(opt =>
    opt
      .setName("번호")
      .setDescription("스킵해서 이동할 곡 번호")
      .setRequired(false)
      .setMinValue(1)
  );

export async function execute(interaction) {
  try {
    const guildId = interaction.guild.id;
    const targetIndex = interaction.options.getInteger("번호"); // 없으면 null

    // 번호가 있으면: 그 번호 곡이 나오도록 대기열 앞부분 제거
    if (targetIndex !== null) {
      const trimmed = trimQueueToIndex(guildId, targetIndex);

      if (typeof trimmed === "string" && trimmed.startsWith("⚠️")) {
        return interaction.reply({ content: trimmed, flags: 64 });
      }
    }

    // 기본: 1곡 스킵 (또는 위에서 잘라낸 뒤 현재곡 스킵해서 점프)
    const result = skipCurrent(guildId);

    if (typeof result === "string" && result.startsWith("⚠️")) {
      return interaction.reply({ content: result, flags: 64 });
    }

    const embed = new EmbedBuilder()
      .setTitle("⏭️ 트랙 스킵")
      .setDescription(
        targetIndex === null
          ? "현재 곡을 건너뛰었습니다."
          : `**${targetIndex}번** 곡으로 이동했습니다.`
      )
      .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

    await updateMusicEmbed(interaction.client, guildId);
    return interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error("❌ skip 실행 중 오류:", err);
    return interaction.reply({
      content: "❌ 스킵 중 오류가 발생했습니다.",
      flags: 64,
    });
  }
}
