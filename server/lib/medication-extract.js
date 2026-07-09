const { SchemaType } = require("@google/generative-ai");
const { genAI, parseJsonSafe, dataUriToInlineData, hasApiKey } = require("./gemini");

const SYSTEM_PROMPT = `あなたは日本の調剤情報を読み取る専門アシスタントです。
入力画像（お薬手帳のシール / お薬説明書 / PTPシート）から、
処方されている薬の情報を抽出し、指定のJSONスキーマのみで返してください。

規則:
- 前置き・説明文・マークダウンは一切出力しない。JSONのみ。
- 読み取れない項目は推測せず null にする。
- 「定期薬」か「頓服薬」かを必ず判定する。
  「疼痛時」「発熱時」「頓用」「〜のとき」などの記載があれば prn（頓服）とする。
- 用法（朝食後など）と1回量（1錠など）を分けて抽出する。
- 各薬の読み取り確度を confidence（high/medium/low）で付与する。
- 画像に複数の薬があれば medications 配列に全て入れる。`;

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    sourceType: {
      type: SchemaType.STRING,
      enum: ["medication_notebook", "drug_info_sheet", "ptp_sheet", "unknown"],
    },
    medications: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          brandName: { type: SchemaType.STRING },
          genericName: { type: SchemaType.STRING, nullable: true },
          strength: { type: SchemaType.STRING, nullable: true },
          dosageType: { type: SchemaType.STRING, enum: ["regular", "prn"] },
          timing: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            nullable: true,
          },
          dosePerTime: { type: SchemaType.STRING, nullable: true },
          prnCondition: { type: SchemaType.STRING, nullable: true },
          note: { type: SchemaType.STRING, nullable: true },
          confidence: { type: SchemaType.STRING, enum: ["high", "medium", "low"] },
        },
        required: ["brandName", "dosageType", "confidence"],
      },
    },
  },
  required: ["sourceType", "medications"],
};

const VALID_SOURCE_TYPES = new Set([
  "medication_notebook",
  "drug_info_sheet",
  "ptp_sheet",
  "unknown",
]);
const VALID_DOSAGE_TYPES = new Set(["regular", "prn"]);
const VALID_CONFIDENCE = new Set(["high", "medium", "low"]);

function getPrimaryModel() {
  return (
    process.env.GEMINI_MODEL_PRIMARY ||
    process.env.GEMINI_MODEL ||
    "gemini-3.1-flash-lite"
  );
}

function getFallbackModel() {
  return process.env.GEMINI_MODEL_FALLBACK || "gemini-3-flash";
}

function getVisionModelForExtract(modelName) {
  if (!genAI) throw new Error("GEMINI_API_KEY not configured");
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });
}

function normalizeNullableString(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str || null;
}

function validateExtractionResult(data) {
  if (!data || typeof data !== "object") return null;

  const sourceType = VALID_SOURCE_TYPES.has(data.sourceType)
    ? data.sourceType
    : "unknown";

  if (!Array.isArray(data.medications)) return null;

  const medications = [];
  for (const med of data.medications) {
    if (!med || typeof med !== "object") continue;

    const brandName = normalizeNullableString(med.brandName);
    if (!brandName) continue;

    const dosageType = VALID_DOSAGE_TYPES.has(med.dosageType)
      ? med.dosageType
      : null;
    const confidence = VALID_CONFIDENCE.has(med.confidence)
      ? med.confidence
      : null;

    if (!dosageType || !confidence) continue;

    let timing = null;
    if (Array.isArray(med.timing)) {
      const cleaned = med.timing
        .map((t) => normalizeNullableString(t))
        .filter(Boolean);
      timing = cleaned.length > 0 ? cleaned : null;
    }

    medications.push({
      brandName,
      genericName: normalizeNullableString(med.genericName),
      strength: normalizeNullableString(med.strength),
      dosageType,
      timing,
      dosePerTime: normalizeNullableString(med.dosePerTime),
      prnCondition: normalizeNullableString(med.prnCondition),
      note: normalizeNullableString(med.note),
      confidence,
    });
  }

  return { sourceType, medications };
}

function shouldRetryWithFallback(result) {
  if (!result) return true;
  if (!result.medications || result.medications.length === 0) return true;
  return result.medications.every((m) => m.confidence === "low");
}

async function callGeminiExtract(image, modelName) {
  const imagePart = dataUriToInlineData(image);
  const model = getVisionModelForExtract(modelName);
  const result = await model.generateContent([
    { text: "この画像から処方薬情報を抽出してください。" },
    imagePart,
  ]);
  const responseText = result.response.text();
  const parsed = parseJsonSafe(responseText);
  return validateExtractionResult(parsed);
}

/**
 * 画像から服薬情報を抽出（保存はしない）
 * @returns {{ sourceType, medications, extractionFailed?: boolean, usedFallback?: boolean }}
 */
async function extractMedicationsFromImage(image) {
  if (!hasApiKey()) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  if (!image) {
    throw new Error("image required");
  }

  const primaryModel = getPrimaryModel();
  let usedFallback = false;

  let result = await callGeminiExtract(image, primaryModel);

  if (shouldRetryWithFallback(result)) {
    const fallbackModel = getFallbackModel();
    if (fallbackModel !== primaryModel) {
      usedFallback = true;
      result = await callGeminiExtract(image, fallbackModel);
    }
  }

  if (shouldRetryWithFallback(result)) {
    return {
      sourceType: "unknown",
      medications: [],
      extractionFailed: true,
      usedFallback,
    };
  }

  return { ...result, extractionFailed: false, usedFallback };
}

module.exports = {
  extractMedicationsFromImage,
  validateExtractionResult,
  SYSTEM_PROMPT,
};
