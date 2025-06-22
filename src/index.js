import chalk from "chalk";
import fs from "fs";
import ProxyManager from "./main/proxy.js";
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

  if (!fs.existsSync("accounts.txt")) {
    console.log(chalk.red("accounts.txt file not found!"));
    console.log(
      chalk.yellow("Create accounts.txt with format: email:password")
    );
    process.exit(1);
  }

  const accounts = fs
    .readFileSync("accounts.txt", "utf8")
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => {
      const [email, password] = line.trim().split(":");
      return { email, password };
    });

  if (accounts.length === 0) {
    console.log(chalk.red("No accounts found in accounts.txt"));
    process.exit(1);
  }

  const count = accounts.length;
  const proxyManager = new ProxyManager();
  const proxiesLoaded = proxyManager.loadProxies();
  if (!proxiesLoaded) {
    logMessage(null, null, "No Proxy. Using default IP", "debug");
  }

  let successful = 0;
  const socketStreams = [];

  for (let i = 0; i < count; i++) {
    const account = accounts[i];
    console.log(chalk.white("-".repeat(85)));
    logMessage(i + 1, count, "Process", "debug");
    const currentProxy = await proxyManager.getRandomProxy(i + 1, count);
    const socketStream = await SocketStream.create(
      account.email,
      account.password,
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
