# よりそいPHR（線維筋痛症版）実装指示書 ― 写真からの服薬登録機能（機能①）

## 0. この指示書の使い方（Cursor向け）

- 対象は「機能①：写真を撮って服薬中の薬を登録する」のみ。関連する「機能②：今日飲むべき薬を教える」への接続だけ考慮するが、②本体はこの指示書の範囲外とする。
- 既存リポジトリ `yorisoi_phr`（React + TypeScript）を前提に、Gemini抽出用のバックエンドAPIを新規に追加し、Cloud Runにデプロイする。
- 医療系機能のため、**AIの抽出結果をユーザー確認なしに保存してはならない**。これは仕様であり省略不可。
- モデルIDとSDKのAPIシグネチャは変動が速い。実装時に `https://ai.google.dev/gemini-api/docs/models` で最新のモデルIDと `@google/genai` のシグネチャを確認してから固定すること。

---

## 1. 目的とスコープ

### 目的
ユーザーがお薬手帳のシール・お薬説明書（薬情）・PTPシートのいずれかを撮影すると、薬名・用量・用法・定期/頓服の区別までを自動抽出し、ユーザー確認・修正のうえで服薬マスタに保存する。

### スコープ内
- 画像アップロード（カメラ撮影 / ファイル選択）
- Gemini Visionによる構造化抽出（JSON）
- 抽出結果の確認・修正UI
- 服薬マスタへの保存（定期 / 頓服を区別）

### スコープ外（この指示書では実装しない）
- 服薬スケジュールの算出（機能②）
- LINE push通知（機能③）
- 検査値記録・気圧表示・気分/痛み記録（機能④⑤⑥）

---

## 2. 技術スタックと前提

| 層 | 採用 |
|---|---|
| フロント | 既存 `yorisoi_phr`（React + TypeScript） |
| バックエンド | Node.js + TypeScript（Cloud Run上のAPIサービスとして新規作成） |
| AI | Gemini API（`@google/genai`） |
| デプロイ | Google Cloud Run |
| シークレット | Google Secret Manager（`GEMINI_API_KEY`） |
| 抽出モデル（主） | `gemini-3.1-flash-lite`（構造化JSON・マルチモーダル・低コスト） |
| 抽出モデル（フォールバック） | `gemini-3-flash`（小文字の読み取りが必要な画像用） |

> 補足：`gemini-1.5-*` / `gemini-2.0-*` は現在停止済み。実装時にモデルIDが有効か必ず確認する。

---

## 3. アーキテクチャ / データフロー

```
[React (yorisoi_phr)]
   1. 画像を撮影 or 選択
   2. base64化して POST /api/medications/extract へ送信
        │
        ▼
[Cloud Run: med-extract API (Node/TS)]
   3. Secret Manager から GEMINI_API_KEY を取得
   4. Gemini に画像 + プロンプト + responseSchema を渡す
   5. JSON抽出結果を検証（Zod）して返す
        │
        ▼
[React]
   6. 確認・修正画面に抽出結果を表示（低信頼項目を強調）
   7. ユーザーが確認/修正して「保存」
   8. POST /api/medications で服薬マスタに保存
```

- 画像はサーバに永続保存しない（抽出のためだけに一時利用）。保存が必要になった場合は別途要件化する。
- Geminiへのアクセスは必ずCloud Run側で行い、フロントにAPIキーを露出させない。

---

## 4. 環境変数 / シークレット

Cloud Runサービスに以下を設定する。

| 変数 | 用途 | 供給元 |
|---|---|---|
| `GEMINI_API_KEY` | Gemini APIキー | Secret Manager |
| `GEMINI_MODEL_PRIMARY` | 主モデルID（既定 `gemini-3.1-flash-lite`） | 環境変数 |
| `GEMINI_MODEL_FALLBACK` | フォールバックモデルID（既定 `gemini-3-flash`） | 環境変数 |
| `ALLOWED_ORIGIN` | CORS許可オリジン（yorisoi_phrのURL） | 環境変数 |

- APIキーは環境変数へ直書きせず、Secret Manager経由でマウントする。
- リポジトリに `.env` をコミットしない（`.gitignore` に追加）。

---

## 5. バックエンド実装（Cloud Run APIサービス）

### 5.1 エンドポイント

| メソッド | パス | 役割 |
|---|---|---|
| `POST` | `/api/medications/extract` | 画像を受け取りGeminiで抽出、JSONを返す（保存はしない） |
| `POST` | `/api/medications` | 確認後の服薬データを保存する |

### 5.2 抽出JSONスキーマ（Geminiに強制させる構造）

```ts
// 1件の薬
type MedicationExtract = {
  brandName: string;          // 商品名 例: プレガバリンOD錠75mg
  genericName: string | null; // 一般名 例: プレガバリン
  strength: string | null;    // 規格/含量 例: 75mg
  dosageType: "regular" | "prn"; // regular=定期, prn=頓服
  timing: string[] | null;    // 定期の服用タイミング 例: ["朝食後","夕食後"]
  dosePerTime: string | null; // 1回量 例: 1錠
  prnCondition: string | null;// 頓服条件 例: 痛い時 1日3回まで
  note: string | null;        // 備考
  confidence: "high" | "medium" | "low"; // 読み取り信頼度
};

type ExtractionResult = {
  sourceType: "medication_notebook" | "drug_info_sheet" | "ptp_sheet" | "unknown";
  medications: MedicationExtract[];
};
```

- 読み取れない項目は推測で埋めず `null` を返させる。手入力で補完する前提。
- `confidence` は項目単位ではなく薬単位でよい。`low` の薬は確認画面で強調する。

### 5.3 Geminiプロンプト（システム指示）

```
あなたは日本の調剤情報を読み取る専門アシスタントです。
入力画像（お薬手帳のシール / お薬説明書 / PTPシート）から、
処方されている薬の情報を抽出し、指定のJSONスキーマのみで返してください。

規則:
- 前置き・説明文・マークダウンは一切出力しない。JSONのみ。
- 読み取れない項目は推測せず null にする。
- 「定期薬」か「頓服薬」かを必ず判定する。
  「疼痛時」「発熱時」「頓用」「〜のとき」などの記載があれば prn（頓服）とする。
- 用法（朝食後など）と1回量（1錠など）を分けて抽出する。
- 各薬の読み取り確度を confidence（high/medium/low）で付与する。
- 画像に複数の薬があれば medications 配列に全て入れる。
```

### 5.4 Gemini呼び出し（TypeScript / `@google/genai`）

```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// responseSchema は Gemini がサポートするスキーマ形式で定義する
const responseSchema = {
  type: "object",
  properties: {
    sourceType: {
      type: "string",
      enum: ["medication_notebook", "drug_info_sheet", "ptp_sheet", "unknown"],
    },
    medications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          brandName: { type: "string" },
          genericName: { type: "string", nullable: true },
          strength: { type: "string", nullable: true },
          dosageType: { type: "string", enum: ["regular", "prn"] },
          timing: { type: "array", items: { type: "string" }, nullable: true },
          dosePerTime: { type: "string", nullable: true },
          prnCondition: { type: "string", nullable: true },
          note: { type: "string", nullable: true },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["brandName", "dosageType", "confidence"],
      },
    },
  },
  required: ["sourceType", "medications"],
};

async function extractMedications(base64Image: string, mimeType: string, model: string) {
  const result = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: SYSTEM_PROMPT }, // 5.3のプロンプト
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0, // 抽出タスクなので決定的に
    },
  });

  return JSON.parse(result.text); // Zodで再検証する（5.5）
}
```

> `@google/genai` のメソッド名・引数はバージョンで変わる。実装前に最新のReadmeで `generateContent` のシグネチャと `inlineData` の指定方法を確認すること。

### 5.5 サーバ側バリデーションとフォールバック

- Geminiの返却JSONを**Zodで再検証**する（モデルがスキーマを外すケースに備える）。
- 検証NG、または `medications` が空、または全件 `confidence: "low"` の場合はフォールバックモデルで1回だけ再試行する。
- 再試行してもNGなら、空配列 + エラーフラグを返し、フロントで「読み取れませんでした。手入力してください」に誘導する。

---

## 6. フロントエンド実装（yorisoi_phr）

### 6.1 画面フロー

1. **撮影/選択画面**：カメラ起動またはファイル選択。1枚。
2. **抽出中**：ローディング表示（数秒）。
3. **確認・修正画面**：抽出された薬を一覧表示。各項目を編集可能にする。
   - `confidence: "low"` の薬、および `null` 項目は視覚的に強調（要確認バッジ）。
   - 「定期 / 頓服」はトグルで切り替え可能に。
   - 「薬を追加」ボタンで手入力の空カードを追加できる。
4. **保存**：確認後 `POST /api/medications` で保存。

### 6.2 実装上の必須要件

- 画像はアップロード前にクライアント側で長辺2000px程度にリサイズ・JPEG圧縮する（通信量とレイテンシ削減、文字が潰れない範囲で）。
- 確認画面をスキップして保存する導線を作らない（安全要件）。
- 保存後、機能②が参照できるよう `dosageType` を必ず保持する。

---

## 7. 服薬マスタ データモデル（保存先）

```prisma
model Medication {
  id            String   @id @default(cuid())
  userId        String
  brandName     String                       // 商品名
  genericName   String?                       // 一般名
  strength      String?                       // 規格/含量
  dosageType    DosageType                    // regular | prn
  timing        String[]                      // 定期の服用タイミング
  dosePerTime   String?                       // 1回量
  prnCondition  String?                       // 頓服条件
  note          String?
  source        String?                       // 抽出元 (notebook/sheet/ptp/manual)
  isActive      Boolean  @default(true)       // 服用中フラグ
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum DosageType {
  regular
  prn
}
```

- `dosageType` が機能②（今日飲むべき薬の算出）の分岐キーになる。`regular` は `timing` からスケジュール生成、`prn` はスケジュールに載せず頓服リストとして扱う。
- 手入力で追加された薬は `source = "manual"` とする。

---

## 8. 安全設計（医療系ゆえ必須）

- **確認ステップ必須**：AI抽出結果を無確認で保存する経路を作らない。
- **推測禁止**：読み取れない項目はnull。誤った用法をAIに埋めさせない。
- **低信頼の可視化**：`confidence: "low"` の薬はユーザーに要確認を促す。
- **APIキー秘匿**：フロントからGeminiを直接呼ばない。Cloud Run経由のみ。
- **画像非永続化**：抽出目的以外で画像を保存しない。

---

## 9. Cloud Run デプロイ手順

1. `Dockerfile` を用意（Node LTS、`npm ci`、`npm run build`、`node dist/index.js`）。
2. `PORT` 環境変数を尊重してリッスンする（Cloud Runは `PORT` を注入する）。
3. Secret Managerに `GEMINI_API_KEY` を登録し、Cloud Runサービスにマウント。
4. デプロイ：
   ```bash
   gcloud run deploy yorisoi-med-extract \
     --source . \
     --region asia-northeast1 \
     --set-secrets GEMINI_API_KEY=gemini-api-key:latest \
     --set-env-vars GEMINI_MODEL_PRIMARY=gemini-3.1-flash-lite,GEMINI_MODEL_FALLBACK=gemini-3-flash,ALLOWED_ORIGIN=<yorisoi_phrのURL> \
     --allow-unauthenticated
   ```
5. CORSを `ALLOWED_ORIGIN` に限定する。
6. フロントの呼び出し先をデプロイ後のCloud RunのURLに設定する。

---

## 10. 受け入れ条件（Definition of Done）

- [ ] お薬手帳シールの画像で、薬名・用法・1回量・定期/頓服が抽出できる。
- [ ] 頓服薬が定期薬と区別して抽出・保存される。
- [ ] 読み取れない項目が `null` で返り、確認画面で手入力補完できる。
- [ ] 確認画面を経由しないと保存できない。
- [ ] `confidence: "low"` の薬が確認画面で強調される。
- [ ] GeminiのAPIキーがフロントのバンドルに含まれていない（ネットワークタブ・ソースで確認）。
- [ ] Cloud Runにデプロイ済みで、yorisoi_phrから呼び出してCORSが通る。
- [ ] Geminiがスキーマを外した場合にZod検証→フォールバック→手入力誘導が動く。

---

## 11. 実装順序（Cursorへのタスク分解）

1. Cloud Run用のNode/TSプロジェクト雛形を作成（Express等 + `@google/genai` + zod）。
2. `POST /api/medications/extract` を実装（5.2〜5.5）。ローカルでサンプル画像でテスト。
3. Zod検証とフォールバック再試行を実装。
4. `POST /api/medications` と Prisma モデル（第7章）を実装。
5. フロント：撮影/選択 → 抽出API呼び出し → 確認・修正画面 → 保存（第6章）。
6. 画像クライアントリサイズ・圧縮を実装。
7. Dockerfile作成、Cloud Runへデプロイ、Secret Manager設定、CORS確認。
8. 受け入れ条件（第10章）を1つずつ確認。

---

## 付記：実装時に必ず確認すること
- Geminiの有効なモデルID（`gemini-3.1-flash-lite` / `gemini-3-flash` が現行か）。
- `@google/genai` の `generateContent` シグネチャと `responseSchema` / `inlineData` の指定方法。
- Cloud Runの `PORT` 注入とSecret Managerマウントの最新手順。
