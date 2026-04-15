#!/bin/bash

echo "======================================"
echo "Smart Setup Script"
echo "======================================"

if ! command -v node &> /dev/null; then
    echo "Node.js is not installed"
    exit 1
fi

echo "Node.js found: $(node --version)"

echo ""
echo "Setting up Frontend..."
cd frontend || exit 1
npm install --no-audit --no-fund
cd .. || exit 1

echo ""
echo "Setting up Backend..."
cd backend || exit 1
npm install --no-audit --no-fund
cd .. || exit 1

echo ""
echo "Setting up Mobile App..."
cd mobile-app || exit 1
npm install --no-audit --no-fund
cd .. || exit 1

echo ""
echo "======================================"
echo "Setup completed successfully"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Update frontend/.env, backend/.env, and mobile app config"
echo "2. Start:"
echo "   cd frontend && npm run dev"
echo "   cd backend && npm run dev"
echo "   cd mobile-app && npm start"
