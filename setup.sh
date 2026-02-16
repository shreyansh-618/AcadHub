#!/bin/bash

echo "======================================"
echo "Academic Platform Setup Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python found: $(python3 --version)${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker is not installed (optional for development)${NC}"
fi

# Setup Frontend
echo ""
echo -e "${YELLOW}Setting up Frontend...${NC}"
cd frontend
npm install --no-audit --no-fund
if [ -f .env.example ]; then
    cp .env.example .env.local
    echo -e "${GREEN}✓ Frontend setup complete${NC}"
fi
cd ..

# Setup Backend
echo ""
echo -e "${YELLOW}Setting up Backend...${NC}"
cd backend
npm install --no-audit --no-fund
if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Backend setup complete${NC}"
fi
cd ..

# Setup AI Service
echo ""
echo -e "${YELLOW}Setting up AI Service...${NC}"
cd ai-service
python3 -m pip install -r requirements.txt > /dev/null 2>&1
if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ AI Service setup complete${NC}"
fi
cd ..

echo ""
echo "======================================"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Update .env files with your configuration:"
echo "   - frontend/.env.local"
echo "   - backend/.env"
echo "   - ai-service/.env"
echo ""
echo "2. Start development servers:"
echo "   # Terminal 1 - Frontend"
echo "   cd frontend && npm run dev"
echo ""
echo "   # Terminal 2 - Backend"
echo "   cd backend && npm run dev"
echo ""
echo "   # Terminal 3 - AI Service"
echo "   cd ai-service && python3 main.py"
echo ""
echo "3. Visit http://localhost:5173 in your browser"
echo ""
