const fs = require("fs");
const path = require("path");
const { cwd } = require("process");

const args = process.argv.slice(2);

const currentDir = cwd();

for (const arg of args) {
  const dir = path.join(currentDir, arg);
  fs.rmSync(dir, { recursive: true, force: true });
}
