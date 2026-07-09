#!/usr/bin/env bash
# 線維筋痛症 患者テスト用 Cloud Run デプロイ（ローカル実行用）
# 使い方:
#   export GCP_PROJECT_ID=your-project
#   export GEMINI_API_KEY=your-key
#   export ALLOW_ORIGIN=https://yorisoi.medi-canvas.com   # 任意
#   ./scripts/deploy-fm-test.sh

set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-yorisoi-phr-fm-test}"
REGION="${REGION:-asia-northeast1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI が見つかりません。https://cloud.google.com/sdk/docs/install を参照してください。"
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

ORIGIN="${ALLOW_ORIGIN:-*}"

echo "Deploying ${SERVICE_NAME} to ${REGION} (project: ${GCP_PROJECT_ID})..."

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
echo "患者テスト用 URL: ${URL}?disease=fm"
