import { Events } from "discord.js";
import MusicChannel from "../models/Musicchannel.js";
import { resolveTracks, ensureGuildQueue, playNext, connectToChannel } from "../music/manager.js";
import { getShoukaku, client } from "../index.js";
import { updateMusicEmbed } from "../lib/updateMusicEmbed.js";
import { clearIdleNotices } from "../music/manager.js";

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message) {
  if (message.author.bot) return;

  const musicChannel = await MusicChannel.findOne({ channelId: message.channel.id });
  if (!musicChannel) return;

  const query = message.content.trim();
  if (!query) return;

  const guildId = message.guild.id;
  const queue = ensureGuildQueue(guildId);
  queue.textChannelId = message.channel.id;

  const member = message.member;
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    const warn = await message.reply("⚠️ 먼저 음성 채널에 들어가주세요!");
    setTimeout(() => warn.delete().catch(() => {}), 3000);
    setTimeout(() => message.delete().catch(() => {}), 3000);
    return;
  }

  try {
    const shoukaku = getShoukaku();
    const node = shoukaku.nodes.get("main") || [...shoukaku.nodes.values()][0];
    if (!node) return;

    if (!queue.player) {
      queue.player = await connectToChannel(guildId, voiceChannel.id, message.guild.shardId);
    }

    const tracks = await resolveTracks(node, query);
    if (!tracks.length) {
      const noTrack = await message.reply("❌ 해당 노래를 찾을 수 없습니다.");
      setTimeout(() => noTrack.delete().catch(() => {}), 3000);
      setTimeout(() => message.delete().catch(() => {}), 3000);
      return;
    }

    const isUrl = /^https?:\/\//.test(query);
    if (isUrl && tracks.length > 1) {
      queue.tracks.push(...tracks);
      const replyMsg = await message.reply(`🎶 플레이리스트에서 **${tracks.length}곡**을 추가했습니다.`);
      setTimeout(() => replyMsg.delete().catch(() => {}), 3000);
    } else {
      const track = tracks[0];
      queue.tracks.push(track);
      const replyMsg = await message.reply(`🎶 **${track.info.title}** 추가됨`);
      setTimeout(() => replyMsg.delete().catch(() => {}), 3000);
    }

    // ✅ 뮤직채널 임베드 즉시 갱신
    await updateMusicEmbed(client, guildId);
    await clearIdleNotices(guildId);

    if (!queue.playing) await playNext(guildId);
    setTimeout(() => message.delete().catch(() => {}), 3000);

  } catch (err) {
    console.error("❌ musicMessage 처리 오류:", err);
  }
}
