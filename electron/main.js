const { app, BrowserWindow, ipcMain, shell, globalShortcut, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execFile, spawn } = require('child_process');

let win;
const DEFAULT_MODEL = process.env.VOICE_OS_OLLAMA_MODEL || 'llama3.2:3b';

function createWindow() {
  win = new BrowserWindow({
    width: 1180, height: 760, minWidth: 900, minHeight: 620,
    backgroundColor: '#0b0d12', title: 'VOICE OS',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) return reject(new Error(stderr || error.message));
      resolve(stdout.trim());
    });
  });
}

function launchTarget(target) {
  return new Promise((resolve, reject) => {
    const child = spawn('cmd.exe', ['/c', 'start', '', target], { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', reject); child.unref(); resolve(`Opened ${target}`);
  });
}

function ollamaChat(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: DEFAULT_MODEL, stream: false, messages: [{ role: 'user', content: prompt }] });
    const req = http.request({ hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { const json = JSON.parse(data); if (json.error) return reject(new Error(json.error)); resolve(json.message?.content || ''); } catch { reject(new Error('Could not parse Ollama response')); } });
    });
    req.on('error', () => reject(new Error('Ollama is not running at http://127.0.0.1:11434')));
    req.write(body); req.end();
  });
}

ipcMain.handle('system:open', async (_, target) => { if (!target || typeof target !== 'string') throw new Error('Missing target'); return launchTarget(target.trim()); });
ipcMain.handle('system:open-path', async (_, target) => { const full = path.resolve(target); if (!fs.existsSync(full)) throw new Error(`Not found: ${target}`); const result = await shell.openPath(full); if (result) throw new Error(result); return `Opened ${full}`; });
ipcMain.handle('system:reveal', async (_, target) => { const full = path.resolve(target); if (!fs.existsSync(full)) throw new Error(`Not found: ${target}`); shell.showItemInFolder(full); return `Showing ${full}`; });
ipcMain.handle('system:power', async (_, action) => { const allowed = { lock: 'rundll32.exe user32.dll,LockWorkStation', sleep: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0' }; if (!allowed[action]) throw new Error('Unsupported system action'); await runPowerShell(allowed[action]); return action; });
ipcMain.handle('system:search-files', async (_, query) => { const safe = String(query || '').replace(/'/g, "''"); const home = process.env.USERPROFILE; const command = `Get-ChildItem -Path '${home}' -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*${safe}*' } | Select-Object -First 20 FullName,Length,LastWriteTime | ConvertTo-Json -Compress`; const raw = await runPowerShell(command); if (!raw) return []; const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [parsed]; });
ipcMain.handle('system:read-file', async (_, target) => { const full = path.resolve(target); if (!fs.existsSync(full)) throw new Error('File not found'); const stat = fs.statSync(full); if (!stat.isFile()) throw new Error('Not a file'); if (stat.size > 2000000) throw new Error('File is too large to read'); return fs.readFileSync(full, 'utf8'); });
ipcMain.handle('system:write-text-file', async (_, target, content) => { const full = path.resolve(target); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, String(content), 'utf8'); return `Saved ${full}`; });
ipcMain.handle('system:clipboard', async (_, text) => { clipboard.writeText(String(text || '')); return 'Copied to clipboard'; });

ipcMain.handle('ai:status', async () => ({ model: DEFAULT_MODEL, endpoint: 'http://127.0.0.1:11434', online: await new Promise(resolve => { const r = http.get('http://127.0.0.1:11434/api/tags', res => resolve(res.statusCode === 200)); r.on('error', () => resolve(false)); r.setTimeout(1500, () => { r.destroy(); resolve(false); }); }) }));
ipcMain.handle('ai:plan', async (_, request) => {
  const prompt = `You are VOICE OS, a Windows desktop assistant. Convert the user's request into JSON only. Return an array of executable actions in the original order. Allowed actions: open_app {target}, open_path {target}, search_files {query}, reveal_path {target}, lock_pc {}, sleep_pc {}, answer {text}. For common Windows apps, target may be chrome, msedge, notepad.exe, calc.exe, explorer.exe, cmd.exe, powershell.exe. For natural requests such as opening Downloads, use an absolute path based on the Windows user profile only if known from the request. Never invent destructive actions. If the request cannot be safely executed, return one answer action explaining why. User request: ${request}`;
  return ollamaChat(prompt);
});
ipcMain.handle('app:toggle-devtools', () => win.webContents.toggleDevTools());

app.whenReady().then(() => { createWindow(); globalShortcut.register('Control+Space', () => win?.webContents.send('voice:hotkey')); });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
