# よりそい PHR — 患者体験記 RAG相談機能 設計仕様書 v1.0

**ドキュメントID:** YORISOI-FRD-002  
**対象リポジトリ:** Keeeeei-Soeda/yorisoi_phr  
**前提ドキュメント:** YORISOI-FRD-001（患者体験記機能 要件定義書 v1.1）  
**ステータス:** 実装待ち

---

## 1. 機能概要

### やりたいこと

ユーザーが「白血病と診断されました。これからどうなりますか？」と質問すると、  
**一般的なAIの回答ではなく、Firestoreに登録されている患者体験記を根拠として**回答を生成する。  
回答の中には参照した体験記へのリンクが含まれ、ユーザーはそのまま詳細を読みに行ける。

### 一般的なAI相談との違い

| 一般的なAI相談 | 本機能（RAG相談） |
|--------------|-----------------|
| 医学的な一般知識で回答 | 実際の患者の体験記を根拠に回答 |
| 「多くの患者は〜」という表現 | 「Kさんは診断後〜」という具体的な表現 |
| 参考文献なし | 参照した体験記へのリンクあり |
| 冷たい情報提供 | 「同じ経験をした人がいる」という安心感 |

### RAGの仕組み（3ステップ）

```
STEP 1: 検索（Retrieval）
  ユーザーの質問 → キーワード解析 → Firestoreから関連する体験記セクションを取得

STEP 2: 生成（Generation）
  取得した体験記の fact_content + 会話履歴 → Claude API → 回答文を生成

STEP 3: 表示
  回答文 + 参照した体験記へのリンク → チャットUIに表示
```

---

## 2. UI仕様

### 2.1 配置場所

`stories.html`（体験記一覧ページ）の**ページ下部**に相談チャットコンポーネントを埋め込む。

```
┌─────────────────────────────────────────┐
│ 患者体験記一覧                            │  ← 既存コンポーネント
│ [カード] [カード] [カード]                │
│                                          │
├─────────────────────────────────────────┤
│ 💬 体験記をもとに相談する                 │  ← NEW: 相談チャット
│ ─────────────────────────────────────── │
│                                          │
│  🤖  白血病患者の体験記をもとにお答えします │  ← AIウェルカムメッセージ
│      （医療アドバイスではありません）       │
│                                          │
│  👤  白血病と診断されました。これから       │  ← ユーザーメッセージ
│      どうなりますか？                     │
│                                          │
│  🤖  複数の方の体験記を参考にお伝えします   │  ← AI回答
│      診断直後は〜                         │
│      ┌────────────────┐                  │
│      │ 📖 Kさんの体験記  →│                │  ← 参照体験記リンク
│      │ 📖 新田さんの体験記→│                │
│      └────────────────┘                  │
│                                          │
│  [続けて相談する...]          [送信 ▶]   │  ← 入力欄
└─────────────────────────────────────────┘
```

### 2.2 チャットUI仕様

| 項目 | 仕様 |
|------|------|
| 会話形式 | マルチターン（会話履歴を保持して続けて質問できる） |
| 会話履歴の保持 | フロントエンドのメモリ上（ページリロードでリセット） |
| 最大ターン数 | 10往復まで（超えたら「新しい相談を始める」ボタンを表示） |
| ローディング表示 | AI回答生成中は「体験記を検索しています...」のスピナー表示 |
| 免責表示 | 入力欄の上に常時表示：「※ 患者さんの体験をもとにした情報です。医療アドバイスではありません。」 |

---

## 3. バックエンド設計

### 3.1 新規作成するファイル

```
server/routes/consultation.js   ← 新規（メインの実装ファイル）
```

### 3.2 変更するファイル

```
server/index.js   ← 1行追加: app.use('/api/consultation', consultationRoutes)
```

### 3.3 APIエンドポイント

```
POST /api/consultation
```

#### リクエスト

```json
{
  "message": "白血病と診断されました。これからどうなりますか？",
  "history": [
    { "role": "user", "content": "前の質問..." },
    { "role": "assistant", "content": "前の回答..." }
  ],
  "disease_type": "cml"
}
```

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `message` | ✅ | 今回のユーザーメッセージ |
| `history` | - | 過去の会話履歴（初回は空配列 `[]`） |
| `disease_type` | - | ユーザーの疾患（未設定なら全疾患から検索） |

#### レスポンス

```json
{
  "answer": "複数の方の体験記をもとにお伝えします。\n\n診断直後については、Kさん（50代・CML）は会社の健診で発覚し...",
  "referenced_stories": [
    {
      "story_id": "cml-001",
      "title": "健診で発覚、9ヶ月。自転車で日本縦断を計画中",
      "phase": "diagnosis",
      "url": "/stories-detail.html?id=cml-001"
    },
    {
      "story_id": "cml-002",
      "title": "プロポーズの翌月に告知。28歳コンサルタント...",
      "phase": "diagnosis",
      "url": "/stories-detail.html?id=cml-002"
    }
  ]
}
```

---

## 4. STEP 1: 体験記の検索ロジック

### 4.1 キーワード → 検索条件マッピング

ユーザーの質問文を解析して、Firestoreの検索条件を決定する。  
（ベクトル検索は使わず、シンプルなキーワードマッピングで実装する）

```javascript
// server/routes/consultation.js 内の関数

function extractSearchConditions(message, disease_type) {
  const conditions = {
    disease_type: disease_type || null,  // nullの場合は全疾患
    phases: [],
    tag_categories: []
  };

  // フェーズのキーワードマッピング
  const phaseKeywords = {
    diagnosis:       ['診断', '発覚', '見つかった', 'と言われた', '検査', 'どうなりますか', '始まり'],
    treatment_start: ['治療', '薬', '飲み始め', 'スタート', '開始', '入院', '始める'],
    ongoing:         ['継続', '続けて', '飲み続け', '副作用', '管理', '日常', '仕事'],
    observation:     ['経過', '観察', '検査値', 'PCR', '数値', '落ち着いた'],
    relapse:         ['再発', '悪化', '変異', '上昇した', '変わった'],
    remission:       ['寛解', '治った', '終わり', 'TFR', '休薬', '回復']
  };

  // タグカテゴリのキーワードマッピング
  const tagKeywords = {
    drug:          ['薬', '分子標的', 'TKI', 'イマチニブ', '抗がん剤', '移植', '服薬'],
    side_effect:   ['副作用', 'むくみ', '倦怠感', '吐き気', '脱毛', 'つらい', '症状'],
    lab_value:     ['数値', '検査', 'PCR', 'MMR', 'CMR', '白血球', '血小板'],
    work_life:     ['仕事', '働', '職場', '生活', '家族', '子供', '日常', '趣味'],
    decision:      ['選択', '決め', '移植', '治験', 'どうすればいい', '判断'],
    communication: ['先生', '医師', '病院', '伝え', '相談', '告知', '話す']
  };

  for (const [phase, keywords] of Object.entries(phaseKeywords)) {
    if (keywords.some(kw => message.includes(kw))) {
      conditions.phases.push(phase);
    }
  }

  for (const [category, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(kw => message.includes(kw))) {
      conditions.tag_categories.push(category);
    }
  }

  // キーワードが何もヒットしない場合は診断期をデフォルトで検索
  if (conditions.phases.length === 0 && conditions.tag_categories.length === 0) {
    conditions.phases = ['diagnosis'];
  }

  return conditions;
}
```

### 4.2 Firestore検索クエリ

```javascript
async function searchRelevantSections(conditions) {
  let query = db.collection('stories').where('status', '==', 'published');

  // 疾患フィルター（v1は白血病のみのため disease_type IN ['cml','aml','all','cll','other']）
  if (conditions.disease_type) {
    query = query.where('disease_type', '==', conditions.disease_type);
  }

  const snapshot = await query.limit(20).get();
  const allStories = snapshot.docs.map(doc => doc.data());

  // フェーズ・タグでセクションを絞り込み
  const relevantSections = [];

  for (const story of allStories) {
    for (const section of (story.sections || [])) {
      const phaseMatch = conditions.phases.length === 0 ||
                         conditions.phases.includes(section.phase);

      const tagMatch = conditions.tag_categories.length === 0 ||
                       (section.fact_tags || []).some(tag =>
                         conditions.tag_categories.includes(tag.category)
                       );

      if (phaseMatch || tagMatch) {
        relevantSections.push({
          story_id: story.story_id,
          title: story.title,
          disease_type: story.disease_type,
          age_at_diagnosis: story.age_at_diagnosis,
          gender: story.gender,
          phase: section.phase,
          fact_content: section.fact_content,
          fact_tags: section.fact_tags || []
        });
      }
    }
  }

  // スコアリング：フェーズもタグも両方一致するものを優先
  relevantSections.sort((a, b) => {
    const aScore = (conditions.phases.includes(a.phase) ? 2 : 0) +
                   (a.fact_tags.some(t => conditions.tag_categories.includes(t.category)) ? 1 : 0);
    const bScore = (conditions.phases.includes(b.phase) ? 2 : 0) +
                   (b.fact_tags.some(t => conditions.tag_categories.includes(t.category)) ? 1 : 0);
    return bScore - aScore;
  });

  // 上位5件を返す（Claude APIに渡すコンテキスト量を制御）
  return relevantSections.slice(0, 5);
}
```

---

## 5. STEP 2: Claude APIへのプロンプト設計

### 5.1 システムプロンプト

```javascript
const SYSTEM_PROMPT = `あなたは白血病患者を支援するAIコンシェルジュです。
以下のルールを必ず守って回答してください。

【絶対に守るルール】
1. 回答は必ず「参照体験記」に含まれる患者さんの実体験を根拠にすること
2. 医療アドバイス・治療方針の推奨は行わない。必ず「体験記の中では〜」という形で紹介する
3. 回答の末尾に必ず免責文を入れる:「※ これは患者さんの個人的な体験です。治療については必ず主治医にご相談ください。」
4. 参照した体験記は [story_id:xxxx] という形式でマークする（後でリンクに変換するため）
5. 一般的な医学知識だけで答えず、体験記の内容に根ざした回答にする
6. 回答は300〜500文字程度を目安にする（長すぎない）
7. 患者さんの気持ちに寄り添う温かいトーンで答える

【回答の構造】
- 最初に共感・受け止めの一文
- 体験記から得た情報（複数名の例を挙げる）
- [story_id:xxxx] でマーキング
- 締めの一文＋免責文`;
```

### 5.2 ユーザーコンテキストの組み立て

```javascript
function buildUserContext(sections) {
  if (sections.length === 0) {
    return '（関連する体験記が見つかりませんでした。一般的な情報をもとに回答します。）';
  }

  return sections.map(s => {
    const ageLabel = `${s.age_at_diagnosis}代`;
    const genderLabel = s.gender === 'male' ? '男性' : s.gender === 'female' ? '女性' : '';
    const diseaseLabel = s.disease_type.toUpperCase();
    const phaseLabel = {
      diagnosis: '診断期', treatment_start: '治療開始',
      ongoing: '治療継続', observation: '経過観察',
      relapse: '再発', remission: '寛解'
    }[s.phase] || s.phase;

    return `【体験記 story_id:${s.story_id}】${s.title}（${diseaseLabel}・${ageLabel}・${genderLabel}・${phaseLabel}）
${s.fact_content}`;
  }).join('\n\n---\n\n');
}
```

### 5.3 Claude API呼び出し

```javascript
async function generateAnswer(message, history, sections) {
  const userContext = buildUserContext(sections);

  // 会話履歴をClaude API形式に変換
  const messages = [
    ...history,  // 過去の会話履歴
    {
      role: 'user',
      content: `【参照できる体験記】\n${userContext}\n\n【ユーザーの質問】\n${message}`
    }
  ];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages
    })
  });

  const data = await response.json();
  return data.content[0].text;
}
```

### 5.4 [story_id:xxxx] をリンク情報に変換

Claude APIが返す回答テキストに含まれる `[story_id:cml-001]` を、フロントエンドで表示するためのリンク情報に変換する。

```javascript
function extractReferencedStories(answerText, sections) {
  const matches = answerText.match(/\[story_id:([^\]]+)\]/g) || [];
  const referencedIds = [...new Set(matches.map(m => m.replace(/\[story_id:|]/g, '')))];

  return referencedIds.map(id => {
    const section = sections.find(s => s.story_id === id);
    return section ? {
      story_id: id,
      title: section.title,
      phase: section.phase,
      url: `/stories-detail.html?id=${id}`
    } : null;
  }).filter(Boolean);
}
```

---

## 6. consultation.js の全体構造

```javascript
// server/routes/consultation.js

const express = require('express');
const { db } = require('../lib/firestore');
const { verifyLiffToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/consultation
router.post('/', verifyLiffToken, async (req, res) => {
  try {
    const { message, history = [], disease_type } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'message is required' });
    }

    // STEP 1: 体験記を検索
    const conditions = extractSearchConditions(message, disease_type);
    const sections = await searchRelevantSections(conditions);

    // STEP 2: Claude APIで回答生成
    const answerText = await generateAnswer(message, history, sections);

    // STEP 3: 参照体験記を抽出
    const referencedStories = extractReferencedStories(answerText, sections);

    // [story_id:xxx] マーカーをクリーンアップして返す
    const cleanAnswer = answerText.replace(/\[story_id:[^\]]+\]/g, '').trim();

    res.json({
      answer: cleanAnswer,
      referenced_stories: referencedStories
    });

  } catch (err) {
    console.error('POST /consultation error:', err);
    res.status(500).json({ error: 'Failed to generate consultation response' });
  }
});

// ヘルパー関数
function extractSearchConditions(message, disease_type) { /* 上記参照 */ }
async function searchRelevantSections(conditions) { /* 上記参照 */ }
function buildUserContext(sections) { /* 上記参照 */ }
async function generateAnswer(message, history, sections) { /* 上記参照 */ }
function extractReferencedStories(answerText, sections) { /* 上記参照 */ }

module.exports = router;
```

---

## 7. server/index.js への追加（1行）

```javascript
// 既存のルート群の下に追加
const consultationRoutes = require('./routes/consultation');
app.use('/api/consultation', consultationRoutes);
```

---

## 8. フロントエンド実装（stories.html への追加）

### 8.1 HTML構造（stories.html の末尾に追加）

```html
<!-- 体験記一覧の下に追加 -->
<div class="consultation-section" id="consultation-section">
  <div class="card">
    <div class="card-title">💬 体験記をもとに相談する</div>
    <p class="text-sm text-muted mt-8">
      登録されている患者さんの体験記をもとにお答えします。
    </p>

    <!-- 免責表示 -->
    <div class="disclaimer-box">
      ※ 患者さんの個人的な体験をもとにした情報です。医療アドバイスではありません。
    </div>

    <!-- チャット表示エリア -->
    <div class="chat-messages" id="chat-messages">
      <div class="chat-bubble ai">
        白血病患者さんの体験記をもとにお答えします。<br>
        どんなことが気になっていますか？
      </div>
    </div>

    <!-- 入力欄 -->
    <div class="chat-input-area">
      <textarea
        id="consultation-input"
        placeholder="例：診断されたばかりで不安です。これからどうなりますか？"
        rows="3"
      ></textarea>
      <button id="send-btn" onclick="sendConsultation()">
        送信 ▶
      </button>
    </div>
  </div>
</div>
```

### 8.2 JavaScript（stories.html の script タグ内に追加）

```javascript
let chatHistory = [];  // 会話履歴（メモリ上）

async function sendConsultation() {
  const input = document.getElementById('consultation-input');
  const message = input.value.trim();
  if (!message) return;

  // ユーザーメッセージを表示
  appendMessage('user', message);
  input.value = '';

  // ローディング表示
  const loadingId = appendMessage('ai', '体験記を検索しています...');

  try {
    const res = await apiPost('/api/consultation', {
      message,
      history: chatHistory,
      disease_type: getDiseaseId()  // liff-init.jsの既存関数
    });

    // ローディングを削除
    document.getElementById(loadingId)?.remove();

    // AI回答を表示（参照体験記リンクつき）
    appendAIAnswer(res.answer, res.referenced_stories);

    // 会話履歴に追加（次回送信時に引き継ぐ）
    chatHistory.push({ role: 'user', content: message });
    chatHistory.push({ role: 'assistant', content: res.answer });

    // 最大10往復でリセット案内
    if (chatHistory.length >= 20) {
      appendMessage('ai', '会話が長くなりました。「新しい相談を始める」ボタンで最初からどうぞ。');
      document.getElementById('send-btn').disabled = true;
    }

  } catch (err) {
    document.getElementById(loadingId)?.remove();
    appendMessage('ai', '申し訳ありません、エラーが発生しました。もう一度お試しください。');
  }
}

function appendMessage(role, text, id = null) {
  const container = document.getElementById('chat-messages');
  const msgId = id || `msg-${Date.now()}`;
  const div = document.createElement('div');
  div.id = msgId;
  div.className = `chat-bubble ${role}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return msgId;
}

function appendAIAnswer(answer, referencedStories) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-bubble ai';

  // 回答テキスト
  const textEl = document.createElement('p');
  textEl.style.whiteSpace = 'pre-wrap';
  textEl.textContent = answer;
  div.appendChild(textEl);

  // 参照体験記リンク
  if (referencedStories && referencedStories.length > 0) {
    const linksEl = document.createElement('div');
    linksEl.className = 'story-links';
    linksEl.innerHTML = '<p class="text-sm text-muted mt-8">📖 参照した体験記：</p>';
    referencedStories.forEach(story => {
      const a = document.createElement('a');
      a.href = story.url;
      a.className = 'story-link-card';
      a.textContent = `→ ${story.title}`;
      linksEl.appendChild(a);
    });
    div.appendChild(linksEl);
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}
```

### 8.3 CSSスタイル（style.css に追加）

```css
/* === 相談チャット === */
.consultation-section {
  margin-top: 24px;
}

.disclaimer-box {
  background: var(--brand-50);
  border-left: 3px solid var(--brand-500);
  padding: 8px 12px;
  font-size: 12px;
  color: var(--gray-600);
  margin: 8px 0 16px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.chat-messages {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  max-width: 85%;
}

.chat-bubble.user {
  background: var(--brand-500);
  color: var(--white);
  align-self: flex-end;
  border-bottom-right-radius: 4px;
}

.chat-bubble.ai {
  background: var(--gray-100);
  color: var(--gray-800);
  align-self: flex-start;
  border-bottom-left-radius: 4px;
}

.story-links {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.story-link-card {
  display: block;
  padding: 8px 12px;
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--brand-700);
  text-decoration: none;
  transition: background 0.15s;
}

.story-link-card:hover {
  background: var(--brand-50);
}

.chat-input-area {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-input-area textarea {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-family: system-ui, sans-serif;
  resize: none;
  line-height: 1.5;
}

.chat-input-area textarea:focus {
  outline: none;
  border-color: var(--brand-500);
}

#send-btn {
  padding: 10px 16px;
  background: var(--brand-500);
  color: var(--white);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  min-width: 72px;
}

#send-btn:disabled {
  background: var(--gray-300);
  cursor: not-allowed;
}
```

---

## 9. 環境変数

```env
# .env に追加
ANTHROPIC_API_KEY=sk-ant-xxxx
```

`server/index.js` はすでに `.env` を読み込んでいるため追記のみでOK。

---

## 10. デモモード対応

デモモード（Firestore未接続時）でも動作するよう、`server/routes/demo.js` に consultation のモックレスポンスを追加する。

```javascript
// server/routes/demo.js に追加
app.post('/api/consultation', (req, res) => {
  res.json({
    answer: "（デモモード）複数の患者さんの体験記をもとにお伝えします。\n\n診断直後については、Kさん（50代・CML）は会社の健診で発覚し、翌日からTKI（分子標的薬）を開始しました。服薬開始2日後に3日間の倦怠感がありましたが、連休明けには通常勤務に戻っています。\n\n新田さん（28歳・CML）は婚約直後の診断でしたが、1年でMMR（良好な検査値）を達成し、現在は海外留学も実現しています。\n\n※ これは患者さんの個人的な体験です。治療については必ず主治医にご相談ください。",
    referenced_stories: [
      { story_id: "cml-001", title: "健診で発覚、9ヶ月。自転車で日本縦断を計画中", phase: "diagnosis", url: "/stories-detail.html?id=cml-001" },
      { story_id: "cml-002", title: "プロポーズの翌月に告知。28歳コンサルタント...", phase: "diagnosis", url: "/stories-detail.html?id=cml-002" }
    ]
  });
});
```

---

## 11. 追加・変更するファイル一覧

| 種別 | ファイルパス | 内容 | 既存への影響 |
|------|------------|------|------------|
| 🆕 新規 | `server/routes/consultation.js` | RAG相談APIの実装本体 | なし |
| ✏️ 変更 | `server/index.js` | routeを1行追加 | 最小限 |
| ✏️ 変更 | `server/routes/demo.js` | デモモード用モックレスポンスを追加 | 最小限 |
| ✏️ 変更 | `public/stories.html` | チャットUIコンポーネントを末尾に追加 | 最小限 |
| ✏️ 変更 | `public/css/style.css` | チャットUIのスタイルを追記 | なし（追記のみ） |
| ✏️ 変更 | `.env` | `ANTHROPIC_API_KEY` を追記 | なし |

---

## 12. 将来の拡張方針

| 拡張項目 | 内容 | 優先度 |
|---------|------|--------|
| ベクトル検索 | Firestoreのベクトル検索機能を使い、意味的類似度で体験記を検索（精度向上） | v2 |
| 疾患横断検索 | CML以外の疾患の体験記も検索対象に追加 | v2 |
| 相談履歴保存 | Firestoreにユーザーごとの相談履歴を保存 | v2 |
| よりそいとの連携 | よりそいのAI診療サマリー（診断名・薬）を自動でコンテキストに注入 | v3 |

---

## 13. 改訂履歴

| Ver. | 日付 | 担当 | 変更内容 |
|------|------|------|---------|
| v1.0 | 2025-04-21 | 副田渓 / Claude | 初版作成 |
