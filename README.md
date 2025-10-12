# BrainVault

a local-first note-taking app that keeps your data on your machine. no cloud, no tracking, just your notes.

## why i built this

i got tired of note apps that require internet, send my data to servers, and charge monthly fees. i wanted something simple: write notes, link them together, search them instantly, and know my data stays mine.

## features

- **offline-first**: works without internet. period.
- **markdown editor**: clean writing with live preview
- **wiki links**: connect notes with `[[links]]`
- **graph view**: see how your notes connect (3D visualization)
- **tags**: organize with `#hashtags`
- **full-text search**: find anything instantly (cmd+k)
- **export everything**: markdown, pdf, or zip of all notes
- **keyboard shortcuts**: press `?` to see them all
- **focus mode**: hide everything, just write

## install

```bash
git clone https://github.com/yourusername/brainvault
cd brainvault
npm install
npm run dev
```

then open http://localhost:5173

## desktop app

to build the desktop version:

```bash
npm run tauri build
```

requires rust and tauri cli. see [tauri docs](https://tauri.app) for setup.

## how to use

1. create notes (cmd+n)
2. link them together with `[[note name]]`
3. search everything (cmd+k)
4. view connections in graph view (cmd+g)
5. export when needed

all your notes are stored in local storage. export them anytime to own your data forever.

## keyboard shortcuts

- `cmd/ctrl + n` - new note
- `cmd/ctrl + k` - search
- `cmd/ctrl + s` - save (auto-saves anyway)
- `cmd/ctrl + e` - cycle editor modes
- `cmd/ctrl + g` - graph view
- `shift + /` - show all shortcuts

## optional: local ai

you can add local ai with ollama:

```bash
# install ollama
brew install ollama

# download a model
ollama pull llama2

# enable in settings
```

then you can chat with your notes, get summaries, etc. all runs locally.

## tech stack

- react + typescript + vite
- tauri (rust) for desktop
- tiptap editor
- tailwind css
- zustand for state
- force-graph-3d for visualization

## license

mit - use it however you want

## contributing

prs welcome. keep it simple and fast.

---

made because i needed it. hopefully you find it useful too.
