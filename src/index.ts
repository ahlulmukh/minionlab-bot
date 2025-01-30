import chalk from "chalk";
import fs from "fs";
import { getRandomProxy, loadProxies } from "./classes/proxy";
import { SocketStream } from "./classes/ws";
import { logMessage, rl } from "./utils/logger";

async function main(): Promise<void> {
  console.log(
    chalk.cyan(`
░█▄█░▀█▀░█▀█░▀█▀░█▀█░█▀█
░█░█░░█░░█░█░░█░░█░█░█░█
░▀░▀░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀░▀
  By : El Puqus Airdrop
   github.com/ahlulmukh
 Use it at your own risk
  `)
  );

  const accounts = fs
    .readFileSync("accountsbot.txt", "utf8")
    .split("\n")
    .filter(Boolean);
  const count = accounts.length;

  const proxiesLoaded = loadProxies();
  if (!proxiesLoaded) {
    logMessage(null, null, "No Proxy. Using default IP", "debug");
  }

  let successful = 0;
  const socketStreams: SocketStream[] = [];

  for (let i = 0; i < count; i++) {
    console.log(chalk.white("-".repeat(85)));
    logMessage(i + 1, count, "Process", "debug");
    const [email, password] = accounts[i].split(":");
    const currentProxy = await getRandomProxy(i + 1, count);
    const socketStream = new SocketStream(email, password, currentProxy, i + 1, count);
    socketStreams.push(socketStream);

    try {
      await socketStream.login();
      await socketStream.waitUntilReady();
      successful++;
    } catch (err) {
      logMessage(i + 1, count, `Error: ${(err as any).message}`, "error");
    }
  }

  console.log(chalk.white("-".repeat(85)));
  logMessage(null, null, "All accounts are ready. Starting real-time point checking...", "success");

  socketStreams.forEach((stream) => {
    stream.startPinging();
  });

  rl.close();
}

main().catch((err) => {
  console.error(chalk.red("Error occurred:"), err);
  process.exit(1);
});