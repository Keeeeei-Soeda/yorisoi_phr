# FM 患者テストブランチ変更履歴

ブランチ: `feature/fm-photo-medication`  
Cloud Run サービス: `yorisoi-phr-fm-test`（`yorisoi-senikintsu-syndo` / `asia-northeast1`）

## 2026-07-09 ホーム画面 UX 改善

### 背景
- 写真での服薬登録・検査値記録は実装済みだったが、ホームから到達できず導線が分かりにくかった
- 「はなす」（`/talk/`）は工事中のため患者テスト対象外

### 変更内容
| 項目 | 内容 |
|------|------|
| ホームに追加 | **写真で服薬登録**（FM テンプレートの `medication-photo` モジュールがある場合） |
| ホームに追加 | **検査値きろく**（テンプレートに `labConfig` がある場合） |
| ホームから除外 | **はなす**（`/talk/`）ボタン |
| 実装 | `public/index.html` の `buildHomeButtons()` で疾患テンプレートに応じて動的生成 |

### FM（`?disease=fm`）のホームメニュー順
1. きろくする
2. 写真で服薬登録
3. 検査値きろく
4. ふりかえる
5. みせる

### 関連画面
- 写真服薬登録: `/medication-photo-register.html?disease=fm`
- 検査値きろく: `/lab-tracker.html?disease=fm`
- 患者テスト URL: `https://yorisoi-phr-fm-test-o7flbqc5ka-an.a.run.app?disease=fm`

### 参照仕様
- 写真服薬登録の詳細要件: `yorisoi_med_photo_registration_cursor.md`（機能①）
