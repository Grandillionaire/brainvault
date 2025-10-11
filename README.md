# 🧠 BrainVault - Local-First Note-Taking & Knowledge Management

**BrainVault** is a powerful, privacy-focused note-taking and knowledge management application designed to be your personal second brain. All your data stays on your device, with no cloud, no tracking, and complete control.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

## ✨ Features

### 🔒 Privacy First
- **100% Local**: All data stored on your device
- **No Cloud Required**: Works completely offline
- **Zero Tracking**: No telemetry or analytics
- **Your Data**: Export anytime, plain markdown files

### 📝 Powerful Note-Taking
- **Markdown Support**: Write in plain text with rich formatting
- **Live Preview**: See formatted notes as you type (editor/preview/split modes)
- **Wiki-Style Links**: Connect notes with `[[Note Links]]`
- **Tags**: Organize with `#tags`
- **Daily Notes**: Automatic journal entries

### 🔍 Smart Organization
- **Full-Text Search**: Lightning-fast search (Cmd+K)
- **Graph View**: Visualize connections between notes (3D)
- **Folders**: Drag and drop organization
- **Command Palette**: Quick access to all features
- **Focus Mode**: Distraction-free writing

### 🤖 AI Integration (Optional)
- **Local AI**: Use Ollama for offline AI features
- **Chat with Notes**: Ask questions about your knowledge base
- **Smart Suggestions**: AI-powered connections
- **Summarization**: Generate note summaries

### 📁 Data Portability
- **Plain Files**: All notes stored as markdown
- **Import**: From Notion, Obsidian, Roam, Evernote
- **Export**: To PDF, HTML, Word
- **Git-Friendly**: Version control your notes

## 🚀 Quick Start

### Download

Download the latest release for your platform:

- **macOS**: [BrainVault.dmg](https://github.com/yourusername/brainvault/releases)
- **Windows**: [BrainVault.exe](https://github.com/yourusername/brainvault/releases)
- **Linux**: [BrainVault.AppImage](https://github.com/yourusername/brainvault/releases)

### First Run

1. Launch BrainVault
2. Choose your vault location (default: `~/Documents/BrainVault`)
3. Complete the interactive tutorial
4. Start capturing your ideas!

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New Note | `Cmd/Ctrl + N` |
| Search | `Cmd/Ctrl + K` |
| Toggle Sidebar | `Cmd/Ctrl + B` |
| Toggle Preview | `Cmd/Ctrl + E` |
| Graph View | `Cmd/Ctrl + G` |
| Daily Note | `Cmd/Ctrl + D` |
| Save | `Cmd/Ctrl + S` (auto-saves anyway) |

## 🛠️ Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) and npm
- [Rust](https://www.rust-lang.org/) (1.70+) for Tauri
- Xcode Command Line Tools (macOS)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/brainvault
cd brainvault

# Install dependencies
npm install

# Start development server
npm run dev

# Build desktop app
npm run tauri build
```

### Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Desktop**: Tauri (Rust)
- **Editor**: Tiptap (ProseMirror)
- **Styling**: Tailwind CSS
- **State**: Zustand

### Project Structure

```
brainvault/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── stores/            # Zustand stores
│   ├── lib/               # Utilities
│   └── types/             # TypeScript types
├── src-tauri/             # Tauri backend
│   └── src/               # Rust source
└── public/                # Static assets
```

## 📚 Documentation

- **Tutorial**: Built into app (first launch)
- **Help**: Press `?` key anytime
- **Issues**: [GitHub Issues](https://github.com/yourusername/brainvault/issues)

## 🔌 Optional AI Setup

BrainVault supports local AI through Ollama:

1. Install Ollama: `brew install ollama` (macOS/Linux)
2. Download a model: `ollama pull llama2`
3. Enable AI in BrainVault settings
4. Start chatting with your notes!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

BrainVault is open source software licensed under the MIT License.

## 🙏 Acknowledgments

Built with modern web technologies and inspired by tools like Obsidian, Notion, and Roam Research.

---

Built with ❤️ for privacy-conscious knowledge workers
