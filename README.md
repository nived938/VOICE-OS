# VOICE OS

A local Windows desktop assistant inspired by the voice-to-action workflow of VoiceOS. It supports both typing and voice input and can execute Windows actions from natural language.

## Current features

- Voice input with the global `Ctrl + Space` hotkey
- Typed commands
- Spoken responses through Windows/Electron speech synthesis
- VoiceOS-style dark desktop interface
- Open Chrome, Edge, Notepad, Calculator, Explorer, CMD and PowerShell
- Open Desktop, Downloads, Documents, Pictures and Videos
- Open a Windows file or folder by full path
- Reveal a file or folder in Explorer
- Search files under the current Windows user profile
- Lock or sleep Windows
- Copy text to the system clipboard
- Local Ollama planner for natural-language requests
- Secure Electron preload bridge with context isolation

## Run on Windows

```powershell
npm install
npm start
```

For the local AI planner, install and run Ollama, then make sure a model is available:

```powershell
ollama serve
ollama pull llama3.2-vision:11b
```

The planner calls Ollama at `http://127.0.0.1:11434`. You can change the model with `VOICE_OS_OLLAMA_MODEL`.

## Build an installer

```powershell
npm run dist
```

## Roadmap

The project is structured so more capabilities can be added without exposing Node.js directly to the renderer. Planned layers include screen awareness, safer multi-step task execution, app integrations, file creation and editing with confirmation, browser automation, startup/background mode, customizable hotkeys, and optional OpenRouter support.

This project is an independent implementation and does not copy VoiceOS proprietary code, assets, or branding.
