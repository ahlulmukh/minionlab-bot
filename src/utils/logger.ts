import chalk from "chalk";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const prompt = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};
//

export function logMessage(
  accountNum: number | null = null,
  total: number | null = null,
  message: string = "",
  messageType: any = "info"
) {
  const now = new Date();
  const timestamp = now
    .toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\./g, ":")
    .replace(/, /g, " ");
  const accountStatus = accountNum && total ? `[${accountNum}/${total}] ` : "";

  let logText;
  switch (messageType) {
    case "success":
      logText = chalk.green(`[✓] ${message}`);
      break;
    case "error":
      logText = chalk.red(`[-] ${message}`);
      break;
    case "process":
      logText = chalk.yellow(`[!] ${message}`);
      break;
    case "debug":
      logText = chalk.blue(`[~] ${message}`);
      break;
    default:
      logText = chalk.white(`[?] ${message}`);
  }

  console.log(
    `${chalk.white("[")}${chalk.dim(timestamp)}${chalk.white(
      "]"
    )} ${accountStatus}${logText}`
  );
}



export { rl };

