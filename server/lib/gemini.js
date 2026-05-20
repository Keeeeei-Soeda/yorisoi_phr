const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// 環境変数で上書き可能（未指定時は Gemini 3.1 Flash Lite）
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
console.log("Gemini model:", MODEL_NAME);

/**
 * 注記：安全ルールは「全禁止」ではなく「評価判定の禁止」に限定する。
 * 全面禁止にするとGeminiが値の抽出まで控えてしまうため、
 * 抽出（転記）は積極的にやらせつつ、診断・評価のみ明確に禁止する。
 */
const SAFETY_INSTRUCTION_SHORT = `あなたはデータ入力補助AIです。患者が言った情報を指定フィールドに正確に転記します。
診断・重症度評価・治療アドバイスは行いません（転記のみ）。出力は必ずJSONのみで、前置きや説明文は不要です。`;

/** テキスト入力用モデル（軽量・速い） */
function getTextModel() {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SAFETY_INSTRUCTION_SHORT,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });
}

/** Vision（画像）入力用モデル */
function getVisionModel() {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SAFETY_INSTRUCTION_SHORT,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });
}

/** チャット用モデル（temperatureやや高め） */
function getChatModel() {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SAFETY_INSTRUCTION_SHORT +
      "\n対話型で症状を聞き取る場合は、短く優しい質問を1つずつ投げます。診断や評価は行わず、共感と次の質問のみ。",
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  });
}

/**
 * JSONパースのエラー耐性処理（コードフェンスや前置き付きにも対応）
 */
function parseJsonSafe(text) {
  if (!text) return null;
  // コードフェンス除去
  let cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/g, "").trim();
  // 先頭のJSONだけを抽出
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON parse error:", e, "\nText:", text);
    return null;
  }
}

/**
 * Base64 データ URI を Gemini API の inlineData 形式に変換
 */
function dataUriToInlineData(dataUri) {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URI");
  return {
    inlineData: {
      mimeType: match[1],
      data: match[2],
    },
  };
}

module.exports = {
  genAI,
  getTextModel,
  getVisionModel,
  getChatModel,
  parseJsonSafe,
  dataUriToInlineData,
  hasApiKey: () => !!API_KEY,
};
