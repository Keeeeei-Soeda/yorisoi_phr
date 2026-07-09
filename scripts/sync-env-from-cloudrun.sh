#!/usr/bin/env bash
# デプロイ済み Cloud Run から GEMINI_API_KEY 等を .env に同期する
# gcloud ログイン済み・Owner/Run 閲覧権限が必要
#
# 使い方:
#   gcloud auth login k.soeda.mediforce@gmail.com
#   gcloud config set project yorisoi-senikintsu-syndo
#   ./scripts/sync-env-from-cloudrun.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-yorisoi-phr-fm-test}"
REGION="${REGION:-asia-northeast1}"
PROJECT="${GCP_PROJECT_ID:-yorisoi-senikintsu-syndo}"
ENV_FILE="${ROOT}/.env"

if ! command -v gcloud >/dev/null 2>&1 || ! gcloud --version >/dev/null 2>&1; then
  echo "Error: 動作する gcloud CLI が必要です"
  echo "  brew install --cask google-cloud-sdk"
  exit 1
fi

gcloud config set project "$PROJECT" >/dev/null

echo "Cloud Run サービス ${SERVICE_NAME} から環境変数を取得中..."

# env 一覧を YAML で取得し GEMINI_API_KEY を抽出
ENV_YAML=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format='yaml(spec.template.spec.containers[0].env)')

GEMINI_KEY=$(echo "$ENV_YAML" | awk '/- name: GEMINI_API_KEY/{getline; gsub(/^[[:space:]]*value: /,""); print; exit}')
ALLOW_ORIGIN=$(echo "$ENV_YAML" | awk '/- name: ALLOW_ORIGIN/{getline; gsub(/^[[:space:]]*value: /,""); print; exit}')

if [[ -z "$GEMINI_KEY" ]]; then
  echo "Error: Cloud Run 上に GEMINI_API_KEY が見つかりません"
  exit 1
fi

# .env を更新または作成
if [[ -f "$ENV_FILE" ]]; then
  cp "$ENV_FILE" "${ENV_FILE}.bak"
fi

cat > "$ENV_FILE" <<EOF
# FM 患者テスト用（git にコミットしない）
# sync-env-from-cloudrun.sh で Cloud Run から同期 ($(date +%Y-%m-%d))

GOOGLE_CLOUD_PROJECT=${PROJECT}
GCP_PROJECT_ID=${PROJECT}

LIFF_CHANNEL_ID=your-line-channel-id

GEMINI_API_KEY=${GEMINI_KEY}

PORT=8080
ALLOW_ORIGIN=${ALLOW_ORIGIN:-https://yorisoi.medi-canvas.com}
DEMO_MODE=1
EOF

chmod 600 "$ENV_FILE"
echo "✅ .env を更新しました（GEMINI_API_KEY 同期済み）"
echo "   バックアップ: ${ENV_FILE}.bak"
