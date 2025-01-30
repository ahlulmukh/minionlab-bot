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

export function logMessage(
  accountNum: number | null = null,
  total: number | null = null,
  message: string = "",
  messageType: string = "info"
): void {
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  const accountStatus = accountNum && total ? `${accountNum}/${total}` : "";

  const colors: { [key: string]: chalk.Chalk } = {
    info: chalk.white,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    process: chalk.cyan,
    debug: chalk.magenta,
  };

  const logColor = colors[messageType] || chalk.white;
  console.log(
    `${chalk.white("[")}${chalk.dim(timestamp)}${chalk.white("]")} ` +
      `${chalk.white("[")}${chalk.yellow(accountStatus)}${chalk.white("]")} ` +
      `${logColor(message)}`
  );
}

export { rl };

