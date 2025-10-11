#!/bin/bash

# BrainVault - Rust Backend Setup Script
# This script sets up everything needed for the Tauri + Rust backend

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
╔══════════════════════════════════════════════════════╗
║                                                      ║
║     🦀 BrainVault - Rust Backend Setup 🦀           ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check Rust
echo -e "${YELLOW}Checking Rust installation...${NC}"
if ! command -v rustc &> /dev/null; then
    echo -e "${RED}❌ Rust is not installed${NC}"
    echo -e "${YELLOW}Installing Rust...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
else
    echo -e "${GREEN}✅ Rust $(rustc --version) detected${NC}"
fi

# Check Node.js
echo -e "\n${YELLOW}Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
else
    echo -e "${GREEN}✅ Node.js $(node --version) detected${NC}"
fi

# Install frontend dependencies
echo -e "\n${YELLOW}Installing frontend dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

# Build Rust backend (will install dependencies automatically)
echo -e "\n${YELLOW}Building Rust backend...${NC}"
cd src-tauri
cargo build
cd ..
echo -e "${GREEN}✅ Rust backend built successfully${NC}"

# Success message
echo -e "\n${GREEN}"
cat << "EOF"
╔══════════════════════════════════════════════════════╗
║                                                      ║
║        ✨ Setup Complete! ✨                         ║
║                                                      ║
║  Run the app:                                        ║
║    npm run tauri dev                                 ║
║                                                      ║
║  Build for production:                               ║
║    npm run tauri build                               ║
║                                                      ║
║  See RUST_BACKEND_SETUP.md for more info            ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

