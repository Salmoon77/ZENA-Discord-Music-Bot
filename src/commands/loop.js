import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { ensureInVoice } from "../lib/_util.js";
import { ensureGuildQueue } from "../music/manager.js";

export const data = new SlashCommandBuilder()
  .setName("반복")
  .setDescription("반복 모드 설정")
  .addStringOption(o =>
    o
      .setName("mode")
      .setDescription("off | track | queue")
      .setRequired(true)
      .addChoices(
        { name: "off", value: "off" },
        { name: "track", value: "track" },
        { name: "queue", value: "queue" }
      )
  );

export async function execute(interaction) {
  ensureInVoice(interaction);
  const q = ensureGuildQueue(interaction.guildId);
  const mode = interaction.options.getString("mode", true);

  // 숫자 루프 모드로 저장 (내부 로직용)
  const loopMap = { off: 0, track: 1, queue: 2 };
  q.loopMode = mode;      // 사람이 볼 문자열
  q.loop = loopMap[mode]; // 내부 로직용 숫자

  // ✅ Embed UI
  const embed = new EmbedBuilder()
    .setColor("#000000")
    .setTitle("🔁 반복 모드 변경")
    .setDescription(`현재 반복 모드가 \`${mode}\` 로 설정되었습니다.`)
    .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

  await interaction.reply({ embeds: [embed] });
}
