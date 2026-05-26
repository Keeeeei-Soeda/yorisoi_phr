# よりそいPHRシリーズ 全面再設計（2026-05-16 開始）

## このフォルダは何か

森さん×Claudeの2026-05-16ブレストで決まった、よりそいPHRシリーズ再設計の全成果物。
「つながる」と同じワークフロー（ブレスト→計画→画面イメージプロンプト→画像生成→デザイン反映）の前半。

## 読む順序

### 1. 全体把握
- [00-series-overview.md](00-series-overview.md) — **まずこれ**。シリーズ全体・親フレーズ・3サブブランド+入口AIの構成・データフロー

### 2. 各サブブランドの詳細
- [01-sub-kiroku.md](01-sub-kiroku.md) — よりそい きろく（記録の核・系統B連携）
- [02-sub-soudan.md](02-sub-soudan.md) — よりそい そうだん（うちあけRAG×AIチャット）
- [03-sub-techo.md](03-sub-techo.md) — よりそい てちょう（医療パスポート・多科併診）
- [04-entrance-ai.md](04-entrance-ai.md) — 入口AI（カウンセラー型・状態判定）

### 3. デザインシステム（3案・画像見比べ用）
- [05-design-system-A-unified.md](05-design-system-A-unified.md) — つながると世界観統一
- [05-design-system-B-independent.md](05-design-system-B-independent.md) — 独立した医療パスポート世界観
- [05-design-system-C-hybrid.md](05-design-system-C-hybrid.md) — つながる共通基盤+PHR独自要素

## ブレスト経緯（読み返し用）

`.plans/designs/2026-05-16-yorisoi-phr-redesign-brainstorm.md` に全Q&A・決定事項・成果物リストを記録。

## 大決定事項（再掲）

| # | 論点 | 決定 |
|---|---|---|
| シリーズ親フレーズ | きろく/そうだん/てちょう を貫く軸 | **「困った時、ここに帰ってこられる。」** |
| サブブランド構成 | 体験ベースか状態ベースか | **案ε（体験×状態ハイブリッド）** |
| 入口設計 | サブブランド名を最初に見せるか | **カウンセラーAI入口・サブ名を最後に出す** |
| 系統B（LINE音声）との関係 | 統合か共存か | **別物として共存**＋PHRに連携取り込み |
| うちあけRAG | 全疾患展開か段階か | **白血病・関節リウマチからPoC→段階展開** |
| 添田白血病版 | 統合か別物か | **本流PHRに統合**（白血病はテンプレ追加・チャット機能は全疾患共通化） |
| ターゲット | 重い患者か全患者か | **コア=重い/進行性/患者会所属、軽症取り込み余地あり** |
| ブランド名 | 「よりそいPHR」維持か | **「よりそい」シリーズのサブブランド複数付ける** |
| ビジュアル方向 | A/B/Cどれか | **画像生成3案見比べて決める（進行中）** |

## 画像生成と比較

`prompts/01-keyvisual-A-unified.md` `02-keyvisual-B-independent.md` `03-keyvisual-C-hybrid.md` を Codex CLI で生成。
出力は `output/01-keyvisual-A-unified.png` `02-keyvisual-B-independent.png` `03-keyvisual-C-hybrid.png`。

## 次のセッションでやること

1. 3案キービジュアルを森さんが見比べる → 方向性確定
2. 確定案のサブブランド別画面（きろく/そうだん/てちょう のホーム・入口AI画面・代表3-5画面）のプロンプトmd量産
3. 画像生成
4. 静的HTMLモック作成（つながると同様に10画面前後）
5. （並走）6/2大阪IBD向けの即効パッチ判定

## 関連リファレンス

- `medicanvas/SERVICE-MAP.md` — 「よりそい」「うちあけ」「Carelife」全体マップ
- `medicanvas/yorisoi-tsunagaru/docs/design-system-tsunagaru.md` — つながるデザインシステム（案Aで流用）
- `medicanvas/yorisoi/patient/yorisoi-phr_soeda-update/YORISOI-FRD-002_RAG相談機能_設計仕様書_v1.0.md` — 添田白血病版RAG設計（そうだんで流用）
- `medicanvas/yorisoi/patient/yorisoi-phr/docs/2026-05-11-debrief-and-redesign.md` — 5/11大阪IBD MTG後の振り返り11章
- `medicanvas/yorisoi/patient/yorisoi-phr/docs/2026-05-14-naibu-brainstorm.md` — 5/14内部ブレスト結論
