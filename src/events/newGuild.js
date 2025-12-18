import { Events, EmbedBuilder, WebhookClient } from "discord.js";
import VoteGuild from "../models/VoteGuild.js";

const webhookClient = new WebhookClient({
  url: "https://discord.com/api/webhooks/1419132988448575639/q2YMII24ALAUMKXmUp6zOaAgoaZY1lA0beSNrDgyfiKN0ygrB_lEofBfG7vDUsdBOHt5"
});
const logchannel = "1414245498491113492";

export const name = Events.GuildCreate;
export const once = false;

export async function execute(guild, client) {
  // DB에 서버 데이터 저장
  try {
    await VoteGuild.findOneAndUpdate(
      { guildId: guild.id },
      { guildId: guild.id, voted: false },
      { upsert: true }
    );
  } catch (err) {
    console.error("GuildCreate DB 저장 오류:", err);
  }

  const e1 = new EmbedBuilder()
    .setTitle("서버에 초대 되었습니다.")
    .setColor("#000000")
    .setDescription(`현재 서버수 : ${client.guilds.cache.size}`)
    .addFields({
      name: "서버정보",
      value: `서버이름 : ${guild.name}(${guild.id})\n서버인원 : ${guild.memberCount}`
    });

  client.channels.cache.get(logchannel)?.send({ embeds: [e1] });

  const embed = new EmbedBuilder()
    .setTitle("새로운 서버에 초대되었습니다.")
    .setColor("#000000");
  webhookClient.send({ embeds: [embed] });
}
