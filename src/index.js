// src/index.js
import { Client, Collection, GatewayIntentBits, REST, Routes } from "discord.js";
import { Shoukaku, Connectors } from "shoukaku";
import { loadCommands } from "./lib/loader.js";
import nodes from "./config/nodeConfig.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import url from "url";
import chalk from "chalk"; // 🎨 색상 로그용
import { Events } from "discord.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// 🎨 MUSE ASCII 아트 로고
console.log(
  chalk.magentaBright.bold(`
███████╗███████╗███╗   ██╗ █████╗ 
╚══███╔╝██╔════╝████╗  ██║██╔══██╗
  ███╔╝ █████╗  ██╔██╗ ██║███████║
 ███╔╝  ██╔══╝  ██║╚██╗██║██╔══██║
███████╗███████╗██║ ╚████║██║  ██║
╚══════╝╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝
          🎵 Discord Music Bot 🎵
 `)
);

// Shoukaku 초기화
const shoukaku = new Shoukaku(
  new Connectors.DiscordJS(client),
  nodes,
  {
    resumable: true,
    resumableTimeout: 30,
    reconnectTries: 2
  }
);

// 🎵 Shoukaku 로그
shoukaku.on("ready", (name, resumed) => {
  console.log(chalk.green.bold(`✅ Shoukaku 노드 "${name}" 준비 완료 (재접속=${resumed})`));
});
shoukaku.on("error", (name, error) => {
  console.log(chalk.redBright.bold(`❌ Shoukaku 노드 "${name}" 오류 발생:`), error);
});
shoukaku.on("close", (name, code, reason) => {
  console.log(chalk.yellow.bold(`⚠️ Shoukaku 노드 "${name}" 연결 종료됨 → 코드=${code}, 사유=${reason}`));
});
shoukaku.on("disconnect", (name, players, moved) => {
  console.log(chalk.magenta.bold(`🔌 Shoukaku 노드 "${name}" 연결 해제됨 → 이동=${moved}, 플레이어=${players.size}`));
});
for (const node of shoukaku.nodes.values()) {
  node.on("error", (err) => console.log(chalk.red(`❌ [Shoukaku:Node] ${node.name} 에러:`), err));
}

// 안전망
process.on("unhandledRejection", (r) => {
  console.error(chalk.bgRed.white.bold("🚨 [UnhandledRejection]"), r);
});
process.on("uncaughtException", (e) => {
  console.error(chalk.bgRed.white.bold("🚨 [UncaughtException]"), e);
});

export function getShoukaku() {
  return shoukaku;
}
export { client };

// ✅ 이벤트 핸들러 
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

(async () => {
  try {
    const imports = await Promise.all(
      eventFiles.map(file =>
        import(url.pathToFileURL(path.join(eventsPath, file)))
      )
    );

    imports.forEach((event, i) => {
      const file = eventFiles[i];

      // ✅ 어떤 이벤트가 로드됐는지 출력
      console.log(
        chalk.cyanBright(
          `📌 이벤트 파일 로드: ${file} → ${event.name} (once=${event.once})`
        )
      );

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    });

    console.log(chalk.greenBright.bold(`✅ 총 ${eventFiles.length}개 이벤트 로드 완료`));
  } catch (err) {
    console.error(chalk.bgRed.white("❌ 이벤트 로드 실패:"), err);
  }
})();


// ✅ Slash 명령어 등록
client.once(Events.ClientReady, async () => {
  console.log(chalk.greenBright.bold(`🤖 로그인됨: ${client.user.tag}`));

  const commands = await loadCommands(client);
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log(chalk.blueBright("⏳ 슬래시 명령어 등록 중..."));
    await rest.put(
  Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
  { body: commands }
  );
    console.log(chalk.greenBright.bold("✅ 슬래시 명령어 등록 성공!"));
  } catch (error) {
    console.error(chalk.redBright("❌ 슬래시 명령어 등록 실패:"), error);
  }
});

client.login(process.env.DISCORD_TOKEN);
