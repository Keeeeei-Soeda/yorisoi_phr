# FM 患者テスト環境 — 別 PC で失敗した理由とセットアップ手順

ブランチ: `feature/fm-photo-medication`  
対象 GCP プロジェクト: **`yorisoi-senikintsu-syndo`**（プロジェクト番号 `857539795793`）  
Cloud Run サービス: **`yorisoi-phr-fm-test`**（リージョン `asia-northeast1`）

---

## 1. 別 PC でデプロイできなかった理由（整理）

別 PC では **複数の問題が重なって** 失敗していました。単一の設定ミスではありません。

### 原因 A: GCP プロジェクトに届いていなかった

| 症状 | 詳細 |
|------|------|
| 見えていたプロジェクトが違う | `gcloud` のアクティブアカウントが **`soeda@macbee.co.jp`** だと、**`onetag-staging` しか表示されない** |
| FM 用プロジェクトが見えない | FM テスト用は **`yorisoi-senikintsu-syndo`**。Owner 権限があるのは **`k.soeda.mediforce@gmail.com`** 側 |

**結論:** 会社用 Google アカウントと個人（medi-canvas）用アカウントが混在しており、**GCP にログインしているアカウントが違った**。

---

### 原因 B: GCP API が未有効（Cloud Run デプロイの前提不足）

| 症状 | エラーメッセージ例 |
|------|-------------------|
| Cloud Run API オフ | `PERMISSION_DENIED: Cloud Run Admin API has not been used in project ... SERVICE_DISABLED` |
| API 有効化も失敗 | `Permission denied to enable service [run.googleapis.com]` |

GitHub Actions 用サービスアカウント（`soeda-kei@...`）には **API を有効化する権限（Service Usage Admin）がなく**、ワークフlow 内の `gcloud services enable` も失敗していました。

**結論:** プロジェクト側で **Cloud Run / Cloud Build / Artifact Registry** が最初から有効化されていなかった。Owner アカウントで手動有効化が必要（2026-07-09 に本 PC から実施済み）。

---

### 原因 C: GitHub Actions のワークフロー YAML 構文エラー

コミット `ci: env-vars-file の YAML インデントを修正` 以降、CI が **0 秒で即失敗**（`workflow file issue`）。

`deploy-fm-test.yml` 内の heredoc（`<<EOF`）の行インデントが YAML パーサーと衝突し、**ワークフロー自体がパース不能**になっていました。

**結論:** デプロイコマンド以前に **GitHub Actions が起動できない** 状態だった（後述の修正で `--set-env-vars` 方式に変更済み）。

---

### 原因 D: 環境変数・シークレットがローカルに無かった

| 不足していたもの | 影響 |
|-----------------|------|
| リポジトリ内 `.env` | `GEMINI_API_KEY` が未設定で `./scripts/deploy-fm-test.sh` が即終了 |
| GitHub Secrets の IAM | `GCP_SA_KEY` の SA に Run Admin 等が不足（API 未有効と相まって CI 失敗） |

**結論:** `.env` は **git に含めない** ため、別 PC では **各自 `.env` を用意する** 必要がある（`.env.example` をコピー）。

---

### 原因 E: gcloud の対話プロンプトで止まった

API 未有効の状態で `gcloud run deploy` や `gcloud run services list` を実行すると:

```
Would you like to enable and retry (this will take a few minutes)? (y/N)?
```

**非対話環境・Cursor ターミナルでは入力待ちのまま固まる** ことがあります。

**結論:** 先に API を `--quiet` 付きで有効化するか、Owner アカウントで Console から有効化してからデプロイする。

---

### 原因 F: GitHub push 権限

`kei-soeda` アカウントでは `Keeeeei-Soeda/yorisoi_phr` へ push できず **403**。

**結論:** push は **`gh auth switch --user Keeeeei-Soeda`** でアカウントを切り替える。

---

### 原因 G: `setup-fm-dev.sh` が ripgrep (`rg`) に依存していた（2026-07-10・2台目 Mac）

| 症状 | 詳細 |
|------|------|
| スクリプト実行時にエラー | `./scripts/setup-fm-dev.sh: line 148: rg: command not found` |
| 誤った判定 | API チェック・稼働確認が **実行されず**、実際には有効な API が「❌ 未有効」と表示される |
| 環境 | Homebrew 未導入・`rg` 未インストールの macOS |

**結論:** セットアップ確認スクリプトが **開発者向けツール（ripgrep）を必須** にしていたのが原因。macOS 標準の `grep` に置き換えて修正（コミット `896a569`）。

---

### 原因 H: API 有効判定が gcloud の出力形式と不一致（2026-07-10）

| 症状 | 詳細 |
|------|------|
| API は有効なのに ❌ | `run.googleapis.com` 等が「未有効」と表示される |
| 実際の gcloud 出力 | `projects/857539795793/services/run.googleapis.com`（フルパス） |
| 旧ロジック | 短い名前 `run.googleapis.com` との **完全一致** のみを成功とみなしていた |

**結論:** Cloud Run が既に稼働しているのにローカルチェックだけ失敗する **偽陽性**。フルパス末尾一致（`*${api}`）で判定するよう修正（コミット `896a569`）。

---

### 参考: 2台目 Mac で追加で必要だった環境整備（問題というより前提）

Homebrew が無い環境では、以下を **手動で PATH に載せる** 必要がありました（`scripts/env-bootstrap.sh` でまとめて設定）。

| 項目 | 内容 |
|------|------|
| Python 3.12 | `gcloud` が古い macOS 付属 Python で動かないため `CLOUDSDK_PYTHON` を指定 |
| Node.js v20 | `npm install` / `npm run dev` 用（`~/.local/node-v20` 等） |
| gcloud SDK | `~/google-cloud-sdk/bin` を PATH に追加 |
| `.env` | `./scripts/sync-env-from-cloudrun.sh` で Cloud Run から `GEMINI_API_KEY` を同期（`.env.bak` が生成されるが **git に含めない**） |
| gh CLI | **任意**（未インストールでも HTTPS で push 可能。警告のみ） |

---

## 2. 本 PC で成功した条件（参考）

以下が揃ったため、2026-07-09 にローカルデプロイが成功しました。

1. `gcloud config set account k.soeda.mediforce@gmail.com`
2. `gcloud config set project yorisoi-senikintsu-syndo`
3. 必要 API を Owner 権限で有効化
4. 別リポジトリの `.env` から `GEMINI_API_KEY` を読み込み
5. `./scripts/deploy-fm-test.sh` を実行

### 2.1 2台目 Mac（2026-07-10）で成功した条件

1. ポータブル Python 3.12 + Node v20 + gcloud SDK を `scripts/env-bootstrap.sh` で PATH 化
2. `gcloud auth login k.soeda.mediforce@gmail.com` → プロジェクト `yorisoi-senikintsu-syndo` 設定
3. `./scripts/sync-env-from-cloudrun.sh` で `.env` / `GEMINI_API_KEY` 同期
4. `./scripts/setup-fm-dev.sh` 実行 — **原因 G・H 修正後** に全 ✅（gh CLI の ⚠️ のみ）
5. 患者テスト URL で稼働確認済み（ローカル `npm run dev` も可）

**患者テスト URL（確定）:**

```
https://yorisoi-phr-fm-test-o7flbqc5ka-an.a.run.app?disease=fm
```

---

## 3. 別 PC セットアップ手順（推奨フロー）

### 3.1 前提ソフトウェア

**Homebrew がある場合:**

```bash
brew install --cask google-cloud-sdk
brew install gh          # 任意（HTTPS push なら不要）
brew install node@20     # ローカル開発時
```

**Homebrew が無い場合:** `scripts/env-bootstrap.sh` が gcloud / Node の PATH を設定します。Python 3.12 と gcloud SDK は各自 `~/.local/` 等に配置（詳細は §1 原因 G 付近の「参考: 2台目 Mac」表を参照）。

### 3.2 リポジトリ取得

```bash
git clone https://github.com/Keeeeei-Soeda/yorisoi_phr.git
cd yorisoi_phr
git checkout feature/fm-photo-medication
git pull origin feature/fm-photo-medication
```

### 3.3 GitHub CLI（push 用）

```bash
gh auth login
gh auth switch --user Keeeeei-Soeda   # 403 が出る場合
gh auth status
```

### 3.4 Google Cloud CLI

```bash
gcloud auth login k.soeda.mediforce@gmail.com
gcloud config set account k.soeda.mediforce@gmail.com
gcloud config set project yorisoi-senikintsu-syndo

# 確認（yorisoi-senikintsu-syndo が一覧に出ること）
gcloud projects list
```

### 3.5 環境変数ファイル

```bash
cp .env.example .env

# 方法A: Cloud Run から同期（推奨・gcloud ログイン後）
source scripts/env-bootstrap.sh
gcloud auth login k.soeda.mediforce@gmail.com
gcloud config set project yorisoi-senikintsu-syndo
./scripts/sync-env-from-cloudrun.sh

# 方法B: 手動で .env を編集
#   GEMINI_API_KEY=（Google AI Studio で取得）
#   GOOGLE_CLOUD_PROJECT=yorisoi-senikintsu-syndo
```

`.env` は **絶対に git commit しない**（`.gitignore` 済み）。

### 3.5.1 ツール PATH（Cursor / 非 Homebrew 環境）

```bash
source scripts/env-bootstrap.sh   # gcloud + Node の PATH を設定
```

### 3.6 セットアップ確認（自動チェック）

```bash
./scripts/setup-fm-dev.sh
```

すべて ✅ になればデプロイ可能です。`gh CLI がありません` は **警告のみ**（必須ではない）。

**よくある誤判定（修正済み）:** `rg: command not found` や API「未有効」3件 → 最新の `feature/fm-photo-medication` を `git pull` して `./scripts/setup-fm-dev.sh` を再実行。

### 3.7 デプロイ

```bash
set -a && source .env && set +a
export GCP_PROJECT_ID=yorisoi-senikintsu-syndo
./scripts/deploy-fm-test.sh
```

成功すると **患者テスト URL** が表示されます:

```
https://yorisoi-phr-fm-test-....asia-northeast1.run.app?disease=fm
```

### 3.8 ローカル開発（任意）

```bash
npm install
set -a && source .env && set +a
export GOOGLE_CLOUD_PROJECT=yorisoi-senikintsu-syndo
export DEMO_MODE=1
npm run dev
# http://localhost:8080/?disease=fm
```

---

## 4. GitHub Actions（CI）でデプロイする場合

Repository → **Settings → Secrets and variables → Actions** に以下を設定:

| Secret 名 | 値 |
|-----------|-----|
| `GCP_PROJECT_ID` | `yorisoi-senikintsu-syndo` |
| `GEMINI_API_KEY` | Gemini API キー |
| `GCP_SA_KEY` | デプロイ用 SA の JSON 全文 |
| `ALLOW_ORIGIN` | （任意）CORS 許可オリジン |

デプロイ用サービスアカウントに推奨ロール:

- `roles/run.admin`
- `roles/cloudbuild.builds.editor`
- `roles/artifactregistry.admin`
- `roles/iam.serviceAccountUser`
- （初回のみ API 有効化が必要なら）`roles/serviceusage.serviceUsageAdmin` **または** Owner が Console で API を有効化済み

手動実行: GitHub → Actions → **Deploy FM Test (Cloud Run)** → **Run workflow**

---

## 5. トラブルシューティング早見表

| 現象 | 対処 |
|------|------|
| `GCP_PROJECT_ID を設定してください` | `.env` を作るか `export GCP_PROJECT_ID=yorisoi-senikintsu-syndo` |
| `GEMINI_API_KEY を設定してください` | `.env` にキーを設定、または `./scripts/sync-env-from-cloudrun.sh` |
| プロジェクト一覧に FM プロジェクトが無い | `gcloud auth login k.soeda.mediforce@gmail.com` で再ログイン |
| `(y/N)?` で止まる | `./scripts/setup-fm-dev.sh --fix-apis` または Owner で Console から API 有効化 |
| `rg: command not found` | `git pull` 後 `./scripts/setup-fm-dev.sh` 再実行（`896a569` 以降は `grep` 使用） |
| API 3件「未有効」だが Cloud Run は動いている | 同上（フルパス判定の修正済み）。手動確認: `gcloud services list --enabled --filter="name:run.googleapis.com"` |
| `gcloud` が Python エラーで起動しない | `source scripts/env-bootstrap.sh`（`CLOUDSDK_PYTHON` 設定） |
| `gh CLI がありません` | 無視可。CLI が欲しければ `brew install gh` |
| GitHub push 403 | `gh auth switch --user Keeeeei-Soeda` |
| CI が 0 秒で失敗 | ワークフロー YAML 構文を確認（最新版では heredoc 問題を修正済み） |
| 写真抽出 503 | Cloud Run の `GEMINI_API_KEY` 環境変数を確認 |

---

## 6. 関連ファイル

| ファイル | 用途 |
|----------|------|
| `scripts/setup-fm-dev.sh` | 別 PC セットアップ自動チェック |
| `scripts/env-bootstrap.sh` | gcloud / Node の PATH 設定 |
| `scripts/sync-env-from-cloudrun.sh` | Cloud Run から GEMINI_API_KEY を .env に同期 |
| `scripts/deploy-fm-test.sh` | Cloud Run デプロイ |
| `.env.example` | 環境変数テンプレート |
| `.github/workflows/deploy-fm-test.yml` | GitHub Actions デプロイ |
| `docs/fm-patient-test-changes.md` | 機能変更履歴 |

---

## 7. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-07-10 | 初版（別 PC 失敗原因の整理・セットアップ手順） |
| 2026-07-10 | 2台目 Mac セットアップ問題（原因 G・H）とトラブルシューティング追記 |
