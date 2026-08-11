/**
 * ALS: 体重・SpO2 の軽量手入力
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
      .collection("vitals")
      .orderBy("measured_date", "desc")
      .get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) {
    console.error("GET /vitals error:", err);
    res.status(500).json({ error: "Failed to fetch vitals" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { measured_date, weight_kg, spo2_percent, entered_by } = req.body || {};
    if (!measured_date || !DATE_RE.test(measured_date)) {
      return res.status(400).json({ error: "measured_date (YYYY-MM-DD) is required" });
    }
    const weight = weight_kg != null && weight_kg !== "" ? parseFloat(weight_kg) : null;
    const spo2 = spo2_percent != null && spo2_percent !== "" ? parseFloat(spo2_percent) : null;
    if (weight == null && spo2 == null) {
      return res.status(400).json({ error: "weight_kg or spo2_percent required" });
    }

    const data = {
      measured_date,
      weight_kg: weight != null && !Number.isNaN(weight) ? weight : null,
      spo2_percent: spo2 != null && !Number.isNaN(spo2) ? spo2 : null,
      entered_by: normalizeEnteredBy(entered_by),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ref = await userRef(req.lineUserId).collection("vitals").add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /vitals error:", err);
    res.status(500).json({ error: "Failed to create vital" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const ref = userRef(req.lineUserId).collection("vitals").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /vitals error:", err);
    res.status(500).json({ error: "Failed to delete vital" });
  }
});

module.exports = router;
