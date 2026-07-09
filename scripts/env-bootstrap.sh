#!/usr/bin/env bash
# FM 開発用 PATH / Python 設定（このリポジトリ用）
# 使い方: source scripts/env-bootstrap.sh

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Portable Python 3.12（gcloud 用）
if [[ -x "$HOME/.local/python312/bin/python3" ]]; then
  export CLOUDSDK_PYTHON="$HOME/.local/python312/bin/python3"
fi

# gcloud SDK
if [[ -d "$HOME/google-cloud-sdk/bin" ]]; then
  export PATH="$HOME/google-cloud-sdk/bin:$PATH"
fi

# Node.js 20（ユーザー local）
if [[ -d "$HOME/.local/node-v20/bin" ]]; then
  export PATH="$HOME/.local/node-v20/bin:$PATH"
fi

export GCP_PROJECT_ID="${GCP_PROJECT_ID:-yorisoi-senikintsu-syndo}"

# .env があれば読み込み
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi
