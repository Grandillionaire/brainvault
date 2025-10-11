#!/bin/bash

# BrainVault Development Startup Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   BrainVault Development Environment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js: $(node --version)${NC}"

if ! command_exists npm; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm: $(npm --version)${NC}"

# Check Xcode Command Line Tools (needed for native modules)
if ! xcode-select -p &> /dev/null; then
    echo -e "${YELLOW}⚠ Xcode Command Line Tools not found${NC}"
    echo -e "${YELLOW}  Installing Xcode Command Line Tools...${NC}"
    xcode-select --install
    echo -e "${YELLOW}  Please complete the installation and run this script again${NC}"
    exit 1
fi

# Check if Xcode license needs to be accepted
if ! sudo xcodebuild -license check &> /dev/null; then
    echo -e "${YELLOW}⚠ Xcode license agreement needs to be accepted${NC}"
    echo -e "${YELLOW}  Please run: sudo xcodebuild -license${NC}"
    echo -e "${YELLOW}  Then run this script again${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Installing dependencies...${NC}"

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

# Install server dependencies
cd server
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing server dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Server dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Server dependencies already installed${NC}"
fi
cd ..

# Create data directories
echo ""
echo -e "${BLUE}Setting up data directories...${NC}"
mkdir -p server/data/vault
mkdir -p server/data/attachments
echo -e "${GREEN}✓ Data directories created${NC}"

# Start the servers
echo ""
echo -e "${BLUE}Starting development servers...${NC}"
echo -e "${YELLOW}Frontend: http://localhost:1420${NC}"
echo -e "${YELLOW}Backend API: http://localhost:3001/api${NC}"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop all servers${NC}"
echo ""

# Trap Ctrl+C to kill both processes
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Start backend server
cd server
npm start &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 2

# Start frontend
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait
