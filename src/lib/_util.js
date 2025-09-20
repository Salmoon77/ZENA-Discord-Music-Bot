export function ensureInVoice(interaction) {
const me = interaction.guild.members.me;
const user = interaction.member;
const userVc = user?.voice?.channelId;
if (!userVc) throw new Error("보이스 채널에 먼저 들어가 주세요.");
if (me?.voice?.channelId && me.voice.channelId !== userVc) throw new Error("봇과 같은 보이스 채널에 있어야 해요.");
return userVc;
}


export function parseVolume(input) {
const v = Number(input);
if (!Number.isFinite(v) || v < 1 || v > 100) throw new Error("볼륨은 1~100 사이여야 해요.");
return v;
}