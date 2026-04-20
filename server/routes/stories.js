/**
 * 患者体験記 API ルート
 * デモモード: stories-seed.json のデータをメモリに展開して返す
 * 本番モード: Cloud Firestore の stories コレクションを参照
 */

const express = require("express");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
const DEMO_MODE = process.env.DEMO_MODE === "1" || !process.env.GOOGLE_CLOUD_PROJECT;

// ----------------------------------------
// デモ用サンプルデータ（stories-seed.json）
// ----------------------------------------

// JSON をそのまま読み込み、メモリ上で操作できるよう配列にコピー
const DEMO_STORIES = JSON.parse(
  JSON.stringify(require(path.join(__dirname, "../../stories-seed.json")))
);

// ----------------------------------------
// disease パラメータの判定ヘルパー
// ----------------------------------------

// "leukemia" などのテンプレートIDはサブタイプではないので全件返す
const LEUKEMIA_SUBTYPES = new Set(["cml", "aml", "all", "cll", "other"]);

// ----------------------------------------
// デモモード用ルーティング
// ----------------------------------------

if (DEMO_MODE) {
  // GET /api/stories — 公開済み体験記一覧
  router.get("/", (req, res) => {
    const { disease } = req.query;
    let stories = DEMO_STORIES.filter((s) => s.status === "published");
    // サブタイプ（cml/aml/all/cll/other）が指定された場合のみ絞り込む
    // "leukemia" のようなテンプレートIDは無視して全件返す
    if (disease && LEUKEMIA_SUBTYPES.has(disease)) {
      stories = stories.filter((s) => s.disease_type === disease);
    }
    // 一覧では sections を返さない（軽量化）
    const list = stories.map(({ sections: _s, ...meta }) => meta);
    res.json(list);
  });

  // GET /api/stories/:id — 体験記詳細（sections あり）
  router.get("/:id", (req, res) => {
    const story = DEMO_STORIES.find((s) => s.story_id === req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found" });
    res.json(story);
  });

  // POST /api/admin/stories — 新規登録（デモ: メモリに追加）
  router.post("/admin", (req, res) => {
    const story = {
      story_id: uuidv4(),
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sections: [],
      ...req.body,
    };
    DEMO_STORIES.push(story);
    res.status(201).json(story);
  });

  // PUT /api/admin/stories/:id — 編集
  router.put("/admin/:id", (req, res) => {
    const idx = DEMO_STORIES.findIndex((s) => s.story_id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: "Story not found" });
    Object.assign(DEMO_STORIES[idx], req.body, { updated_at: new Date().toISOString() });
    res.json(DEMO_STORIES[idx]);
  });

  module.exports = router;
  return;
}

// ----------------------------------------
// 本番モード（Firestore）
// ----------------------------------------

const { db } = require("../lib/firestore");
const { verifyLiffToken } = require("../middleware/auth");

// GET /api/stories
router.get("/", verifyLiffToken, async (req, res) => {
  try {
    const { disease } = req.query;
    let query = db.collection("stories").where("status", "==", "published");
    if (disease && LEUKEMIA_SUBTYPES.has(disease)) {
      query = query.where("disease_type", "==", disease);
    }
    const snap = await query.orderBy("published_at", "desc").get();
    const stories = snap.docs.map((doc) => {
      const { sections: _s, ...meta } = doc.data();
      return { story_id: doc.id, ...meta };
    });
    res.json(stories);
  } catch (err) {
    console.error("GET /stories error:", err);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

// GET /api/stories/:id
router.get("/:id", verifyLiffToken, async (req, res) => {
  try {
    const doc = await db.collection("stories").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Story not found" });
    const data = doc.data();
    if (data.status !== "published") return res.status(404).json({ error: "Story not found" });
    res.json({ story_id: doc.id, ...data });
  } catch (err) {
    console.error("GET /stories/:id error:", err);
    res.status(500).json({ error: "Failed to fetch story" });
  }
});

// POST /api/admin/stories — 管理者: 新規登録
router.post("/admin", async (req, res) => {
  try {
    const story = {
      status: "draft",
      created_at: new Date(),
      updated_at: new Date(),
      sections: [],
      ...req.body,
    };
    const ref = await db.collection("stories").add(story);
    res.status(201).json({ story_id: ref.id, ...story });
  } catch (err) {
    console.error("POST /stories/admin error:", err);
    res.status(500).json({ error: "Failed to create story" });
  }
});

// PUT /api/admin/stories/:id — 管理者: 編集・ステータス変更
router.put("/admin/:id", async (req, res) => {
  try {
    const ref = db.collection("stories").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Story not found" });

    const updates = { ...req.body, updated_at: new Date() };
    if (updates.status === "published" && !updates.published_at) {
      updates.published_at = new Date();
    }
    await ref.update(updates);
    res.json({ story_id: req.params.id, ...doc.data(), ...updates });
  } catch (err) {
    console.error("PUT /stories/admin/:id error:", err);
    res.status(500).json({ error: "Failed to update story" });
  }
});

module.exports = router;
