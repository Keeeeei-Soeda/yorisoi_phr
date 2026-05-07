/**
 * デモモード用モックAPIルート
 * Firestore不要でサンプルデータを返す
 * テンプレート駆動：疾患IDに応じてデータを切り替え
 */

const express = require("express");
const { listTemplates, getTemplate, getMedicationMaster } = require("../lib/templates");

const router = express.Router();

// ========================================
// テンプレート / コンフィグ API
// ========================================

// GET /api/templates — 利用可能な疾患テンプレート一覧
router.get("/api/templates", (_req, res) => {
  res.json(listTemplates());
});

// GET /api/config?disease=uc — 指定疾患のテンプレート取得
router.get("/api/config", (req, res) => {
  const diseaseId = req.query.disease || "uc";
  const tmpl = getTemplate(diseaseId);
  if (!tmpl) return res.status(404).json({ error: `Template '${diseaseId}' not found` });
  res.json(tmpl);
});

// GET /api/master/medications?disease=uc — 疾患別薬剤マスタ
router.get("/api/master/medications", (req, res) => {
  const diseaseId = req.query.disease || "uc";
  const master = getMedicationMaster(diseaseId);
  if (!master) return res.status(404).json({ error: `Medication master for '${diseaseId}' not found` });
  res.json(master);
});

// ========================================
// 疾患別デモデータ
// ========================================

const DEMO_DATA = {
  uc: {
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "潰瘍性大腸炎",
      diagnosisDate: "2020-06-15",
      diseaseId: "uc",
    },
    timeline: [
      { id: "ev1", date: "2020-06-15", category: "diagnosis", title: "潰瘍性大腸炎と診断", detail: "○○大学病院 消化器内科にて確定診断。全大腸炎型。", source: "manual" },
      { id: "ev2", date: "2020-06-20", category: "medication_change", title: "ペンタサ処方開始", detail: "メサラジン 1日3回 経口", source: "manual" },
      { id: "ev3", date: "2020-09-10", category: "exam", title: "大腸内視鏡検査", detail: "軽度の炎症所見あり。生検実施。", source: "manual" },
      { id: "ev4", date: "2021-03-05", category: "hospitalization", title: "再燃により入院（10日間）", detail: "○○大学病院。ステロイドパルス療法実施。", source: "manual" },
      { id: "ev5", date: "2021-03-15", category: "medication_change", title: "プレドニン追加", detail: "プレドニゾロン30mg/日から漸減", source: "manual" },
      { id: "ev6", date: "2021-08-01", category: "treatment_change", title: "ステロイド離脱成功", detail: "プレドニゾロン完全中止。ペンタサ単独に。", source: "manual" },
      { id: "ev7", date: "2022-04-20", category: "exam", title: "大腸内視鏡検査", detail: "粘膜治癒確認。寛解維持。", source: "manual" },
      { id: "ev8", date: "2023-11-10", category: "medication_change", title: "リアルダに変更", detail: "ペンタサ→リアルダ（1日1回に簡素化）", source: "manual" },
      { id: "ev9", date: "2024-05-15", category: "exam", title: "定期内視鏡", detail: "異常なし。寛解維持継続。", source: "manual" },
      { id: "ev10", date: "2025-12-01", category: "other", title: "引っ越しに伴い転院", detail: "○○大学病院 → △△クリニック IBD外来", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "リアルダ", genericName: "メサラジン", category: "5-ASA", dosageForm: "経口", startDate: "2023-11-10", endDate: null, isActive: true, changeReason: "1日1回に簡素化のため変更", sideNotes: "食後に服用" },
      { id: "m2", name: "ビオフェルミン", genericName: "", category: "other", dosageForm: "経口", startDate: "2020-06-20", endDate: null, isActive: true, changeReason: "腸内環境の改善", sideNotes: "" },
      { id: "m3", name: "ペンタサ", genericName: "メサラジン", category: "5-ASA", dosageForm: "経口", startDate: "2020-06-20", endDate: "2023-11-10", isActive: false, changeReason: "初回処方", sideNotes: "1日3回 食後" },
      { id: "m4", name: "プレドニン", genericName: "プレドニゾロン", category: "steroid", dosageForm: "経口", startDate: "2021-03-05", endDate: "2021-08-01", isActive: false, changeReason: "再燃時のステロイドパルス", sideNotes: "30mg→漸減→中止" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-15", values: { crp: 0.12, hb: 14.2, wbc: 5800, alb: 4.1, plt: 22 } },
      { id: "l2", date: "2025-12-10", values: { crp: 0.08, hb: 13.8, wbc: 6200, alb: 4.3, plt: 24 } },
      { id: "l3", date: "2025-09-05", values: { crp: 0.15, hb: 14.0, wbc: 5500, alb: 4.0, plt: 21 } },
      { id: "l4", date: "2025-06-01", values: { crp: 0.45, hb: 12.9, wbc: 7100, alb: 3.8, plt: 28 } },
      { id: "l5", date: "2025-03-01", values: { crp: 0.22, hb: 13.5, wbc: 6000, alb: 4.2, plt: 23 } },
    ],
  },

  parkinson: {
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "パーキンソン病",
      diagnosisDate: "2019-03-10",
      diseaseId: "parkinson",
    },
    timeline: [
      { id: "ev1", date: "2019-03-10", category: "diagnosis", title: "パーキンソン病と診断", detail: "○○大学病院 神経内科。安静時振戦と動作緩慢を指摘。", source: "manual" },
      { id: "ev2", date: "2019-03-15", category: "medication_change", title: "マドパー処方開始", detail: "レボドパ/ベンセラジド 100mg 1日3回", source: "manual" },
      { id: "ev3", date: "2020-06-01", category: "medication_change", title: "アジレクト追加", detail: "MAO-B阻害薬を併用開始", source: "manual" },
      { id: "ev4", date: "2021-09-20", category: "treatment_change", title: "ウェアリングオフ出現", detail: "レボドパの効果持続時間が短縮。服用間隔を調整。", source: "manual" },
      { id: "ev5", date: "2022-04-10", category: "medication_change", title: "エクフィナ追加", detail: "ウェアリングオフ改善のためMAO-B阻害薬を変更", source: "manual" },
      { id: "ev6", date: "2023-11-15", category: "exam", title: "DATスキャン", detail: "ドパミントランスポーター減少を確認。H&Y分類 Stage 2。", source: "manual" },
      { id: "ev7", date: "2025-01-10", category: "treatment_change", title: "リハビリ開始", detail: "週2回のPT（理学療法）開始。バランス訓練中心。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "マドパー", genericName: "レボドパ/ベンセラジド", category: "levodopa", dosageForm: "経口", startDate: "2019-03-15", endDate: null, isActive: true, changeReason: "初回処方", sideNotes: "食前30分 1日3回" },
      { id: "m2", name: "エクフィナ", genericName: "サフィナミド", category: "mao_b_inhibitor", dosageForm: "経口", startDate: "2022-04-10", endDate: null, isActive: true, changeReason: "ウェアリングオフ対策", sideNotes: "1日1回 朝" },
      { id: "m3", name: "アジレクト", genericName: "ラサギリン", category: "mao_b_inhibitor", dosageForm: "経口", startDate: "2020-06-01", endDate: "2022-04-10", isActive: false, changeReason: "MAO-B阻害薬の併用", sideNotes: "" },
    ],
    labResults: [
      { id: "l1", date: "2026-02-01", values: { tsh: 2.1, ast: 22, alt: 18, bun: 15, cre: 0.9 } },
      { id: "l2", date: "2025-08-01", values: { tsh: 1.8, ast: 25, alt: 20, bun: 16, cre: 0.85 } },
    ],
  },

  sle: {
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "全身性エリテマトーデス",
      diagnosisDate: "2018-11-20",
      diseaseId: "sle",
    },
    timeline: [
      { id: "ev1", date: "2018-11-20", category: "diagnosis", title: "SLEと診断", detail: "蝶形紅斑・関節痛・抗dsDNA抗体陽性で確定。", source: "manual" },
      { id: "ev2", date: "2018-12-01", category: "medication_change", title: "プレドニン + プラケニル開始", detail: "PSL 30mg + HCQ 200mg", source: "manual" },
      { id: "ev3", date: "2019-06-15", category: "treatment_change", title: "ステロイド漸減", detail: "PSL 30mg→15mg→10mg と段階的に減量", source: "manual" },
      { id: "ev4", date: "2020-03-01", category: "medication_change", title: "セルセプト追加", detail: "ステロイドスペアリング目的でMMF追加", source: "manual" },
      { id: "ev5", date: "2021-08-10", category: "hospitalization", title: "ループス腎炎で入院", detail: "蛋白尿増加。腎生検実施。ISN/RPS Class III。", source: "manual" },
      { id: "ev6", date: "2022-01-01", category: "treatment_change", title: "寛解達成", detail: "SLEDAI 0点。PSL 5mg維持。", source: "manual" },
      { id: "ev7", date: "2024-04-20", category: "exam", title: "定期検査", detail: "抗dsDNA正常化。補体正常範囲。腎機能安定。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "プレドニン", genericName: "プレドニゾロン", category: "steroid", dosageForm: "経口", startDate: "2018-12-01", endDate: null, isActive: true, changeReason: "SLE初回治療", sideNotes: "5mg/日 維持量" },
      { id: "m2", name: "プラケニル", genericName: "ヒドロキシクロロキン", category: "antimalarial", dosageForm: "経口", startDate: "2018-12-01", endDate: null, isActive: true, changeReason: "SLE基本治療", sideNotes: "200mg/日 眼科定期検診" },
      { id: "m3", name: "セルセプト", genericName: "ミコフェノール酸モフェチル", category: "immunosuppressant", dosageForm: "経口", startDate: "2020-03-01", endDate: null, isActive: true, changeReason: "ステロイド減量目的", sideNotes: "1000mg/日 消化器症状に注意" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-01", values: { crp: 0.05, "anti-dsDNA": 12, c3: 95, c4: 22, eGFR: 85, uProtein: 0.1 } },
      { id: "l2", date: "2025-12-01", values: { crp: 0.08, "anti-dsDNA": 15, c3: 90, c4: 20, eGFR: 82, uProtein: 0.12 } },
      { id: "l3", date: "2025-09-01", values: { crp: 0.03, "anti-dsDNA": 10, c3: 98, c4: 24, eGFR: 88, uProtein: 0.08 } },
    ],
  },

  t1d: {
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "1型糖尿病",
      diagnosisDate: "2015-08-05",
      diseaseId: "t1d",
    },
    timeline: [
      { id: "ev1", date: "2015-08-05", category: "diagnosis", title: "1型糖尿病と診断", detail: "DKA（ケトアシドーシス）で緊急入院。GAD抗体陽性。", source: "manual" },
      { id: "ev2", date: "2015-08-10", category: "medication_change", title: "インスリン療法開始", detail: "MDI（頻回注射法）: ランタス + ノボラピッド", source: "manual" },
      { id: "ev3", date: "2018-04-01", category: "treatment_change", title: "インスリンポンプ導入", detail: "Medtronic 670G SAP療法に移行", source: "manual" },
      { id: "ev4", date: "2021-06-15", category: "treatment_change", title: "CGM導入", detail: "Dexcom G6 開始。リアルタイム血糖モニタリング。", source: "manual" },
      { id: "ev5", date: "2023-09-01", category: "treatment_change", title: "AID（自動インスリン送達）に移行", detail: "Medtronic 780G + Guardian 4。ハイブリッドクローズドループ。", source: "manual" },
      { id: "ev6", date: "2025-04-10", category: "exam", title: "定期検査（眼底・腎機能）", detail: "HbA1c 6.8%。網膜症なし。微量アルブミン尿なし。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "インスリン アスパルト", genericName: "超速効型インスリン", category: "insulin_rapid", dosageForm: "ポンプ", startDate: "2018-04-01", endDate: null, isActive: true, changeReason: "ポンプ用インスリン", sideNotes: "基礎レート+ボーラス" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-01", values: { hba1c: 6.8, eGFR: 95, uAlb: 8, tcho: 185, ldl: 102 } },
      { id: "l2", date: "2025-09-01", values: { hba1c: 7.1, eGFR: 97, uAlb: 5, tcho: 178, ldl: 98 } },
      { id: "l3", date: "2025-03-01", values: { hba1c: 6.9, eGFR: 96, uAlb: 6, tcho: 190, ldl: 105 } },
    ],
  },

  crohn: {
    profile: { displayName: "デモユーザー", diagnosisName: "クローン病", diagnosisDate: "2017-05-12", diseaseId: "crohn" },
    timeline: [
      { id: "ev1", date: "2017-05-12", category: "diagnosis", title: "クローン病と診断", detail: "小腸大腸型。○○大学病院。", source: "manual" },
      { id: "ev2", date: "2017-05-20", category: "medication_change", title: "ペンタサ + エレンタール開始", detail: "栄養療法と5-ASA併用。", source: "manual" },
      { id: "ev3", date: "2018-11-05", category: "flare", title: "再燃", detail: "腹痛・下痢増悪。CRP 4.2。", source: "manual" },
      { id: "ev4", date: "2018-11-10", category: "medication_change", title: "ヒュミラ導入", detail: "生物学的製剤開始。", source: "manual" },
      { id: "ev5", date: "2020-06-15", category: "exam", title: "大腸内視鏡", detail: "粘膜治癒確認。", source: "manual" },
      { id: "ev6", date: "2023-03-01", category: "medication_change", title: "ステラーラに変更", detail: "ヒュミラ効果減弱のため変更。", source: "manual" },
      { id: "ev7", date: "2025-10-01", category: "exam", title: "定期MRE検査", detail: "活動性炎症なし。寛解維持。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "ステラーラ", genericName: "ウステキヌマブ", category: "biologic", dosageForm: "皮下注射", startDate: "2023-03-01", endDate: null, isActive: true, changeReason: "ヒュミラ効果減弱", sideNotes: "8週ごと自己注射" },
      { id: "m2", name: "ペンタサ", genericName: "メサラジン", category: "5-ASA", dosageForm: "経口", startDate: "2017-05-20", endDate: null, isActive: true, changeReason: "初回処方", sideNotes: "1日4g" },
      { id: "m3", name: "エレンタール", genericName: "成分栄養剤", category: "nutritional", dosageForm: "経口", startDate: "2017-05-20", endDate: null, isActive: true, changeReason: "栄養療法", sideNotes: "就寝前1包" },
      { id: "m4", name: "ヒュミラ", genericName: "アダリムマブ", category: "biologic", dosageForm: "皮下注射", startDate: "2018-11-10", endDate: "2023-03-01", isActive: false, changeReason: "効果減弱", sideNotes: "" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-10", values: { crp: 0.15, hb: 13.5, wbc: 6200, alb: 4.0, esr: 8, plt: 25, ferritin: 85, ca: 9.2 } },
      { id: "l2", date: "2025-12-05", values: { crp: 0.22, hb: 13.2, wbc: 6500, alb: 3.9, esr: 12, plt: 27, ferritin: 72, ca: 9.1 } },
      { id: "l3", date: "2025-09-01", values: { crp: 0.18, hb: 13.8, wbc: 5900, alb: 4.1, esr: 10, plt: 24, ferritin: 95, ca: 9.3 } },
    ],
  },

  ra: {
    profile: { displayName: "デモユーザー", diagnosisName: "関節リウマチ", diagnosisDate: "2019-08-20", diseaseId: "ra" },
    timeline: [
      { id: "ev1", date: "2019-08-20", category: "diagnosis", title: "関節リウマチと診断", detail: "両手関節腫脹・朝のこわばり90分。RF・抗CCP陽性。", source: "manual" },
      { id: "ev2", date: "2019-08-25", category: "medication_change", title: "MTX開始", detail: "メトトレキサート 6mg/週", source: "manual" },
      { id: "ev3", date: "2020-02-10", category: "medication_change", title: "MTX増量", detail: "10mg/週へ。DAS28 4.2。", source: "manual" },
      { id: "ev4", date: "2021-04-15", category: "medication_change", title: "エンブレル併用開始", detail: "DAS28改善不十分のため生物学的製剤追加。", source: "manual" },
      { id: "ev5", date: "2022-09-01", category: "exam", title: "関節エコー評価", detail: "滑膜炎消失。寛解達成。", source: "manual" },
      { id: "ev6", date: "2024-11-20", category: "medication_change", title: "MTX減量", detail: "寛解維持のため8mg/週へ減量。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "リウマトレックス", genericName: "メトトレキサート", category: "csdmard", dosageForm: "経口", startDate: "2019-08-25", endDate: null, isActive: true, changeReason: "アンカードラッグ", sideNotes: "週1回 8mg" },
      { id: "m2", name: "エンブレル", genericName: "エタネルセプト", category: "biologic_tnf", dosageForm: "皮下注射", startDate: "2021-04-15", endDate: null, isActive: true, changeReason: "MTX効果不十分", sideNotes: "週1回自己注射" },
      { id: "m3", name: "葉酸", genericName: "フォリアミン", category: "other", dosageForm: "経口", startDate: "2019-08-25", endDate: null, isActive: true, changeReason: "MTX副作用予防", sideNotes: "週1回 5mg" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-15", values: { crp: 0.08, esr: 10, rf: 45, accp: 82, mmp3: 68, hb: 13.1, plt: 25, alt: 22, cre: 0.85, egfr: 78 } },
      { id: "l2", date: "2025-12-10", values: { crp: 0.12, esr: 12, rf: 50, accp: 85, mmp3: 75, hb: 12.9, plt: 26, alt: 25, cre: 0.88, egfr: 76 } },
      { id: "l3", date: "2025-09-05", values: { crp: 0.15, esr: 14, rf: 48, accp: 80, mmp3: 82, hb: 13.0, plt: 24, alt: 20, cre: 0.90, egfr: 74 } },
    ],
  },

  ms: {
    profile: { displayName: "デモユーザー", diagnosisName: "多発性硬化症", diagnosisDate: "2016-02-18", diseaseId: "ms" },
    timeline: [
      { id: "ev1", date: "2016-02-18", category: "diagnosis", title: "多発性硬化症と診断", detail: "再発寛解型(RRMS)。MRI多発脱髄病変。", source: "manual" },
      { id: "ev2", date: "2016-02-25", category: "medication_change", title: "ベタフェロン開始", detail: "インターフェロンβ-1b 隔日皮下注。", source: "manual" },
      { id: "ev3", date: "2018-06-10", category: "relapse", title: "再発", detail: "視神経炎。左眼視力低下。", source: "manual" },
      { id: "ev4", date: "2018-06-12", category: "hospitalization", title: "ステロイドパルス", detail: "ソル・メドロール 1g×3日。", source: "manual" },
      { id: "ev5", date: "2018-08-01", category: "medication_change", title: "テクフィデラに変更", detail: "経口DMTに切替。", source: "manual" },
      { id: "ev6", date: "2021-11-05", category: "mri", title: "定期MRI", detail: "新規病変なし。EDSS 2.0維持。", source: "manual" },
      { id: "ev7", date: "2025-03-20", category: "exam", title: "JCV抗体検査", detail: "陰性確認。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "テクフィデラ", genericName: "フマル酸ジメチル", category: "dmt_oral", dosageForm: "経口", startDate: "2018-08-01", endDate: null, isActive: true, changeReason: "注射剤からの切替", sideNotes: "1日2回" },
      { id: "m2", name: "ベタフェロン", genericName: "インターフェロンβ-1b", category: "dmt_injection", dosageForm: "皮下注射", startDate: "2016-02-25", endDate: "2018-08-01", isActive: false, changeReason: "経口DMTへ切替", sideNotes: "" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-01", values: { wbc: 5800, lymph: 1450, jcv: 0.3, igg: 1200, alt: 22, ast: 20, cre: 0.8, vitd: 35 } },
      { id: "l2", date: "2025-09-01", values: { wbc: 6000, lymph: 1500, jcv: 0.35, igg: 1180, alt: 25, ast: 22, cre: 0.82, vitd: 28 } },
    ],
  },

  mg: {
    profile: { displayName: "デモユーザー", diagnosisName: "重症筋無力症", diagnosisDate: "2018-10-05", diseaseId: "mg" },
    timeline: [
      { id: "ev1", date: "2018-10-05", category: "diagnosis", title: "重症筋無力症と診断", detail: "全身型。抗AChR抗体陽性。MGFA分類 IIa。", source: "manual" },
      { id: "ev2", date: "2018-10-10", category: "medication_change", title: "メスチノン開始", detail: "ピリドスチグミン 180mg/日。", source: "manual" },
      { id: "ev3", date: "2018-11-20", category: "thymectomy", title: "胸腺摘出術", detail: "胸腺腫なし。拡大胸腺摘出。", source: "manual" },
      { id: "ev4", date: "2019-01-15", category: "medication_change", title: "プレドニン追加", detail: "ステロイド療法開始。", source: "manual" },
      { id: "ev5", date: "2020-08-10", category: "crisis", title: "筋無力症クリーゼ", detail: "感染契機。IVIG治療。", source: "manual" },
      { id: "ev6", date: "2020-08-15", category: "ivig", title: "IVIG施行", detail: "5日間投与。症状改善。", source: "manual" },
      { id: "ev7", date: "2023-04-01", category: "medication_change", title: "ソリリス導入", detail: "難治例として補体阻害薬開始。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "メスチノン", genericName: "ピリドスチグミン", category: "cholinesterase_inhibitor", dosageForm: "経口", startDate: "2018-10-10", endDate: null, isActive: true, changeReason: "症状改善", sideNotes: "1日3回" },
      { id: "m2", name: "プレドニン", genericName: "プレドニゾロン", category: "steroid", dosageForm: "経口", startDate: "2019-01-15", endDate: null, isActive: true, changeReason: "免疫抑制", sideNotes: "5mg/日 維持量" },
      { id: "m3", name: "ソリリス", genericName: "エクリズマブ", category: "biologic", dosageForm: "点滴", startDate: "2023-04-01", endDate: null, isActive: true, changeReason: "難治例", sideNotes: "2週ごと" },
    ],
    labResults: [
      { id: "l1", date: "2026-02-20", values: { achr: 8.5, musk: 0.02, ck: 120, tsh: 2.1, ft4: 1.2, wbc: 7200, lymph: 1800, igg: 1050 } },
      { id: "l2", date: "2025-08-20", values: { achr: 9.2, musk: 0.02, ck: 135, tsh: 2.3, ft4: 1.1, wbc: 7500, lymph: 1850, igg: 1080 } },
    ],
  },

  fabry: {
    profile: { displayName: "デモユーザー", diagnosisName: "ファブリー病", diagnosisDate: "2012-09-15", diseaseId: "fabry" },
    timeline: [
      { id: "ev1", date: "2012-09-15", category: "diagnosis", title: "ファブリー病と診断", detail: "家族歴あり。α-Gal活性低下。", source: "manual" },
      { id: "ev2", date: "2012-10-01", category: "genetic_test", title: "遺伝子検査", detail: "GLA遺伝子変異確定。", source: "manual" },
      { id: "ev3", date: "2012-11-01", category: "ert_start", title: "酵素補充療法(ERT)開始", detail: "ファブラザイム 2週ごと点滴。", source: "manual" },
      { id: "ev4", date: "2015-06-20", category: "exam", title: "定期心エコー", detail: "左室肥大なし。心機能正常。", source: "manual" },
      { id: "ev5", date: "2018-12-10", category: "complication", title: "一過性脳虚血発作", detail: "左上肢脱力。アスピリン開始。", source: "manual" },
      { id: "ev6", date: "2023-05-15", category: "exam", title: "腎生検", detail: "軽度のGL-3蓄積。eGFR安定。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "ファブラザイム", genericName: "アガルシダーゼβ", category: "ert", dosageForm: "点滴", startDate: "2012-11-01", endDate: null, isActive: true, changeReason: "根本治療", sideNotes: "隔週投与" },
      { id: "m2", name: "テグレトール", genericName: "カルバマゼピン", category: "pain", dosageForm: "経口", startDate: "2013-04-10", endDate: null, isActive: true, changeReason: "四肢疼痛", sideNotes: "200mg/日" },
      { id: "m3", name: "ブロプレス", genericName: "カンデサルタン", category: "renal", dosageForm: "経口", startDate: "2016-03-01", endDate: null, isActive: true, changeReason: "腎保護", sideNotes: "4mg/日" },
      { id: "m4", name: "バイアスピリン", genericName: "アスピリン", category: "other", dosageForm: "経口", startDate: "2018-12-12", endDate: null, isActive: true, changeReason: "TIA後の抗血小板療法", sideNotes: "100mg/日" },
    ],
    labResults: [
      { id: "l1", date: "2026-02-15", values: { lysogb3: 4.5, galA: 2.1, egfr: 78, uprot: 0.18, cre: 0.95, bnp: 28, lvef: 62, troponin: 8 } },
      { id: "l2", date: "2025-08-15", values: { lysogb3: 4.8, galA: 2.0, egfr: 80, uprot: 0.20, cre: 0.92, bnp: 32, lvef: 63, troponin: 9 } },
    ],
  },

  poems: {
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "POEMS症候群",
      diagnosisDate: "2024-08-10",
      diseaseId: "poems",
    },
    timeline: [
      { id: "ev1", date: "2023-04-15", category: "exam", title: "初発症状（手足のしびれ）", detail: "近医 脳神経内科受診。CIDP疑いでIVIG施行も改善乏しく、以後診断難渋。", source: "manual" },
      { id: "ev2", date: "2024-02-01", category: "exam", title: "VEGF高値を指摘", detail: "他院での精査で血清VEGF 3,580 pg/mL。POEMS症候群を強く疑う所見。", source: "manual" },
      { id: "ev3", date: "2024-08-10", category: "diagnosis", title: "POEMS症候群と確定診断", detail: "千葉大学 脳神経内科にて確定。M蛋白・多発神経障害・浮腫・臓器腫大・内分泌障害を満たす。", source: "manual" },
      { id: "ev4", date: "2024-08-20", category: "medication_change", title: "サレド（サリドマイド）開始", detail: "100mg/日で導入。TERMS登録済。血栓予防にリクシアナ併用。", source: "manual" },
      { id: "ev5", date: "2024-12-05", category: "hospitalization", title: "ASCT目的で入院（幹細胞採取）", detail: "シクロホスファミド+G-CSFで末梢血幹細胞採取。", source: "manual" },
      { id: "ev6", date: "2025-01-10", category: "asct", title: "自家造血幹細胞移植（ASCT）施行", detail: "大量メルファラン（200mg/m²）前処置後、自家PBSCT。", source: "manual" },
      { id: "ev7", date: "2025-03-20", category: "exam", title: "移植後3か月評価", detail: "VEGF 820 pg/mL（著明低下）。しびれ軽減・歩行距離改善。M蛋白ほぼ消失。", source: "manual" },
      { id: "ev8", date: "2025-09-15", category: "remission", title: "寛解判定", detail: "VEGF正常化・M蛋白陰性・神経症状改善。維持療法としてレブラミド低用量へ。", source: "manual" },
      { id: "ev9", date: "2026-03-10", category: "exam", title: "定期外来（血液内科）", detail: "VEGF 410 pg/mL。寛解維持。握力・歩行機能も安定。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "レブラミド", genericName: "レナリドミド", category: "imid", dosageForm: "経口", startDate: "2025-09-15", endDate: null, isActive: true, changeReason: "寛解後の維持療法", sideNotes: "10mg/日 21日オン7日オフ。RevMate管理中" },
      { id: "m2", name: "リクシアナ", genericName: "エドキサバン", category: "anticoagulant", dosageForm: "経口", startDate: "2024-08-20", endDate: null, isActive: true, changeReason: "IMiDs併用時の血栓予防", sideNotes: "30mg/日" },
      { id: "m3", name: "プレドニン", genericName: "プレドニゾロン", category: "chemo", dosageForm: "経口", startDate: "2025-09-15", endDate: null, isActive: true, changeReason: "維持療法のパートナー", sideNotes: "5mg/日 維持量" },
      { id: "m4", name: "タリージェ", genericName: "ミロガバリン", category: "support", dosageForm: "経口", startDate: "2024-08-20", endDate: null, isActive: true, changeReason: "手足のしびれ・痛み", sideNotes: "10mg 1日2回" },
      { id: "m5", name: "チラーヂンS", genericName: "レボチロキシン", category: "endocrine", dosageForm: "経口", startDate: "2024-09-01", endDate: null, isActive: true, changeReason: "甲状腺機能低下の補充", sideNotes: "50μg/日 朝食前" },
      { id: "m6", name: "サレド", genericName: "サリドマイド", category: "imid", dosageForm: "経口", startDate: "2024-08-20", endDate: "2024-12-05", isActive: false, changeReason: "ASCT前処置のため一旦中止", sideNotes: "TERMS登録済" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-10", values: { vegf: 410, mprotein: 0, plt: 28, hb: 13.2, alb: 4.1, ddimer: 0.5, hba1c: 5.8, tsh: 2.4, ft4: 1.2, testosterone: 4.8, cre: 0.82, egfr: 88 } },
      { id: "l2", date: "2025-12-05", values: { vegf: 520, mprotein: 0, plt: 32, hb: 13.5, alb: 4.0, ddimer: 0.6, hba1c: 6.0, tsh: 2.6, ft4: 1.1, testosterone: 4.2, cre: 0.85, egfr: 86 } },
      { id: "l3", date: "2025-09-15", values: { vegf: 480, mprotein: 0, plt: 29, hb: 12.8, alb: 3.9, ddimer: 0.7, hba1c: 6.1, tsh: 3.0, ft4: 1.0, testosterone: 3.8, cre: 0.88, egfr: 84 } },
      { id: "l4", date: "2025-06-15", values: { vegf: 620, mprotein: 0.05, plt: 35, hb: 12.4, alb: 3.8, ddimer: 0.9, hba1c: 6.3, tsh: 3.2, ft4: 1.0, testosterone: 3.2, cre: 0.90, egfr: 82 } },
      { id: "l5", date: "2025-03-20", values: { vegf: 820, mprotein: 0.12, plt: 45, hb: 11.8, alb: 3.5, ddimer: 1.2, hba1c: 6.5, tsh: 3.5, ft4: 0.9, testosterone: 2.8, cre: 0.95, egfr: 78 } },
      { id: "l6", date: "2024-11-05", values: { vegf: 2180, mprotein: 0.35, plt: 58, hb: 11.2, alb: 3.2, ddimer: 1.8, hba1c: 6.8, tsh: 4.2, ft4: 0.8, testosterone: 2.1, cre: 1.05, egfr: 72 } },
      { id: "l7", date: "2024-08-10", values: { vegf: 3580, mprotein: 0.68, plt: 72, hb: 10.5, alb: 2.9, ddimer: 2.4, hba1c: 7.1, tsh: 5.8, ft4: 0.7, testosterone: 1.8, cre: 1.12, egfr: 68 } },
    ],
    clinics: [
      { id: "c1", name: "千葉大学医学部附属病院", address: "千葉県千葉市中央区亥鼻1-8-1", phone: "043-222-7171", departments: ["血液内科", "脳神経内科"], isPrimary: true, note: "POEMS確定診断・ASCT実施。主治医は血液内科。" },
      { id: "c2", name: "みやざき眼科クリニック", address: "千葉県千葉市稲毛区", phone: "", departments: ["眼科"], isPrimary: false, note: "視神経乳頭浮腫の定期フォロー。" },
      { id: "c3", name: "田中内分泌クリニック", address: "千葉県千葉市稲毛区", phone: "", departments: ["内分泌科"], isPrimary: false, note: "甲状腺機能低下のフォロー・チラーヂンS処方。" },
    ],
    visits: [
      { id: "v1", date: "2024-08-10", clinicId: "c1", department: "血液内科", doctor: "山田 太郎", chiefComplaint: "しびれ・浮腫が続いている", findings: "M蛋白・多発神経障害・浮腫・臓器腫大・内分泌障害を満たしPOEMSと確定診断。サレド導入を予定。", nextAction: "TERMS登録後にサレド開始。血栓予防にリクシアナ併用。", photos: [], relatedMedicationIds: [], relatedLabResultIds: ["l7"], relatedTimelineEventId: "ev3" },
      { id: "v2", date: "2025-01-10", clinicId: "c1", department: "血液内科", doctor: "山田 太郎", chiefComplaint: "ASCT入院中", findings: "大量メルファラン前処置後、自家PBSCT実施。経過良好。", nextAction: "退院後、外来で月1回フォロー。", photos: [], relatedMedicationIds: ["m6"], relatedLabResultIds: [], relatedTimelineEventId: "ev6" },
      { id: "v3", date: "2025-09-15", clinicId: "c1", department: "血液内科", doctor: "山田 太郎", chiefComplaint: "しびれ軽減・歩行距離改善", findings: "VEGF正常化・M蛋白陰性・神経症状改善。維持療法としてレブラミド低用量へ移行。", nextAction: "レブラミド10mg/日（21日オン7日オフ）。次回3ヶ月後。", photos: [], relatedMedicationIds: ["m1"], relatedLabResultIds: ["l3"], relatedTimelineEventId: "ev8" },
      { id: "v4", date: "2026-03-10", clinicId: "c1", department: "血液内科", doctor: "山田 太郎", chiefComplaint: "握力・歩行機能とも安定", findings: "VEGF 410 pg/mL。寛解維持。レブラミド継続で経過良好。", nextAction: "次回6ヶ月後。眼科・内分泌のフォローも継続。", photos: [], relatedMedicationIds: ["m1", "m3"], relatedLabResultIds: ["l1"], relatedTimelineEventId: "ev9" },
      { id: "v5", date: "2025-11-20", clinicId: "c2", department: "眼科", doctor: "宮崎 花子", chiefComplaint: "見え方は安定", findings: "視神経乳頭浮腫は軽度残存だが進行なし。視野・視力とも保たれている。", nextAction: "6ヶ月後フォロー。視野変化があれば早めに受診。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v6", date: "2026-02-05", clinicId: "c3", department: "内分泌科", doctor: "田中 健", chiefComplaint: "倦怠感は軽快", findings: "TSH 2.4・FT4 1.2 と正常範囲。チラーヂン継続で安定。", nextAction: "現量継続。半年後に再評価。", photos: [], relatedMedicationIds: ["m5"], relatedLabResultIds: ["l1"], relatedTimelineEventId: null },
    ],
  },

  pah: {
    profile: { displayName: "デモユーザー", diagnosisName: "肺動脈性肺高血圧症", diagnosisDate: "2020-01-22", diseaseId: "pah" },
    timeline: [
      { id: "ev1", date: "2020-01-22", category: "diagnosis", title: "PAHと診断", detail: "労作時息切れ精査で診断。WHO FC III。", source: "manual" },
      { id: "ev2", date: "2020-01-25", category: "rhc", title: "右心カテーテル検査", detail: "mPAP 48mmHg、PVR 8.5 WU。", source: "manual" },
      { id: "ev3", date: "2020-02-01", category: "medication_change", title: "アドシルカ開始", detail: "タダラフィル 40mg/日。", source: "manual" },
      { id: "ev4", date: "2020-04-15", category: "medication_change", title: "オプスミット追加", detail: "2剤併用療法へ。", source: "manual" },
      { id: "ev5", date: "2021-06-10", category: "hospitalization", title: "心不全増悪で入院", detail: "利尿薬調整。", source: "manual" },
      { id: "ev6", date: "2021-07-01", category: "medication_change", title: "ウプトラビ追加", detail: "3剤併用療法。WHO FC II改善。", source: "manual" },
      { id: "ev7", date: "2025-09-10", category: "rhc", title: "定期右心カテーテル", detail: "mPAP 32mmHg、PVR 4.2 WU。改善維持。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "アドシルカ", genericName: "タダラフィル", category: "pde5_inhibitor", dosageForm: "経口", startDate: "2020-02-01", endDate: null, isActive: true, changeReason: "初回処方", sideNotes: "40mg/日" },
      { id: "m2", name: "オプスミット", genericName: "マシテンタン", category: "era", dosageForm: "経口", startDate: "2020-04-15", endDate: null, isActive: true, changeReason: "併用療法", sideNotes: "10mg/日" },
      { id: "m3", name: "ウプトラビ", genericName: "セレキシパグ", category: "prostacyclin_oral", dosageForm: "経口", startDate: "2021-07-01", endDate: null, isActive: true, changeReason: "3剤併用", sideNotes: "1日2回" },
      { id: "m4", name: "ラシックス", genericName: "フロセミド", category: "other", dosageForm: "経口", startDate: "2020-02-01", endDate: null, isActive: true, changeReason: "利尿・浮腫対策", sideNotes: "20mg/日" },
      { id: "m5", name: "ワーファリン", genericName: "ワルファリン", category: "anticoagulant", dosageForm: "経口", startDate: "2020-02-01", endDate: null, isActive: true, changeReason: "血栓予防", sideNotes: "INR 1.5-2.5" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-05", values: { bnp: 85, ntprobnp: 280, egfr: 72, cre: 0.95, ast: 22, alt: 25, ua: 6.8, na: 138, k: 4.2, hb: 13.5, plt: 22 } },
      { id: "l2", date: "2025-12-05", values: { bnp: 92, ntprobnp: 310, egfr: 70, cre: 0.98, ast: 24, alt: 28, ua: 7.1, na: 137, k: 4.0, hb: 13.2, plt: 23 } },
      { id: "l3", date: "2025-09-05", values: { bnp: 78, ntprobnp: 265, egfr: 74, cre: 0.92, ast: 20, alt: 22, ua: 6.5, na: 139, k: 4.3, hb: 13.8, plt: 24 } },
    ],
  },
};

// ========================================
// データ取得ヘルパー
// ========================================

function getDiseaseId(req) {
  return req.query.disease || req.headers["x-disease-id"] || "uc";
}

function getData(diseaseId) {
  const data = DEMO_DATA[diseaseId] || DEMO_DATA.uc;
  if (!data.clinics) data.clinics = [];
  if (!data.visits) data.visits = [];
  return data;
}

function generateSymptomLogs(diseaseId) {
  const logs = [];
  const today = new Date();
  const tmpl = getTemplate(diseaseId);
  const metrics = tmpl?.symptomConfig?.metrics || [];

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (Math.random() > 0.25) {
      const dateStr = d.toISOString().slice(0, 10);
      const log = { id: dateStr, date: dateStr };
      metrics.forEach((m) => {
        if (m.type === "counter") log[m.id] = Math.floor(Math.random() * (m.max > 10 ? 5 : m.max)) + (m.min || 0);
        else if (m.type === "scale") log[m.id] = Math.floor(Math.random() * (m.max - m.min + 1)) + m.min;
        else if (m.type === "toggle") log[m.id] = Math.random() < 0.12;
      });
      logs.push(log);
    }
  }
  return logs;
}

const symptomCache = {};
function getSymptomLogs(diseaseId) {
  if (!symptomCache[diseaseId]) symptomCache[diseaseId] = generateSymptomLogs(diseaseId);
  return symptomCache[diseaseId];
}

// ========================================
// API エンドポイント
// ========================================

// プロフィール
router.get("/api/profile", (req, res) => res.json(getData(getDiseaseId(req)).profile));
router.put("/api/profile", (req, res) => res.json({ ...getData(getDiseaseId(req)).profile, ...req.body }));

// タイムライン
router.get("/api/timeline", (req, res) => {
  const data = getData(getDiseaseId(req));
  res.json([...data.timeline].sort((a, b) => b.date.localeCompare(a.date)));
});
router.post("/api/timeline", (req, res) => {
  const data = getData(getDiseaseId(req));
  const ev = { id: "ev" + Date.now(), ...req.body, source: "manual" };
  data.timeline.push(ev);
  res.status(201).json(ev);
});
router.put("/api/timeline/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.timeline.findIndex((e) => e.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  Object.assign(data.timeline[idx], req.body);
  res.json(data.timeline[idx]);
});
router.delete("/api/timeline/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.timeline.findIndex((e) => e.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  data.timeline.splice(idx, 1);
  res.json({ deleted: true });
});

// 薬管理
router.get("/api/medications", (req, res) => {
  const data = getData(getDiseaseId(req));
  res.json([...data.medications].sort((a, b) => b.startDate.localeCompare(a.startDate)));
});
router.get("/api/medications/active", (req, res) => {
  const data = getData(getDiseaseId(req));
  res.json(data.medications.filter((m) => m.isActive));
});
router.post("/api/medications", (req, res) => {
  const data = getData(getDiseaseId(req));
  const med = { id: "m" + Date.now(), ...req.body, isActive: !req.body.endDate };
  data.medications.push(med);
  res.status(201).json(med);
});
router.put("/api/medications/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.medications.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  Object.assign(data.medications[idx], req.body);
  if (req.body.endDate !== undefined) data.medications[idx].isActive = !req.body.endDate;
  res.json(data.medications[idx]);
});
router.delete("/api/medications/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.medications.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  data.medications.splice(idx, 1);
  res.json({ deleted: true });
});

// 症状記録
router.get("/api/symptoms", (req, res) => {
  const diseaseId = getDiseaseId(req);
  const days = parseInt(req.query.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  const logs = getSymptomLogs(diseaseId).filter((l) => l.date >= sinceStr);
  res.json(logs.sort((a, b) => b.date.localeCompare(a.date)));
});
router.get("/api/symptoms/today", (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const log = getSymptomLogs(getDiseaseId(req)).find((l) => l.date === today);
  res.json(log || null);
});
router.post("/api/symptoms", (req, res) => {
  const diseaseId = getDiseaseId(req);
  const date = req.body.date || new Date().toISOString().slice(0, 10);
  const logs = getSymptomLogs(diseaseId);
  const existing = logs.findIndex((l) => l.date === date);
  const log = { id: date, ...req.body, date };
  if (existing >= 0) logs[existing] = log;
  else logs.push(log);
  res.status(201).json(log);
});
router.delete("/api/symptoms/:date", (req, res) => {
  const logs = getSymptomLogs(getDiseaseId(req));
  const idx = logs.findIndex((l) => l.date === req.params.date);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  logs.splice(idx, 1);
  res.json({ deleted: true });
});

// 検査値
router.get("/api/labs", (req, res) => {
  const data = getData(getDiseaseId(req));
  res.json(data.labResults || []);
});
router.post("/api/labs", (req, res) => {
  const data = getData(getDiseaseId(req));
  const entry = { id: "l" + Date.now(), ...req.body };
  if (!data.labResults) data.labResults = [];
  data.labResults.unshift(entry);
  res.status(201).json(entry);
});

// クリニックマスタ
router.get("/api/clinics", (req, res) => {
  const data = getData(getDiseaseId(req));
  res.json([...data.clinics].sort((a, b) => a.name.localeCompare(b.name, "ja")));
});
router.post("/api/clinics", (req, res) => {
  const data = getData(getDiseaseId(req));
  if (!req.body.name) return res.status(400).json({ error: "name is required" });
  if (!Array.isArray(req.body.departments) || req.body.departments.length === 0) {
    return res.status(400).json({ error: "departments must be a non-empty array" });
  }
  const clinic = {
    id: "c" + Date.now(),
    address: "",
    phone: "",
    isPrimary: false,
    note: "",
    ...req.body,
  };
  data.clinics.push(clinic);
  res.status(201).json(clinic);
});
router.put("/api/clinics/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.clinics.findIndex((c) => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  if (req.body.departments !== undefined) {
    if (!Array.isArray(req.body.departments) || req.body.departments.length === 0) {
      return res.status(400).json({ error: "departments must be a non-empty array" });
    }
  }
  Object.assign(data.clinics[idx], req.body);
  res.json(data.clinics[idx]);
});
router.delete("/api/clinics/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.clinics.findIndex((c) => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  data.clinics.splice(idx, 1);
  res.json({ deleted: true });
});

// 受診（visits）
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
router.get("/api/visits", (req, res) => {
  const data = getData(getDiseaseId(req));
  res.json([...data.visits].sort((a, b) => b.date.localeCompare(a.date)));
});
router.get("/api/visits/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const visit = data.visits.find((v) => v.id === req.params.id);
  if (!visit) return res.status(404).json({ error: "Not found" });
  res.json(visit);
});
router.post("/api/visits", (req, res) => {
  const data = getData(getDiseaseId(req));
  const { date, clinicId, department } = req.body;
  if (!date || !DATE_RE.test(date)) return res.status(400).json({ error: "date (YYYY-MM-DD) is required" });
  if (!clinicId) return res.status(400).json({ error: "clinicId is required" });
  if (!department) return res.status(400).json({ error: "department is required" });
  const visit = {
    id: "v" + Date.now(),
    doctor: "",
    chiefComplaint: "",
    findings: "",
    nextAction: "",
    photos: [],
    relatedMedicationIds: [],
    relatedLabResultIds: [],
    relatedTimelineEventId: null,
    ...req.body,
  };
  data.visits.push(visit);
  res.status(201).json(visit);
});
router.put("/api/visits/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.visits.findIndex((v) => v.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  if (req.body.date !== undefined && !DATE_RE.test(req.body.date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }
  Object.assign(data.visits[idx], req.body);
  res.json(data.visits[idx]);
});
router.delete("/api/visits/:id", (req, res) => {
  const data = getData(getDiseaseId(req));
  const idx = data.visits.findIndex((v) => v.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  data.visits.splice(idx, 1);
  res.json({ deleted: true });
});

// サマリー
router.get("/api/summary", (req, res) => {
  const diseaseId = getDiseaseId(req);
  const data = getData(diseaseId);
  const tmpl = getTemplate(diseaseId);
  const active = data.medications.filter((m) => m.isActive);
  const recent = [...data.timeline].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceStr = since.toISOString().slice(0, 10);
  const logs = getSymptomLogs(diseaseId).filter((l) => l.date >= sinceStr);

  let symptomSummary = null;
  if (logs.length > 0 && tmpl?.symptomConfig?.summaryMetrics) {
    symptomSummary = { recordedDays: logs.length, metrics: {} };
    tmpl.symptomConfig.summaryMetrics.forEach((sm) => {
      if (sm.aggregate === "avg") {
        const vals = logs.map((l) => l[sm.id]).filter((v) => v != null);
        symptomSummary.metrics[sm.id] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
      } else if (sm.aggregate === "countTrue") {
        symptomSummary.metrics[sm.id] = logs.filter((l) => l[sm.id]).length;
      }
    });
  }

  res.json({
    profile: data.profile,
    activeMedications: active,
    recentEvents: recent,
    symptomSummary,
    labResults: (data.labResults || []).slice(0, 3),
  });
});

// ヘルスチェック
router.get("/health", (_req, res) => res.json({ status: "ok", mode: "demo" }));

module.exports = router;
