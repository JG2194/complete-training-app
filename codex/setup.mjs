#!/usr/bin/env node
// Public OAuth client only. No passwords, service keys or tokens belong here.
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const connection = Object.freeze({
  serverName: 'complete-training-dj',
  url: 'https://lbdqvqsysuagpzohllyj.supabase.co/functions/v1/ct-pilot/mcp',
  clientId: '9e13687a-659c-4f26-b148-781ad33846cb',
  callbackUrl: 'http://127.0.0.1:8751/callback/R3rIRgv_D0ht',
  callbackPort: 8751,
});
const block = `[mcp_servers.${connection.serverName}]
url = "${connection.url}"

[mcp_servers.${connection.serverName}.oauth]
client_id = "${connection.clientId}"
callback_url = "${connection.callbackUrl}"
callback_port = ${connection.callbackPort}
`;

export function configure(configPath) {
  const original = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
  if (original.includes(block)) return { changed: false, configPath };
  // Refuse to touch an existing differently configured entry, including quoted TOML keys.
  if (/^\s*\[\s*mcp_servers\s*\.\s*["']?complete-training-dj(?:["']?\s*[.\]])/m.test(original)
      || /^\s*["']?complete-training-dj["']?\s*=/m.test(original)) {
    throw new Error('An existing complete-training-dj entry differs. Review it in config.toml before continuing; nothing was overwritten.');
  }
  mkdirSync(dirname(configPath), { recursive: true });
  let backup;
  if (existsSync(configPath)) {
    backup = `${configPath}.ct-backup-${Date.now()}`;
    copyFileSync(configPath, backup);
  }
  writeFileSync(configPath, original.trimEnd() + '\n\n' + block, { mode: 0o600 });
  return { changed: true, configPath, backup };
}

export function findCodex() {
  const candidates = [process.env.CT_CODEX_BIN, 'codex',
    '/Applications/Codex.app/Contents/Resources/codex',
    '/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex'].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    if (!result.error && result.status === 0) return candidate;
  }
  throw new Error('Codex CLI was not found. Install the official @openai/codex CLI or set CT_CODEX_BIN to your installed Codex executable.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const configOnly = process.argv.includes('--configure-only');
    const binary = configOnly ? null : findCodex();
    const result = configure(join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'config.toml'));
    console.log(result.changed ? 'Complete Training MCP configuration added.' : 'Complete Training MCP is already configured.');
    if (result.backup) console.log(`Previous configuration backed up: ${result.backup}`);
    if (binary) {
      console.log('Sign in with your enrolled Google account and approve read access in the browser. No web ChatGPT chat is needed.');
      const login = spawnSync(binary, ['mcp', 'login', connection.serverName, '--scopes', 'openid,offline_access'], { stdio: 'inherit' });
      if (login.error || login.status !== 0) throw new Error('Login did not complete. Configuration is saved; rerun this script to retry.');
      console.log('Login completed. Reopen your local Codex project/chat if the MCP tools are not visible, then ask it to search your permitted reports.');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
