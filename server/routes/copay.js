/**
 * ALS: 自己負担上限額管理票
 * Certificate / MonthlyLedger / Entry
 */

const express = require("express");
const { userRef } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

const router = express.Router();
router.use(verifyLiffToken);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const YM_RE = /^\d{4}-\d{2}$/;
const ENTERED_BY = new Set(["self", "caregiver"]);
const FACILITY_TYPES = new Set(["hospital", "pharmacy", "home_nurse", "other"]);

function normalizeEnteredBy(v) {
  return ENTERED_BY.has(v) ? v : "self";
}

function certCol(uid) {
  return userRef(uid).collection("copay_certificates");
}

function ledgerCol(uid) {
  return userRef(uid).collection("copay_ledgers");
}

function entryCol(uid) {
  return userRef(uid).collection("copay_entries");
}

// --- Certificate ---
router.get("/certificate", async (req, res) => {
  try {
    const snap = await certCol(req.lineUserId).orderBy("updatedAt", "desc").limit(1).get();
    if (snap.empty) return res.json(null);
    const doc = snap.docs[0];
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("GET /copay/certificate error:", err);
    res.status(500).json({ error: "Failed to fetch certificate" });
  }
});

router.post("/certificate", async (req, res) => {
  try {
    const {
      income_category,
      monthly_cap_yen,
      valid_from,
      valid_to,
      cert_number,
    } = req.body || {};

    const cap = parseInt(monthly_cap_yen, 10);
    if (Number.isNaN(cap) || cap < 0) {
      return res.status(400).json({ error: "monthly_cap_yen is required" });
    }

    const data = {
      income_category: income_category || "",
      monthly_cap_yen: cap,
      valid_from: valid_from && DATE_RE.test(valid_from) ? valid_from : null,
      valid_to: valid_to && DATE_RE.test(valid_to) ? valid_to : null,
      cert_number: typeof cert_number === "string" ? cert_number.slice(0, 64) : "",
      updatedAt: new Date(),
      createdAt: new Date(),
    };

    // 既存があれば更新（1ユーザ1証の簡易実装）
    const existing = await certCol(req.lineUserId).orderBy("updatedAt", "desc").limit(1).get();
    if (!existing.empty) {
      const ref = existing.docs[0].ref;
      const { createdAt, ...rest } = data;
      await ref.update({ ...rest, updatedAt: new Date() });
      const doc = await ref.get();
      return res.json({ id: doc.id, ...doc.data() });
    }

    const ref = await certCol(req.lineUserId).add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /copay/certificate error:", err);
    res.status(500).json({ error: "Failed to save certificate" });
  }
});

// --- Month summary ---
router.get("/month/:yearMonth", async (req, res) => {
  try {
    const { yearMonth } = req.params;
    if (!YM_RE.test(yearMonth)) {
      return res.status(400).json({ error: "yearMonth must be YYYY-MM" });
    }

    const certSnap = await certCol(req.lineUserId).orderBy("updatedAt", "desc").limit(1).get();
    const certificate = certSnap.empty
      ? null
      : { id: certSnap.docs[0].id, ...certSnap.docs[0].data() };

    let ledger = null;
    const ledgerSnap = await ledgerCol(req.lineUserId)
      .where("year_month", "==", yearMonth)
      .limit(1)
      .get();
    if (!ledgerSnap.empty) {
      ledger = { id: ledgerSnap.docs[0].id, ...ledgerSnap.docs[0].data() };
    }

    let entries = [];
    if (ledger) {
      const entrySnap = await entryCol(req.lineUserId)
        .where("monthly_ledger_id", "==", ledger.id)
        .get();
      entries = entrySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      entries.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    }

    const total = entries.reduce((s, e) => s + (e.self_pay_yen || 0), 0);
    const cap = certificate?.monthly_cap_yen ?? null;
    const remaining = cap == null ? null : Math.max(0, cap - total);
    const reached = cap != null && total >= cap;

    res.json({
      year_month: yearMonth,
      certificate,
      ledger,
      entries,
      total_yen: total,
      remaining_yen: remaining,
      cap_reached: reached,
    });
  } catch (err) {
    console.error("GET /copay/month error:", err);
    res.status(500).json({ error: "Failed to fetch month summary" });
  }
});

async function ensureLedger(uid, certificateId, yearMonth) {
  const snap = await ledgerCol(uid).where("year_month", "==", yearMonth).limit(1).get();
  if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  const data = {
    certificate_id: certificateId || null,
    year_month: yearMonth,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const ref = await ledgerCol(uid).add(data);
  return { id: ref.id, ...data };
}

// --- Entry ---
router.post("/entries", async (req, res) => {
  try {
    const {
      date,
      facility_type,
      facility_name,
      self_pay_yen,
      entered_by,
      year_month,
    } = req.body || {};

    if (!date || !DATE_RE.test(date)) {
      return res.status(400).json({ error: "date (YYYY-MM-DD) is required" });
    }
    if (!FACILITY_TYPES.has(facility_type)) {
      return res.status(400).json({ error: "invalid facility_type" });
    }
    const yen = parseInt(self_pay_yen, 10);
    if (Number.isNaN(yen) || yen < 0) {
      return res.status(400).json({ error: "self_pay_yen is required" });
    }

    const ym = year_month && YM_RE.test(year_month) ? year_month : date.slice(0, 7);
    const certSnap = await certCol(req.lineUserId).orderBy("updatedAt", "desc").limit(1).get();
    const certificateId = certSnap.empty ? null : certSnap.docs[0].id;
    const ledger = await ensureLedger(req.lineUserId, certificateId, ym);

    const data = {
      monthly_ledger_id: ledger.id,
      date,
      facility_type,
      facility_name: typeof facility_name === "string" ? facility_name.slice(0, 100) : "",
      self_pay_yen: yen,
      entered_by: normalizeEnteredBy(entered_by),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ref = await entryCol(req.lineUserId).add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("POST /copay/entries error:", err);
    res.status(500).json({ error: "Failed to create entry" });
  }
});

router.delete("/entries/:id", async (req, res) => {
  try {
    const ref = entryCol(req.lineUserId).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    await ref.delete();
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /copay/entries error:", err);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

module.exports = router;
