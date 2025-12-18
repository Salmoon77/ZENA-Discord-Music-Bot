// src/index.js
import { Client, Collection, GatewayIntentBits, REST, Routes, Events } from "discord.js";
import { Shoukaku, Connectors } from "shoukaku";
import { loadCommands } from "./lib/loader.js";
import nodes from "./config/nodeConfig.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import url from "url";
import chalk from "chalk";

import { saveQueues } from "./music/manager.js";
import { reconnectPlayers } from "./music/reconnect.js"; // ✅ 재시작 복구 실행

dotenv.config();

// ✅ 클라이언트 생성
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});
client.commands = new Collection();

// 🎨 MUSE 로고 출력
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

// ✅ Shoukaku 초기화
const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
  resume: true,
  resumeTimeout: 300,
  resumeByLibrary: true,
  reconnectTries: 5,
  reconnectInterval: 5,
});

// ✅ 내보내기
export function getShoukaku() {
  return shoukaku;
}
export { client };

/* =========================================================
 * 1) leaveVoiceChannel 강제 스택 트레이스 패치 (범인 100% 추적)
 * ========================================================= */
if (!shoukaku.__leavePatched) {
  shoukaku.__leavePatched = true;
  const origLeave = shoukaku.leaveVoiceChannel.bind(shoukaku);
  shoukaku.leaveVoiceChannel = async (guildId) => {
    //console.warn(new Error(`[FORCE-LEAVE-TRACE] guild=${guildId}`).stack);
    return origLeave(guildId);
  };
  console.log(chalk.yellowBright("🧷 Patched: shoukaku.leaveVoiceChannel trace enabled"));
}

/* =========================================================
 * 2) 프로세스 종료 시 재생상태 저장 (PM2/재시작 대비)
 * ========================================================= */
let _shuttingDown = false;
async function gracefulShutdown(signal) {
  if (_shuttingDown) return;
  _shuttingDown = true;

  try {
    console.log(chalk.yellowBright(`🛑 [${signal}] 종료 감지 → 현재 재생 상태 저장 중...`));
    saveQueues();
    console.log(chalk.greenBright("✅ queueBackup.json 저장 완료"));
  } catch (e) {
    console.error(chalk.redBright("❌ 종료 저장 실패:"), e);
  } finally {
    // 약간 대기 후 종료(파일 flush 보장)
    setTimeout(() => process.exit(0), 300);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("beforeExit", () => {
  try {
    saveQueues();
  } catch {}
});

// ✅ 에러 안전망
process.on("unhandledRejection", (r) =>
  console.error(chalk.bgRed.white.bold("🚨 [UnhandledRejection]"), r)
);
process.on("uncaughtException", (e) =>
  console.error(chalk.bgRed.white.bold("🚨 [UncaughtException]"), e)
);

/* =========================================================
 * 3) Shoukaku 이벤트
 * ========================================================= */
shoukaku.on("ready", async (name, resumed) => {
  const node = shoukaku.nodes.get(name);
  console.log(`✅ 노드 "${name}" 준비됨 (재접속=${resumed})`);
  if (node) {
    await node.rest.updateSession(true, 300).catch(() => {});
    console.log("🧠 Lavalink 세션 재개 활성화 완료");
  }
});

shoukaku.on("playerResumed", (player) => {
  console.log(`🎶 [RESUMED] ${player.guildId}의 플레이어 복귀`);
});

shoukaku.on("error", (name, error) => {
  console.log(chalk.redBright.bold(`❌ Shoukaku 노드 "${name}" 오류:`), error);
});

shoukaku.on("close", (name, code, reason) => {
  console.log(chalk.yellow.bold(`⚠️ Shoukaku 노드 "${name}" 종료 → 코드=${code}, 사유=${reason}`));
});

shoukaku.on("disconnect", (name, players, moved) => {
  console.log(
    chalk.magenta.bold(`🔌 Shoukaku 노드 "${name}" 연결 해제 (이동=${moved}, 플레이어=${players.size})`)
  );
});

// ✅ 노드별 에러 로그
for (const node of shoukaku.nodes.values()) {
  node.on("error", (err) => console.log(chalk.red(`❌ [Shoukaku:Node ${node.name}]`), err));
}

/* =========================================================
 * 4) Discord Ready: 슬래시 등록 + 재시작 복구 실행
 * ========================================================= */
client.once(Events.ClientReady, async () => {
  console.log(chalk.greenBright.bold(`🤖 로그인됨: ${client.user.tag}`));

  // 🎵 슬래시 명령어 등록
  try {
    console.log(chalk.blueBright("⏳ 슬래시 명령어 등록 중..."));
    const commands = await loadCommands(client);
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
    console.log(chalk.greenBright.bold("✅ 슬래시 명령어 등록 성공!"));
  } catch (error) {
    console.error(chalk.redBright("❌ 슬래시 명령어 등록 실패:"), error);
  }

  // ✅ 재시작 복구: Ready 이후 한 번 실행
  try {
    console.log(chalk.blueBright("🔁 재시작 복구(reconnectPlayers) 시작..."));
    await reconnectPlayers();
    console.log(chalk.greenBright("✅ 재시작 복구 시도 완료"));
  } catch (e) {
    console.error(chalk.redBright("❌ 재시작 복구 실패:"), e);
  }
});

/* =========================================================
 * 5) 이벤트 핸들러 로드
 * ========================================================= */
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

(async () => {
  try {
    const imports = await Promise.all(
      eventFiles.map((file) => import(url.pathToFileURL(path.join(eventsPath, file))))
    );
    imports.forEach((event, i) => {
      const file = eventFiles[i];
      console.log(chalk.cyanBright(`📌 이벤트 로드: ${file} → ${event.name} (once=${event.once})`));
      if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
      else client.on(event.name, (...args) => event.execute(...args, client));
    });
    console.log(chalk.greenBright.bold(`✅ 총 ${eventFiles.length}개 이벤트 로드 완료`));
  } catch (err) {
    console.error(chalk.bgRed.white("❌ 이벤트 로드 실패:"), err);
  }
})();

// ✅ 봇 로그인
client.login(process.env.DISCORD_TOKEN);
