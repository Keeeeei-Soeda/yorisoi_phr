/**
 * ホーム画面ウィジェット（気圧・クイック気分記録）
 * テンプレートの homeConfig に従って表示
 */

const DEFAULT_GEO = { lat: 35.6812, lon: 139.7671, label: "東京" };
const GEO_STORAGE_KEY = "yorisoi_geo";

async function resolveGeoLocation() {
  try {
    const stored = localStorage.getItem(GEO_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}

  if (!navigator.geolocation) return DEFAULT_GEO;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(DEFAULT_GEO), 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        const geo = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: "現在地",
        };
        try { localStorage.setItem(GEO_STORAGE_KEY, JSON.stringify(geo)); } catch (_) {}
        resolve(geo);
      },
      () => {
        clearTimeout(timer);
        resolve(DEFAULT_GEO);
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 }
    );
  });
}

async function fetchBarometerData(lat, lon) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "surface_pressure");
  url.searchParams.set("hourly", "surface_pressure");
  url.searchParams.set("timezone", "Asia/Tokyo");
  url.searchParams.set("forecast_days", "2");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("気圧データの取得に失敗しました");
  const data = await res.json();

  const current = Math.round(data.current?.surface_pressure || 0);
  const hourly = data.hourly?.surface_pressure || [];
  const times = data.hourly?.time || [];

  let yesterdaySameHour = null;
  if (hourly.length > 24 && times.length > 24) {
    const now = Date.now();
    let hourIdx = times.findIndex((t) => Math.abs(new Date(t).getTime() - now) < 3600000);
    if (hourIdx < 0) hourIdx = times.length - 1;
    if (hourIdx >= 24) yesterdaySameHour = Math.round(hourly[hourIdx - 24]);
  }

  const delta = yesterdaySameHour != null ? current - yesterdaySameHour : null;
  let trendLabel = "";
  let trendClass = "neutral";
  if (delta != null) {
    if (delta <= -3) {
      trendLabel = `前日比 ${delta} hPa（下降）`;
      trendClass = "down";
    } else if (delta >= 3) {
      trendLabel = `前日比 +${delta} hPa（上昇）`;
      trendClass = "up";
    } else {
      trendLabel = `前日比 ${delta >= 0 ? "+" : ""}${delta} hPa`;
      trendClass = "neutral";
    }
  }

  return { current, trendLabel, trendClass, locationLabel: null };
}

const PAIN_COLORS = ["", "#60a5fa", "#34d399", "#fbbf24", "#fb923c", "#f87171"];

function renderHomeWidgets(container, template) {
  const config = template.homeConfig;
  if (!config?.barometer && !config?.painButtons?.length && !config?.moodButtons?.length) return;

  let html = '<div class="home-widgets-inner">';

  if (config.barometer) {
    html += `
      <div class="home-widget-card barometer-card" id="barometer-card">
        <div class="home-widget-title">
          <span class="material-symbols-outlined">air</span>
          今日の気圧
        </div>
        <div class="barometer-value" id="barometer-value">読み込み中...</div>
        <div class="barometer-sub" id="barometer-sub"></div>
      </div>`;
  }

  if (config.painButtons?.length) {
    html += `
      <div class="home-widget-card pain-card">
        <div class="home-widget-title">
          <span class="material-symbols-outlined">sentiment_very_dissatisfied</span>
          今日の痛みは？
        </div>
        <p class="pain-hint">1タップで記録できます</p>
        <div class="pain-buttons" id="pain-buttons">
          ${config.painButtons.map((b) => `
            <button type="button" class="pain-btn" data-pain-value="${b.value}"
              data-pain-label="${escapeHtml(b.label)}"
              style="--pain-color:${PAIN_COLORS[b.value] || "#94a3b8"}">
              <span class="pain-num">${b.value}</span>
              <span class="pain-label">${escapeHtml(b.label)}</span>
            </button>
          `).join("")}
        </div>
        <div class="pain-status hidden" id="pain-status"></div>
      </div>`;
  }

  if (config.moodButtons?.length) {
    html += `
      <div class="home-widget-card mood-card">
        <div class="home-widget-title">
          <span class="material-symbols-outlined">mood</span>
          きょうの気分
        </div>
        <p class="mood-hint">タップするだけで記録できます</p>
        <div class="mood-buttons" id="mood-buttons">
          ${config.moodButtons.map((b) => `
            <button type="button" class="mood-btn" data-mood-id="${escapeHtml(b.id)}"
              data-mood-label="${escapeHtml(b.label)}" data-mood-score="${b.value}">
              <span class="mood-emoji">${b.emoji || ""}</span>
              <span class="mood-label">${escapeHtml(b.label)}</span>
            </button>
          `).join("")}
        </div>
        <div class="mood-status hidden" id="mood-status"></div>
      </div>`;
  }

  html += "</div>";
  container.innerHTML = html;
  container.classList.remove("hidden");
}

async function initBarometerWidget() {
  const valueEl = document.getElementById("barometer-value");
  const subEl = document.getElementById("barometer-sub");
  if (!valueEl) return;

  try {
    const geo = await resolveGeoLocation();
    const data = await fetchBarometerData(geo.lat, geo.lon);
    valueEl.textContent = `${data.current} hPa`;
    valueEl.classList.remove("loading");

    const parts = [];
    if (data.trendLabel) {
      parts.push(`<span class="barometer-trend ${data.trendClass}">${escapeHtml(data.trendLabel)}</span>`);
    }
    parts.push(`<span class="barometer-loc">${escapeHtml(geo.label)}付近</span>`);
    subEl.innerHTML = parts.join(" · ");
  } catch (err) {
    console.warn("Barometer fetch failed:", err);
    valueEl.textContent = "—";
    subEl.textContent = "気圧を取得できませんでした";
  }
}

async function loadTodayMood() {
  try {
    const log = await apiGet("/api/symptoms/today");
    if (!log?.mood) return null;
    return log;
  } catch (_) {
    return null;
  }
}

function highlightMoodButton(moodId) {
  document.querySelectorAll(".mood-btn").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.moodId === moodId);
  });
}

function showMoodStatus(message, isError) {
  const el = document.getElementById("mood-status");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden", "error", "success");
  el.classList.add(isError ? "error" : "success");
}

async function saveQuickMood(moodId, moodLabel, moodScore) {
  const today = new Date().toISOString().slice(0, 10);
  let existing = {};
  try {
    existing = (await apiGet("/api/symptoms/today")) || {};
  } catch (_) {}

  const payload = {
    ...existing,
    date: today,
    mood: moodId,
    moodLabel,
    moodScore,
    quickMoodAt: new Date().toISOString(),
  };

  await apiPost("/api/symptoms", payload);
  highlightMoodButton(moodId);
  showMoodStatus(`「${moodLabel}」を記録しました`, false);
}

function highlightPainButton(value) {
  document.querySelectorAll(".pain-btn").forEach((btn) => {
    btn.classList.toggle("selected", Number(btn.dataset.painValue) === Number(value));
  });
}

function showPainStatus(message, isError) {
  const el = document.getElementById("pain-status");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden", "error", "success");
  el.classList.add(isError ? "error" : "success");
}

async function saveQuickPain(value, label) {
  const today = new Date().toISOString().slice(0, 10);
  let existing = {};
  try { existing = (await apiGet("/api/symptoms/today")) || {}; } catch (_) {}
  await apiPost("/api/symptoms", { ...existing, date: today, overallPain: value, overallPainLabel: label });
  highlightPainButton(value);
  showPainStatus(`痛み「${label}（${value}）」を記録しました`, false);
}

function setupPainButtons() {
  const container = document.getElementById("pain-buttons");
  if (!container) return;

  container.addEventListener("click", async (e) => {
    const btn = e.target.closest(".pain-btn");
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    showPainStatus("保存中...", false);
    try {
      await saveQuickPain(Number(btn.dataset.painValue), btn.dataset.painLabel);
    } catch (err) {
      console.error(err);
      showPainStatus("保存に失敗しました", true);
    } finally {
      btn.disabled = false;
    }
  });

  apiGet("/api/symptoms/today").then((log) => {
    if (log?.overallPain) {
      highlightPainButton(log.overallPain);
      showPainStatus(`今日の痛みは「${log.overallPainLabel || log.overallPain}」で記録済み`, false);
    }
  }).catch(() => {});
}

function setupMoodButtons() {
  const container = document.getElementById("mood-buttons");
  if (!container) return;

  container.addEventListener("click", async (e) => {
    const btn = e.target.closest(".mood-btn");
    if (!btn || btn.disabled) return;

    const { moodId, moodLabel, moodScore } = btn.dataset;
    btn.disabled = true;
    showMoodStatus("保存中...", false);

    try {
      await saveQuickMood(moodId, moodLabel, parseInt(moodScore, 10));
    } catch (err) {
      console.error(err);
      showMoodStatus("保存に失敗しました", true);
    } finally {
      btn.disabled = false;
    }
  });

  loadTodayMood().then((log) => {
    if (log?.mood) {
      highlightMoodButton(log.mood);
      showMoodStatus(`今日は「${log.moodLabel || log.mood}」で記録済み`, false);
    }
  });
}

/**
 * @param {HTMLElement} container
 * @param {object} template
 */
async function initHomeWidgets(container, template) {
  if (!container || !template?.homeConfig) return;

  renderHomeWidgets(container, template);

  if (template.homeConfig.barometer) {
    initBarometerWidget();
  }
  if (template.homeConfig.painButtons?.length) {
    setupPainButtons();
  }
  if (template.homeConfig.moodButtons?.length) {
    setupMoodButtons();
  }
}

window.initHomeWidgets = initHomeWidgets;
