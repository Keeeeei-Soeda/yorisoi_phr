#!/usr/bin/env bash
# ALS 患者テスト用 Cloud Run デプロイ（ローカル実行用）
# FM（yorisoi-phr-fm-test / feature/fm-photo-medication）とは分離すること。
#
# 使い方:
#   export GCP_PROJECT_ID=yorisoi-senikintsu-syndo
#   export GEMINI_API_KEY=your-key
#   ./scripts/deploy-als-test.sh

set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-yorisoi-phr-als-test}"
REGION="${REGION:-asia-northeast1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI が見つかりません。"
  exit 1
fi

if [ -z "${GCP_PROJECT_ID:-}" ]; then
  echo "Error: GCP_PROJECT_ID を設定してください"
  exit 1
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "Error: GEMINI_API_KEY を設定してください"
  exit 1
fi

# 誤って FM ブランチからデプロイしないガード
BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
if [ "$BRANCH" = "feature/fm-photo-medication" ]; then
  echo "Error: 現在ブランチが feature/fm-photo-medication です。"
  echo "ALS デプロイは feature/als-phase1 など ALS 専用ブランチで実行してください。"
  exit 1
fi

ORIGIN="${ALLOW_ORIGIN:-*}"

echo "Deploying ALS service ${SERVICE_NAME} to ${REGION} (project: ${GCP_PROJECT_ID}, branch: ${BRANCH})..."

gcloud config set project "$GCP_PROJECT_ID"

gcloud run deploy "$SERVICE_NAME" \
  --source "$ROOT" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=${GCP_PROJECT_ID},GEMINI_API_KEY=${GEMINI_API_KEY},GEMINI_MODEL_PRIMARY=gemini-3.1-flash-lite,GEMINI_MODEL_FALLBACK=gemini-3-flash,ALLOW_ORIGIN=${ORIGIN},DEMO_MODE=1" \
  --quiet

URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format 'value(status.url)')

echo ""
echo "Deployed successfully."
echo "ALS 患者テスト用 URL: ${URL}?disease=als"
