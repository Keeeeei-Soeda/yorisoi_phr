#!/usr/bin/env bash
# FM 患者テスト環境のセットアップ確認スクリプト
# 別 PC でデプロイ前に実行し、不足している設定を洗い出す
#
# 使い方:
#   ./scripts/setup-fm-dev.sh
#   ./scripts/setup-fm-dev.sh --fix-apis   # Owner 権限がある場合、API を有効化

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "${ROOT}/scripts/env-bootstrap.sh" 2>/dev/null || true
EXPECTED_PROJECT="yorisoi-senikintsu-syndo"
EXPECTED_ACCOUNT_HINT="k.soeda.mediforce@gmail.com"
LIVE_URL="https://yorisoi-phr-fm-test-o7flbqc5ka-an.a.run.app"
FIX_APIS=false

if [[ "${1:-}" == "--fix-apis" ]]; then
  FIX_APIS=true
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅${NC} $1"; }
warn() { echo -e "${YELLOW}⚠️${NC}  $1"; }
ng()   { echo -e "${RED}❌${NC} $1"; }

errors=0
warnings=0

echo "=== FM 患者テスト環境セットアップ確認 ==="
echo "プロジェクト: ${EXPECTED_PROJECT}"
echo ""

# --- 本番テスト URL（別 PC でデプロイ済み） ---
if curl -fsS "${LIVE_URL}/health" >/dev/null 2>&1; then
  ok "Cloud Run 患者テスト環境は稼働中: ${LIVE_URL}?disease=fm"
else
  warn "Cloud Run テスト URL に接続できません（未デプロイ or ネットワーク）"
  warnings=$((warnings + 1))
fi

# --- gcloud CLI ---
if command -v gcloud >/dev/null 2>&1; then
  if gcloud --version >/dev/null 2>&1; then
    ok "gcloud CLI がインストールされています"
  else
    ng "gcloud はあるが Python 互換エラー → Python 3.10+ を入れて CLOUDSDK_PYTHON を設定、または brew install --cask google-cloud-sdk"
    errors=$((errors + 1))
  fi
else
  ng "gcloud CLI がありません → brew install --cask google-cloud-sdk"
  errors=$((errors + 1))
fi

# --- GitHub CLI ---
if command -v gh >/dev/null 2>&1; then
  ok "gh CLI がインストールされています"
  if gh auth status >/dev/null 2>&1; then
    active_gh=$(gh auth status 2>&1 | grep "Active account:" | head -1 || true)
    if echo "$active_gh" | grep -q "Keeeeei-Soeda"; then
      ok "GitHub アクティブアカウント: Keeeeei-Soeda"
    else
      warn "GitHub push 用は Keeeeei-Soeda 推奨 → gh auth switch --user Keeeeei-Soeda"
      warnings=$((warnings + 1))
    fi
  else
    warn "gh 未ログイン → gh auth login"
    warnings=$((warnings + 1))
  fi
else
  warn "gh CLI がありません（push 時に必要）→ brew install gh"
  warnings=$((warnings + 1))
fi

# --- Node.js ---
if command -v node >/dev/null 2>&1; then
  ok "Node.js $(node -v)"
else
  warn "Node.js がありません（ローカル dev 時のみ必要）"
  warnings=$((warnings + 1))
fi

# --- .env ---
ENV_FILE="${ROOT}/.env"
if [[ -f "$ENV_FILE" ]]; then
  ok ".env が存在します"
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
  if [[ -n "${GEMINI_API_KEY:-}" && "${GEMINI_API_KEY}" != "your-gemini-api-key" ]]; then
    ok "GEMINI_API_KEY が設定されています"
  else
    ng "GEMINI_API_KEY が未設定 → .env を編集、または gcloud ログイン後:"
    echo "     ./scripts/sync-env-from-cloudrun.sh"
    errors=$((errors + 1))
  fi
else
  ng ".env がありません → cp .env.example .env して GEMINI_API_KEY を設定"
  errors=$((errors + 1))
fi

# --- gcloud account & project ---
if command -v gcloud >/dev/null 2>&1; then
  active_account=$(gcloud config get-value account 2>/dev/null || true)
  active_project=$(gcloud config get-value project 2>/dev/null || true)

  echo ""
  echo "--- GCP 設定 ---"
  echo "アカウント: ${active_account:-（未設定）}"
  echo "プロジェクト: ${active_project:-（未設定）}"

  if [[ "$active_account" == *"macbee"* ]]; then
    warn "会社アカウント (${active_account}) では FM プロジェクトが見えない可能性があります"
    warn "→ gcloud config set account ${EXPECTED_ACCOUNT_HINT}"
    warnings=$((warnings + 1))
  elif [[ -n "$active_account" ]]; then
    ok "gcloud アカウント: ${active_account}"
  fi

  if [[ "$active_project" == "$EXPECTED_PROJECT" ]]; then
    ok "gcloud プロジェクトが正しい"
  else
    ng "プロジェクト不一致 → gcloud config set project ${EXPECTED_PROJECT}"
    errors=$((errors + 1))
  fi

  if gcloud projects describe "$EXPECTED_PROJECT" >/dev/null 2>&1; then
    ok "プロジェクト ${EXPECTED_PROJECT} へのアクセス OK"
  else
    ng "プロジェクト ${EXPECTED_PROJECT} にアクセスできません → アカウントを切り替え"
    errors=$((errors + 1))
  fi

  # --- APIs ---
  echo ""
  echo "--- 必要 API ---"
  REQUIRED_APIS=(
    run.googleapis.com
    cloudbuild.googleapis.com
    artifactregistry.googleapis.com
  )
  missing_apis=()
  for api in "${REQUIRED_APIS[@]}"; do
    enabled=$(gcloud services list --enabled --filter="name:${api}" --format="value(name)" 2>/dev/null | head -1 || true)
    if [[ -n "$enabled" && "$enabled" == *"${api}" ]]; then
      ok "${api} 有効"
    else
      ng "${api} 未有効"
      missing_apis+=("$api")
      errors=$((errors + 1))
    fi
  done

  if [[ ${#missing_apis[@]} -gt 0 && "$FIX_APIS" == true ]]; then
    echo ""
    echo "API を有効化しています..."
    gcloud services enable "${missing_apis[@]}" --project="$EXPECTED_PROJECT" --quiet
    ok "API 有効化完了"
  elif [[ ${#missing_apis[@]} -gt 0 ]]; then
    warn "Owner 権限があれば: ./scripts/setup-fm-dev.sh --fix-apis"
  fi
fi

# --- git branch ---
echo ""
echo "--- Git ---"
current_branch=$(git -C "$ROOT" branch --show-current 2>/dev/null || true)
if [[ "$current_branch" == "feature/fm-photo-medication" ]]; then
  ok "ブランチ: feature/fm-photo-medication"
else
  warn "ブランチが feature/fm-photo-medication ではありません（現在: ${current_branch:-unknown}）"
  warnings=$((warnings + 1))
fi

# --- Summary ---
echo ""
echo "=== 結果 ==="
live_ok=false
if curl -fsS "${LIVE_URL}/health" >/dev/null 2>&1; then
  if curl -fsS "${LIVE_URL}/api/ai/health" 2>/dev/null | grep -q '"hasKey":true'; then
    live_ok=true
  fi
fi

if [[ "$live_ok" == true ]]; then
  ok "患者テスト環境は利用可能です"
  echo "  → ${LIVE_URL}?disease=fm"
fi

if [[ $errors -eq 0 ]]; then
  ok "ローカルセットアップ OK — この PC からもデプロイ可能です"
  echo ""
  echo "次のコマンド:"
  echo "  set -a && source .env && set +a"
  echo "  export GCP_PROJECT_ID=${EXPECTED_PROJECT}"
  echo "  ./scripts/deploy-fm-test.sh"
  exit 0
elif [[ "$live_ok" == true ]]; then
  warn "ローカルデプロイ用の設定が未完了（${errors} 件）— 患者テスト自体は上記 URL で可能"
  echo ""
  echo "ローカルデプロイを直す場合: docs/fm-deploy-setup-guide.md"
  exit 0
else
  ng "エラー ${errors} 件 / 警告 ${warnings} 件 — 上記を修正してください"
  echo ""
  echo "詳細: docs/fm-deploy-setup-guide.md"
  exit 1
fi
