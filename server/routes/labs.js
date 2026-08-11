/**
 * ALS / 共通: 検査値 CRUD（写真・entered_by 対応）
 * デモ・本番の両方から使えるよう、Firestore実装をここに置く。
 * デモモードでは demo.js 側のインメモリ実装を優先してマウントする。
 */

const express = require("express");
const { userRef } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyLiffToken);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ENTERED_BY = new Set(["self", "caregiver"]);

function normalizeEnteredBy(v) {
  return ENTERED_BY.has(v) ? v : "self";
}

// GET /api/labs
router.get("/", async (req, res) => {
  try {
    const snap = await userRef(req.lineUserId)
      .collection("lab_results")
      .orderBy("date", "desc")
      .get();
    res.json(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    console.error("GET /labs error:", err);
    res.status(500).json({ error: "Failed to fetch labs" });
  }
});

// POST /api/labs
router.post("/", async (req, res) => {
  try {
    const {
      date,
      values,
      photo,
      entered_by,
      source,
      confirmed,
    } = req.body || {};

    if (!date || !DATE_RE.test(date)) {
      return res.status(400).json({ error: "date (YYYY-MM-DD) is required" });
    }
    if (!values || typeof values !== "object") {
      return res.status(400).json({ error: "values object is required" });
    }
    // silent auto-commit 防止: OCR 由来は confirmed 必須
    if (source === "ocr" && confirmed !== true) {
      return res.status(400).json({ error: "OCR results must be confirmed before save" });
    }

    const cleanValues = {};
    Object.entries(values).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") return;
      const n = parseFloat(v);
      if (!Number.isNaN(n)) cleanValues[k] = n;
    });

    const data = {
      date,
      values: cleanValues,
      photo: typeof photo === "string" ? photo : null,
      entered_by: normalizeEnteredBy(entered_by),
      source: source === "ocr" ? "ocr" : "manual",
      confirmed: confirmed === true || source !== "ocr",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await userRef(req.lineUserId).collection("lab_results").add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /labs error:", err);
    res.status(500).json({ error: "Failed to create lab result" });
  }
});

// DELETE /api/labs/:id
router.delete("/:id", async (req, res) => {
  try {
    const ref = userRef(req.lineUserId).collection("lab_results").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /labs error:", err);
    res.status(500).json({ error: "Failed to delete lab result" });
  }
});

module.exports = router;
