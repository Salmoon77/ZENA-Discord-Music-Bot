// src/events/interactionCreate.js
import { Events } from "discord.js";
import { handleMusicButton } from "../components/buttons.js";
import MusicChannel from "../models/Musicchannel.js";

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction, client) {
  try {
    // 🎵 버튼 처리
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("music_")) {
        return handleMusicButton(interaction);
      }
    }

    // 🎵 슬래시 명령어 처리
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction).catch(async (err) => {
        console.error("❌ 명령어 실행 오류:", err);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "⚠️ 명령어 실행 중 오류 발생!", ephemeral: true });
        } else {
          await interaction.reply({ content: "⚠️ 명령어 실행 중 오류 발생!", ephemeral: true });
        }
      });

      // ✅ 뮤직채널에서 실행된 경우 3초 뒤 응답 메시지 삭제
      const musicChannel = await MusicChannel.findOne({ channelId: interaction.channelId });
      if (musicChannel) {
        setTimeout(async () => {
          try {
            const replyMsg = await interaction.fetchReply();
            if (replyMsg) await replyMsg.delete().catch(() => {});
          } catch {
            // 이미 삭제되었거나 응답이 없는 경우 무시
          }
        }, 3000);
      }
    }
  } catch (err) {
    console.error("❌ Interaction 처리 오류:", err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "⚠️ 처리 중 오류 발생!", ephemeral: true });
    } else {
      await interaction.reply({ content: "⚠️ 처리 중 오류 발생!", ephemeral: true });
    }
  }
}
