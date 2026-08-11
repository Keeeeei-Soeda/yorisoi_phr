/**
 * ALS 共通: 代理入力（本人 / 介護者）フラグ
 * Phase 1 はフラグのみ。権限分離はしない。
 */

const ENTERED_BY_KEY = "yorisoi_entered_by";

function getEnteredBy() {
  try {
    const v = localStorage.getItem(ENTERED_BY_KEY);
    if (v === "caregiver" || v === "self") return v;
  } catch (_) {}
  return "self";
}

function setEnteredBy(value) {
  const v = value === "caregiver" ? "caregiver" : "self";
  try { localStorage.setItem(ENTERED_BY_KEY, v); } catch (_) {}
  return v;
}

function enteredByLabel(value) {
  return value === "caregiver" ? "介護者" : "本人";
}

/** 簡易トグル UI を container に描画 */
function mountEnteredByToggle(container, { onChange } = {}) {
  if (!container) return;
  const current = getEnteredBy();
  container.innerHTML = `
    <div class="entered-by-row" role="group" aria-label="記録した人">
      <span class="entered-by-caption">記録した人</span>
      <button type="button" class="entered-by-btn${current === "self" ? " active" : ""}" data-entered-by="self">本人</button>
      <button type="button" class="entered-by-btn${current === "caregiver" ? " active" : ""}" data-entered-by="caregiver">介護者</button>
    </div>`;
  container.querySelectorAll("[data-entered-by]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = setEnteredBy(btn.dataset.enteredBy);
      container.querySelectorAll("[data-entered-by]").forEach((b) => {
        b.classList.toggle("active", b.dataset.enteredBy === v);
      });
      if (onChange) onChange(v);
    });
  });
}

const OCR_CONSENT_KEY = "yorisoi_als_lab_ocr_consent";

function hasLabOcrConsent() {
  try { return localStorage.getItem(OCR_CONSENT_KEY) === "1"; } catch (_) { return false; }
}

function setLabOcrConsent(ok) {
  try {
    if (ok) localStorage.setItem(OCR_CONSENT_KEY, "1");
    else localStorage.removeItem(OCR_CONSENT_KEY);
  } catch (_) {}
}

/**
 * OCR 送信前の同意。既同意なら即 resolve(true)。
 * @returns {Promise<boolean>}
 */
function ensureLabOcrConsent() {
  if (hasLabOcrConsent()) return Promise.resolve(true);

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "als-consent-overlay";
    overlay.innerHTML = `
      <div class="als-consent-sheet" role="dialog" aria-modal="true">
        <h2>検査値写真の取扱いについて</h2>
        <p>検査結果の写真には、氏名・患者番号・施設名などが写り込むことがあります（要配慮個人情報）。</p>
        <ul>
          <li>数値の転記補助のため、画像を外部の Vision API（Gemini）へ送信します</li>
          <li>AI は診断・評価を行わず、数値の読み取りのみです</li>
          <li>撮影時は氏名・患者番号・施設名を紙などで隠すことをおすすめします</li>
          <li>写真は記録の原本として保存し、あとから確認できます</li>
        </ul>
        <p class="als-consent-note">詳細はアプリ内ドキュメント「ALS 検査値写真の取り扱い」に準拠します。同意は画面からいつでも撤回できます。</p>
        <button type="button" class="btn btn-primary" id="als-consent-ok">同意して続ける</button>
        <button type="button" class="btn btn-outline" id="als-consent-ng" style="margin-top:8px;">同意しない</button>
      </div>`;
    document.body.appendChild(overlay);
    const close = (ok) => {
      document.body.removeChild(overlay);
      if (ok) setLabOcrConsent(true);
      resolve(ok);
    };
    overlay.querySelector("#als-consent-ok").addEventListener("click", () => close(true));
    overlay.querySelector("#als-consent-ng").addEventListener("click", () => close(false));
  });
}
