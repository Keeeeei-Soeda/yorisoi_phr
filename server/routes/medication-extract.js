/**
 * POST /api/medications/extract
 * 画像から服薬情報を抽出する（保存しない・ユーザー確認必須）
 */

const express = require("express");
const { hasApiKey } = require("../lib/gemini");
const { extractMedicationsFromImage } = require("../lib/medication-extract");

const router = express.Router();

router.use(express.json({ limit: "30mb" }));

router.use((req, res, next) => {
  if (!hasApiKey()) {
    return res.status(503).json({ error: "Gemini API key not configured" });
  }
  next();
});

router.post("/extract", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "image required" });
    }

    const result = await extractMedicationsFromImage(image);
    res.json(result);
  } catch (err) {
    console.error("POST /medications/extract error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
