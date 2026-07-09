#!/bin/bash

# Exit on error
set -e

# Visual formatting
echo "=================================================="
echo "🚀 Axiom Mobile Cloudflare Worker Deployer"
echo "=================================================="

# Check if node is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js first (https://nodejs.org)."
  exit 1
fi

# Navigate to bridge directory
cd "$(dirname "$0")/mobile-bridge"

echo "📦 Installing Wrangler CLI and dependencies..."
npm install

echo ""
echo "🔐 Step 1: Log in to your Cloudflare Account"
echo "This will open a browser window. If you don't have an account, you can sign up for free."
echo "Press Enter to open the login page..."
read -r
npx wrangler login

echo ""
echo "🔑 Step 2: Configure your Gemini API Key"
echo "We will upload your Gemini API Key securely to your Cloudflare vault."
echo "Paste your key and press Enter when prompted:"
npx wrangler secret put GEMINI_API_KEY

echo ""
echo "🌍 Step 3: Deploying Cloudflare Worker..."
npx wrangler deploy

echo ""
echo "=================================================="
echo "🎉 Axiom Mobile Worker Bridge Deployed Successfully!"
echo "=================================================="
echo "1. Copy the URL printed above (ending in .workers.dev)."
echo "2. Build your 3-block Shortcuts using the instructions in:"
echo "   Plans/axiom_mobile_shortcuts_gemini.md"
echo "=================================================="
