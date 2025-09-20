import { Events, ActivityType } from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  // MongoDB 연결
  mongoose
    .connect(process.env.MONGO_URL)
    .then(() => console.log("[DB] 데이터베이스 연결됨"))
    .catch((err) => console.error("[DB] 연결 실패:", err));

  console.log(`✅ Logged in as ${client.user.tag}`);
   let number = 0;
        setInterval(() => {
            const list = [`${client.guilds.cache.size}개의 서버에서 일`, "고품질 음악봇 제나"];
            if (number == list.length) number = 0;
            client.user.setActivity(list[number], {
                type: ActivityType.Playing,
            });
            number++;
        }, 10000);
}
