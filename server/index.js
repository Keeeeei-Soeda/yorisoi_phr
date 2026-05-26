const path = require("path");

// --- .env 読み込み（複数の場所から探す） ---
const envCandidates = [
  path.join(__dirname, "../.env"),                 // yorisoi-phr/.env
  path.join(__dirname, "../../secure/.env"),        // patient/secure/.env ★
];
for (const envPath of envCandidates) {
  try {
    const fs = require("fs");
    if (fs.existsSync(envPath)) {
      require("dotenv").config({ path: envPath });
      console.log("Loaded env from:", envPath);
      break;
    }
  } catch (e) {}
}

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || "*";
const DEMO_MODE = process.env.DEMO_MODE === "1" || !process.env.GOOGLE_CLOUD_PROJECT;

// --- Middleware ---
app.use(cors({ origin: ALLOW_ORIGIN }));
app.use(express.json({ limit: "30mb" }));

// 静的ファイル配信（LIFF フロントエンド）
app.use(express.static(path.join(__dirname, "../public")));

// --- AI補助ルート（デモ/本番どちらでも動作） ---
try {
  const aiRoutes = require("./routes/ai");
  app.use("/api/ai", aiRoutes);
  console.log("AI routes loaded");
} catch (err) {
  console.warn("AI routes not loaded:", err.message);
}

// --- 公衆トイレ オープンデータ（認証不要・デモ/本番共通） ---
try {
  const restroomRoutes = require("./routes/restrooms");
  app.use(restroomRoutes);
  console.log("Restroom (Osaka open data) routes loaded");
} catch (err) {
  console.warn("Restroom routes not loaded:", err.message);
}

// --- 食事写真メモ（認証不要・デモ/本番共通） ---
try {
  const mealsRoutes = require("./routes/meals");
  app.use(mealsRoutes);
  console.log("Meals routes loaded");
} catch (err) {
  console.warn("Meals routes not loaded:", err.message);
}

// --- yorisoi-talk SubApp マウント（話す/気づく/次の一歩） ---
// 名前空間: /talk/* (静的) + /api/talk/* (API)
try {
  const talkApp = require("../../yorisoi-talk/server/talk-app");
  app.use(talkApp);
  console.log("yorisoi-talk subapp mounted at /talk and /api/talk");
} catch (err) {
  console.warn("yorisoi-talk subapp not loaded:", err.message);
}

if (DEMO_MODE) {
  // --- デモモード: Firestore不要、サンプルデータで動作 ---
  console.log("*** DEMO MODE — using mock data (no Firestore) ***");
  const demoRoutes = require("./routes/demo");
  app.use(demoRoutes);
} else {
  // --- 本番モード: Firestore接続 ---
  const timelineRoutes = require("./routes/timeline");
  const medicationRoutes = require("./routes/medications");
  const symptomRoutes = require("./routes/symptoms");
  const profileRoutes = require("./routes/profile");
  const summaryRoutes = require("./routes/summary");
  const visitsRoutes = require("./routes/visits");
  const clinicsRoutes = require("./routes/clinics");

  app.use("/api/profile", profileRoutes);
  app.use("/api/timeline", timelineRoutes);
  app.use("/api/medications", medicationRoutes);
  app.use("/api/symptoms", symptomRoutes);
  app.use("/api/summary", summaryRoutes);
  app.use("/api/visits", visitsRoutes);
  app.use("/api/clinics", clinicsRoutes);

  // 薬剤マスタ（認証不要の公開エンドポイント）
  app.get("/api/master/medications", (_req, res) => {
    const master = require("../data/medication-master.json");
    res.json(master);
  });

  // ヘルスチェック
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
}

// SPA フォールバック（LIFF内の画面遷移用）
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`yorisoi-phr server listening on port ${PORT}${DEMO_MODE ? " [DEMO]" : ""}`);
});
