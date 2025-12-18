// src/events/guildCreate.js
import { EmbedBuilder, ChannelType, PermissionFlagsBits, WebhookClient } from "discord.js";

export const name = "guildCreate"; // 이벤트 이름
export const once = false;         // 여러 번 실행 가능

export async function execute(guild) {
    // 기본 텍스트 채널 찾기
    const defaultChannel = guild.channels.cache.find(
        (channel) =>
            channel.type === ChannelType.GuildText &&
            channel
                .permissionsFor(guild.members.me)
                ?.has(PermissionFlagsBits.SendMessages)
    );

    if (defaultChannel) {
        const embed = new EmbedBuilder()
            .setColor("#000000")
            .setTitle("🎵 고품질 음악봇 ZENA!")
            .setDescription(
                "안녕하세요! 저는 **제나**, 디스코드에서 최고의 음악 경험을 선사할 여러분들의 뮤직봇이에요. 🎧\n\n" +
                "🎶 **함께할 준비 되셨나요?**\n" +
                "몇 가지 간단한 명령어로 음악을 플레이하고, 재생목록을 관리하며, 여러분들을 음악으로 가득 채워드릴게요!\n\n" +
                "💡 **저는 이런 걸 할 수 있어요!**\n" +
                "- `/재생 [노래 제목 또는 링크]`로 원하는 곡을 바로 재생해요.\n" +
                "- `/중지` 명령어로 노래를 멈추고 정리할 수 있어요.\n" +
                "- `/뮤직채널`로 음악전용채널을 생성해 음악을 편하게 재생해보세요!\n\n" +
                "지금 바로 시작해볼까요? 뮤즈는 언제나 준비되어있어요! 🚀\n\n" +
                "현재 제나는 배타 기간으로 매우 불안정합니다 오류제보는 서포트서버 이용부탁드립니다."
            )
            .setThumbnail(
                "https://cdn.discordapp.com/attachments/1294501229258346550/1418944488889651240/d09d2648db99f46d197bfc4dbc265a95.jpg?ex=68cff688&is=68cea508&hm=3ece02731fcf3aebb67fd1bed19a8e7dd9ab08f303a2d097a13727e0e52bd095&"
            )
            .setFooter({
                text: "© 2024. Team.VITA, All rights reserved.",
                iconURL:
                    "https://cdn.discordapp.com/attachments/1292105481476898867/1292106836329103410/SmartSelect_20241005_142547_Chrome.jpg",
            });

        await defaultChannel.send({ embeds: [embed] });
    } else {
        console.log(`메시지를 보낼 수 있는 채널을 찾을 수 없습니다: ${guild.name}`);
    }
}
