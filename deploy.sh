#!/bin/bash

echo "╔══════════════════════════════════════════════╗"
echo "║  Smart Attendance System - Deployment Setup  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Check Node.js
echo -e "${YELLOW}[1/6]${NC} Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"

# Step 2: Check npm
echo -e "${YELLOW}[2/6]${NC} Checking npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v) found${NC}"

# Step 3: Install backend dependencies
echo -e "${YELLOW}[3/6]${NC} Installing backend dependencies..."
cd server
npm install --production
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to install backend dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Step 4: Build frontend
echo -e "${YELLOW}[4/6]${NC} Building frontend..."
cd ../client
npm install --production
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to build frontend${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Step 5: Check environment
echo -e "${YELLOW}[5/6]${NC} Checking environment configuration..."
cd ../server
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ No .env file found${NC}"
    echo "  Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit server/.env with your MongoDB credentials${NC}"
fi
echo -e "${GREEN}✓ Environment file ready${NC}"

# Step 6: Test MongoDB connection
echo -e "${YELLOW}[6/6]${NC} Testing MongoDB connection..."
node test-mongo.js
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ MongoDB connection successful${NC}"
else
    echo -e "${YELLOW}⚠ MongoDB connection failed${NC}"
    echo "   See DEPLOYMENT_GUIDE.md for MongoDB setup options"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo -e "${GREEN}║        Deployment Preparation Complete       ║${NC}"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Configure MongoDB (if not already done)"
echo "  2. Start server: npm start"
echo "  3. Test API: curl http://localhost:5000/api/health"
echo ""
