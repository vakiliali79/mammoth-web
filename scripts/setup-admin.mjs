#!/usr/bin/env node
/**
 * Creates/updates the admin credentials in .env.
 *   npm run admin:setup
 * The password is only stored as a scrypt hash; a random session secret is
 * generated if none exists. Nothing is ever written to the repository.
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout, env, exit } from "node:process";
import { hashPassword } from "../src/lib/auth/password.mjs";

const ENV_FILE = new URL("../.env", import.meta.url);

async function ask(question, { hidden = false } = {}) {
  const rl = createInterface({ input: stdin, output: stdout, terminal: stdin.isTTY });
  if (hidden && stdin.isTTY) {
    // Do not echo the password.
    rl._writeToOutput = (s) => {
      if (s.includes(question)) stdout.write(s);
    };
  }
  const answer = await rl.question(question);
  rl.close();
  if (hidden && stdin.isTTY) stdout.write("\n");
  return answer.trim();
}

// Non-interactive use (CI/tests): ADMIN_SETUP_USERNAME / ADMIN_SETUP_PASSWORD.
const username = env.ADMIN_SETUP_USERNAME || (await ask("Admin username: "));
const password = env.ADMIN_SETUP_PASSWORD || (await ask("Admin password (min 10 characters): ", { hidden: true }));

if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) {
  console.error("✗ Username must be 3–40 characters: letters, digits, dot, dash or underscore.");
  exit(1);
}
if (password.length < 10) {
  console.error("✗ Password must be at least 10 characters.");
  exit(1);
}

let content = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
const set = (key, value) => {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  content = re.test(content) ? content.replace(re, line) : `${content.replace(/\n*$/, "\n")}${line}\n`;
};
const current = (key) => content.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim();

set("ADMIN_USERNAME", username);
set("ADMIN_PASSWORD_HASH", hashPassword(password));
if (!current("SESSION_SECRET") || current("SESSION_SECRET").length < 32) set("SESSION_SECRET", randomBytes(48).toString("hex"));

writeFileSync(ENV_FILE, content.replace(/^\n+/, ""));
chmodSync(ENV_FILE, 0o600);
console.log("✓ Admin credentials saved to .env (password stored as a scrypt hash).");
console.log("  Restart the app for the change to take effect.");
