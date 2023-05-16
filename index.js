#!/usr/bin/env node

const spawn = require("child_process").spawn;

const tsx = (command) => {
  const [filePath, ...others] = command.split(" ");
  const pkgFile = path.resolve(__dirname, "./src/", filePath);
  const fixCommand = [pkgFile, ...others].join(" ");
  return spawn(`npx tsx ${fixCommand}`, {
    stdio: "inherit",
    shell: true,
  });
};

tsx("./exec");
