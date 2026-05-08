# 患者体験談ベース AI 相談機能 — 移植用仕様書

別アプリに「体験談の内容に根づいた回答」を実装するための技術仕様です。実装者（人間・AI エージェント）がこの文書だけで概ね同じ挙動を再現できることを目的とします。

**参照実装（よりそい PHR）**

| 種別 | パス |
|------|------|
| API ルート | `server/routes/consultation.js` |
| フロント | `public/consultation.html` |
| デモ用体験談 JSON | `stories-seed.json` |
| ルート登録 | `server/index.js`（`/api/consultation`） |

---

## 1. 機能の目的と境界

### 1.1 目的

- 登録済みの**患者体験談（ストーリー）**をモデルに読ませ、ユーザー質問に**自然言語で**応答する。
- 回答は体験談に**根づけ**、参照したストーリーをユーザーに示せること。

### 1.2 やらないこと（必須）

- **医療アドバイス・診断・治療方針の推奨は禁止**。体験の紹介・寄り添いにとどめる。
- 体験談にない内容を**断定・創作**して答えない（システムプロンプトで抑制）。

### 1.3 アプローチの種類（本実装）

本リポジトリは **ベクトル検索を使わない「全文コンテキスト注入型」**です。

1. 公開済みストーリーを取得し、任意で疾患などでフィルタする。
2. 各ストーリーのセクション本文を **1 つの長い参照テキスト**に連結する。
3. **会話の最初のユーザーターン**だけ、その参照テキストをユーザーメッセージの前に付与して LLM に送る。
4. モデルには **システム指示**で「体験のみに基づく」「参照 ID を `[story_id:...]` でマークする」などを課す。
5. 返答からマーカーを除去してユーザーに見せ、マーカーから参照一覧（リンク用メタデータ）を復元する。

体験談が数十件・長大になる場合は、別アプリでは **チャンク分割 + 埋め込み検索（本格的 RAG）** への置き換えを検討する（[10. 拡張](#10-拡張パス本格的-rag)）。

---

## 2. データモデル（体験談）

### 2.1 ストーリー単位

移植先でも、最低限次の概念を持てる JSON 形を推奨します。

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `story_id` | string | はい | 一意 ID。回答内マーカーと一致させる（例: `cml-001`）。 |
| `title` | string | はい | 一覧・リンク表示用タイトル。 |
| `disease_type` など | string | 任意 | フィルタ用（例: `cml`, `aml`）。アプリのドメインに合わせてよい。 |
| `age_at_diagnosis` | number | 任意 | 文脈整形用。 |
| `gender` | string | 任意 | 文脈整形用。 |
| `status` | string | 推奨 | 例: `published` のみ相談対象にする。 |
| `sections` | array | はい | 時系列・フェーズごとの本文ブロック。 |

### 2.2 セクション単位

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `phase` | string | 任意 | 例: `diagnosis`, `treatment_start`, `ongoing`（表示ラベルはアプリ側で定義）。 |
| `fact_content` | string | 推奨 | **事実の記述**。LLM に渡す主本文（参照実装は主にここを使用）。 |
| `emotion_content` | string | 任意 | 感情面の記述。移植時は `fact_content` と結合して渡すと情報量が増える。 |
| `fact_tags` | array | 任意 | `{ "category", "value" }` など。検索・要約の補助に使える。 |

**参照実装の注意:** `server/routes/consultation.js` の `buildContext` は現状 **`fact_content` のみ**を連結している。感情文や `summary_fact` を足すかは移植先のポリシーで決める。

---

## 3. HTTP API 仕様

### 3.1 `POST /api/consultation`

**リクエスト JSON**

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `message` | string | はい | ユーザーの質問（空不可）。 |
| `history` | array | いいえ | これまでの会話。要素は `{ "role": "user" \| "assistant", "content": string }`。 |
| `disease_type` | string | いいえ | 指定時のみ、その値に一致するストーリーに絞り込み（参照実装は許可リストで検証）。 |

**初回ターン:** `history` は空配列 `[]` または省略。

**2 ターン目以降:** `history` には**これまでの user / assistant のみ**を入れ、**直近のユーザーメッセージは含めない**のが参照実装のクライアント挙動（`consultation.html` は送信後に `history: chatHistory.slice(0, -1)` を送る）。

**レスポンス JSON**

| フィールド | 型 | 説明 |
|------------|-----|------|
| `answer` | string | ユーザー向け本文。`[story_id:...]` マーカーは**サーバで除去済み**。 |
| `referenced_stories` | array | 参照した体験談のメタ情報。要素例は下表。 |
| `error` | string | エラー時（ステータス 4xx/5xx）。 |

`referenced_stories` の要素例:

```json
{
  "story_id": "cml-001",
  "title": "健診で発覚、9ヶ月。…",
  "disease_type": "cml",
  "url": "/stories-detail.html?id=cml-001"
}
```

`url` のパス形式は**移植先のルーティングに合わせて変更**する。

---

## 4. サーバー側アルゴリズム（擬似コード）

```
function handleConsultation(message, history, disease_type_filter):
  stories = loadPublishedStories()   // Firestore / DB / デモ JSON など
  if disease_type_filter is valid:
    stories = filter by disease_type

  if no LLM API key:
    return mockAnswer(stories)       // 任意。開発用。

  if history is empty (first turn):
    context = buildContextString(stories)
    userPayload = "【参照できる患者体験記】\n" + context + "\n\n【ユーザーの質問】\n" + message
  else:
    userPayload = message            // 参照実装は 2 ターン目以降コンテキストを再送しない

  rawAnswer = LLM.chat(systemPrompt, historyMappedToLLM, userPayload)

  referenced = extractStoryReferences(rawAnswer, stories)  // [story_id:xxx] から復元
  cleanAnswer = stripMarkers(rawAnswer)

  return { answer: cleanAnswer, referenced_stories: referenced }
```

**履歴のマッピング:** OpenAI 形式の `assistant` を Gemini の `model` ロールに対応させるなど、利用 LLM の SDK に合わせる。

**コンテキスト再送の是非:** 参照実装は **トークン節約のため 2 ターン目以降は体験談全文を送らない**。マルチターンで「常に根拠を保証」したい場合は、毎ターン要約したコンテキストを付ける・検索で都度取得する等の設計変更が必要。

---

## 5. システムプロンプト（移植用テンプレート）

以下は**参照実装の方針**を文章化したもの。疾患名・トーンはプロダクトに合わせて差し替える。

- 体験談に**含まれる事実のみ**を根拠に答える。ない情報は断るか、一般論に逃げない。
- **医療アドバイス禁止**。「体験記の中では〜」「ある方は〜」のように第三者経験として述べる。
- 参照した各ストーリーを **`[story_id:<story_id>]`** 形式で文中に含める（サーバがリンク一覧を生成）。
- 文末に**免責**を必ず入れる（例: 「※ 患者さんの個人的な体験です。治療については必ず主治医にご相談ください。」）。
- 文字数目安（例: 300〜500 文字）を指定してもよい。

マーカー形式は **正規表現で抽出可能**であること:

```regexp
\[story_id:([^\]]+)\]
```

---

## 6. `buildContext` の出力形式（参照実装）

ストーリーごと・セクションごとに、モデルが ID を誤記しにくいよう **ヘッダに `story_id` を明示**する。

例（概念）:

```
【体験記 story_id:cml-001】タイトル…（CML・50代・男性・診断期）
キーワード：…
<fact_content の本文>

---

【体験記 story_id:cml-001】…（治療開始）
…
```

---

## 7. 環境変数・依存（よりそい PHR の例）

| 変数 | 用途 |
|------|------|
| `GEMINI_API_KEY` | Google Gemini 利用時（`hasApiKey()` が false なら参照実装はモック応答）。 |
| `GEMINI_MODEL` | 未設定時はコード側デフォルトモデル名を使用。 |
| `GOOGLE_CLOUD_PROJECT` | 未設定かつ `DEMO_MODE` 相当だと Firestore を使わずシード JSON にフォールバックする実装がある。 |
| `DEMO_MODE=1` | デモ挙動の明示（プロジェクトによる）。 |

**移植時:** OpenAI・Azure・Anthropic 等に差し替える場合は、**チャット API・システムロール・トークン上限**のみ置き換え、アルゴリズムは同じでよい。

---

## 8. フロントエンド要件（最小）

- チャット UI: ユーザー入力 → `POST /api/consultation` → `answer` を表示。
- `referenced_stories` を受け取ったら**リンク一覧**を AI 吹き出し付近に表示。
- 初回送信時は `history` を空にする。以降は**直近のユーザーメッセージを除いた**履歴を送るか、仕様をサーバと一致させる。
- 乱打・コスト対策: 参照実装は **ユーザー発話 10 ターン上限**（`MAX_TURNS`）、入力 **300 文字** など。

疾患フィルタを URL から引き継ぐ場合の例: `?disease_type=cml` → `disease_type` として API に渡す。

---

## 9. セキュリティ・コンプライアンス

- 体験談には個人情報が含まれる可能性があるため、**保存場所・アクセス制御・ログに全文を残さない**方針を決める。
- LLM への送信は**外部 API** の場合、契約・地域・医療関連ポリシーを確認する。
- 利用規約・画面上で「AI の回答は参考であり医療判断ではない」旨を明示する（参照実装の案内文も同趣旨）。

---

## 10. 拡張パス（本格的 RAG）

体験談が増えた場合の一般的な拡張:

1. セクション単位でチャンク化（`story_id` + `section_id` をメタデータに保持）。
2. 埋め込みベクトルストア（Pinecone、pgvector、Vertex AI Search 等）で質問に類似チャンクのみ取得。
3. 取得チャンクだけをプロンプトに入れる（トークン削減・精度向上）。
4. 参照表示は `story_id` / `section_id` ベースで詳細ページへディープリンク。

---

## 11. 実装チェックリスト（別アプリ向け）

- [ ] 体験談のスキーマ（最低限 `story_id`, `title`, `sections[].fact_content`）を決める。
- [ ] 公開フラグ（`status` 等）で相談対象を制限する。
- [ ] `POST /api/consultation` 相当のエンドポイントとリクエスト/レスポンスを実装する。
- [ ] システムプロンプト（根拠・禁止事項・マーカー・免責）を設定する。
- [ ] `[story_id:...]` の抽出と除去をサーバで実装する。
- [ ] API キー未設定時の挙動（エラー / モック）を決める。
- [ ] フロントで参照リンクと利用注意文を表示する。

---

## 12. バージョン

| 日付 | 内容 |
|------|------|
| 2026-05-04 | 初版。よりそい PHR の `consultation` 実装を基に移植用に整理。 |
