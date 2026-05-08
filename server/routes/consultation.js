/**
 * 患者体験記 RAG相談 API
 *
 * Plan B（疾患フィルタ込み）:
 *   1. 体験記を疾患サブタイプでフィルタ
 *   2. 該当する全セクションをコンテキストとしてGeminiに渡す
 *   3. Geminiが自然言語で回答し、参照体験記を [story_id:xxx] マーカーで明示
 *   4. マーカーを抽出してリンクリストとして返す
 */

const express = require("express");
const path = require("path");
const { genAI, hasApiKey } = require("../lib/gemini");

const router = express.Router();

const DEMO_MODE =
  process.env.DEMO_MODE === "1" || !process.env.GOOGLE_CLOUD_PROJECT;

// 有効な疾患サブタイプ（白血病カテゴリは除外してフィルタに使わない）
const DISEASE_SUBTYPES = new Set(["cml", "aml", "all", "cll", "other"]);

// デモ用シードデータ
const SEED_STORIES = JSON.parse(
  JSON.stringify(
    require(path.join(__dirname, "../../stories-seed.json"))
  )
);

// ──────────────────────────────────────────────
// ラベル定義
// ──────────────────────────────────────────────

const PHASE_LABELS = {
  diagnosis: "診断期",
  treatment_start: "治療開始",
  ongoing: "治療継続",
  observation: "経過観察",
  relapse: "再発・治療変更",
  remission: "寛解・回復",
};

const DISEASE_LABELS = {
  cml: "CML",
  aml: "AML",
  all: "ALL",
  cll: "CLL",
  other: "その他",
};

const GENDER_LABELS = {
  male: "男性",
  female: "女性",
  unanswered: "",
};

// ──────────────────────────────────────────────
// Gemini コンサルテーションモデル
// ──────────────────────────────────────────────

const CONSULTATION_SYSTEM_PROMPT = `あなたは白血病患者を支援するAIコンシェルジュです。
登録されている患者さんの実際の体験記をもとに、ユーザーの疑問や不安に寄り添いながら回答します。

【必ず守るルール】
1. 回答は「参照体験記」に含まれる実体験を根拠にすること。体験記にない情報で答えてはいけない
2. 医療アドバイス・治療方針の推奨は絶対に行わない。「体験記の中では〜」「○○さんは〜」という形で紹介する
3. 参照した体験記は [story_id:cml-001] という形式でマーキングする（後でリンクに変換される）
4. 回答の最後に必ず「※ 患者さんの個人的な体験です。治療については必ず主治医にご相談ください。」を入れる
5. 回答は300〜500文字程度。長くなりすぎない
6. 温かく寄り添うトーンで答える

【回答の構成】
1. 共感・受け止めの一文
2. 体験記から得た情報（複数人の例）＋ [story_id:xxx] マーキング
3. 締めの言葉 ＋ 免責文`;

function getConsultationModel() {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview",
    systemInstruction: CONSULTATION_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  });
}

// ──────────────────────────────────────────────
// 体験記コンテキスト文字列の構築
// ──────────────────────────────────────────────

function buildContext(stories) {
  if (stories.length === 0) {
    return "（関連する体験記が見つかりませんでした）";
  }

  const chunks = [];
  for (const story of stories) {
    const diseaseLabel = DISEASE_LABELS[story.disease_type] || story.disease_type;
    const ageLabel = story.age_at_diagnosis ? `${story.age_at_diagnosis}代` : "";
    const genderLabel = GENDER_LABELS[story.gender] || "";

    for (const section of story.sections || []) {
      const phaseLabel = PHASE_LABELS[section.phase] || section.phase;
      const tags = (section.fact_tags || []).map((t) => t.value).join("、");

      chunks.push(
        `【体験記 story_id:${story.story_id}】${story.title}` +
          `（${diseaseLabel}・${ageLabel}・${genderLabel}・${phaseLabel}）` +
          (tags ? `\nキーワード：${tags}` : "") +
          `\n${section.fact_content}`
      );
    }
  }

  return chunks.join("\n\n---\n\n");
}

// ──────────────────────────────────────────────
// [story_id:xxx] マーカーから参照リストを生成
// ──────────────────────────────────────────────

function extractReferencedStories(answerText, stories) {
  const matches = answerText.match(/\[story_id:([^\]]+)\]/g) || [];
  const ids = [...new Set(matches.map((m) => m.replace(/\[story_id:|\]/g, "")))];

  return ids
    .map((id) => {
      const story = stories.find((s) => s.story_id === id);
      if (!story) return null;
      return {
        story_id: id,
        title: story.title,
        disease_type: story.disease_type,
        url: `/stories-detail.html?id=${encodeURIComponent(id)}`,
      };
    })
    .filter(Boolean);
}

// ──────────────────────────────────────────────
// Gemini マルチターン呼び出し
// ──────────────────────────────────────────────

async function generateAnswer(message, history, context) {
  const model = getConsultationModel();

  // history を Gemini 形式（role: user/model）に変換
  const geminiHistory = history.map((h) => ({
    role: h.role === "assistant" ? "model" : "user",
    parts: [{ text: h.content }],
  }));

  const chat = model.startChat({ history: geminiHistory });

  // 最初のターンのみコンテキストを添付（2ターン目以降はメッセージのみ）
  const isFirstTurn = history.length === 0;
  const userMessage = isFirstTurn
    ? `【参照できる患者体験記】\n${context}\n\n【ユーザーの質問】\n${message}`
    : message;

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

// ──────────────────────────────────────────────
// モックレスポンス（APIキーなし時）
// ──────────────────────────────────────────────

function getMockResponse(stories) {
  const s1 = stories[0];
  const s2 = stories[1];
  const id1 = s1?.story_id || "cml-001";
  const id2 = s2?.story_id || "cml-002";

  return {
    rawAnswer:
      `いつもお疲れ様です。診断後の不安はとても自然なことです。\n\n` +
      `体験記の中では、治療開始後に倦怠感が出たものの数日で通常生活に戻った方がいらっしゃいます [story_id:${id1}]。` +
      `また「プロポーズ直後の診断で動揺したが、薬を飲みながら海外留学まで実現した」という方の体験も登録されています [story_id:${id2}]。\n\n` +
      `それぞれ状況は異なりますが、同じ病気と向き合いながら前に進んでいる方たちの声が、少し支えになれば嬉しいです。\n\n` +
      `※ 患者さんの個人的な体験です。治療については必ず主治医にご相談ください。`,
    stories,
  };
}

// ──────────────────────────────────────────────
// POST /api/consultation
// ──────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const { message, history = [], disease_type } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "message is required" });
    }

    // STEP 1: 体験記を取得
    let stories;
    if (DEMO_MODE) {
      stories = SEED_STORIES.filter((s) => s.status === "published");
    } else {
      const { db } = require("../lib/firestore");
      const snap = await db
        .collection("stories")
        .where("status", "==", "published")
        .get();
      stories = snap.docs.map((doc) => ({ story_id: doc.id, ...doc.data() }));
    }

    // STEP 2: 疾患サブタイプでフィルタ（指定がある場合のみ）
    if (disease_type && DISEASE_SUBTYPES.has(disease_type)) {
      stories = stories.filter((s) => s.disease_type === disease_type);
    }

    // APIキーなし → モック返却
    if (!hasApiKey()) {
      console.warn("[consultation] GEMINI_API_KEY not set — returning mock response");
      const { rawAnswer, stories: filteredStories } = getMockResponse(stories);
      const referencedStories = extractReferencedStories(rawAnswer, filteredStories);
      const cleanAnswer = rawAnswer.replace(/\[story_id:[^\]]+\]/g, "").trim();
      return res.json({ answer: cleanAnswer, referenced_stories: referencedStories });
    }

    // STEP 3: Gemini に渡すコンテキストを構築（会話の最初のターンのみ）
    const context = history.length === 0 ? buildContext(stories) : "";

    // STEP 4: Gemini で回答生成
    const rawAnswer = await generateAnswer(message, history, context);

    // STEP 5: 参照体験記を抽出
    const referencedStories = extractReferencedStories(rawAnswer, stories);

    // [story_id:xxx] マーカーを除去して返す
    const cleanAnswer = rawAnswer.replace(/\[story_id:[^\]]+\]/g, "").trim();

    res.json({
      answer: cleanAnswer,
      referenced_stories: referencedStories,
    });
  } catch (err) {
    console.error("[consultation] POST error:", err);
    res.status(500).json({ error: "AI相談の処理中にエラーが発生しました" });
  }
});

module.exports = router;
