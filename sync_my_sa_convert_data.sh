#!/bin/bash
# Sincroniza o branch "my-sa-convert-data" com o "main"

set -e

BRANCH="my-sa-convert-data"

echo "📡 A obter atualizações do remoto..."
git fetch origin main

echo "🔄 A mudar para $BRANCH..."
git checkout $BRANCH

echo "🧹 A igualar conteúdo ao origin/main..."
git reset --hard origin/main

echo "🚀 A atualizar o remoto (force push)..."
git push --force

echo "✅ O branch '$BRANCH' está agora idêntico ao 'main'."
