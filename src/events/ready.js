import { Events, ActivityType } from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { loadVolumeStore } from "../db/volumeStore.js";
import { musicManager } from "../music/manager.js"; // 🎵 현재 재생중인 길드 계산용
dotenv.config();

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
   await loadVolumeStore();
  console.log("[VOLUME] volumeStore loaded");
  // MongoDB 연결
  mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log("[DB] 데이터베이스 연결됨"))
    .catch((err) => console.error("[DB] 연결 실패:", err));

  console.log(`✅ Logged in as ${client.user.tag}`);

  let number = 0;

  setInterval(() => {
    // 🎵 현재 음악 재생 중인 길드 수 계산
    const playingCount = Array.from(musicManager.values()).filter(
      (q) => q.playing && q.player
    ).length;

    const list = [
      `${client.guilds.cache.size}개의 서버에서 일 하는중`,
      `${playingCount}개의 서버에서 노래 재생중`,
    ];

    if (number >= list.length) number = 0;

    client.user.setActivity(list[number], {
      type: ActivityType.Playing,
    });

    number++;
  }, 10000);
}
