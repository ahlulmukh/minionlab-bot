import chalk from "chalk";
import fs from "fs";
import { getRandomProxy, loadProxies } from "./main/proxy.js";
import { SocketStream } from "./main/ws.js";
import { logMessage, rl } from "./utils/logger.js";

async function main() {
  console.log(
    chalk.cyan(`
 __  __ ___ _  _ ___ ___  _  _   _      _   ___
|  \\/  |_ _| \\| |_ _/ _ \\| \\| | | |    /_\\ | _ )
| |\\/| || || .\` || | (_) | .\` | | |__ / _ \\| _ \\
|_|  |_|___|_|\\_|___\\___/|_|\\_| |____/_/ \\_\\___/
        Minion Lab Auto Running
          By : El Puqus Airdrop
         github.com/ahlulmukh
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
  const socketStreams = [];

  for (let i = 0; i < count; i++) {
    console.log(chalk.white("-".repeat(85)));
    logMessage(i + 1, count, "Process", "debug");
    const [email, password] = accounts[i].split(":");
    const currentProxy = await getRandomProxy(i + 1, count);
    const socketStream = new SocketStream(
      email,
      password,
      currentProxy,
      i + 1,
      count
    );
    socketStreams.push(socketStream);

    try {
      await socketStream.login();
      await socketStream.waitUntilReady();
      successful++;
    } catch (err) {
      logMessage(i + 1, count, `Error: ${err.message}`, "error");
    }
  }

  console.log(chalk.white("-".repeat(85)));
  logMessage(
    null,
    null,
    "All accounts are ready. Starting real-time point checking...",
    "success"
  );

  socketStreams.forEach((stream) => {
    stream.startPinging();
  });

  rl.close();
}

main().catch((err) => {
  console.error(chalk.red("Error occurred:"), err);
  process.exit(1);
});
