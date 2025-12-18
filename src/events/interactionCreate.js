import { Events, EmbedBuilder } from "discord.js";
import { handleMusicButton } from "../components/buttons.js";
import MusicChannel from "../models/Musicchannel.js";
import VoteGuild from "../models/VoteGuild.js";
import { checkVote } from "../lib/checkVote.js";

const logChannelId = process.env.LOG_INTERACTION_CHANNEL_ID;

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
      // ✅ 길드 데이터 확인 (없으면 새로 생성)
      let guildData = await VoteGuild.findOne({ guildId: interaction.guild.id });
      if (!guildData) {
        guildData = new VoteGuild({ guildId: interaction.guild.id, voted: false });
        await guildData.save();
      }

      // ✅ 투표 여부 검증
      if (!guildData.voted) {
        const voted = await checkVote(interaction.user.id);
        if (!voted) {
          const embed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("❤️ 사랑이 필요합니다!")
            .setDescription(
              "[여기](https://koreanbots.dev/bots/1335614699064262666)에서 하트를 눌러주세요!!\n" +
              "서버 초대 후 최초 1회만 하트를 눌러주시면 계속해서 작동합니다!!\n" +
              "한디리 투표수가 초기화 되면 다시 눌러야 할수도 있어요...!!"
            );
          return interaction.reply({ embeds: [embed], flags: 64 });
        }

        // 최초 투표 성공 → DB에 기록
        guildData.voted = true;
        await guildData.save();
      }

      // ✅ 로그 전송
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const logEmbed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("📌 명령어 사용 로그")
        .setDescription(
          `👤 사용자: ${interaction.user.tag} (${interaction.user.id})\n` +
          `💬 명령어: \`/${interaction.commandName}\`\n` +
          `📺 채널: <#${interaction.channelId}>`
        )
        .setTimestamp();

      // ✅ 캐시 미포함 대비: fetch() 사용
      if (logChannelId) {
        try {
          const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
          if (logChannel) {
            await logChannel.send({ embeds: [logEmbed] });
          } else {
            console.warn(`⚠️ 로그 채널(${logChannelId})을 찾을 수 없습니다.`);
          }
        } catch (logErr) {
          console.error("❌ 로그 전송 중 오류:", logErr);
        }
      }

      // ✅ 실제 명령어 실행
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error("❌ 명령어 실행 오류:", err);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "⚠️ 명령어 실행 중 오류 발생!", flags: 64 });
        } else {
          await interaction.reply({ content: "⚠️ 명령어 실행 중 오류 발생!", flags: 64 });
        }
      }

      // ✅ 뮤직채널이면 3초 뒤 응답 삭제
      const musicChannel = await MusicChannel.findOne({ channelId: interaction.channelId });
      if (musicChannel) {
        setTimeout(async () => {
          try {
            const replyMsg = await interaction.fetchReply();
            if (replyMsg) await replyMsg.delete().catch(() => {});
          } catch {
            // 이미 삭제됐으면 무시
          }
        }, 3000);
      }
    }
  } catch (err) {
    console.error("❌ Interaction 처리 오류:", err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "⚠️ 처리 중 오류 발생!", flags: 64 });
    } else {
      await interaction.reply({ content: "⚠️ 처리 중 오류 발생!", flags: 64 });
    }
  }
}
