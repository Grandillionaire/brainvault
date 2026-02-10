# 🧠 BrainVault

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-orange.svg)](https://tauri.app/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> A local-first, privacy-focused note-taking app with AI-powered features. Your second brain, running entirely on your machine.

<p align="center">
  <img src="docs/demo.gif" alt="BrainVault Demo" width="800"/>
</p>

## ✨ Features

### 📝 **Powerful Editor**
- Rich markdown editing with live preview
- Wiki-style `[[linking]]` between notes
- `#hashtag` support for organization
- Code blocks with syntax highlighting
- Task lists, tables, and more

### 🔗 **Knowledge Graph**
- Interactive 3D visualization of your notes
- See connections at a glance
- Filter by tags, find orphan notes
- Hover preview for quick context

### 🤖 **AI Assistant** (Local-First)
- **Summarize notes** with one click
- **Semantic search** — find notes by meaning, not just keywords
- **Related notes** — discover hidden connections
- Works with [Ollama](https://ollama.ai) for 100% local AI

### 📅 **Daily Notes & Templates**
- One-click daily note creation
- Built-in templates: Meeting Notes, Project, Journal
- Customizable template system
- Quick create from command palette

### 📥 **Import & Export**
- Import from Obsidian vaults (preserves [[links]])
- Import markdown files and folders
- Export as ZIP, JSON, or individual files
- Full backup with metadata

### 🚀 **Built for Speed**
- Instant search with `Cmd+K`
- Keyboard-first design
- No cloud dependencies
- Works offline, always

### 🎨 **Beautiful & Customizable**
- Dark/light mode with auto-detection
- Clean, distraction-free interface
- Focus mode for deep writing
- Split view editor/preview

---

## 🆚 How BrainVault Compares

| Feature | BrainVault | Obsidian | Notion |
|---------|------------|----------|--------|
| **Local-first** | ✅ 100% local | ✅ Local files | ❌ Cloud-only |
| **Free** | ✅ MIT License | ⚠️ Freemium | ⚠️ Freemium |
| **Open source** | ✅ | ❌ | ❌ |
| **Wiki links** | ✅ | ✅ | ⚠️ Limited |
| **Knowledge graph** | ✅ 3D Graph | ✅ Graph view | ❌ |
| **Local AI** | ✅ Ollama | ❌ | ❌ |
| **Native desktop app** | ✅ Tauri | ✅ Electron | ❌ Web only |
| **Mobile app** | 🚧 Planned | ✅ | ✅ |
| **Offline support** | ✅ Full | ✅ Full | ⚠️ Limited |
| **File format** | Markdown | Markdown | Proprietary |
| **Import from Obsidian** | ✅ | N/A | ⚠️ Manual |

---

## 🖥️ Screenshots

<details>
<summary>Click to expand screenshots</summary>

### Editor View
![Editor](docs/screenshots/editor.png)

### Graph View  
![Graph](docs/screenshots/graph.png)

### AI Assistant
![AI](docs/screenshots/ai.png)

### Command Palette
![Commands](docs/screenshots/commands.png)

</details>

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Grandillionaire/brainvault
cd brainvault

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 and start taking notes!

### Desktop App

Build a native desktop app with Tauri:

```bash
# Install Tauri CLI (first time only)
cargo install tauri-cli

# Build the app
npm run tauri build
```

---

## 🐳 Docker

Run BrainVault in a container:

```bash
# Quick start
docker compose up -d

# Access at http://localhost:3000
```

Or build and run manually:

```bash
# Build the image
docker build -t brainvault .

# Run the container
docker run -d -p 3000:80 --name brainvault brainvault
```

### With Local AI (Ollama)

```bash
# Start with Ollama support
docker compose --profile ai up -d

# Pull a model
docker exec brainvault-ollama ollama pull llama2
```

---

## 🤖 Setting Up Local AI

BrainVault works great without AI, but for the full experience:

1. **Install Ollama**
   ```bash
   brew install ollama  # macOS
   # or download from https://ollama.ai
   ```

2. **Start Ollama**
   ```bash
   ollama serve
   ```

3. **Pull a model**
   ```bash
   ollama pull llama2     # Fast, good quality
   ollama pull mistral    # Great for reasoning
   ollama pull codellama  # Best for code notes
   ```

4. **Open BrainVault** — AI features will automatically connect!

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New note | `Cmd+N` |
| Daily note | `Cmd+D` |
| Search | `Cmd+K` |
| Toggle sidebar | `Cmd+B` |
| Switch view mode | `Cmd+E` |
| Graph view | `Cmd+G` |
| Save note | `Cmd+S` |
| Focus mode | `Cmd+Shift+F` |
| AI chat | `Cmd+J` |
| All shortcuts | `Shift+/` |

---

## 🛠️ Built With

<p align="center">
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/></a>
  <a href="https://tauri.app"><img src="https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri"/></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/></a>
</p>

| Layer | Technology |
|-------|------------|
| **Framework** | React 19 + TypeScript |
| **Desktop** | Tauri 2.0 (Rust) |
| **Editor** | TipTap |
| **State** | Zustand |
| **Styling** | Tailwind CSS |
| **Animations** | Framer Motion |
| **Graph** | react-force-graph-3d |
| **AI** | Ollama (local inference) |
| **Search** | Fuse.js + custom semantic search |

---

## 📁 Project Structure

```
brainvault/
├── src/
│   ├── components/     # React components
│   │   ├── AI/         # AI chat interface
│   │   ├── Editor/     # Markdown editor
│   │   ├── Graph/      # Knowledge graph
│   │   ├── Import/     # Import modal
│   │   ├── Templates/  # Template modal
│   │   └── ...
│   ├── stores/         # Zustand state management
│   ├── lib/            # Utilities & helpers
│   │   ├── ai.ts       # AI/ML functions
│   │   ├── import.ts   # Import utilities
│   │   ├── templates.ts# Note templates
│   │   └── ...
│   ├── types/          # TypeScript types
│   └── styles/         # Global styles
├── src-tauri/          # Tauri (Rust) backend
├── server/             # Optional API server
├── docker/             # Docker configuration
└── public/             # Static assets
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run specific test file
npm test -- src/lib/__tests__/ai.test.ts
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT — do whatever you want with it.

---

## 🙏 Acknowledgments

- [Obsidian](https://obsidian.md) for inspiration
- [Tauri](https://tauri.app) for making desktop apps not suck
- [Ollama](https://ollama.ai) for democratizing local AI

---

<p align="center">
  Made with ❤️ because note-taking apps shouldn't sell your data.
</p>
