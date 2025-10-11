# 🚀 Quick Start Guide for BrainVault

## Option 1: Web Version (Recommended for Development)

The easiest way to start BrainVault is to run it as a web application:

```bash
cd /Users/hq2/Desktop/brainvault
npm run dev
```

This will start the development server at `http://localhost:5173`

The web version includes all features except:
- File system integration (uses browser storage instead)
- Desktop app packaging

## Option 2: Desktop App (Requires Rust)

To run as a desktop application, you need to install Rust first:

### Step 1: Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Step 2: Run Desktop App

```bash
npm run tauri dev
```

## What Just Got Fixed

I fixed the following Rust compilation errors:
1. ✅ Added missing `mime_guess` dependency
2. ✅ Removed unused imports (Event, EventKind, RecursiveMode, Watcher, channel, Arc, Mutex)
3. ✅ Fixed return value lifetime issue in `strip_markdown` function
4. ✅ Prefixed unused variable with underscore

## Current Status

- ✅ **Web Version**: Ready to run with `npm run dev`
- ⚠️ **Desktop Version**: Requires Rust installation (see Option 2)
- ✅ **Production Build**: Works with `npm run build`

## Recommended: Start with Web Version

For the quickest start and easiest development:

```bash
# Just run this:
npm run dev
```

Then open your browser to `http://localhost:5173`

## Features Available in Web Version

- ✅ Note-taking with markdown editor
- ✅ Live preview (editor/preview/split modes)
- ✅ Wiki-style links `[[Note Links]]`
- ✅ Tags `#tag`
- ✅ Full-text search (Cmd+K)
- ✅ Command palette (Cmd+Shift+P)
- ✅ Graph visualization (3D)
- ✅ Drag & drop organization
- ✅ Interactive tutorial
- ✅ Dark mode
- ✅ AI Chat (with Ollama running locally)

## Troubleshooting

**Port already in use?**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

**Dependencies missing?**
```bash
npm install
```

**Want to build for production?**
```bash
npm run build
# Output in dist/ folder
```

---

**Next Steps:**
1. Run `npm run dev` to start the development server
2. Open `http://localhost:5173` in your browser
3. Complete the interactive tutorial
4. Start taking notes!
