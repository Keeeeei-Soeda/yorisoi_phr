# よりそい ALS版 Phase 1

`?disease=als` で起動する ALS（筋萎縮性側索硬化症）向け構成です。fm 版は `?disease=fm` のまま共存します。

## 起動

```bash
npm run dev
# http://localhost:8080/?disease=als
```

セットアップ画面の疾患一覧にも「ALS」が表示されます（`templates/als.json`）。

## ホーム導線（ボタン少なめ）

1. 検査値の記録（`als-labs.html`）
2. 薬の記録（`als-medications.html`）
3. 診察の記録（`als-visits.html`）
4. 自己負担上限額管理票（`als-copay.html`）
5. あんしんカード（既存 `emergency-card.html`）

非表示: ボディマップ・気圧・痛みスケール / グラフ

## 主な API

| API | 用途 |
|-----|------|
| `POST /api/ai/scan-lab` | Vision 抽出（ALS は固定スキーマ） |
| `/api/labs` | 検査値（`confirmed` 必須・写真・`entered_by`） |
| `/api/vitals` | 体重・SpO2 |
| `/api/medication-logs` | 服薬チェックログ |
| `/api/consultations` | 診察メモ |
| `/api/copay/*` | 受給者証・月次・明細 |

## 法務

検査値写真の同意・保存・越境方針は [als-privacy-design.md](./als-privacy-design.md) を参照。

## Phase 2（今回スコープ外）

- エダラボン投与サイクル
- あんしんカード ALS 拡張
- ALSFRS-R / 呼吸・栄養モニタ拡充
