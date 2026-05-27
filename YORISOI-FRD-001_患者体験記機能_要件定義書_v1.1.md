# よりそい PHR — 患者体験記機能 要件定義書 v1.1

**ドキュメントID:** YORISOI-FRD-001  
**対象リポジトリ:** y-mori29/yorisoi-phr  
**対象プロダクト:** よりそい PHR（LINE外部 ブラウザWebページ）  
**対象疾患（初期）:** 白血病全般（CML・AML・ALL等）  
**ステータス:** レビュー中

---

## 1. 背景・目的

### ユーザー課題と解決策

| 課題 | 解決策 |
|------|--------|
| 感情的な体験記を読むと気分が落ち込む | 「事実」と「感情」を分離表示。デフォルトは事実のみ表示 |
| 自分の今後の治療経路が見えない不安 | 治療フェーズ別の時系列で薬・副作用・選択肢を可視化 |
| 他の患者がどんな意思決定をしたか知りたい | 「意思決定タイミング」を事実タグとして構造化して提示 |
| 自分の疾患に近い体験記だけを見たい | 疾患フィルタートグル（全表示 ⇔ 自分の疾患のみ） |

---

## 2. 機能一覧

| # | 機能名 | 概要 | 優先度 |
|---|--------|------|--------|
| F-01 | 体験記一覧表示 | 体験記をカード形式で一覧表示 | **Must** |
| F-02 | 治療フェーズ別タイムライン | フェーズ（診断期・治療開始・経過観察・寛解）軸で表示 | **Must** |
| F-03 | 事実・感情の分離表示 | デフォルトは事実のみ。「気持ちも読む」ボタンでインライン展開 | **Must** |
| F-04 | 疾患フィルター | 全件表示 / 自分の疾患のみ の切り替えトグル | **Must** |
| F-05 | 体験記詳細ページ | 1件の体験記をフェーズ別縦タイムラインで詳細表示 | **Must** |
| F-06 | 事実情報の構造化タグ | 薬・副作用・検査値・仕事影響・意思決定・医師コミュニケーションをバッジ表示 | **Must** |
| F-07 | CMS（管理画面） | 運営者が体験記を登録・編集・AI分類確認・公開管理 | **Must** |
| F-08 | AI自動分類 | Claude APIで事実/感情を仮分類。運営者が最終確認 | **Must** |
| F-09 | 「似た体験記」レコメンド | 年齢・疾患・治療フェーズが近い体験記をサジェスト | Want（v2） |

---

## 3. データモデル

### 3.1 体験記メタ情報

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| `story_id` | string (UUID) | 体験記の一意識別子 |
| `disease_type` | enum | `cml` / `aml` / `all` / `cll` / `other` |
| `age_at_diagnosis` | number | 発症時年齢（10歳刻みで保持） |
| `gender` | enum | `male` / `female` / `unanswered` |
| `title` | string | 体験記タイトル（運営が設定） |
| `summary_fact` | string | 事実サマリー（一覧カード表示用・100文字以内） |
| `source_url` | string | 外部掲載元URL（任意） |
| `status` | enum | `draft` / `reviewing` / `published` |
| `published_at` | Timestamp | 公開日時 |
| `created_at` | Timestamp | 作成日時 |
| `updated_at` | Timestamp | 更新日時 |
| `sections` | array | フェーズセクションの配列（下記参照） |

### 3.2 フェーズセクション（`sections` 配列の各要素）

| フィールド名 | 型 | 説明 |
|-------------|-----|------|
| `section_id` | string (UUID) | セクションの一意識別子 |
| `phase` | enum | `diagnosis` / `treatment_start` / `ongoing` / `observation` / `relapse` / `remission` |
| `phase_order` | number | フェーズの表示順（1始まり） |
| `fact_content` | string | 事実パート本文（**常時表示**） |
| `emotion_content` | string | 感情パート本文（**ボタン押下で展開**） |
| `fact_tags` | array | 構造化タグ（下記参照） |

### 3.3 事実タグ（`fact_tags` 配列の各要素）

```json
{ "category": "drug", "value": "イマチニブ400mg" }
```

| `category` | ラベル | 抽出対象 |
|------------|--------|---------|
| `drug` | 💊 薬・治療法 | 使用した分子標的薬・抗がん剤・移植種別 |
| `side_effect` | ⚠️ 副作用 | 副作用の種類・発生時期・持続期間 |
| `lab_value` | 📊 検査値 | 白血球数・PCR値・MMR/CMR達成時期 |
| `work_life` | 💼 仕事・生活 | 就労状況・日常生活への影響 |
| `decision` | 🔀 意思決定 | 治療選択肢・意思決定のタイミングと理由 |
| `communication` | 🏥 医師・病院 | 受診先・主治医とのコミュニケーション方法 |

---

## 4. 機能詳細

### F-03 事実・感情の分離表示（中核機能）

| 状態 | 表示内容 |
|------|---------|
| **デフォルト（感情非表示）** | `fact_content` のみ表示。「気持ちも読む 🔽」ボタンを表示 |
| **展開後（感情表示）** | `emotion_content` が薄いオレンジ背景でインライン展開。ボタンが「気持ちを閉じる 🔼」に変化 |

- 感情パートはページ遷移なし・インライン展開
- 感情パートは背景色（薄オレンジ）＋左ボーダーラインで事実パートと視覚的に差別化
- 展開状態はセッション内で保持する

### F-04 疾患フィルター

- **初期状態:** 全件表示
- **切り替え:** 「自分の疾患のみ表示」トグルをONにすると、ユーザープロフィールの疾患と一致する体験記のみ表示
- **未登録時:** トグルを非活性にして「疾患を登録してください」と案内

---

## 5. 技術仕様

### 5.1 技術スタック（既存）

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Vanilla JS + LIFF SDK（`/public/*.html`） |
| バックエンド | Node.js 18 + Express（`/server/routes/*.js`） |
| データベース | Cloud Firestore |
| 認証 | LIFF IDトークン → LINE UserID（`server/middleware/auth.js`） |
| インフラ | Google Cloud Run |

### 5.2 JSONテンプレートとFirestoreの役割分担

> **重要: この2つは全く別の役割を持つ**

| 項目 | `templates/leukemia.json` | Cloud Firestore |
|------|--------------------------|-----------------|
| **正体** | アプリの「設定ファイル」 | 実際の「データベース」 |
| **保存場所** | リポジトリ内（サーバー上のファイル） | Google Cloudのクラウド上 |
| **内容** | 表示するボタンの種類・色・アイコン・体験記フェーズ定義・タグ定義 | 体験記の本文テキスト・患者の記録データ・公開ステータス |
| **変更方法** | コードを編集してデプロイが必要 | 管理画面から即時変更可能 |
| **ゲームで例えると** | ステージの「設定ファイル」 | プレイヤーの「セーブデータ」 |

### 5.3 Firestoreコレクション設計

```
stories/                          ← グローバルコレクション（全ユーザー共有・読み取り専用）
  {storyId}/
    story_id: string
    disease_type: 'cml' | 'aml' | 'all' | 'cll' | 'other'
    age_at_diagnosis: number       // 10歳刻み（例: 30 = 30代）
    gender: 'male' | 'female' | 'unanswered'
    title: string
    summary_fact: string           // 100文字以内
    source_url: string             // 外部掲載元URL（任意）
    status: 'draft' | 'reviewing' | 'published'
    published_at: Timestamp
    created_at: Timestamp
    updated_at: Timestamp
    sections: [                    // フェーズセクション配列（サブコレクションではなく配列）
      {
        section_id: string
        phase: 'diagnosis' | 'treatment_start' | 'ongoing' | 'observation' | 'relapse' | 'remission'
        phase_order: number
        fact_content: string       // 常時表示
        emotion_content: string    // ボタン押下で展開
        fact_tags: [
          { category: 'drug', value: 'イマチニブ400mg' },
          { category: 'side_effect', value: '倦怠感 3ヶ月' }
        ]
      }
    ]

users/{lineUserId}/               ← 既存のユーザー固有データ（変更なし）
  profile
  timeline_events/{eventId}
  medications/{medicationId}
  symptom_logs/{date}
```

> `sections` はサブコレクションではなく、ドキュメント内の配列フィールドとして持つ（読み込み1回で完結させるため）

### 5.4 Firestoreセキュリティルール追加分

```javascript
// firestore.rules に追記
match /stories/{storyId} {
  // 公開済み体験記は認証済みユーザーなら誰でも読める
  allow read: if request.auth != null
               && resource.data.status == 'published';

  // 書き込みはAdmin SDKのみ（クライアントからの直接書き込み禁止）
  allow write: if false;
}
```

### 5.5 追加・変更するファイル一覧

| 種別 | ファイルパス | 内容 | 既存への影響 |
|------|------------|------|------------|
| ✅ **新規（作成済み）** | `templates/leukemia.json` | 白血病用テンプレート | なし |
| 🆕 新規 | `public/stories.html` | 体験記一覧画面 | なし |
| 🆕 新規 | `public/stories-detail.html` | 体験記詳細画面（フェーズ別タイムライン・感情展開） | なし |
| 🆕 新規 | `server/routes/stories.js` | 体験記CRUD API + AI分類エンドポイント | なし |
| ✏️ 変更 | `server/index.js` | `app.use('/api/stories', storiesRoutes)` を1行追加するのみ | **最小限** |
| ✏️ 変更 | `firestore.rules` | `stories` コレクションの読み取りルールを追加 | **最小限** |

### 5.6 APIエンドポイント仕様

```
GET    /api/stories                  # 公開済み体験記一覧（認証済みユーザー）
                                     # クエリパラメータ: ?disease=cml でフィルター可
GET    /api/stories/:id              # 体験記詳細・全セクション含む（認証済みユーザー）
POST   /api/admin/stories            # 体験記の新規登録（管理者のみ）→ status: 'draft'
PUT    /api/admin/stories/:id        # 体験記の編集・ステータス変更（管理者のみ）
POST   /api/admin/stories/:id/classify  # Claude APIで事実/感情を仮分類してsectionsに書き込む（管理者のみ）
```

#### GET /api/stories レスポンス例

```json
[
  {
    "story_id": "abc123",
    "disease_type": "cml",
    "age_at_diagnosis": 50,
    "gender": "male",
    "title": "発症9ヶ月、自転車で日本縦断を計画中",
    "summary_fact": "会社の健診でCMLが判明。分子標的薬を開始し9ヶ月経過。ランニングから自転車に切り替えて継続治療中。",
    "status": "published",
    "published_at": "2025-04-01T00:00:00Z"
  }
]
```

#### GET /api/stories/:id レスポンス例

```json
{
  "story_id": "abc123",
  "disease_type": "cml",
  "title": "発症9ヶ月、自転車で日本縦断を計画中",
  "sections": [
    {
      "section_id": "s1",
      "phase": "diagnosis",
      "phase_order": 1,
      "fact_content": "会社の健康診断で白血球数の異常を指摘。翌日診療所で再検査後、大学病院の血液内科への紹介状を受け取った。約2ヶ月後にCMLと確定診断。",
      "emotion_content": "体の調子が悪いわけではなかったので、最初は「何だろう？」という程度だった。息子が医学生のため検査結果をメールで共有し、CMLの可能性が高いと覚悟した状態で確定診断を聞いた。「ああ、そうですか」という感じだった。",
      "fact_tags": [
        { "category": "lab_value", "value": "白血球数異常（健診）" },
        { "category": "communication", "value": "大学病院への紹介状" },
        { "category": "decision", "value": "CML確定診断まで2ヶ月" }
      ]
    },
    {
      "section_id": "s2",
      "phase": "treatment_start",
      "phase_order": 2,
      "fact_content": "確定診断翌日から分子標的治療薬を開始。服薬2日後から倦怠感が出現し3連休をほぼ就寝して過ごした。連休明けには回復し、以降は通常通り勤務継続。",
      "emotion_content": "上司が「薬を飲めばいいんだよ」と理解ある言葉をかけてくれた。それで少し気持ちが楽になった。仕事や責任の範囲が変わることを懸念し、現時点では上司のみに告知。",
      "fact_tags": [
        { "category": "drug", "value": "分子標的治療薬（TKI）開始" },
        { "category": "side_effect", "value": "倦怠感 開始2日後〜3日間" },
        { "category": "work_life", "value": "連休明けより通常勤務継続" }
      ]
    }
  ]
}
```

### 5.7 AI分類プロンプト設計（/api/admin/stories/:id/classify）

**入力:** 体験記原文テキスト（全文） + 疾患種別（例: `cml`）

**処理:** Claude APIを呼び出し、以下のJSON形式で返却させる

```json
[
  {
    "phase": "diagnosis",
    "phase_order": 1,
    "fact_content": "事実パートの本文（数値・薬名・医療行為・時期・客観的影響）",
    "emotion_content": "感情パートの本文（心情・不安・驚き・感謝など主観的記述）",
    "fact_tags": [
      { "category": "lab_value", "value": "白血球22800" },
      { "category": "communication", "value": "大学病院転院" }
    ]
  }
]
```

**分類基準:**

- **事実:** 数値・薬名・医療行為・時期・仕事/生活への客観的影響
- **感情:** 心情・不安・驚き・感謝・家族への気持ちなど主観的な記述
- 1パラグラフに事実と感情が混在する場合は文単位で分割して分類する

### 5.8 既存コードとの整合性

`stories.js` は既存ルート（`timeline.js`, `medications.js` 等）と同じパターンで実装する。

```javascript
// server/routes/stories.js の基本構造
const express = require('express');
const { db } = require('../lib/firestore');  // userRef ではなく db を直接使う（グローバルコレクション）
const { verifyLiffToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/stories — 公開済み体験記一覧
router.get('/', verifyLiffToken, async (req, res) => {
  const { disease } = req.query;
  let query = db.collection('stories').where('status', '==', 'published');
  if (disease) query = query.where('disease_type', '==', disease);
  // ...
});
```

> **注意:** 既存ルートは `userRef(req.lineUserId).collection(...)` でユーザー固有データを扱うが、
> `stories` はグローバルコレクションなので `db.collection('stories')` を直接使う。

---

## 6. 画面設計

### 6.1 画面一覧

| No. | ファイル名 | 概要 |
|-----|-----------|------|
| S-01 | `public/stories.html` | 体験記一覧。疾患フィルタートグル |
| S-02 | `public/stories-detail.html` | 体験記詳細。フェーズ別タイムライン・感情展開ボタン |
| S-03 | CMS体験記一覧（管理者専用） | 登録済み体験記のステータス管理 |
| S-04 | CMS体験記編集（管理者専用） | AI分類結果の確認・修正・承認 |

### 6.2 既存メニューへの追加方法

`leukemia.json` の `modules` 配列に以下が定義済みのため、`index.html` のメニューグリッドに自動で表示される（既存のテンプレートエンジンが処理する）。

```json
{
  "id": "stories",
  "label": "患者体験記",
  "description": "他の患者さんの治療体験を読む（事実・感情を分けて表示）",
  "icon": "auto_stories",
  "page": "stories.html",
  "enabled": true,
  "core": true
}
```

### 6.3 stories-detail.html の構成

```
┌─────────────────────────────────────┐
│ ← 戻る                               │  ← ヘッダー
├─────────────────────────────────────┤
│ タイトル                              │
│ [CML] [50代] [男性]                   │  ← 疾患バッジ
│ ⚠️ 本コンテンツは個人の体験であり...    │  ← 免責文言（常時表示）
├─────────────────────────────────────┤
│ [診断期] [治療開始] [治療継続] [寛解]  │  ← フェーズナビ（アンカーリンク）
├─────────────────────────────────────┤
│ 🔵 診断期                             │
│ [💊 TKI開始] [📊 白血球22800]         │  ← 事実タグ（バッジ）
│                                      │
│ fact_content の本文テキスト           │  ← 常時表示
│                                      │
│ [気持ちも読む 🔽]                     │  ← ボタン
│ ┌──────────────────────────────┐   │
│ │ emotion_content の本文テキスト │   │  ← 展開時のみ表示（薄オレンジ背景）
│ └──────────────────────────────┘   │
├─────────────────────────────────────┤
│ 🟢 治療開始                           │
│ （繰り返し）                          │
└─────────────────────────────────────┘
```

---

## 7. 実装ロードマップ

| Phase | 内容 | 作業詳細 | 見積 |
|-------|------|---------|------|
| **P1** ✅ | テンプレート | `leukemia.json` 作成完了 | 完了 |
| **P1** | バックエンド | `server/routes/stories.js` 実装 / `server/index.js` 1行追加 / `firestore.rules` 更新 | 1〜2日 |
| **P2** | フロントエンド | `stories.html`（一覧）/ `stories-detail.html`（詳細・感情展開） | 2〜3日 |
| **P3** | AI分類＋CMS | `/classify` エンドポイント実装 / 管理画面UI | 2〜3日 |
| **P4** | 初期コンテンツ | 体験記10件をAI分類して投入（ノバルティスCMLランナーズ等） | 1〜2日 |
| **P5（v2）** | レコメンド・UGC | 「似た体験記」サジェスト / うちあけ連携 / 患者投稿機能 | 別途 |

---

## 8. 非機能要件

| 区分 | 要件 |
|------|------|
| 対応環境 | スマートフォンブラウザ（iOS Safari / Android Chrome）主対象。PCも対応 |
| パフォーマンス | 一覧ページ初回表示3秒以内。感情展開アニメーション300ms以内 |
| 個人情報 | 投稿者氏名は原則イニシャルまたは匿名。実名掲載時は書面同意を取得・保管 |
| 著作権 | 外部サイト（ノバルティス等）体験記の掲載は事前に許諾を取得すること |
| 医療免責 | 「本コンテンツは個人の体験であり、治療の推奨ではありません」を全ページに表示 |

---

## 9. 未決事項

| # | 論点 | 選択肢 | ステータス |
|---|------|--------|-----------|
| ① | 感情パートの展開はフェーズ単位か、全フェーズ一括ON/OFFか | ①フェーズ単位（現設計）　②一括トグル追加 | **要確認** |
| ② | 外部体験記（ノバルティス等）の掲載許諾の取得方法 | ①直接交渉　②引用＋リンクのみ | **未決** |
| ③ | UGC機能（患者自身が投稿）をv2以降で追加するか | ①うちあけ連携　②独立投稿フォーム　③運営入力のみ継続 | v2検討 |
| ④ | よりそいのAI診療サマリーと体験記を連携（「あなたに近い体験記」を自動提示） | ①連携する　②独立機能のまま | v3以降 |
| ⑤ | 製薬会社（ノバルティス等）との共同コンテンツ制作・掲載提案 | ①BioPharma共同制作モデル　②独自運営 | BizDev検討 |

---

## 10. 改訂履歴

| Ver. | 日付 | 担当 | 変更内容 |
|------|------|------|---------|
| v1.0 | 2025-04-21 | 副田渓 / Claude | 初版作成 |
| v1.1 | 2025-04-21 | 副田渓 / Claude | 技術仕様追記。leukemia.json作成完了を反映 |
