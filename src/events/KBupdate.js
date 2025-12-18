// import { Events, REST, Routes } from "discord.js";
// import { Koreanbots } from "koreanbots";

// const koreanbots = new Koreanbots({
//   api: {
//     token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEzMzU2MTQ2OTkwNjQyNjI2NjYiLCJpYXQiOjE3NTgzNzc3MDN9.D2iOSLwbkm17zgfYGJ-kWP8DDEtg9l8aM_X3PpaSarPNyNJrCs2SkzS-dZz4kk46o5v7idUWXFFSSwamEIODrEq2XiowsavyVfoEGUbFXNY_Hl0LRH8ULBRnbNVAnBX6hXULso4SDKu9G1zrnGkVCxcUlhP6knZk0QuZ-T9PGw0"
//   },
//   clientID: "1335614699064262666"
// });

// const kbLogChannel = "1419133617665347644";

// async function updateServers(client) {
//   try {
//     const res = await koreanbots.mybot.update({
//       servers: client.guilds.cache.size,
//       shards: client.shard?.count
//     });
//     client.channels.cache
//       .get(kbLogChannel)
//       ?.send("서버 수를 정상적으로 업데이트하였습니다!\n반환된 정보:" + JSON.stringify(res));
//   } catch (err) {
//     console.error("❌ Koreanbots 업데이트 오류:", err);
//   }
// }

// export const name = Events.ClientReady;
// export const once = true;

// export async function execute(client) {
//   updateServers(client);
//   setInterval(() => updateServers(client), 60000);
// }
