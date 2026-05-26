/**
 * AI入力補助APIルート
 * - 診断・判定は一切行わない
 * - 入力補助（転記）のみ
 */

const express = require("express");
const { SchemaType } = require("@google/generative-ai");
const { getTextModel, getVisionModel, getChatModel, parseJsonSafe, dataUriToInlineData, hasApiKey, genAI } = require("../lib/gemini");
const { getTemplate, getMedicationMaster } = require("../lib/templates");

const router = express.Router();

// ミドルウェア: APIキーの有無確認
router.use((req, res, next) => {
  if (!hasApiKey()) {
    return res.status(503).json({ error: "Gemini API key not configured" });
  }
  next();
});

// Express の JSON サイズ上限を上げる（画像・音声アップロード用）
router.use(express.json({ limit: "30mb" }));

// ======================================================
// POST /api/ai/parse-symptom
// 音声入力されたテキストを、疾患テンプレートのmetricsにマップする
// ======================================================
router.post("/parse-symptom", async (req, res) => {
  try {
    const { text, diseaseId } = req.body;
    if (!text) return res.status(400).json({ error: "text required" });

    const tmpl = getTemplate(diseaseId || "uc");
    if (!tmpl) return res.status(404).json({ error: "Template not found" });

    const metrics = tmpl.symptomConfig?.metrics || [];
    const fieldDescriptions = metrics.map((m) => {
      let desc = `- ${m.id} (${m.label})`;
      if (m.type === "counter") desc += ` : 数値 ${m.min}〜${m.max}${m.unit ? " " + m.unit : ""}`;
      if (m.type === "scale") desc += ` : ${m.min}〜${m.max}の段階${m.labels ? " (" + m.labels.join("/") + ")" : ""}`;
      if (m.type === "toggle") desc += ` : true か false`;
      if (m.description) desc += ` — ${m.description}`;
      return desc;
    }).join("\n");

    const fieldIds = metrics.map((m) => m.id);
    const prompt = `患者の発話からデータを抽出してJSONを出力します。

【フィールド】
${fieldDescriptions}

【例1】
発話: "今日は排便3回、血便なし、痛みなし、調子良い"
出力: {"bowelCount":3,"bristolScale":null,"bleeding":false,"painScore":0,"memo":"調子良い"}

【例2】
発話: "排便5回で血便少しあります。お腹の痛みは3くらい。かなり疲れた"
出力: {"bowelCount":5,"bristolScale":null,"bleeding":true,"painScore":3,"memo":"かなり疲れた"}

【例3】
発話: "今日は普通、4回だけだった"
出力: {"bowelCount":4,"bristolScale":null,"bleeding":null,"painScore":null,"memo":"普通の日"}

【ルール】
- 発話に数値があれば必ず抽出（「4回」→4）
- 「あり」「ちょっと」「少し」→ true、「なし」「ない」→ false
- 発話に触れられていない項目のみ null
- memoは短い感想のみ（フィールドで抽出した情報は入れない）

【今回の発話】
"${text}"

上記の発話から ${fieldIds.join(", ")}, memo を含むJSONを出力してください。`;

    const model = getTextModel();
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText });
    }

    // サニタイズ: テンプレートにあるフィールドのみ返す
    const sanitized = { memo: parsed.memo || null };
    metrics.forEach((m) => {
      if (parsed[m.id] !== undefined && parsed[m.id] !== null) {
        sanitized[m.id] = parsed[m.id];
      }
    });

    res.json({ result: sanitized, raw: parsed });
  } catch (err) {
    console.error("parse-symptom error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/transcribe
// 音声を書き起こしだけ行う（AIチャットからの利用など）
// body: { audio: "data:audio/...", }
// ======================================================
router.post("/transcribe", async (req, res) => {
  try {
    const { audio } = req.body;
    if (!audio) return res.status(400).json({ error: "audio required" });

    console.log("[transcribe] audio dataUri length:", audio.length, "head:", audio.slice(0, 50));

    const audioPart = dataUriToInlineData(audio);
    console.log("[transcribe] mimeType:", audioPart.inlineData.mimeType, "base64 length:", audioPart.inlineData.data.length);

    const model = getTextModel();
    const prompt = `この音声ファイルを日本語で書き起こしてください。

【重要な制約】
- 音声が無音・雑音・聞き取れない場合は空文字列 "" を返すこと
- 実際に聞こえた日本語のみを書き起こすこと
- 聞こえていない内容を創作・補完することは絶対禁止

出力は次のJSONのみ: {"transcript": "書き起こしたテキスト または ''"}
説明や前置きは不要です。`;

    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();
    console.log("[transcribe] Gemini response:", responseText.slice(0, 200));
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText.slice(0, 500) });
    }

    res.json({ transcript: parsed.transcript || "" });
  } catch (err) {
    console.error("transcribe error:", err.message);
    console.error(err.stack);
    res.status(500).json({
      error: err.message,
      hint: "音声フォーマットが対応していない可能性があります。audio/webm, audio/mp4, audio/ogg, audio/wavを試してください。",
    });
  }
});

// ======================================================
// POST /api/ai/voice-symptom
// 音声 → Geminiマルチモーダルで書き起こし+構造化
// body: { audio: "data:audio/webm;base64,...", diseaseId }
// ======================================================
router.post("/voice-symptom", async (req, res) => {
  try {
    const { audio, diseaseId } = req.body;
    if (!audio) return res.status(400).json({ error: "audio required" });

    console.log("[voice-symptom] audio length:", audio.length, "head:", audio.slice(0, 50));

    const tmpl = getTemplate(diseaseId || "uc");
    if (!tmpl) return res.status(404).json({ error: "Template not found" });

    const metrics = tmpl.symptomConfig?.metrics || [];
    const fieldDescriptions = metrics.map((m) => {
      let desc = `- ${m.id} (${m.label})`;
      if (m.type === "counter") desc += ` : 数値 ${m.min}〜${m.max}${m.unit ? " " + m.unit : ""}`;
      if (m.type === "scale") desc += ` : ${m.min}〜${m.max}の段階${m.labels ? " (" + m.labels.join("/") + ")" : ""}`;
      if (m.type === "toggle") desc += ` : true か false`;
      if (m.description) desc += ` — ${m.description}`;
      return desc;
    }).join("\n");

    const prompt = `添付の音声ファイルを処理してください。日本語で症状を話している患者の声が含まれている想定です。

## やること
1. 音声を正確に書き起こす
2. 書き起こし内容から症状データを抽出する

## 重要な制約（ハルシネーション防止）
- 音声が無音・雑音・聞き取れない場合は transcript: "" を返し、values は全て null にすること
- 実際に聞こえた日本語のみを書き起こすこと
- 聞こえていない内容を創作・補完することは絶対禁止

## 抽出対象のフィールド
${fieldDescriptions}

## 抽出例
音声: "今日は排便4回、血便少しあり、お腹の痛みは2くらい、調子は悪くない"
出力: {"transcript":"今日は排便4回、血便少しあり、お腹の痛みは2くらい、調子は悪くない","values":{"bowelCount":4,"bristolScale":null,"bleeding":true,"painScore":2},"memo":"調子は悪くない"}

## ルール
- transcript には音声の書き起こし全文を入れる（聞こえなければ""）
- values には書き起こしから確認できる値のみを入れる（該当なしは null）
- 「あり」「少し」「ちょっと」→ true、「なし」「ない」→ false

## 出力JSON形式
{
  "transcript": "書き起こしたテキスト または ''",
  "values": { ${metrics.map((m) => `"${m.id}": <値 or null>`).join(", ")} },
  "memo": <文字列 or null>
}

JSONのみを返してください。`;

    const audioPart = dataUriToInlineData(audio);
    console.log("[voice-symptom] mimeType:", audioPart.inlineData.mimeType);

    const model = getTextModel();
    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();
    console.log("[voice-symptom] Gemini response length:", responseText.length);
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText.slice(0, 500) });
    }

    // サニタイズ
    const cleanValues = {};
    metrics.forEach((m) => {
      const v = parsed.values?.[m.id];
      if (v !== null && v !== undefined) cleanValues[m.id] = v;
    });

    res.json({
      transcript: parsed.transcript || "",
      values: cleanValues,
      memo: parsed.memo || null,
    });
  } catch (err) {
    console.error("voice-symptom error:", err.message);
    console.error(err.stack);
    res.status(500).json({
      error: err.message,
      hint: "音声フォーマットが対応していない可能性があります。",
    });
  }
});

// ======================================================
// POST /api/ai/chat-symptom
// 対話型で症状を聞き取る
// body: { messages: [{role, content}...], diseaseId }
// ======================================================
/**
 * メトリクスを自然言語の説明に変換
 * scale型は labels があればそれを使い、なければ汎用ラベルを生成
 */
function describeMetricForAI(m) {
  const baseInfo = `${m.id}（${m.label}）`;
  if (m.type === "counter") {
    return `${baseInfo}: 数値入力${m.unit ? "（単位: " + m.unit + "）" : ""}、範囲${m.min}〜${m.max}`;
  }
  if (m.type === "toggle") {
    return `${baseInfo}: あり(true) / なし(false) の2択`;
  }
  if (m.type === "scale") {
    // labelsを優先
    if (Array.isArray(m.labels) && m.labels.length === (m.max - m.min + 1)) {
      const opts = m.labels.map((label, i) => `${m.min + i}=${label}`).join(" / ");
      return `${baseInfo}: ${opts}`;
    }
    // 汎用ラベル生成
    const diff = m.max - m.min;
    const generic = {
      3: ["なし", "軽い", "中", "強い"],
      4: ["なし", "軽度", "中程度", "強い", "最も強い"],
      5: ["なし", "すこし", "中くらい", "強め", "とても強い", "耐えられない"],
    };
    const labels = generic[diff];
    if (labels) {
      const opts = labels.map((l, i) => `${m.min + i}=${l}`).join(" / ");
      return `${baseInfo}: ${opts}`;
    }
    return `${baseInfo}: ${m.min}〜${m.max}の段階`;
  }
  return baseInfo;
}

router.post("/chat-symptom", async (req, res) => {
  try {
    const { messages = [], diseaseId } = req.body;
    const tmpl = getTemplate(diseaseId || "uc");
    if (!tmpl) return res.status(404).json({ error: "Template not found" });

    const metrics = tmpl.symptomConfig?.metrics || [];
    const fieldsDesc = metrics.map(describeMetricForAI).map((d) => "- " + d).join("\n");

    const systemContext = `あなたは${tmpl.name}の患者から今日の症状を聞き取る、優しく親しみやすい対話AIアシスタントです。

## 収集したいフィールド（内部的なマッピング用）
${fieldsDesc}

## 重要な役割
- 患者が日常の言葉で話した内容を、内部のフィールドに正確にマッピングする
- 数値そのものではなく、自然な言葉で質問・会話する（「1〜7で」「0〜5で」等の機械的な聞き方は絶対NG）
- 診断・評価・アドバイスは禁止（共感の一言と次の質問のみ）

## 質問の仕方（超重要）
**悪い例**: 「便の硬さを1〜7で教えてください」
**良い例**: 「便の状態はどうでしたか？硬い感じ？普通？それとも柔らかめ？」

**悪い例**: 「痛みを0〜5で教えてください」
**良い例**: 「お腹の痛みはどのくらいでしたか？全くない／少し／中くらい／強い のどれかで教えてください」

## 会話の進め方
1. 患者の自由な言葉から値を抽出する（例:「ちょっと柔らかめ」→ bristolScale: 5）
2. 患者の言葉から値が推測できれば積極的にマッピング（「普通」=中央値、「ちょっと」=1段階）
3. まだ聞けていない項目を、1回の返信で1〜2個だけ自然な日本語で聞く
4. 3項目以上集まったら「他に気になることはありますか？なければ記録します」と締めくくる
5. 患者が「大丈夫」「終わり」「OK」「これで」等と言ったら finished: true

## 出力ルール
- collected は既に判明している全項目（蓄積型、前回分も含める）
- 数値は数値型、真偽はbooleanで（"あり"=true、"なし"=false）
- まだ聞けていない項目は null のまま
- reply は自然な日本語（機械的な数字は使わない）

## 出力形式 JSON（これ以外は出力しない）
{
  "reply": "次の質問または締めの言葉",
  "collected": { "<fieldId>": <値 or null>, ... },
  "finished": <true or false>
}`;

    // チャット履歴を構築
    const history = [];
    history.push({ role: "user", parts: [{ text: systemContext }] });
    history.push({ role: "model", parts: [{ text: '{"reply":"準備できました","collected":{},"finished":false}' }] });

    messages.forEach((m) => {
      history.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    });

    const model = getChatModel();
    const chat = model.startChat({ history: history.slice(0, -1) });
    const lastMessage = history[history.length - 1];
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText });
    }

    // collected のサニタイズ
    const collected = {};
    const validIds = new Set(metrics.map((m) => m.id));
    Object.keys(parsed.collected || {}).forEach((k) => {
      if (validIds.has(k) && parsed.collected[k] !== null && parsed.collected[k] !== undefined) {
        collected[k] = parsed.collected[k];
      }
    });

    res.json({
      reply: parsed.reply || "...",
      collected,
      finished: !!parsed.finished,
    });
  } catch (err) {
    console.error("chat-symptom error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/scan-medication
// お薬手帳の写真から薬を抽出
// body: { image: "data:image/...", diseaseId }
// ======================================================
router.post("/scan-medication", async (req, res) => {
  try {
    const { image, diseaseId } = req.body;
    if (!image) return res.status(400).json({ error: "image required" });

    const master = getMedicationMaster(diseaseId || "uc");
    const masterNames = master ? master.medications.map((m) => ({ brandNames: m.brandNames, generic: m.genericName, category: m.category })) : [];

    const prompt = `お薬手帳または処方箋の画像を読み取り、処方された薬の情報を転記してください。

【出力形式 JSON】
{
  "medications": [
    {
      "brandName": "<商品名>",
      "genericName": "<一般名 or null>",
      "dosage": "<用量（例: 100mg）or null>",
      "frequency": "<用法（例: 1日3回食後）or null>",
      "startDate": "<開始日 YYYY-MM-DD or null>"
    }, ...
  ]
}

【注意】
- 読み取れた薬のみ列挙（推測不可）
- 薬効・相互作用・副作用等のコメントは一切含めない
- 単なる転記のみ`;

    const imagePart = dataUriToInlineData(image);
    const model = getVisionModel();
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed || !Array.isArray(parsed.medications)) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText });
    }

    // 薬剤マスタと照合してcategoryを推定
    const enriched = parsed.medications.map((m) => {
      const found = masterNames.find((mm) =>
        mm.brandNames.some((bn) => m.brandName && m.brandName.includes(bn))
      );
      return {
        ...m,
        category: found ? found.category : "other",
        matchedInMaster: !!found,
      };
    });

    res.json({ medications: enriched });
  } catch (err) {
    console.error("scan-medication error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/scan-lab
// 検査結果の写真/PDFから数値を抽出
// body: { image: "data:image/...", diseaseId }
// ======================================================
router.post("/scan-lab", async (req, res) => {
  try {
    const { image, diseaseId } = req.body;
    if (!image) return res.status(400).json({ error: "image required" });

    const tmpl = getTemplate(diseaseId || "uc");
    if (!tmpl) return res.status(404).json({ error: "Template not found" });

    const labItems = tmpl.labConfig?.items || [];
    const itemsDesc = labItems.map((l) => `- ${l.id} (${l.label}, ${l.unit})`).join("\n");

    const prompt = `検査結果の画像を読み取り、指定された検査項目の数値を転記してください。

【抽出対象】
${itemsDesc}

【出力形式 JSON】
{
  "date": "<検査日 YYYY-MM-DD or null>",
  "values": {
${labItems.map((l) => `    "${l.id}": <数値 or null>`).join(",\n")}
  }
}

【注意】
- 画像から読み取れた数値のみ
- 基準値範囲内外の判定コメントは一切含めない
- 単位換算は行わない（画像のままの値）`;

    const imagePart = dataUriToInlineData(image);
    const model = getVisionModel();
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText });
    }

    // サニタイズ
    const cleanValues = {};
    labItems.forEach((item) => {
      const v = parsed.values?.[item.id];
      if (v !== null && v !== undefined && !isNaN(parseFloat(v))) {
        cleanValues[item.id] = parseFloat(v);
      }
    });

    res.json({ date: parsed.date || null, values: cleanValues });
  } catch (err) {
    console.error("scan-lab error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/scan-cgm
// CGMレポートのスクリーンショットから血糖指標を抽出
// body: { image: "data:image/..." }
// ======================================================
router.post("/scan-cgm", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "image required" });

    const prompt = `CGM（持続血糖モニタリング）レポート画像から数値指標を読み取り、転記してください。

【抽出対象】
- tir: Time in Range (70-180 mg/dL) の % (0-100)
- tbr_l2: TBR Level 2 (<54 mg/dL) の % (0-100)
- tar_l1: TAR (>180 mg/dL) の %
- cv: 変動係数 %
- gmi: Glucose Management Indicator %
- tdd: Total Daily Dose (単位/日)

【出力形式 JSON】
{
  "tir": <数値 or null>,
  "tbr_l2": <数値 or null>,
  "tar_l1": <数値 or null>,
  "cv": <数値 or null>,
  "gmi": <数値 or null>,
  "tdd": <数値 or null>
}

【注意】
- 画像から読み取れた値のみ（推測不可）
- 血糖管理の良し悪しに関するコメントは一切含めない
- 数値の転記のみ`;

    const imagePart = dataUriToInlineData(image);
    const model = getVisionModel();
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText });
    }

    // サニタイズ
    const keys = ["tir", "tbr_l2", "tar_l1", "cv", "gmi", "tdd"];
    const clean = {};
    keys.forEach((k) => {
      if (parsed[k] !== null && parsed[k] !== undefined && !isNaN(parseFloat(parsed[k]))) {
        clean[k] = parseFloat(parsed[k]);
      }
    });

    res.json({ values: clean });
  } catch (err) {
    console.error("scan-cgm error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/parse-visit
// 受診時の「言われたこと」を整形して findings/nextAction に分ける
// body: { rawText: "...", diseaseId, visitDate?: "YYYY-MM-DD" }
// ======================================================
router.post("/parse-visit", async (req, res) => {
  try {
    const { rawText, diseaseId, visitDate } = req.body;
    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "rawText required" });
    }

    const tmpl = getTemplate(diseaseId || "uc");
    const diseaseName = tmpl?.name || "";
    const today = visitDate || new Date().toISOString().slice(0, 10);

    const prompt = `患者が受診時に医師から言われた内容を整形します。診断・解釈・治療方針の評価は一切行わず、患者が話した内容を読みやすく整理するだけです。

## やること
1. rawText を「医師が言ったこと（findings）」と「次回までにすること（nextActionDraft）」に分けて整形
2. 「次回○日後／○週間後／○月○日」のような言及があれば、受診日（${today}）を起点に nextVisitDate を YYYY-MM-DD で計算
3. 処方変更／検査指示／治療変更の言及があるかをフラグで返す（true/false）

## 厳守事項（ハルシネーション防止）
- 入力に書かれていないことは創作・補完しない
- 医学的解釈・重症度評価・治療方針の示唆は禁止
- 不明・該当なしの項目は空文字列または null
- 患者向けにやさしく言い換える程度の整形は OK だが、内容は変えない

## 例
入力: "今日先生に言われたこと、レブラミドこのまま続けて、VEGFは正常範囲、次は3ヶ月後でいいって。あと血液検査の予約だけ取って帰ること"
出力: {
  "findings": "・レブラミドは現状のまま継続\\n・VEGF は正常範囲\\n・治療経過は良好",
  "nextActionDraft": "・血液検査の予約を取る\\n・3ヶ月後に再診",
  "nextVisitDate": "<受診日から3ヶ月後>",
  "suggestions": { "medicationChange": false, "newLab": true, "newProcedure": false }
}

## 入力（疾患: ${diseaseName}・受診日: ${today}）
"""
${rawText}
"""

## 出力JSON形式（これ以外は出力しない）
{
  "findings": "<整形された医師の所見・箇条書き推奨>",
  "nextActionDraft": "<次回までにすることの箇条書き>",
  "nextVisitDate": "<YYYY-MM-DD or null>",
  "suggestions": {
    "medicationChange": <true or false>,
    "newLab": <true or false>,
    "newProcedure": <true or false>
  }
}`;

    const model = getTextModel();
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText.slice(0, 500) });
    }

    // サニタイズ
    const sanitized = {
      findings: typeof parsed.findings === "string" ? parsed.findings : "",
      nextActionDraft: typeof parsed.nextActionDraft === "string" ? parsed.nextActionDraft : "",
      nextVisitDate: /^\d{4}-\d{2}-\d{2}$/.test(parsed.nextVisitDate || "") ? parsed.nextVisitDate : null,
      suggestions: {
        medicationChange: !!parsed.suggestions?.medicationChange,
        newLab: !!parsed.suggestions?.newLab,
        newProcedure: !!parsed.suggestions?.newProcedure,
      },
    };
    res.json(sanitized);
  } catch (err) {
    console.error("parse-visit error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/parse-record
// 「きろくする」の統合API: 原文から type(visit/self-log) を自動判別し、
// それぞれに適した整理結果を返す
// body: { rawText, diseaseId, currentDate?: "YYYY-MM-DD", knownClinics?: [{id, name, departments}] }
// ======================================================
router.post("/parse-record", async (req, res) => {
  try {
    const { rawText, diseaseId, currentDate, knownClinics } = req.body;
    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "rawText required" });
    }

    const tmpl = getTemplate(diseaseId || "uc");
    const diseaseName = tmpl?.name || "";
    const today = currentDate || new Date().toISOString().slice(0, 10);

    const clinicsHint = Array.isArray(knownClinics) && knownClinics.length
      ? "\n## 登録済みのかかりつけ病院（候補）\n" + knownClinics.map((c, i) =>
          `${i + 1}. id="${c.id}" name="${c.name}" depts=[${(c.departments || []).join(",")}]`
        ).join("\n")
      : "";

    const prompt = `患者が記録した自由文を整理します。診断・解釈は一切行わず、以下を判定・整形してください。

## やること
1. **type 判定**: この文章は「受診の記録(visit)」か「日常の体調メモ(self-log)」か
   - 受診の特徴: 医師の発言・処方・検査結果・次回予約・「先生に言われた」など
   - 体調メモの特徴: 自分の症状の主観的記述・気分・体調の変化のみ
2. **type=visit の場合**: findings(医師の所見) と nextActionDraft(次回までにすること) に分けて整形
3. **type=self-log の場合**: selfLogTitle(30字以内のタイトル) と selfLogDetail(本文) を作成
4. **次回受診日**: 「○日後／○ヶ月後／○月○日」が含まれれば nextVisitDate を YYYY-MM-DD で計算（受診日 ${today} 基準）
5. **病院推測**: 文中に病院名が出ていて、登録済み候補と一致するなら suggestedClinicId/Department を返す（推測できなければ null）
6. **suggestions**: 処方変更/検査指示/治療変更が含まれていればフラグを true

## 厳守事項
- 入力にないことは書かない（創作禁止）
- 医学的解釈・重症度評価は禁止
- 確信が持てないときは type="self-log" にフォールバック（より安全）

## 例1: 受診の記録
入力: "今日先生にレブラミドこのまま続けて、3ヶ月後に再診って言われた。VEGFは正常範囲でした。"
出力: {
  "type":"visit", "confidence":0.95,
  "findings":"・レブラミドは現状のまま継続\\n・VEGF は正常範囲",
  "nextActionDraft":"・3ヶ月後に再診",
  "nextVisitDate":"<3ヶ月後>",
  "selfLogTitle":null, "selfLogDetail":null,
  "suggestedClinicId":null, "suggestedDepartment":null,
  "suggestions": {"medicationChange":false,"newLab":false,"newProcedure":false}
}

## 例2: 体調メモ
入力: "今日は朝から手のしびれが少し強い。歩くのは大丈夫。夕方には楽になった。"
出力: {
  "type":"self-log", "confidence":0.92,
  "findings":null, "nextActionDraft":null, "nextVisitDate":null,
  "selfLogTitle":"朝の手のしびれ強め、夕方楽に",
  "selfLogDetail":"今日は朝から手のしびれが少し強い。歩くのは大丈夫。夕方には楽になった。",
  "suggestedClinicId":null, "suggestedDepartment":null,
  "suggestions": {"medicationChange":false,"newLab":false,"newProcedure":false}
}

## 入力（疾患: ${diseaseName}・記録日: ${today}）
"""
${rawText}
"""
${clinicsHint}

## 出力JSON（これ以外は出力しない）
{
  "type": "visit" | "self-log",
  "confidence": <0-1>,
  "findings": <string or null>,
  "nextActionDraft": <string or null>,
  "nextVisitDate": <"YYYY-MM-DD" or null>,
  "selfLogTitle": <string or null>,
  "selfLogDetail": <string or null>,
  "suggestedClinicId": <string or null>,
  "suggestedDepartment": <string or null>,
  "suggestions": {
    "medicationChange": <true or false>,
    "newLab": <true or false>,
    "newProcedure": <true or false>
  }
}`;

    const model = getTextModel();
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText.slice(0, 500) });
    }

    const sanitized = {
      type: parsed.type === "visit" ? "visit" : "self-log",
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      findings: typeof parsed.findings === "string" ? parsed.findings : null,
      nextActionDraft: typeof parsed.nextActionDraft === "string" ? parsed.nextActionDraft : null,
      nextVisitDate: /^\d{4}-\d{2}-\d{2}$/.test(parsed.nextVisitDate || "") ? parsed.nextVisitDate : null,
      selfLogTitle: typeof parsed.selfLogTitle === "string" ? parsed.selfLogTitle : null,
      selfLogDetail: typeof parsed.selfLogDetail === "string" ? parsed.selfLogDetail : null,
      suggestedClinicId: typeof parsed.suggestedClinicId === "string" ? parsed.suggestedClinicId : null,
      suggestedDepartment: typeof parsed.suggestedDepartment === "string" ? parsed.suggestedDepartment : null,
      suggestions: {
        medicationChange: !!parsed.suggestions?.medicationChange,
        newLab: !!parsed.suggestions?.newLab,
        newProcedure: !!parsed.suggestions?.newProcedure,
      },
    };
    res.json(sanitized);
  } catch (err) {
    console.error("parse-record error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/summarize-other-visits
// 「いま見せる病院」以外の最近の受診を、医師に伝える1文の箇条書きに整形
// body: {
//   diseaseId,
//   currentClinic: { name, departments: [...] },
//   otherVisits: [{ date, clinicName, department, findings, nextAction }, ...]
// }
// ======================================================
router.post("/summarize-other-visits", async (req, res) => {
  try {
    const { diseaseId, currentClinic, otherVisits } = req.body;
    if (!Array.isArray(otherVisits) || otherVisits.length === 0) {
      return res.json({ summary: "" });
    }

    const tmpl = getTemplate(diseaseId || "uc");
    const diseaseName = tmpl?.name || "";
    const currentName = currentClinic?.name || "今日のクリニック";
    const currentDepts = (currentClinic?.departments || []).join("・") || "未指定";

    const visitsText = otherVisits.map((v, i) => {
      return `${i + 1}. ${v.date}  ${v.department}（${v.clinicName}）
   findings: ${v.findings || ""}
   nextAction: ${v.nextAction || ""}`;
    }).join("\n");

    const prompt = `「他のクリニックでこんなことを言われた」を医師に短く伝えるための箇条書きを作ります。

## 状況
患者は今、${currentName}（${currentDepts}）の診察室にいます。
医師が${diseaseName}の患者の他クリニックでの最近の出来事を知りたがっています。

## 厳守事項
- 与えられた findings / nextAction の内容を**短く言い換える**だけ
- 創作・補完・診断・治療方針評価は禁止
- 不明な情報は書かない
- 各クリニック1行・最大40字程度（医師がパッと読める長さ）
- フォーマット: "・<診療科>（<クリニック略称>, <月>月）: <要約>"

## 与えられた他クリニックの受診（直近順）
${visitsText}

## 出力JSON（これ以外は出力しない）
{ "summary": "<改行区切りの箇条書き>" }`;

    const model = getTextModel();
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed) {
      return res.status(500).json({ error: "Failed to parse AI response", raw: responseText.slice(0, 500) });
    }

    res.json({ summary: typeof parsed.summary === "string" ? parsed.summary : "" });
  } catch (err) {
    console.error("summarize-other-visits error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/chat-record
// 「きろくする」のチャット対話。受診の記録 / 体調メモ どちらの聞き取りもこなす。
// body: { messages: [{role:"user"|"assistant", content:"..."}], diseaseId }
// res:  { reply: "...", suggestEnd: bool, turnCount: number }
// ======================================================
router.post("/chat-record", async (req, res) => {
  try {
    const { messages = [], diseaseId } = req.body;
    const tmpl = getTemplate(diseaseId || "uc");
    const diseaseName = tmpl?.name || "慢性疾患";

    const userTurns = messages.filter((m) => m.role === "user").length;
    const lastUserMsg = (messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "").toLowerCase();
    // ユーザー側の「終わりたい」シグナル検出（フロント側でも判定するが、サーバ側でも保険）
    const userWantsToEnd = /もう?(大丈夫|いい|ok|オーケー|十分)|これで|終わ(り|る|ろ)|保存|次へ|ありがとう|また(明日|今度|今度ね)|おやすみ|寝る|疲れ/.test(lastUserMsg);

    const systemContext = `あなたは${diseaseName}の患者さんに寄り添う、訓練を受けたピアカウンセラーです。
医療判断や薬の効果判定は一切しません。代わりに、患者さんが自分の気持ちと体調を
言葉にできるように、安全で温かい対話を提供します。

## 振る舞いの5原則

### 1. 傾聴ファースト
- 受け止めだけで返すターンがあって構いません（毎回質問しない）
- 相手の言葉をそのまま使ってオウム返しする：「『朝から重い感じ』が続いているのですね」
- 共感の言い回しを毎回変える（同じ定型句を直近3ターン以内に繰り返さない）

### 2. 小さな肯定を挟む
- 「気づかれているのが、もう大事な一歩ですね」
- 「ここに書こうと思われたの、いいと思います」
- ChatGPTの「いい質問ですね」のような、相手の行動を具体的に肯定する一言
- お世辞や大袈裟な褒めは禁止

### 3. 質問は最大1つ・選択肢か逃げ道を添える
- 「もう少し教えてもらってもいいですか。たとえば、いつ頃から続いていますか？」
- 「無理に答えていただかなくても大丈夫です」を時々添える
- 質問しない返信があってもOK

### 4. 自己決定を尊重する
- 「○○してください」と命令しない
- 「○○もありますし、××もあります。お好みで大丈夫です」のように選択肢を残す
- 終わるかどうかは患者さんに決めてもらう

### 5. 無理に終わらせない
- ターン数で機械的に切らない
- ユーザーが終わりたいシグナル（「保存」「もういい」「ありがとう」「次へ」「大丈夫」「おやすみ」「また」）を出したら、同意して suggestEnd:true
- ${userWantsToEnd ? "**直前のユーザー発話に「終わりたいシグナル」が含まれています**。受け止め＋感謝＋次の動線案内で suggestEnd:true を返してください。" : "ユーザーが話したい雰囲気の間は、ずっと受け止め続けてください。"}

## 絶対NG
- 診断・重症度評価・薬の効果判定・「再燃の可能性があります」等の医学的解釈
- 「○○してください」と命令する
- 「そうだったんですね」「お疲れ様です」など同じ定型句を直近3ターン以内に繰り返す
- 絵文字
- 「！」を使った大袈裟な相槌
- 患者さんの話を勝手に要約して終わらせようとする

## トーン
- 敬語ベース、ですます調
- 2〜4文以内
- 一文を短く、改行は使わない
- 「あなた」より「○○さん」を避けて主語なしで自然な日本語

## 出力形式（JSONのみ・前置きやコードブロックのマーカー禁止）
{
  "reply": "<2〜4文の応答>",
  "suggestEnd": <true: ユーザーが終わりたいシグナルを出している / false: 続きを受け止める>
}`;

    // チャット履歴を構築（chat-symptom と同じ手法）
    const history = [];
    history.push({ role: "user", parts: [{ text: systemContext }] });
    history.push({ role: "model", parts: [{ text: '{"reply":"了解しました","suggestEnd":false}' }] });

    messages.forEach((m) => {
      history.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    });

    if (history.length < 3) {
      // ユーザー発話がまだ無い → 既定の出だしを返す
      return res.json({
        reply: "今日のことを教えてください。受診のお話でも、体調のことでも何でもどうぞ。",
        suggestEnd: false,
        turnCount: 0,
      });
    }

    const model = getChatModel();
    const chat = model.startChat({ history: history.slice(0, -1) });
    const lastMessage = history[history.length - 1];
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed || typeof parsed.reply !== "string") {
      // 失敗時はフォールバック（プレーンテキストで返ってきた可能性）
      const cleaned = (responseText || "").replace(/^[`\s]*```json|```[\s`]*$/g, "").trim();
      return res.json({
        reply: cleaned || "もう少し詳しく教えてもらえますか？",
        suggestEnd: userTurns >= 4,
        turnCount: userTurns,
      });
    }

    res.json({
      reply: parsed.reply,
      suggestEnd: !!parsed.suggestEnd,
      turnCount: userTurns,
    });
  } catch (err) {
    console.error("chat-record error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// POST /api/ai/listen
// ひとりごとモード：AIは「聞き役」に徹する。質問しない・要約しない・
// 診断しない。共感と受け止めだけ。流れていく対話。
// body: { messages: [{role, content}], diseaseId }
// res:  { reply: "..." }
// ======================================================
router.post("/listen", async (req, res) => {
  try {
    const { messages = [], diseaseId } = req.body;
    const tmpl = getTemplate(diseaseId || "uc");
    const diseaseName = tmpl?.name || "慢性疾患";

    const systemContext = `あなたは${diseaseName}の患者さんの「ひとりごと」を聞く、寄り添うだけの存在です。
このチャットは保存されません。患者さんが気持ちを流すための場所です。

## 振る舞いの原則
1. **聞くだけ**：質問は基本しない（するとしても押しつけがましくなく、1回の応答に最大1つだけ・自然な誘い）
2. **要約しない**：「つまり○○ですね」と整理しない。患者さんの言葉のまま受け止める
3. **解決策を出さない**：「○○してみては？」は一切言わない
4. **診断しない**：医学的解釈は禁止
5. **共感の言葉を毎回変える**：「そうだったんですね」連発を絶対に避ける
6. **短く**：2〜3文以内、改行なし
7. **絵文字なし・「！」なし**

## 共感の引き出し（毎回違うものを選ぶ）
- 「それは、しんどいですよね」
- 「うんうん、そう感じるのも当然だと思います」
- 「ここで言葉にできただけでも、すごいことです」
- 「無理に話さなくても、いてくれるだけで大丈夫ですよ」
- 「そうやって考えてしまう日もありますよね」
- 「気持ちを置いていく場所があるって、大事ですよね」
- 「読んでいて、こちらも一緒に深呼吸したくなりました」
- 「言葉にすると、また見え方が変わってくるかもしれません」
- 「どうぞ、続きがあれば聞かせてくださいね」

## 出力形式（JSONのみ・前置き禁止）
{
  "reply": "<2〜3文の聞き役応答>"
}`;

    const history = [];
    history.push({ role: "user", parts: [{ text: systemContext }] });
    history.push({ role: "model", parts: [{ text: '{"reply":"はい、ここにいます"}' }] });

    messages.forEach((m) => {
      history.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    });

    if (history.length < 3) {
      return res.json({ reply: "はい、ここにいます。今日のこと、よかったら聞かせてくださいね。" });
    }

    const model = getChatModel();
    const chat = model.startChat({ history: history.slice(0, -1) });
    const lastMessage = history[history.length - 1];
    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const responseText = result.response.text();
    const parsed = parseJsonSafe(responseText);

    if (!parsed || typeof parsed.reply !== "string") {
      const cleaned = (responseText || "").replace(/^[`\s]*```json|```[\s`]*$/g, "").trim();
      return res.json({ reply: cleaned || "うん、聞いていますよ。" });
    }
    res.json({ reply: parsed.reply });
  } catch (err) {
    console.error("listen error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ヘルスチェック
router.get("/health", (_req, res) => res.json({ ok: true, hasKey: hasApiKey() }));

module.exports = router;
