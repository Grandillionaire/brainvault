#!/bin/bash

# BrainVault Development Startup Script
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🧠 BrainVault - Starting Development Servers${NC}\n"

# Check dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"
[ ! -d "node_modules" ] && npm install
[ ! -d "server/node_modules" ] && (cd server && npm install)
echo -e "${GREEN}✅ Dependencies ready${NC}\n"

# Create directories
mkdir -p server/data/vault/{notes,daily,attachments,templates,.trash}

# Start servers
echo -e "${BLUE}🚀 Starting backend...${NC}"
cd server && node index.js &
SERVER_PID=$!
cd ..
sleep 3

echo -e "${BLUE}🎨 Starting frontend...${NC}"
npm run dev &
FRONTEND_PID=$!

echo -e "\n${GREEN}✨ BrainVault running!${NC}"
echo -e "Frontend: http://localhost:1420"
echo -e "Backend:  http://localhost:3001\n"
echo -e "Press Ctrl+C to stop\n"

# Cleanup on exit
trap "kill $SERVER_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
