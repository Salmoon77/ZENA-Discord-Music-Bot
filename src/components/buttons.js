// src/components/buttons.js
import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from "discord.js";
import { togglePause, skipCurrent, stop, getQueue, toggleLoop } from "../music/manager.js";

export function musicControlButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_pause")
      .setLabel("⏯️ 일시정지/재개")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("music_skip")
      .setLabel("⏭️ 스킵")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("music_stop")
      .setLabel("⏹️ 정지")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("music_loop")
      .setLabel("🔁 반복")
      .setStyle(ButtonStyle.Success)
  );
}

/**
 * 버튼 클릭 핸들러
 */
export async function handleMusicButton(interaction) {
  const guildId = interaction.guildId;
  const queue = getQueue(guildId);

  if (!queue || !queue.player) {
    return interaction.reply({ content: "⚠️ 현재 재생 중인 음악이 없습니다.", ephemeral: true });
  }

  try {
    if (interaction.customId === "music_pause") {
      const result = togglePause(guildId);
      return interaction.reply({ content: result, ephemeral: true });
    }

    if (interaction.customId === "music_skip") {
      const result = skipCurrent(guildId);
      return interaction.reply({ content: result, ephemeral: true });
    }

    if (interaction.customId === "music_stop") {
      await stop(guildId);
      return interaction.reply({ content: "🛑 음악을 정지하고 큐를 비웠습니다.", ephemeral: true });
    }

    if (interaction.customId === "music_loop") {
      const result = toggleLoop(guildId);
      return interaction.reply({ content: result, ephemeral: true });
    }
  } catch (err) {
    console.error("❌ 버튼 처리 오류:", err);
    return interaction.reply({ content: "❌ 버튼 처리 중 오류가 발생했습니다.", ephemeral: true });
  }
}
