#!/usr/bin/env bash
# scripts/macos/setup_macos.sh — Prepare macOS environment for sa-convert-data
set -euo pipefail

echo "🔧 Preparing macOS environment (Homebrew + Python venv)"

# Homebrew (if not installed)
if ! command -v brew >/dev/null 2>&1; then
  echo "🍺 Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile || true
  eval "$(/opt/homebrew/bin/brew shellenv)" || true
fi

# Ensure python3 exists (brew's python is fine)
brew update
brew install python || true

# Create venv if missing
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi

# Activate venv
# shellcheck disable=SC1091
source .venv/bin/activate

# Upgrade pip and install deps
python -m pip install -U pip
if [[ -f requirements.txt ]]; then
  pip install -r requirements.txt
else
  echo "ℹ️ No requirements.txt found; skipping."
fi

echo "✅ macOS setup complete. To run: python app.py"
