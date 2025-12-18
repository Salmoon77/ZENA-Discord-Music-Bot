import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import {
  ensureGuildQueue,
  connectToChannel,
  resolveTracks,
  playNext,
} from "../music/manager.js";
import { getShoukaku } from "../index.js";
import { clearIdleNotices } from "../music/manager.js";

export const data = new SlashCommandBuilder()
  .setName("재생")
  .setDescription("노래를 재생합니다.")
  .addStringOption((option) =>
    option
      .setName("제목")
      .setDescription("노래 제목, URL 또는 플레이리스트 URL")
      .setRequired(true)
  );

export async function execute(interaction) {
  const query = interaction.options.getString("제목");
  const guildId = interaction.guild.id;

  const queue1 = ensureGuildQueue(guildId);
  queue1.textChannelId = interaction.channel.id; // ✅ 메시지 채널 저장

  const member = interaction.member;
  const voiceChannel =
    member?.voice?.channel ??
    (member?.voice?.channelId
      ? interaction.guild.channels.cache.get(member.voice.channelId)
      : null);

  if (!voiceChannel) {
    return interaction.reply({
      content: "⚠️ 먼저 음성 채널에 들어가주세요!",
      ephemeral: true,
    });
  }

  const shoukaku = getShoukaku();
  const node =
    shoukaku.nodes.get("main") ||
    shoukaku.idleNodes?.[0] ||
    [...shoukaku.nodes.values()][0];

  if (!node) {
    return interaction.reply({
      content: "❌ 사용할 수 있는 Lavalink 노드가 없습니다.",
      ephemeral: true,
    });
  }

  const queue = ensureGuildQueue(guildId);

  // 3초 내 응답 예약
  await interaction.deferReply();

  // 플레이어가 없으면 접속
  if (!queue.player) {
    try {
      queue.player = await connectToChannel(
        guildId,
        voiceChannel.id,
        interaction.guild.shardId
      );
      queue.nodeName = node.name ?? "main";
    } catch (err) {
      console.error(err);
      return interaction.editReply({
        content: `❌ 채널 접속 실패: ${err.message}`,
      });
    }
  }

  // 트랙 검색
  const isUrl = /^https?:\/\//i.test(query);
  const tracks = await resolveTracks(node, query);

  if (!tracks.length) {
    return interaction.editReply({ content: "⚠️ 트랙을 찾을 수 없습니다." });
  }

  // ✅ URL이면 지금처럼 처리
  if (isUrl) {
    if (tracks.length > 1) {
      queue.tracks.push(...tracks);
      await interaction.editReply(
        `🎶 플레이리스트에서 **${tracks.length}곡**을 추가했습니다.`
      );
    } else {
      const track = tracks[0];
      queue.tracks.push(track);
      await interaction.editReply(
        `🎶 **${track.info?.title ?? "제목 없음"}** 추가됨`
      );
    }

    if (!queue.playing) await playNext(guildId).catch(console.error);
    return;
  }

  // ✅ 검색일 경우: 상위 10곡 리스트
  const top = tracks.slice(0, 10);

  const embed = new EmbedBuilder()
    .setTitle("🔎 검색 결과")
    .setDescription(
      top
        .map(
          (t, i) =>
            `\`\`${i + 1}\`\`  ${t.info.title} — ${t.info.author} (${Math.floor(
              t.info.length / 60000
            )}:${String(Math.floor((t.info.length % 60000) / 1000)).padStart(
              2,
              "0"
            )})`
        )
        .join("\n")
    )
    .setFooter({
      text: "아래 버튼을 눌러 원하는 곡을 선택하세요. (20초 제한)",
    });

  // 버튼 생성 (1~10 + 취소)
  const rows = [];
  for (let i = 0; i < 2; i++) {
    const row = new ActionRowBuilder();
    for (let j = 1; j <= 5; j++) {
      const num = i * 5 + j;
      if (num > top.length) break;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`choose_${num}`)
          .setLabel(num.toString())
          .setStyle(ButtonStyle.Primary)
      );
    }
    if (row.components.length) rows.push(row);
  }
  // 취소 버튼
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("cancel")
        .setLabel("취소")
        .setStyle(ButtonStyle.Danger)
    )
  );

  const msg = await interaction.editReply({ embeds: [embed], components: rows });

  // ✅ 버튼 인터랙션 수집
  const collector = msg.createMessageComponentCollector({
    time: 20000,
  });

  collector.on("collect", async (btn) => {
    if (btn.user.id !== interaction.user.id) {
      return btn.reply({ content: "⚠️ 명령어 실행자만 선택할 수 있습니다.", ephemeral: true });
    }

    if (btn.customId === "cancel") {
      await btn.update({ content: "❌ 선택이 취소되었습니다.", embeds: [], components: [] });
      collector.stop();
      return;
    }

    const choice = parseInt(btn.customId.split("_")[1], 10);
    const track = top[choice - 1];
    queue.tracks.push(track);

    await btn.update({
      content: `🎶 선택됨: **${track.info.title ?? "제목 없음"}**`,
      embeds: [],
      components: [],
    });
    await clearIdleNotices(guildId);

    if (!queue.playing) await playNext(guildId).catch(console.error);
    collector.stop();
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await interaction.editReply({
        content: "⌛ 시간 초과! 선택이 취소되었습니다.",
        embeds: [],
        components: [],
      });
    }
  });
}
