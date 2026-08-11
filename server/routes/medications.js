const express = require("express");
const { userRef } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyLiffToken);

const VALID_CATEGORIES = [
  "5-ASA",
  "steroid",
  "immunomodulator",
  "biologic",
  "jak_inhibitor",
  "other",
];

const VALID_DOSAGE_TYPES = ["regular", "prn"];
const VALID_SOURCES = [
  "medication_notebook",
  "drug_info_sheet",
  "ptp_sheet",
  "manual",
  "unknown",
];

function buildMedicationData(body, defaults = {}) {
  const brandName = body.brandName || body.name;
  const dosageType = body.dosageType || defaults.dosageType || "regular";
  const timing = Array.isArray(body.timing)
    ? body.timing.filter(Boolean)
    : defaults.timing || [];

  const sideNotesParts = [
    body.strength,
    body.dosePerTime,
    dosageType === "regular" && timing.length ? timing.join("・") : null,
    dosageType === "prn" ? body.prnCondition : null,
    body.note,
  ].filter(Boolean);

  return {
    name: brandName,
    brandName: brandName || "",
    genericName: body.genericName || "",
    category: body.category || "other",
    dosageForm: body.dosageForm || "",
    strength: body.strength || null,
    dosageType,
    timing,
    dosePerTime: body.dosePerTime || null,
    prnCondition: body.prnCondition || null,
    note: body.note || null,
    source: body.source || defaults.source || "manual",
    startDate: body.startDate,
    endDate: body.endDate || null,
    isActive: body.endDate ? false : body.isActive !== false,
    changeReason: body.changeReason || "",
    sideNotes: body.sideNotes || sideNotesParts.join(" / "),
    createdAt: defaults.createdAt || new Date(),
    updatedAt: new Date(),
  };
}

// GET /api/medications — 薬一覧（開始日降順）
router.get("/", async (req, res) => {
  try {
    const snap = await userRef(req.lineUserId)
      .collection("medications")
      .orderBy("startDate", "desc")
      .get();

    const meds = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(meds);
  } catch (err) {
    console.error("GET /medications error:", err);
    res.status(500).json({ error: "Failed to fetch medications" });
  }
});

// GET /api/medications/active — 現在服用中の薬
router.get("/active", async (req, res) => {
  try {
    const snap = await userRef(req.lineUserId)
      .collection("medications")
      .where("isActive", "==", true)
      .orderBy("startDate", "desc")
      .get();

    const meds = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(meds);
  } catch (err) {
    console.error("GET /medications/active error:", err);
    res.status(500).json({ error: "Failed to fetch active medications" });
  }
});

// POST /api/medications — 薬追加
router.post("/", async (req, res) => {
  try {
    const brandName = req.body.brandName || req.body.name;
    const { startDate } = req.body;

    if (!brandName || !startDate) {
      return res.status(400).json({ error: "name (or brandName) and startDate are required" });
    }
    // category は疾患マスタ依存のため自由文字列を許容
    if (req.body.dosageType && !VALID_DOSAGE_TYPES.includes(req.body.dosageType)) {
      return res.status(400).json({ error: "Invalid dosageType" });
    }
    if (req.body.source && !VALID_SOURCES.includes(req.body.source)) {
      return res.status(400).json({ error: "Invalid source" });
    }

    const data = buildMedicationData(req.body);

    const ref = await userRef(req.lineUserId)
      .collection("medications")
      .add(data);

    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /medications error:", err);
    res.status(500).json({ error: "Failed to create medication" });
  }
});

// PUT /api/medications/:id — 薬情報更新
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = userRef(req.lineUserId).collection("medications").doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Medication not found" });
    }

    const updates = { updatedAt: new Date() };
    const allowed = [
      "name",
      "brandName",
      "genericName",
      "category",
      "dosageForm",
      "strength",
      "dosageType",
      "timing",
      "dosePerTime",
      "prnCondition",
      "note",
      "source",
      "startDate",
      "endDate",
      "changeReason",
      "sideNotes",
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // endDate が設定されたら isActive を false に
    if (updates.endDate !== undefined) {
      updates.isActive = !updates.endDate;
    }

    await ref.update(updates);
    res.json({ id, ...doc.data(), ...updates });
  } catch (err) {
    console.error("PUT /medications error:", err);
    res.status(500).json({ error: "Failed to update medication" });
  }
});

// DELETE /api/medications/:id — 薬削除
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = userRef(req.lineUserId).collection("medications").doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Medication not found" });
    }

    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /medications error:", err);
    res.status(500).json({ error: "Failed to delete medication" });
  }
});

module.exports = router;
