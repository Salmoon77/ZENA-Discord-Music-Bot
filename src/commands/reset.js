// src/commands/reset.js
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getShoukaku } from "../index.js";
import { musicManager } from "../music/manager.js";

export const data = new SlashCommandBuilder()
  .setName("초기화")
  .setDescription("대부분의 오류를 해결합니다.");

export async function execute(interaction) {
  const guildId = interaction.guild.id;
  const shoukaku = getShoukaku();

  try {
    // 1. Lavalink 연결 해제
    await shoukaku.leaveVoiceChannel(guildId).catch(() => {});

    // 2. 로컬 큐/플레이어 데이터 초기화
    musicManager.delete(guildId);

    // 3. 안내 Embed
    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("🛠️ 연결 초기화 완료")

    return interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    return interaction.reply({
      content: "⚠️ 초기화 중 오류가 발생했습니다.",
      flags: 64
    });
  }
}
