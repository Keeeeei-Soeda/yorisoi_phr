/**
 * LIFF 初期化 & 認証 & テンプレートエンジン
 */

const LIFF_ID = "YOUR_LIFF_ID";
const API_BASE = "";

let _idToken = null;
let _userId = null;
let _isDemoMode = false;
let _diseaseId = null;
let _template = null;

// --- 疾患IDの取得（URLパラメータ or localStorage） ---
function getCurrentDiseaseId() {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get("disease");
  if (fromUrl) {
    localStorage.setItem("yorisoi_disease", fromUrl);
    return fromUrl;
  }
  return localStorage.getItem("yorisoi_disease") || "uc";
}

/**
 * LIFF初期化 + テンプレート読み込み
 */
async function initLiff() {
  _diseaseId = getCurrentDiseaseId();

  // LIFF SDK 判定
  if (typeof liff === "undefined" || LIFF_ID === "YOUR_LIFF_ID") {
    _isDemoMode = true;
    _idToken = "demo-token";
    _userId = "demo-user";
  } else {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) { liff.login(); return; }
    _idToken = liff.getIDToken();
    const profile = await liff.getProfile();
    _userId = profile.userId;
  }

  // テンプレート読み込み
  _template = await apiGet(`/api/config?disease=${_diseaseId}`);

  // 詳細モード画面 (/simple/ 配下以外) で簡単モード文脈なら、ヘッダーに「←かんたんに戻る」を差し込む
  if (!location.pathname.startsWith("/simple/")) {
    try { attachSimpleBackBadge(); } catch (_) {}
  }

  return { idToken: _idToken, userId: _userId, diseaseId: _diseaseId, template: _template };
}

/** 現在のテンプレートを取得 */
function getTemplate() { return _template; }
function getDiseaseId() { return _diseaseId; }

/**
 * 表示モードの取得 ('simple' | 'detail')
 * - localStorage.yorisoi_mode が明示されていればそれを返す
 * - 未設定で yorisoi_setup_done='1' なら既存ユーザ → 'detail' で後方互換
 * - それ以外（新規 / setup未完了） → 'simple' を既定
 */
function getCurrentMode() {
  const stored = localStorage.getItem("yorisoi_mode");
  if (stored === "simple" || stored === "detail") return stored;
  if (localStorage.getItem("yorisoi_setup_done") === "1") return "detail";
  return "simple";
}

function setMode(mode) {
  if (mode !== "simple" && mode !== "detail") return;
  localStorage.setItem("yorisoi_mode", mode);
}

// --- API ヘルパー ---

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${_idToken}`,
    "X-Disease-Id": _diseaseId || "uc",
    ...(options.headers || {}),
  };
  // disease パラメータを自動付与
  const url = new URL(`${API_BASE}${path}`, location.origin);
  if (!url.searchParams.has("disease")) url.searchParams.set("disease", _diseaseId || "uc");

  const res = await fetch(url.toString(), { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  return res.json();
}

function apiGet(path) { return apiFetch(path); }
function apiPost(path, data) { return apiFetch(path, { method: "POST", body: JSON.stringify(data) }); }
function apiPut(path, data) { return apiFetch(path, { method: "PUT", body: JSON.stringify(data) }); }
function apiDelete(path) { return apiFetch(path, { method: "DELETE" }); }

// --- 表示ヘルパー ---

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatYearMonth(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

/** テンプレートからカテゴリラベルマップを生成 */
function getCategoryLabels() {
  if (!_template || !_template.timelineCategories) return {};
  const map = {};
  _template.timelineCategories.forEach((c) => { map[c.id] = c.label; });
  return map;
}

/** テンプレートから薬カテゴリラベルを取得（薬剤マスタから） */
let _medCategoryLabels = null;
async function getMedCategoryLabels() {
  if (_medCategoryLabels) return _medCategoryLabels;
  try {
    const master = await apiGet("/api/master/medications");
    _medCategoryLabels = {};
    if (master.categories) master.categories.forEach((c) => { _medCategoryLabels[c.id] = c.name; });
    return _medCategoryLabels;
  } catch {
    return {};
  }
}

// 後方互換（既存画面用）
const CATEGORY_LABELS = {
  diagnosis: "診断", hospitalization: "入院", medication_change: "薬変更",
  exam: "検査", treatment_change: "治療方針変更", other: "その他",
};
const MED_CATEGORY_LABELS = {
  "5-ASA": "5-ASA製剤", steroid: "ステロイド", immunomodulator: "免疫調節薬",
  biologic: "生物学的製剤", jak_inhibitor: "JAK阻害薬", other: "その他",
};

function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p class="mt-8 text-sm text-muted">読み込み中...</p></div>';
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

/**
 * 戻り先 URL を判定する。
 * - URL クエリ ?from=simple または現在モードが simple なら /simple/ に戻る
 * - それ以外（くわしいモードでアクセス中）は / （詳細モードホーム）に戻る
 * disease クエリは引き継ぐ。
 */
function getBackHref() {
  const params = new URLSearchParams(location.search);
  const from = params.get("from");
  const isSimpleContext = from === "simple" || getCurrentMode() === "simple";
  const disease = params.get("disease") || _diseaseId || localStorage.getItem("yorisoi_disease");
  const q = disease ? "?disease=" + encodeURIComponent(disease) + (isSimpleContext ? "&from=simple" : "") : "";
  return (isSimpleContext ? "/simple/" : "/") + (isSimpleContext ? q.replace("&from=simple","") : q);
}

/**
 * 詳細モード画面のヘッダーに「← かんたんに戻る」バッジを差し込む。
 * 簡単モード文脈のとき（?from=simple または getCurrentMode()==='simple'）のみ表示。
 */
function attachSimpleBackBadge() {
  const params = new URLSearchParams(location.search);
  const from = params.get("from");
  const isSimpleContext = from === "simple" || getCurrentMode() === "simple";
  if (!isSimpleContext) return;
  // 既存の戻るボタンを置き換える
  const back = document.querySelector(".header-back");
  if (back) {
    back.innerHTML = "←";
    back.title = "かんたんモードに戻る";
    back.onclick = () => { location.href = getBackHref(); };
  }
  // ヘッダーにバッジを追加
  const header = document.querySelector(".header");
  if (header && !header.querySelector(".simple-mode-badge")) {
    const badge = document.createElement("a");
    badge.className = "simple-mode-badge";
    badge.href = getBackHref();
    badge.style.cssText = "margin-left:auto; padding:4px 10px; background:rgba(255,255,255,0.2); color:#fff; font-size:11px; border-radius:12px; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px;";
    badge.innerHTML = "← かんたんに戻る";
    header.appendChild(badge);
  }
}

/**
 * メニューグリッドを動的生成
 */
function renderMenuGrid(containerId) {
  if (!_template || !_template.modules) return;
  const container = document.getElementById(containerId);
  if (!container) return;

  const enabledModules = _template.modules.filter((m) => m.enabled);
  let html = "";

  enabledModules.forEach((mod) => {
    const diseaseParam = `?disease=${_diseaseId}`;
    const href = mod.page + (mod.page.includes("?") ? "&" : "") + diseaseParam.slice(1);
    const fullWidth = mod.fullWidth ? ' style="grid-column: 1 / -1;"' : "";
    html += `
      <a href="/${href}" class="menu-card"${fullWidth}>
        <div class="menu-icon"><span class="material-symbols-outlined">${mod.icon}</span></div>
        <div class="menu-label">${escapeHtml(mod.label)}</div>
        <div class="menu-desc">${escapeHtml(mod.description)}</div>
      </a>`;
  });

  container.innerHTML = html;
}
