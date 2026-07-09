const express = require("express");
const { userRef } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyLiffToken);

// GET /api/symptoms — 症状記録一覧（日付降順、デフォルト30日分）
router.get("/", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const snap = await userRef(req.lineUserId)
      .collection("symptom_logs")
      .where("date", ">=", sinceStr)
      .orderBy("date", "desc")
      .get();

    const logs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(logs);
  } catch (err) {
    console.error("GET /symptoms error:", err);
    res.status(500).json({ error: "Failed to fetch symptom logs" });
  }
});

// GET /api/symptoms/today — 今日の記録を取得
router.get("/today", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const doc = await userRef(req.lineUserId)
      .collection("symptom_logs")
      .doc(today)
      .get();

    if (!doc.exists) {
      return res.json(null);
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("GET /symptoms/today error:", err);
    res.status(500).json({ error: "Failed to fetch today's log" });
  }
});

// GET /api/symptoms/summary — 直近N日間のサマリー（診察用）
router.get("/summary", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const snap = await userRef(req.lineUserId)
      .collection("symptom_logs")
      .where("date", ">=", sinceStr)
      .orderBy("date", "desc")
      .get();

    const logs = snap.docs.map((d) => d.data());

    if (logs.length === 0) {
      return res.json({ days, count: 0, avgBowelCount: null, bleedingDays: 0, avgPainScore: null, logs: [] });
    }

    const avgBowelCount = logs.reduce((s, l) => s + (l.bowelCount || 0), 0) / logs.length;
    const bleedingDays = logs.filter((l) => l.bleeding).length;
    const painLogs = logs.filter((l) => l.painScore != null);
    const avgPainScore = painLogs.length > 0
      ? painLogs.reduce((s, l) => s + l.painScore, 0) / painLogs.length
      : null;

    res.json({
      days,
      count: logs.length,
      avgBowelCount: Math.round(avgBowelCount * 10) / 10,
      bleedingDays,
      avgPainScore: avgPainScore != null ? Math.round(avgPainScore * 10) / 10 : null,
      logs,
    });
  } catch (err) {
    console.error("GET /symptoms/summary error:", err);
    res.status(500).json({ error: "Failed to fetch symptom summary" });
  }
});

// POST /api/symptoms — 記録追加・更新（日付をIDとして使用）
router.post("/", async (req, res) => {
  try {
    const {
      date, bowelCount, bristolScale, bleeding, painScore, memo,
      // FM専用フィールド
      overallPain, overallPainLabel, mood, moodLabel,
      bodyPains, pressureHpa, temperatureC, tags,
    } = req.body;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const data = { date: targetDate, updatedAt: new Date() };

    // IBD系フィールド（任意）
    if (bowelCount != null) data.bowelCount = parseInt(bowelCount);
    if (bristolScale != null) data.bristolScale = parseInt(bristolScale);
    if (bleeding != null) data.bleeding = !!bleeding;
    if (painScore != null) data.painScore = parseInt(painScore);
    if (memo != null) data.memo = memo;

    // FM専用フィールド（任意）
    if (overallPain != null) data.overallPain = parseInt(overallPain);
    if (overallPainLabel != null) data.overallPainLabel = String(overallPainLabel);
    if (mood != null) data.mood = parseInt(mood);
    if (moodLabel != null) data.moodLabel = String(moodLabel);
    if (bodyPains != null) data.bodyPains = bodyPains;
    if (pressureHpa != null) data.pressureHpa = parseFloat(pressureHpa);
    if (temperatureC != null) data.temperatureC = parseFloat(temperatureC);
    if (Array.isArray(tags)) data.tags = tags;

    await userRef(req.lineUserId)
      .collection("symptom_logs")
      .doc(targetDate)
      .set(data, { merge: true });

    res.status(201).json({ id: targetDate, ...data });
  } catch (err) {
    console.error("POST /symptoms error:", err);
    res.status(500).json({ error: "Failed to save symptom log" });
  }
});

// DELETE /api/symptoms/:date — 記録削除
router.delete("/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const ref = userRef(req.lineUserId).collection("symptom_logs").doc(date);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Log not found" });
    }
    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /symptoms error:", err);
    res.status(500).json({ error: "Failed to delete symptom log" });
  }
});

module.exports = router;
