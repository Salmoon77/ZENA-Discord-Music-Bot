import { Events, EmbedBuilder, WebhookClient } from "discord.js";
import VoteGuild from "../models/VoteGuild.js";

const webhookClient = new WebhookClient({
  url: "https://discord.com/api/webhooks/1419132988448575639/q2YMII24ALAUMKXmUp6zOaAgoaZY1lA0beSNrDgyfiKN0ygrB_lEofBfG7vDUsdBOHt5"
});
const logchannel = "1414245498491113492";

export const name = Events.GuildDelete;
export const once = false;

export async function execute(guild, client) {
  // DB에서 서버 데이터 삭제
  try {
    await VoteGuild.findOneAndDelete({ guildId: guild.id });
  } catch (err) {
    console.error("GuildDelete DB 삭제 오류:", err);
  }

  const e1 = new EmbedBuilder()
    .setTitle("서버에서 추방 되었습니다")
    .setColor("#000000")
    .setDescription(`현재 서버수 : ${client.guilds.cache.size}`)
    .addFields({
      name: "서버정보",
      value: `서버이름 : ${guild.name}(${guild.id})\n서버인원 : ${guild.memberCount}`
    });

  client.channels.cache.get(logchannel)?.send({ embeds: [e1] });

  const embed = new EmbedBuilder()
    .setTitle("서버에서 추방되었습니다")
    .setColor("#000000");
  webhookClient.send({ embeds: [embed] });
}
