const express = require("express");
const { userRef } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyLiffToken);

// GET /api/clinics — かかりつけクリニック一覧（name 昇順）
router.get("/", async (req, res) => {
  try {
    const snap = await userRef(req.lineUserId)
      .collection("clinics")
      .orderBy("name", "asc")
      .get();

    const clinics = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(clinics);
  } catch (err) {
    console.error("GET /clinics error:", err);
    res.status(500).json({ error: "Failed to fetch clinics" });
  }
});

// POST /api/clinics — クリニック新規登録
router.post("/", async (req, res) => {
  try {
    const { name, address, phone, departments, isPrimary, note } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }
    if (!Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({ error: "departments must be a non-empty array" });
    }

    const data = {
      name,
      address: address || "",
      phone: phone || "",
      departments,
      isPrimary: Boolean(isPrimary),
      note: note || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await userRef(req.lineUserId).collection("clinics").add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /clinics error:", err);
    res.status(500).json({ error: "Failed to create clinic" });
  }
});

// PUT /api/clinics/:id — クリニック更新
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = userRef(req.lineUserId).collection("clinics").doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Clinic not found" });
    }

    const updates = { updatedAt: new Date() };
    const allowed = ["name", "address", "phone", "departments", "isPrimary", "note"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.departments !== undefined) {
      if (!Array.isArray(updates.departments) || updates.departments.length === 0) {
        return res.status(400).json({ error: "departments must be a non-empty array" });
      }
    }

    await ref.update(updates);
    res.json({ id, ...doc.data(), ...updates });
  } catch (err) {
    console.error("PUT /clinics error:", err);
    res.status(500).json({ error: "Failed to update clinic" });
  }
});

// DELETE /api/clinics/:id — クリニック削除
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = userRef(req.lineUserId).collection("clinics").doc(id);

    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Clinic not found" });
    }

    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /clinics error:", err);
    res.status(500).json({ error: "Failed to delete clinic" });
  }
});

module.exports = router;
