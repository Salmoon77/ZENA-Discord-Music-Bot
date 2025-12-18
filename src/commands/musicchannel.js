import { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } from "discord.js";
import MusicChannel from "../models/Musicchannel.js";

export const data = new SlashCommandBuilder()
  .setName("뮤직채널")
  .setDescription("뮤직 전용 채널을 생성합니다.");

export async function execute(interaction) {
  const guild = interaction.guild;

  // 권한 확인
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({ content: "❌ 채널 생성 권한이 없습니다!", ephemeral: true });
  }
  if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    return interaction.reply({ content: "❌ 봇에게 채널 생성 권한이 없습니다!", ephemeral: true });
  }
  if (!interaction.member.voice.channel) {
    return interaction.reply({ content: "❌ 음성 채널에 접속해야 합니다!", ephemeral: true });
  }

  // 기존 뮤직채널 확인 및 삭제
  const existing = await MusicChannel.findOne({ guildId: guild.id });
  if (existing) {
    const oldChannel = guild.channels.cache.get(existing.channelId);
    if (oldChannel) {
      try {
        await oldChannel.delete("새 뮤직채널 생성 요청으로 기존 채널 삭제");
      } catch (err) {
        console.error("❌ 기존 채널 삭제 실패:", err);
      }
    }
    await MusicChannel.deleteOne({ guildId: guild.id });
  }

  // 새 채널 생성
  const channel = await guild.channels.create({
    name: "🎵𝐙𝐄𝐍𝐀",
    type: 0,
    topic: "여기에 노래 제목을 입력하면 제나가 불러줄게요!"
  });

  const embed = new EmbedBuilder()
    .setTitle("🎵 뮤직 채널 부팅중..")
    .setDescription("노래 제목 입력시 작동됩니다..!");

  const msg = await channel.send({ embeds: [embed] });

  // DB 저장
  await MusicChannel.create({ guildId: guild.id, channelId: channel.id, messageId: msg.id });

  return interaction.reply({ content: `🎵 ${channel} 채널이 새로 생성되었습니다!`, ephemeral: true });
}
