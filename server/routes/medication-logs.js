/**
 * ALS: 服薬ログ（登録済み薬のチェック）
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

// GET /api/medication-logs?date=YYYY-MM-DD
router.get("/", async (req, res) => {
  try {
    let query = userRef(req.lineUserId).collection("medication_logs").orderBy("date", "desc");
    if (req.query.date && DATE_RE.test(req.query.date)) {
      query = userRef(req.lineUserId)
        .collection("medication_logs")
        .where("date", "==", req.query.date);
    }
    const snap = await query.get();
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    logs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    res.json(logs);
  } catch (err) {
    console.error("GET /medication-logs error:", err);
    res.status(500).json({ error: "Failed to fetch medication logs" });
  }
});

// POST /api/medication-logs — { date, medicationIds: [], entered_by }
router.post("/", async (req, res) => {
  try {
    const { date, medicationIds, entered_by, note } = req.body || {};
    if (!date || !DATE_RE.test(date)) {
      return res.status(400).json({ error: "date (YYYY-MM-DD) is required" });
    }
    const ids = Array.isArray(medicationIds) ? medicationIds.filter(Boolean) : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: "medicationIds required" });
    }

    const data = {
      date,
      medicationIds: ids,
      note: typeof note === "string" ? note.slice(0, 200) : "",
      entered_by: normalizeEnteredBy(entered_by),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ref = await userRef(req.lineUserId).collection("medication_logs").add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /medication-logs error:", err);
    res.status(500).json({ error: "Failed to create medication log" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const ref = userRef(req.lineUserId).collection("medication_logs").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /medication-logs error:", err);
    res.status(500).json({ error: "Failed to delete medication log" });
  }
});

module.exports = router;
