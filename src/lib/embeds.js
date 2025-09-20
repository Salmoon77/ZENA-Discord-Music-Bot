import { EmbedBuilder } from "discord.js";


export const baseColor = "000000";


export function nowPlayingEmbed(track, guildQueue) {
const e = new EmbedBuilder()
.setColor(baseColor)
.setTitle("🎶 Now Playing")
.setDescription(`[${track.info.title}](${track.info.uri || track.info.url || track.info.identifier})`)
.addFields(
{ name: "채널", value: track.info.author ?? "Unknown", inline: true },
{ name: "길이", value: formatDuration(track.info.length), inline: true },
{ name: "볼륨", value: `${guildQueue.volume}%`, inline: true },
{ name: "반복", value: guildQueue.loopMode, inline: true },
{ name: "대기열", value: `${guildQueue.tracks.length}곡`, inline: true }
);
return e;
}


export function queueEmbed(guildQueue) {
  const e = new EmbedBuilder()
    .setColor(baseColor)
    .setTitle("📜 대기열");

  if (!guildQueue.tracks.length && !guildQueue.current) {
    return e.setDescription("⚠️ 현재 대기열이 비어있습니다.");
  }

  let desc = "";

  // 🎵 현재 재생 중
  if (guildQueue.current) {
    desc += `**🎶 지금 재생 중:**\n` +
            `▶️ **${guildQueue.current.info.title}**` +
            ` \`(${formatDuration(guildQueue.current.info.length)})\`\n\n`;
  }

  // 📜 다음 곡들 (최대 15곡만 표시)
  if (guildQueue.tracks.length) {
    const lines = guildQueue.tracks
      .slice(0, 15)
      .map(
        (t, i) =>
          `**${i + 1}.** ${t.info.title} \`(${formatDuration(t.info.length)})\``
      );
    desc += `**📑 다음 대기열:**\n${lines.join("\n")}`;

    // ✅ 남은 곡이 있을 때만 표시
    const remaining = guildQueue.tracks.length - 15;
    if (remaining > 0) {
      desc += `\n...그리고 ${remaining}곡 더 있음`;
    }
  }

  // 🔁 반복 모드 표시
  let loopText = "반복 없음";
  if (guildQueue.loopMode === "track") loopText = "현재 곡 반복 🔂";
  else if (guildQueue.loopMode === "queue") loopText = "대기열 반복 🔁";

  return e.setDescription(desc).setFooter({
    text: `총 ${guildQueue.tracks.length + (guildQueue.current ? 1 : 0)}곡 ｜ ${loopText}`,
  });
}


export function formatDuration(ms = 0) {
const s = Math.floor(ms / 1000);
const h = Math.floor(s / 3600);
const m = Math.floor((s % 3600) / 60);
const sec = s % 60;
return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}