// 食事写真メモ API（デモ・本番共通）
// 「撮るだけ・分類しない」の原則。体調悪化時の振り返り用途。
// 画像はデモではメモリ保持、本番は Cloud Storage に置き換える前提

const express = require("express");
const router = express.Router();

router.use(express.json({ limit: "30mb" }));

// メモリ保存（デモ用）
const MEALS = [];

function isDataUriImage(s) {
  return typeof s === "string" && /^data:image\/(jpeg|png|webp|heic|heif|gif)/i.test(s);
}

router.get("/api/meals", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 200);
  const sorted = [...MEALS].sort((a, b) => (b.takenAt || "").localeCompare(a.takenAt || ""));
  res.json({
    count: MEALS.length,
    returned: Math.min(sorted.length, limit),
    items: sorted.slice(0, limit),
  });
});

router.post("/api/meals", (req, res) => {
  const { image, note, takenAt } = req.body || {};
  if (!image || !isDataUriImage(image)) {
    return res.status(400).json({ error: "image (data URI of jpeg/png/webp) is required" });
  }
  const item = {
    id: "meal-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    image,
    note: typeof note === "string" ? note.slice(0, 200) : "",
    takenAt: takenAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  MEALS.push(item);
  res.status(201).json(item);
});

router.delete("/api/meals/:id", (req, res) => {
  const idx = MEALS.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  MEALS.splice(idx, 1);
  res.json({ deleted: true });
});

module.exports = router;
