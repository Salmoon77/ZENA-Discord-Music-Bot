// src/lib/updateMusicEmbed.js
import { EmbedBuilder } from "discord.js";
import MusicChannel from "../models/Musicchannel.js";
import { musicManager } from "../music/manager.js";
import { musicControlButtons } from "../components/buttons.js";

export async function updateMusicEmbed(client, guildId) {
  const queue = musicManager.get(guildId);
  const musicChannel = await MusicChannel.findOne({ guildId });
  if (!musicChannel) return;

  const channel = client.channels.cache.get(musicChannel.channelId);
  if (!channel) return;

  let message;
  try {
    message = await channel.messages.fetch(musicChannel.messageId);
  } catch {
    const newEmbed = new EmbedBuilder()
      .setColor("#000000")
      .setTitle("뮤직 채널 초기화")
      .setDescription("재생 중인 노래가 없습니다.");
    message = await channel.send({ embeds: [newEmbed] });
    musicChannel.messageId = message.id;
    await musicChannel.save();
  }

  if (!queue || !queue.current) {
    const embed = new EmbedBuilder()
      .setColor("000000")
      .setTitle("ZENA 뮤직채널")
      .setDescription("현재 재생 중인 노래가 없습니다.")
      .setThumbnail(`https://cdn.discordapp.com/attachments/1294501229258346550/1418944488889651240/d09d2648db99f46d197bfc4dbc265a95.jpg?ex=68cff688&is=68cea508&hm=3ece02731fcf3aebb67fd1bed19a8e7dd9ab08f303a2d097a13727e0e52bd095&`)
      .addFields({ name: `\`\`\`서포트서버\`\`\``, value: `🏠 [초대링크](https://discord.gg/RfGwkc6tAE)`, inline: true })
      .addFields({ name: `\`\`\`한디리\`\`\``, value: `♥️ [하트](https://koreanbots.dev/bots/1274377980080164920)`, inline: true })
      .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });
    await message.edit({ embeds: [embed], components: [] });
  } else {
    const current = queue.current.info;
    let queueText = "";
    for (let i = 0; i < queue.tracks.length; i++) {
      const line = `**${i + 1}.** ${queue.tracks[i].info.title}\n`;
      if ((queueText + line).length > 1500) {
        queueText += `...외 ${queue.tracks.length - i}곡`;
        break;
      }
      queueText += line;
    }

    const embed = new EmbedBuilder()
      .setColor("#000000")
      .setTitle(`🎶 ${current.title}`)
      .setDescription(queueText || "대기열이 없습니다.")
      .setImage(`https://img.youtube.com/vi/${current.identifier}/mqdefault.jpg`)
      .setFooter({ text: "© 2024. Team.VITA, All rights reserved." });

    await message.edit({ embeds: [embed], components: [musicControlButtons()] });
  }
}
