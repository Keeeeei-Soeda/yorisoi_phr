/**
 * ALS: 軽量な診察記録（日付 + 次回聞きたいことメモ）
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

router.get("/", async (req, res) => {
  try {
    const snap = await userRef(req.lineUserId)
      .collection("consultations")
      .orderBy("date", "desc")
      .get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error("GET /consultations error:", err);
    res.status(500).json({ error: "Failed to fetch consultations" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { date, memo, entered_by } = req.body || {};
    if (!date || !DATE_RE.test(date)) {
      return res.status(400).json({ error: "date (YYYY-MM-DD) is required" });
    }
    const data = {
      date,
      memo: typeof memo === "string" ? memo.slice(0, 2000) : "",
      entered_by: normalizeEnteredBy(entered_by),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ref = await userRef(req.lineUserId).collection("consultations").add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /consultations error:", err);
    res.status(500).json({ error: "Failed to create consultation" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const ref = userRef(req.lineUserId).collection("consultations").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    const patch = { updatedAt: new Date() };
    if (req.body.date != null) {
      if (!DATE_RE.test(req.body.date)) return res.status(400).json({ error: "invalid date" });
      patch.date = req.body.date;
    }
    if (req.body.memo != null) patch.memo = String(req.body.memo).slice(0, 2000);
    if (req.body.entered_by != null) patch.entered_by = normalizeEnteredBy(req.body.entered_by);
    await ref.update(patch);
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error("PUT /consultations error:", err);
    res.status(500).json({ error: "Failed to update consultation" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const ref = userRef(req.lineUserId).collection("consultations").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /consultations error:", err);
    res.status(500).json({ error: "Failed to delete consultation" });
  }
});

module.exports = router;
