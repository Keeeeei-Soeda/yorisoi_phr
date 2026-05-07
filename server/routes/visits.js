const express = require("express");
const { userRef } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyLiffToken);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/visits — 受診履歴（date 降順）
router.get("/", async (req, res) => {
  try {
    const snap = await userRef(req.lineUserId)
      .collection("visits")
      .orderBy("date", "desc")
      .get();

    const visits = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(visits);
  } catch (err) {
    console.error("GET /visits error:", err);
    res.status(500).json({ error: "Failed to fetch visits" });
  }
});

// GET /api/visits/:id — 受診1件
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await userRef(req.lineUserId).collection("visits").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Visit not found" });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("GET /visits/:id error:", err);
    res.status(500).json({ error: "Failed to fetch visit" });
  }
});

// POST /api/visits — 受診記録新規
router.post("/", async (req, res) => {
  try {
    const {
      date,
      clinicId,
      department,
      doctor,
      chiefComplaint,
      findings,
      nextAction,
      photos,
      relatedMedicationIds,
      relatedLabResultIds,
      relatedTimelineEventId,
    } = req.body;

    if (!date || !DATE_RE.test(date)) {
      return res.status(400).json({ error: "date (YYYY-MM-DD) is required" });
    }
    if (!clinicId || typeof clinicId !== "string") {
      return res.status(400).json({ error: "clinicId is required" });
    }
    if (!department || typeof department !== "string") {
      return res.status(400).json({ error: "department is required" });
    }

    const data = {
      date,
      clinicId,
      department,
      doctor: doctor || "",
      chiefComplaint: chiefComplaint || "",
      findings: findings || "",
      nextAction: nextAction || "",
      photos: Array.isArray(photos) ? photos : [],
      relatedMedicationIds: Array.isArray(relatedMedicationIds) ? relatedMedicationIds : [],
      relatedLabResultIds: Array.isArray(relatedLabResultIds) ? relatedLabResultIds : [],
      relatedTimelineEventId: relatedTimelineEventId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await userRef(req.lineUserId).collection("visits").add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /visits error:", err);
    res.status(500).json({ error: "Failed to create visit" });
  }
});

// PUT /api/visits/:id — 受診記録更新
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = userRef(req.lineUserId).collection("visits").doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Visit not found" });
    }

    const updates = { updatedAt: new Date() };
    const allowed = [
      "date",
      "clinicId",
      "department",
      "doctor",
      "chiefComplaint",
      "findings",
      "nextAction",
      "photos",
      "relatedMedicationIds",
      "relatedLabResultIds",
      "relatedTimelineEventId",
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.date !== undefined && !DATE_RE.test(updates.date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }

    await ref.update(updates);
    res.json({ id, ...doc.data(), ...updates });
  } catch (err) {
    console.error("PUT /visits error:", err);
    res.status(500).json({ error: "Failed to update visit" });
  }
});

// DELETE /api/visits/:id — 受診記録削除
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = userRef(req.lineUserId).collection("visits").doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Visit not found" });
    }

    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /visits error:", err);
    res.status(500).json({ error: "Failed to delete visit" });
  }
});

module.exports = router;
