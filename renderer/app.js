const input = document.getElementById('input');
const send = document.getElementById('send');
const mic = document.getElementById('mic');
const micTop = document.getElementById('micTop');
const messages = document.getElementById('messages');
const mode = document.getElementById('mode');

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;

function addMessage(role, text) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.innerHTML = `<div class="label">${role === 'user' ? 'You' : 'VOICE OS'}</div><div class="bubble"></div>`;
  el.querySelector('.bubble').textContent = text;
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
  return el.querySelector('.bubble');
}

function say(text) {
  addMessage('assistant', text);
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }
}

function lower(s) { return s.toLowerCase().trim(); }

async function executeCommand(raw) {
  const q = lower(raw);
  const home = '\\' + '\\' + 'USERPROFILE';
  try {
    if (/^(open|launch|start) (chrome|google chrome)$/.test(q)) return await voiceOS.open('chrome');
    if (/^(open|launch|start) (edge|microsoft edge)$/.test(q)) return await voiceOS.open('msedge');
    if (/^(open|launch|start) (notepad|text editor)$/.test(q)) return await voiceOS.open('notepad.exe');
    if (/^(open|launch|start) (calculator|calc)$/.test(q)) return await voiceOS.open('calc.exe');
    if (/^(open|launch|start) (file explorer|explorer|files)$/.test(q)) return await voiceOS.open('explorer.exe');
    if (/^(open|launch|start) (terminal|cmd|command prompt)$/.test(q)) return await voiceOS.open('cmd.exe');
    if (/^(open|launch|start) (powershell)$/.test(q)) return await voiceOS.open('powershell.exe');
    if (/open (my )?desktop$/.test(q)) return await voiceOS.openPath(`${home}\\Desktop`);
    if (/open (my )?downloads?$/.test(q)) return await voiceOS.openPath(`${home}\\Downloads`);
    if (/open (my )?documents?$/.test(q)) return await voiceOS.openPath(`${home}\\Documents`);
    if (/open (my )?pictures?$/.test(q)) return await voiceOS.openPath(`${home}\\Pictures`);
    if (/open (my )?videos?$/.test(q)) return await voiceOS.openPath(`${home}\\Videos`);
    if (/lock (the )?(computer|pc|windows)/.test(q)) return await voiceOS.power('lock');
    if (/sleep (the )?(computer|pc|windows)/.test(q)) return await voiceOS.power('sleep');

    const find = q.match(/^(find|search for|locate) (.+?)( files?)?$/);
    if (find) {
      const results = await voiceOS.searchFiles(find[2]);
      if (!results.length) return `I couldn't find anything matching “${find[2]}”.`;
      const lines = results.slice(0, 10).map(x => x.FullName || x.fullName).join('\n');
      return `I found ${results.length} matching item(s):\n${lines}`;
    }

    const openPath = raw.match(/^(?:open|launch)\s+([A-Za-z]:[\\/].+)$/i);
    if (openPath) return await voiceOS.openPath(openPath[1]);

    const revealPath = raw.match(/^(?:show|reveal)\s+([A-Za-z]:[\\/].+)$/i);
    if (revealPath) return await voiceOS.reveal(revealPath[1]);

    if (/^(copy|copy this) to clipboard$/.test(q)) {
      await voiceOS.clipboard(input.value);
      return 'Copied the current text to your clipboard.';
    }

    if (/^hello|^hi\b|^hey\b/.test(q)) return 'Hi. I am ready. Tell me what you want to do on your computer.';
    if (q === 'help' || q.includes('what can you do')) return 'I can open Windows apps, open folders and files, search your user files, reveal paths in Explorer, lock or sleep the PC, copy text, and accept both typed and spoken commands. The next layer will add an AI planner for multi-step tasks.';

    return 'I understood the request, but this command is not connected yet. Try “open Chrome”, “find my Downloads”, “open C:\\Users”, or “lock my computer”.';
  } catch (err) {
    return `I couldn't complete that: ${err.message || err}`;
  }
}

async function submit(text) {
  text = String(text || '').trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  addMessage('user', text);
  const response = await executeCommand(text);
  say(response);
}

function toggleListening() {
  if (!SpeechRecognition) {
    say('Voice input is not available in this Electron build. Text input is still ready.');
    return;
  }
  if (listening) { recognition.stop(); return; }
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  listening = true;
  mic.classList.add('listening');
  mode.textContent = 'Listening...';
  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
    input.value = transcript;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    if (event.results[event.results.length - 1].isFinal) submit(transcript);
  };
  recognition.onerror = () => { listening = false; mic.classList.remove('listening'); mode.textContent = 'Text mode'; };
  recognition.onend = () => { listening = false; mic.classList.remove('listening'); mode.textContent = 'Text mode'; };
  recognition.start();
}

send.addEventListener('click', () => submit(input.value));
mic.addEventListener('click', toggleListening);
micTop.addEventListener('click', toggleListening);
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input.value); } });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 150) + 'px'; });
document.querySelectorAll('[data-prompt]').forEach(b => b.addEventListener('click', () => submit(b.dataset.prompt)));

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => {
  const view = btn.dataset.view;
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.view').forEach(x => x.classList.add('hidden'));
  document.getElementById(`${view}View`).classList.remove('hidden');
  document.getElementById('pageTitle').textContent = view === 'assistant' ? 'What can I do for you?' : view[0].toUpperCase() + view.slice(1);
}));

document.getElementById('newChat').addEventListener('click', () => {
  messages.innerHTML = '<div class="welcome"><div class="orb"><div></div></div><h2>Talk to your computer.</h2><p>Type a request or press <kbd>Ctrl</kbd> + <kbd>Space</kbd> and speak.</p><div class="suggestions"><button data-prompt="Open Chrome">Open Chrome</button><button data-prompt="Find my Downloads folder">Find my Downloads</button><button data-prompt="Open Notepad">Open Notepad</button><button data-prompt="Open my Desktop">Open my Desktop</button></div></div>';
  document.querySelectorAll('[data-prompt]').forEach(b => b.addEventListener('click', () => submit(b.dataset.prompt)));
});

voiceOS.onHotkey(() => toggleListening());
