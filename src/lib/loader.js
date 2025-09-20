import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  const commands = [];
  const foldersPath = path.join(__dirname, "../commands");
  const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(foldersPath, file);
    const command = await import(url.pathToFileURL(filePath));

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data.toJSON());
    } else {
      console.warn(`⚠️ ${file} 은 data 또는 execute export 가 없습니다.`);
    }
  }
  return commands;
}
