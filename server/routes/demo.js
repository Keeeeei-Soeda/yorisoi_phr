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
    // 仮想ストーリー（大阪IBD会員想定）：
    // 大阪市内勤務・35歳前後の女性。2020年に都島区の総合医療センターでUCと確定診断（全大腸炎型）。
    // 翌年に再燃でステロイドパルス、その後寛解。2023年からリアルダ単独で寛解維持。
    // 2023年から大阪IBDの交流会に参加し、同世代の仲間ができた。
    // 2025年12月に通勤の都合で難波の専門クリニックに転院し、現在は月1回フォロー。
    // 末梢関節炎・口内炎などの腸管外症状もあり多科併診中。
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "潰瘍性大腸炎",
      diagnosisDate: "2020-06-15",
      diseaseId: "uc",
    },
    timeline: [
      { id: "ev1", date: "2020-06-15", category: "diagnosis", title: "潰瘍性大腸炎と診断", detail: "大阪市立総合医療センター 消化器内科にて確定診断。全大腸炎型。仕事中の血便がきっかけで受診。", source: "manual" },
      { id: "ev2", date: "2020-06-20", category: "medication_change", title: "ペンタサ処方開始", detail: "メサラジン 1日3回 経口（朝・昼・夕）", source: "manual" },
      { id: "ev3", date: "2020-09-10", category: "exam", title: "大腸内視鏡検査", detail: "下行結腸〜直腸に軽度炎症所見。生検でUC典型像確認。", source: "manual" },
      { id: "ev4", date: "2021-03-05", category: "hospitalization", title: "再燃により入院（10日間）", detail: "大阪市立総合医療センターに入院。ステロイドパルス療法（ソル・メドロール 1g×3日）。", source: "manual" },
      { id: "ev5", date: "2021-03-15", category: "medication_change", title: "プレドニン追加", detail: "プレドニゾロン30mg/日からスタート。月単位で漸減。", source: "manual" },
      { id: "ev6", date: "2021-08-01", category: "treatment_change", title: "ステロイド離脱成功", detail: "プレドニゾロン完全中止。ペンタサ単独維持に。", source: "manual" },
      { id: "ev7", date: "2022-04-20", category: "exam", title: "大腸内視鏡検査", detail: "粘膜治癒（Mayo内視鏡スコア0）確認。寛解維持。", source: "manual" },
      { id: "ev8", date: "2023-09-23", category: "other", title: "大阪IBDの交流会に初参加", detail: "発症から3年、ようやく同世代の患者さんと話せた。栄養剤や仕事の工夫を共有してもらえた。気持ちが軽くなった。", source: "manual" },
      { id: "ev9", date: "2023-11-10", category: "medication_change", title: "リアルダに変更", detail: "ペンタサ（1日3回）→リアルダ（1日1回）に切替。服薬負担が一気に減った。", source: "manual" },
      { id: "ev10", date: "2024-05-15", category: "exam", title: "定期内視鏡", detail: "粘膜治癒継続。寛解維持。便中カルプロテクチン 35μg/g。", source: "manual" },
      { id: "ev11", date: "2025-12-01", category: "other", title: "通勤の都合で転院", detail: "大阪市立総合医療センター → IBD専門クリニックなにわ。紹介状＋これまでの治療歴を持参。", source: "manual" },
      { id: "ev12", date: "2026-02-14", category: "self-log", title: "世界IBDデーの会報を読んだ", detail: "大阪IBDの会報「日本一分厚いIBD患者会会報」最新号。新しい治療薬の解説が分かりやすかった。", source: "manual" },
      { id: "ev13", date: "2026-03-22", category: "self-log", title: "繁忙期で疲れがたまった", detail: "残業続きで便回数が3〜4回/日に増えた。土日にしっかり休んだら戻った。睡眠大事。", source: "manual" },
      { id: "ev14", date: "2026-04-18", category: "self-log", title: "久しぶりに焼肉に行けた", detail: "脂多めを少しだけ。腹痛なし、便通も安定。寛解期の幸せ。", source: "manual" },
      { id: "ev15", date: "2026-05-09", category: "self-log", title: "大阪IBDの総会に出席", detail: "5/19の世界IBDデーに向けたPOOPキャラバンの打ち合わせを聞いた。会員さんとの再会も嬉しい。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "リアルダ", genericName: "メサラジン", category: "5-ASA", dosageForm: "経口", startDate: "2023-11-10", endDate: null, isActive: true, changeReason: "ペンタサからの簡素化（1日1回に）", sideNotes: "朝食後に4錠まとめて服用" },
      { id: "m2", name: "ビオスリー", genericName: "酪酸菌・糖化菌・乳酸菌", category: "other", dosageForm: "経口", startDate: "2020-06-20", endDate: null, isActive: true, changeReason: "腸内環境の改善", sideNotes: "毎食後" },
      { id: "m3", name: "ペンタサ", genericName: "メサラジン", category: "5-ASA", dosageForm: "経口", startDate: "2020-06-20", endDate: "2023-11-10", isActive: false, changeReason: "初回処方", sideNotes: "1日3回 食後" },
      { id: "m4", name: "プレドニン", genericName: "プレドニゾロン", category: "steroid", dosageForm: "経口", startDate: "2021-03-05", endDate: "2021-08-01", isActive: false, changeReason: "再燃時のステロイドパルス後の漸減", sideNotes: "30mg→20mg→10mg→5mg→中止" },
    ],
    labResults: [
      { id: "l1", date: "2026-04-20", values: { crp: 0.10, hb: 14.1, wbc: 5800, alb: 4.2, esr: 8, plt: 22, fcal: 32 } },
      { id: "l2", date: "2026-01-15", values: { crp: 0.12, hb: 14.0, wbc: 5900, alb: 4.1, esr: 9, plt: 23, fcal: 38 } },
      { id: "l3", date: "2025-12-01", values: { crp: 0.15, hb: 13.8, wbc: 6200, alb: 4.0, esr: 11, plt: 24, fcal: 42 } },
      { id: "l4", date: "2025-09-05", values: { crp: 0.18, hb: 13.6, wbc: 6500, alb: 4.0, esr: 13, plt: 25, fcal: 58 } },
      { id: "l5", date: "2025-06-01", values: { crp: 0.45, hb: 12.9, wbc: 7100, alb: 3.8, esr: 22, plt: 28, fcal: 145, lrg: 14 } },
      { id: "l6", date: "2025-03-01", values: { crp: 0.22, hb: 13.5, wbc: 6000, alb: 4.0, esr: 14, plt: 23, fcal: 65 } },
    ],
    clinics: [
      { id: "c1", name: "IBD専門クリニックなにわ", address: "大阪市中央区難波", phone: "06-1234-5678", departments: ["消化器内科"], isPrimary: true, note: "通勤途中の難波で月1回フォロー。寛解期は3ヶ月毎。" },
      { id: "c2", name: "大阪市立総合医療センター 消化器内科", address: "大阪市都島区都島本通", phone: "06-6929-1221", departments: ["消化器内科", "大腸肛門外科"], isPrimary: false, note: "確定診断・入院・大腸内視鏡の拠点。年1回の精査で受診。" },
      { id: "c3", name: "なかのしまリウマチ内科クリニック", address: "大阪市北区中之島", phone: "", departments: ["リウマチ科"], isPrimary: false, note: "末梢関節炎の合併確認・フォロー。半年に1回。" },
      { id: "c4", name: "うめだ皮ふ科クリニック", address: "大阪市北区梅田", phone: "", departments: ["皮膚科"], isPrimary: false, note: "口内炎・皮疹の相談（UCの腸管外症状）。" },
    ],
    visits: [
      { id: "v1", date: "2026-04-20", clinicId: "c1", department: "消化器内科", doctor: "難波 徹", chiefComplaint: "便通安定、血便なし。仕事のストレスで便回数が一時増えた話を相談。", findings: "CRP 0.10、Alb 4.2、便中カルプロテクチン 32 と良好。寛解維持。pMayo 0点。", nextAction: "リアルダ継続（1日1回 4錠 朝食後）。次回3ヶ月後。再燃時は早めに連絡。", photos: [], relatedMedicationIds: ["m1"], relatedLabResultIds: ["l1"], relatedTimelineEventId: null },
      { id: "v2", date: "2026-01-15", clinicId: "c1", department: "消化器内科", doctor: "難波 徹", chiefComplaint: "年末年始の食生活が乱れた後の体調確認", findings: "便回数 1〜2回/日、血便なし。CRP 0.12 と寛解維持。", nextAction: "リアルダ継続。次回3ヶ月後。", photos: [], relatedMedicationIds: ["m1"], relatedLabResultIds: ["l2"], relatedTimelineEventId: null },
      { id: "v3", date: "2025-12-01", clinicId: "c1", department: "消化器内科", doctor: "難波 徹", chiefComplaint: "転院後の初回受診。これまでの治療歴と現在の薬を共有。", findings: "紹介状確認。リアルダ単独で寛解維持中。CRP 0.15。", nextAction: "現薬継続。月1回フォロー開始。次回1月。", photos: [], relatedMedicationIds: ["m1"], relatedLabResultIds: ["l3"], relatedTimelineEventId: "ev11" },
      { id: "v4", date: "2025-10-15", clinicId: "c2", department: "消化器内科", doctor: "都島 麻衣", chiefComplaint: "転院前の最終フォロー。今後は近所でフォロー希望と相談。", findings: "粘膜治癒継続。便中カルプロテクチン 58 と良好。紹介状を作成。", nextAction: "なにわクリニックへ紹介。年1回の精査時のみ当院も受診で。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2025-08-10", clinicId: "c3", department: "リウマチ科", doctor: "中之島 健", chiefComplaint: "左膝の痛みが2週間続く。階段の上り下りでつらい。", findings: "末梢関節炎の合併。左膝に軽度滑膜炎。リウマトイド因子・抗CCP抗体ともに陰性。UC関連の関節症と判断。", nextAction: "ロキソニン頓用。膝のサポーター指導。次回2ヶ月後にフォロー。消化器内科にも共有。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v6", date: "2025-11-20", clinicId: "c4", department: "皮膚科", doctor: "梅田 桜子", chiefComplaint: "口内炎が月1〜2回繰り返す。今回は3つ同時に出た。", findings: "アフタ性口内炎（UC関連の腸管外症状の可能性）。皮膚は問題なし。", nextAction: "ケナログ軟膏処方。再燃のサインかもしれないので消化器内科へ報告を勧奨。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
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
    clinics: [
      { id: "c1", name: "○○大学病院 神経内科", address: "千葉県千葉市", phone: "043-222-7171", departments: ["脳神経内科"], isPrimary: true, note: "確定診断・薬剤調整のメイン。3ヶ月毎。" },
      { id: "c2", name: "リハビリセンターひかり", address: "千葉県千葉市", phone: "", departments: ["リハビリテーション科"], isPrimary: false, note: "PT/OT/ST 週2回。" },
      { id: "c3", name: "桜泌尿器科クリニック", address: "千葉県千葉市", phone: "", departments: ["泌尿器科"], isPrimary: false, note: "排尿障害（自律神経症状）のフォロー。" },
      { id: "c4", name: "ハート心療内科", address: "千葉県千葉市", phone: "", departments: ["心療内科"], isPrimary: false, note: "うつ症状・睡眠障害の相談。" },
    ],
    visits: [
      { id: "v1", date: "2026-02-01", clinicId: "c1", department: "脳神経内科", doctor: "中村 大輔", chiefComplaint: "ウェアリングオフが少し短い", findings: "オフ時間 1日2時間程度。L-DOPA併用のエクフィナで効果良好。H&Y Stage 2維持。", nextAction: "現薬継続。3ヶ月後フォロー。リハ継続。", photos: [], relatedMedicationIds: ["m1", "m2"], relatedLabResultIds: ["l1"], relatedTimelineEventId: null },
      { id: "v2", date: "2025-08-01", clinicId: "c1", department: "脳神経内科", doctor: "中村 大輔", chiefComplaint: "歩行時のすくみ少し増加", findings: "オン時のADLは保たれる。バランス訓練継続を推奨。", nextAction: "リハに歩行訓練追加。次回6ヶ月後。", photos: [], relatedMedicationIds: ["m1"], relatedLabResultIds: ["l2"], relatedTimelineEventId: null },
      { id: "v3", date: "2025-01-10", clinicId: "c2", department: "リハビリテーション科", doctor: "光 美香", chiefComplaint: "リハビリ初回", findings: "歩行速度・バランス評価。Berg Balance Scale 48/56。", nextAction: "週2回のPT・OT。バランス訓練・歩行訓練中心。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: "ev7" },
      { id: "v4", date: "2025-11-15", clinicId: "c3", department: "泌尿器科", doctor: "桜井 修", chiefComplaint: "夜間頻尿、尿の出しづらさ", findings: "神経因性膀胱。残尿量50mL程度。", nextAction: "ベタニス処方。3ヶ月後フォロー。水分摂取の指導。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2025-10-05", clinicId: "c4", department: "心療内科", doctor: "ハート 慶子", chiefComplaint: "気分が落ち込む、寝つき悪い", findings: "PD関連うつの可能性。HAM-D 10点。", nextAction: "ミルタザピン少量で開始。睡眠衛生指導。1ヶ月後フォロー。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
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
    clinics: [
      { id: "c1", name: "○○大学病院 膠原病・リウマチ内科", address: "東京都新宿区", phone: "03-3353-1211", departments: ["膠原病内科"], isPrimary: true, note: "SLEメイン主治医。3ヶ月毎に補体・抗dsDNA確認。" },
      { id: "c2", name: "○○大学病院 腎臓内科", address: "東京都新宿区", phone: "03-3353-1211", departments: ["腎臓内科"], isPrimary: false, note: "ループス腎炎フォロー。半年に1回。" },
      { id: "c3", name: "みなみ皮膚科", address: "東京都新宿区", phone: "", departments: ["皮膚科"], isPrimary: false, note: "蝶形紅斑・脱毛・日光過敏のフォロー。" },
      { id: "c4", name: "中野眼科クリニック", address: "東京都中野区", phone: "", departments: ["眼科"], isPrimary: false, note: "プラケニル網膜症スクリーニング 年1回。" },
    ],
    visits: [
      { id: "v1", date: "2026-03-01", clinicId: "c1", department: "膠原病内科", doctor: "新宿 健", chiefComplaint: "倦怠感は安定", findings: "抗dsDNA 12 IU/mL、補体正常。SLEDAI 0点。寛解維持。", nextAction: "PSL 5mg・MMF 2g・HCQ 200mg 継続。次回3ヶ月後。", photos: [], relatedMedicationIds: [], relatedLabResultIds: ["l1"], relatedTimelineEventId: "ev7" },
      { id: "v2", date: "2025-12-01", clinicId: "c1", department: "膠原病内科", doctor: "新宿 健", chiefComplaint: "風邪気味だった", findings: "感染契機の再燃なし。補体・抗dsDNA軽度動くが範囲内。", nextAction: "現薬継続。感染対策を継続。", photos: [], relatedMedicationIds: [], relatedLabResultIds: ["l2"], relatedTimelineEventId: null },
      { id: "v3", date: "2025-10-15", clinicId: "c2", department: "腎臓内科", doctor: "腎沼 太郎", chiefComplaint: "腎機能のフォロー", findings: "尿蛋白 0.10 g/gCr、eGFR 85。腎炎寛解維持。", nextAction: "半年後に再評価。MMF継続。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v4", date: "2025-11-20", clinicId: "c3", department: "皮膚科", doctor: "南 桜子", chiefComplaint: "頬の赤みが少し強い", findings: "軽度蝶形紅斑。日光暴露の影響。", nextAction: "ステロイド外用（弱め）短期。日焼け止め徹底。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2026-01-15", clinicId: "c4", department: "眼科", doctor: "中野 修", chiefComplaint: "プラケニル網膜症のスクリーニング", findings: "OCT・視野・眼底とも異常なし。", nextAction: "次回1年後。HCQ継続でOK。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
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
    clinics: [
      { id: "c1", name: "東京糖尿病センター", address: "東京都千代田区", phone: "03-1111-2222", departments: ["内分泌・代謝科"], isPrimary: true, note: "1型糖尿病のメイン主治医。3ヶ月毎にHbA1c・CGMレポート確認。" },
      { id: "c2", name: "○○眼科クリニック", address: "東京都千代田区", phone: "", departments: ["眼科"], isPrimary: false, note: "糖尿病網膜症スクリーニング年1回。" },
      { id: "c3", name: "千代田腎臓内科", address: "東京都千代田区", phone: "", departments: ["腎臓内科"], isPrimary: false, note: "微量アルブミン尿フォロー。" },
      { id: "c4", name: "ハッピー産婦人科", address: "東京都千代田区", phone: "", departments: ["産婦人科"], isPrimary: false, note: "周期に合わせた血糖管理相談。" },
    ],
    visits: [
      { id: "v1", date: "2026-03-01", clinicId: "c1", department: "内分泌・代謝科", doctor: "東京 太郎", chiefComplaint: "ポンプ療法のフォロー", findings: "HbA1c 6.8%、TIR 78%、TBR 1.2%。AID良好。", nextAction: "現設定継続。次回3ヶ月後。低血糖頻度に注意。", photos: [], relatedMedicationIds: ["m1"], relatedLabResultIds: ["l1"], relatedTimelineEventId: null },
      { id: "v2", date: "2025-09-01", clinicId: "c1", department: "内分泌・代謝科", doctor: "東京 太郎", chiefComplaint: "深夜の高血糖が気になる", findings: "HbA1c 7.1%。基礎レート 02:00-04:00 を上方修正。", nextAction: "1ヶ月後にCGMで再評価。", photos: [], relatedMedicationIds: [], relatedLabResultIds: ["l2"], relatedTimelineEventId: null },
      { id: "v3", date: "2025-04-10", clinicId: "c2", department: "眼科", doctor: "佐々木 麗", chiefComplaint: "年1回の眼底検査", findings: "網膜症なし。両眼異常なし。", nextAction: "次回1年後。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: "ev6" },
      { id: "v4", date: "2025-10-20", clinicId: "c3", department: "腎臓内科", doctor: "千代田 翔", chiefComplaint: "腎機能フォロー", findings: "eGFR 95、微量アルブミン尿なし。", nextAction: "次回1年後。SGLT2阻害薬の検討は将来的に。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2025-11-30", clinicId: "c4", department: "産婦人科", doctor: "幸田 ハッピー", chiefComplaint: "妊娠の相談", findings: "プレコンセプションケア。HbA1c目標6.5%未満で妊娠許可。", nextAction: "葉酸補充開始。3ヶ月後フォロー。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
    ],
  },

  crohn: {
    // 仮想ストーリー（大阪IBD会員想定）：
    // 吹田市在住・28歳男性。大学2年生（19歳）の春にクローン病（小腸大腸型）と診断され9年。
    // 大阪医科薬科大学IBDセンター（高槻市）で確定診断、ペンタサ＋成分栄養剤エレンタールから開始。
    // 翌年再燃でヒュミラ導入、5年後に効果減弱でステラーラに変更（現在2剤目）。
    // 軽度の痔瘻と肛門皮垂があり大腸肛門外科でもフォロー。
    // 診断翌年（2018年）に大阪IBDの交流会に参加して人生観が変わった。今も会員継続中。
    // 仕事は大阪市内のIT企業勤務、エレンタールを職場に常備して就寝前服用。
    profile: { displayName: "デモユーザー", diagnosisName: "クローン病", diagnosisDate: "2017-05-12", diseaseId: "crohn" },
    timeline: [
      { id: "ev1", date: "2017-05-12", category: "diagnosis", title: "クローン病と診断", detail: "大阪医科薬科大学病院 IBDセンター（高槻市）。小腸大腸型。大学2年の春、体重5kg減と腹痛・下痢で受診。", source: "manual" },
      { id: "ev2", date: "2017-05-20", category: "medication_change", title: "ペンタサ + エレンタール開始", detail: "メサラジン1日4g + 成分栄養剤エレンタール 就寝前1包から開始。", source: "manual" },
      { id: "ev3", date: "2018-04-15", category: "other", title: "大阪IBD交流会に初参加", detail: "診断から1年、思い切って参加。同じ20代のクローン病患者さんと話せて気持ちが軽くなった。エレンタールの飲み方の工夫を教えてもらう。以降、会員として継続。", source: "manual" },
      { id: "ev4", date: "2018-11-05", category: "flare", title: "再燃", detail: "大学のテスト期間中に腹痛・下痢が増悪。CRP 4.2、Alb 3.2。", source: "manual" },
      { id: "ev5", date: "2018-11-10", category: "medication_change", title: "ヒュミラ導入", detail: "生物学的製剤（アダリムマブ）開始。導入時は週1回、その後2週ごと自己注射。", source: "manual" },
      { id: "ev6", date: "2019-08-20", category: "surgery", title: "肛門周囲膿瘍切開排膿", detail: "肛門周囲の腫れと痛みで救急受診。シートン法でドレナージ。CDの肛門病変として治療。", source: "manual" },
      { id: "ev7", date: "2020-06-15", category: "exam", title: "大腸内視鏡", detail: "粘膜治癒確認（SES-CD改善）。寛解維持。就職活動も無事終えられた。", source: "manual" },
      { id: "ev8", date: "2022-10-10", category: "flare", title: "二次無効の兆候", detail: "ヒュミラの効果が薄れる感じ。便回数増、CRP 1.8。抗薬物抗体も陽性化。", source: "manual" },
      { id: "ev9", date: "2023-03-01", category: "medication_change", title: "ステラーラに変更", detail: "ヒュミラ→ステラーラ（ウステキヌマブ）に切替。8週ごと自己注射。", source: "manual" },
      { id: "ev10", date: "2024-11-08", category: "exam", title: "MRE検査", detail: "小腸の活動性炎症なし。狭窄もなし。寛解維持確認。", source: "manual" },
      { id: "ev11", date: "2025-10-01", category: "exam", title: "定期MRE検査", detail: "活動性炎症なし。寛解維持。狭窄なし。", source: "manual" },
      { id: "ev12", date: "2026-02-10", category: "self-log", title: "エレンタール新フレーバー試した", detail: "バニラ強め。マンゴーよりは飲みやすかった。会報で紹介されてた飲み方も試す予定。", source: "manual" },
      { id: "ev13", date: "2026-03-05", category: "self-log", title: "会社に病気の話を改めて", detail: "健康診断のタイミングで上司に相談。以前から伝えていたが、改めて理解してもらえた。在宅勤務の調整もしやすくなった。", source: "manual" },
      { id: "ev14", date: "2026-04-12", category: "self-log", title: "肛門周囲の違和感", detail: "夜お風呂で温めたら楽に。シャワー＋座浴を続ける。痔瘻の再発が怖いので来週受診。", source: "manual" },
      { id: "ev15", date: "2026-05-10", category: "self-log", title: "大阪IBD総会に出席", detail: "5/19のWorld IBD Dayイベント（POOPキャラバン）の準備の話を聞いた。久しぶりに会えた人もいて元気をもらえた。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "ステラーラ", genericName: "ウステキヌマブ", category: "biologic", dosageForm: "皮下注射", startDate: "2023-03-01", endDate: null, isActive: true, changeReason: "ヒュミラ二次無効", sideNotes: "8週ごと自己注射（次回 2026-06-上旬）" },
      { id: "m2", name: "ペンタサ", genericName: "メサラジン", category: "5-ASA", dosageForm: "経口", startDate: "2017-05-20", endDate: null, isActive: true, changeReason: "初回処方", sideNotes: "1日4g 朝・夕" },
      { id: "m3", name: "エレンタール", genericName: "成分栄養剤", category: "nutritional", dosageForm: "経口", startDate: "2017-05-20", endDate: null, isActive: true, changeReason: "栄養療法（在宅経腸栄養）", sideNotes: "就寝前1包（300kcal）。フレーバーで工夫" },
      { id: "m4", name: "ヒュミラ", genericName: "アダリムマブ", category: "biologic", dosageForm: "皮下注射", startDate: "2018-11-10", endDate: "2023-03-01", isActive: false, changeReason: "二次無効・抗薬物抗体陽性化", sideNotes: "2週ごと自己注射（5年継続）" },
    ],
    labResults: [
      { id: "l1", date: "2026-04-15", values: { crp: 0.12, hb: 13.6, wbc: 6100, alb: 4.1, esr: 8, plt: 25, ferritin: 88, ca: 9.2, fcal: 45, vitB12: 380, vitD: 28, zn: 78 } },
      { id: "l2", date: "2026-01-20", values: { crp: 0.15, hb: 13.5, wbc: 6200, alb: 4.0, esr: 9, plt: 25, ferritin: 85, ca: 9.2, fcal: 52, vitB12: 360, vitD: 25, zn: 75 } },
      { id: "l3", date: "2025-10-15", values: { crp: 0.18, hb: 13.4, wbc: 6300, alb: 4.0, esr: 10, plt: 26, ferritin: 80, ca: 9.1, fcal: 65, vitB12: 350, vitD: 22, zn: 72 } },
      { id: "l4", date: "2025-07-01", values: { crp: 0.22, hb: 13.2, wbc: 6500, alb: 3.9, esr: 12, plt: 27, ferritin: 72, ca: 9.1, fcal: 75, vitB12: 320, vitD: 20, zn: 68 } },
      { id: "l5", date: "2025-04-01", values: { crp: 0.25, hb: 13.1, wbc: 6400, alb: 3.9, esr: 13, plt: 26, ferritin: 70, ca: 9.0, fcal: 82, vitB12: 310, vitD: 18, zn: 65 } },
    ],
    clinics: [
      { id: "c1", name: "大阪医科薬科大学病院 IBDセンター", address: "大阪府高槻市大学町", phone: "072-683-1221", departments: ["消化器内科"], isPrimary: true, note: "確定診断時から9年お世話になっているメイン主治医。3ヶ月毎フォロー、ステラーラの自己注指導もここ。" },
      { id: "c2", name: "せんり大腸肛門クリニック", address: "大阪府吹田市千里山", phone: "06-6831-1111", departments: ["大腸肛門外科"], isPrimary: false, note: "肛門病変（皮垂・痔瘻フォロー）。半年〜1年に1回。" },
      { id: "c3", name: "なかもず皮ふ科", address: "堺市北区中百舌鳥町", phone: "", departments: ["皮膚科"], isPrimary: false, note: "結節性紅斑・口内炎などCD関連腸管外症状の相談。" },
      { id: "c4", name: "うえまち栄養指導クリニック", address: "大阪市中央区上町", phone: "", departments: ["栄養指導"], isPrimary: false, note: "エレンタール継続支援・食事相談。半年に1回。" },
    ],
    visits: [
      { id: "v1", date: "2026-04-15", clinicId: "c1", department: "消化器内科", doctor: "高槻 大樹", chiefComplaint: "腹痛なし、便回数 1〜2回/日で安定。肛門違和感を最近感じる旨を相談。", findings: "CRP 0.12、Alb 4.1、便中カルプロテクチン 45 と良好。寛解維持。HBI 2点。肛門病変は大腸肛門外科でフォロー継続を推奨。", nextAction: "ステラーラ継続（次回 6月上旬）。エレンタール就寝前1包継続。VitD補充再開。次回3ヶ月後。", photos: [], relatedMedicationIds: ["m1", "m3"], relatedLabResultIds: ["l1"], relatedTimelineEventId: null },
      { id: "v2", date: "2026-01-20", clinicId: "c1", department: "消化器内科", doctor: "高槻 大樹", chiefComplaint: "風邪を引いた後の体調確認。発熱時の対応も相談。", findings: "感染除外確認済み。CRP 0.15。再燃の兆候なし。生物学的製剤使用中の感染対応を再確認。", nextAction: "現薬継続。38度以上の発熱時は連絡を。次回3ヶ月後。", photos: [], relatedMedicationIds: [], relatedLabResultIds: ["l2"], relatedTimelineEventId: null },
      { id: "v3", date: "2025-10-15", clinicId: "c1", department: "消化器内科", doctor: "高槻 大樹", chiefComplaint: "MRE検査の結果説明", findings: "MREで小腸の活動性炎症なし、狭窄なし。寛解維持確認。", nextAction: "ステラーラ8週ごと継続。次回3ヶ月後にCRP・カルプロテクチン再評価。", photos: [], relatedMedicationIds: ["m1"], relatedLabResultIds: ["l3"], relatedTimelineEventId: "ev11" },
      { id: "v4", date: "2025-08-20", clinicId: "c2", department: "大腸肛門外科", doctor: "千里 拓也", chiefComplaint: "肛門周囲の皮垂と時々の違和感の確認", findings: "皮垂のみ。瘻孔の再発なし。坐浴とシャワーケアの継続を指導。", nextAction: "セルフケア継続。違和感増悪時は早めに再診。次回1年後で良い。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2025-12-08", clinicId: "c3", department: "皮膚科", doctor: "百舌鳥 玲子", chiefComplaint: "下腿に赤いしこり（再発）", findings: "結節性紅斑（再発）。CD関連の腸管外症状として典型的。", nextAction: "ステロイド外用＋NSAIDs短期。消化器内科に共有。1ヶ月後フォロー。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v6", date: "2025-11-18", clinicId: "c4", department: "栄養指導", doctor: "上町 まり子", chiefComplaint: "エレンタールの継続のコツ。職場で続ける工夫を相談。", findings: "1日1包（300kcal）就寝前で継続。フレーバーローテーション提案、コーヒー風味の追加紹介。", nextAction: "次回6ヶ月後。生活変化時は都度相談OK。", photos: [], relatedMedicationIds: ["m3"], relatedLabResultIds: [], relatedTimelineEventId: null },
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
    clinics: [
      { id: "c1", name: "○○リウマチクリニック", address: "神奈川県横浜市", phone: "045-111-2222", departments: ["リウマチ科"], isPrimary: true, note: "RAメイン主治医。MTX・エンブレル管理。月1回。" },
      { id: "c2", name: "横浜整形外科病院", address: "神奈川県横浜市", phone: "045-333-4444", departments: ["整形外科"], isPrimary: false, note: "関節破壊フォロー・手指機能評価。" },
      { id: "c3", name: "みなと眼科", address: "神奈川県横浜市", phone: "", departments: ["眼科"], isPrimary: false, note: "強膜炎・ドライアイのフォロー。" },
      { id: "c4", name: "横浜歯科口腔外科", address: "神奈川県横浜市", phone: "", departments: ["歯科"], isPrimary: false, note: "MTX・bDMARD服用中の歯科治療相談。" },
    ],
    visits: [
      { id: "v1", date: "2026-03-15", clinicId: "c1", department: "リウマチ科", doctor: "横浜 玲子", chiefComplaint: "朝のこわばり10分程度", findings: "DAS28-CRP 1.8。寛解維持。CRP 0.08。", nextAction: "MTX 8mg/週、エンブレル週1継続。次回1ヶ月後。", photos: [], relatedMedicationIds: ["m1", "m2"], relatedLabResultIds: ["l1"], relatedTimelineEventId: null },
      { id: "v2", date: "2025-12-10", clinicId: "c1", department: "リウマチ科", doctor: "横浜 玲子", chiefComplaint: "問題なく経過", findings: "DAS28-CRP 1.9。LDA維持。MMP-3軽度上昇。", nextAction: "MTX減量検討は次回。エンブレル継続。", photos: [], relatedMedicationIds: ["m1", "m2"], relatedLabResultIds: ["l2"], relatedTimelineEventId: "ev6" },
      { id: "v3", date: "2025-09-05", clinicId: "c1", department: "リウマチ科", doctor: "横浜 玲子", chiefComplaint: "右手指朝のこわばり少し", findings: "右第3MCP 軽度腫脹。エコーで滑膜炎軽度。", nextAction: "現薬継続。3ヶ月後再評価。", photos: [], relatedMedicationIds: [], relatedLabResultIds: ["l3"], relatedTimelineEventId: null },
      { id: "v4", date: "2025-10-25", clinicId: "c2", department: "整形外科", doctor: "整形 信", chiefComplaint: "右手親指の付け根の痛み", findings: "CM関節症の合併。手指機能は良好。", nextAction: "テーピング・装具指導。痛み時はカロナール。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2025-11-08", clinicId: "c3", department: "眼科", doctor: "港 明子", chiefComplaint: "目の乾きが強い", findings: "シェーグレン合併考慮。BUT 5秒、SchirmerI 5mm。", nextAction: "ヒアレイン点眼1日4回。3ヶ月後フォロー。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
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
    clinics: [
      { id: "c1", name: "○○MSセンター 脳神経内科", address: "京都府京都市", phone: "075-111-2222", departments: ["脳神経内科"], isPrimary: true, note: "MS拠点病院。3ヶ月毎にDMTフォロー。" },
      { id: "c2", name: "京都眼科クリニック", address: "京都府京都市", phone: "", departments: ["眼科"], isPrimary: false, note: "視神経炎再発時の評価。" },
      { id: "c3", name: "嵐山泌尿器科", address: "京都府京都市", phone: "", departments: ["泌尿器科"], isPrimary: false, note: "排尿障害（神経因性膀胱）のフォロー。" },
      { id: "c4", name: "東山リハセンター", address: "京都府京都市", phone: "", departments: ["リハビリテーション科"], isPrimary: false, note: "歩行・バランス訓練 月2回。" },
    ],
    visits: [
      { id: "v1", date: "2026-03-01", clinicId: "c1", department: "脳神経内科", doctor: "京都 桜", chiefComplaint: "新規症状なし", findings: "EDSS 2.0維持。MRI新規病変なし。リンパ球 1450/μL。", nextAction: "テクフィデラ継続。次回3ヶ月後にMRI予定。", photos: [], relatedMedicationIds: ["m1"], relatedLabResultIds: ["l1"], relatedTimelineEventId: null },
      { id: "v2", date: "2025-09-01", clinicId: "c1", department: "脳神経内科", doctor: "京都 桜", chiefComplaint: "再発徴候なし", findings: "JCV抗体陰性。リンパ球 1500。テクフィデラ忍容性良好。", nextAction: "現薬継続。VitD補充も継続。", photos: [], relatedMedicationIds: [], relatedLabResultIds: ["l2"], relatedTimelineEventId: "ev7" },
      { id: "v3", date: "2025-06-10", clinicId: "c2", department: "眼科", doctor: "宇治 美咲", chiefComplaint: "視野定期検査", findings: "OCT・視野とも左視神経委縮所見残るが進行なし。", nextAction: "1年後フォロー。違和感あれば即受診。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v4", date: "2025-11-15", clinicId: "c3", department: "泌尿器科", doctor: "嵐山 仁", chiefComplaint: "頻尿が気になる", findings: "残尿少量。神経因性膀胱の傾向。", nextAction: "ベタニス開始。3ヶ月後フォロー。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2025-12-20", clinicId: "c4", department: "リハビリテーション科", doctor: "東山 リカ", chiefComplaint: "リハ評価", findings: "10m歩行・TUGとも改善傾向。バランスやや低下。", nextAction: "週1回PT継続。バランス訓練追加。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
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
    clinics: [
      { id: "c1", name: "○○大学病院 脳神経内科 MGクリニック", address: "愛知県名古屋市", phone: "052-111-2222", departments: ["脳神経内科"], isPrimary: true, note: "MG拠点。ソリリス点滴2週ごと管理。" },
      { id: "c2", name: "名古屋胸部外科", address: "愛知県名古屋市", phone: "", departments: ["胸部外科"], isPrimary: false, note: "胸腺摘出術後フォロー（年1回CT）。" },
      { id: "c3", name: "金山眼科", address: "愛知県名古屋市", phone: "", departments: ["眼科"], isPrimary: false, note: "眼瞼下垂・複視のフォロー。" },
      { id: "c4", name: "大須呼吸器内科", address: "愛知県名古屋市", phone: "", departments: ["呼吸器内科"], isPrimary: false, note: "クリーゼ後の呼吸機能フォロー。" },
    ],
    visits: [
      { id: "v1", date: "2026-02-20", clinicId: "c1", department: "脳神経内科", doctor: "名古屋 哲", chiefComplaint: "症状安定", findings: "MG-ADL 2点。ソリリス効果良好。AChR抗体 8.5 IU/mL。", nextAction: "ソリリス継続。次回点滴2週後。", photos: [], relatedMedicationIds: ["m3"], relatedLabResultIds: ["l1"], relatedTimelineEventId: null },
      { id: "v2", date: "2025-08-20", clinicId: "c1", department: "脳神経内科", doctor: "名古屋 哲", chiefComplaint: "夕方の疲労感", findings: "全身型維持期。プレドニン5mg継続。複視なし。", nextAction: "現治療継続。髄膜炎菌ワクチン更新を予定。", photos: [], relatedMedicationIds: ["m2"], relatedLabResultIds: ["l2"], relatedTimelineEventId: null },
      { id: "v3", date: "2025-10-10", clinicId: "c2", department: "胸部外科", doctor: "中区 翼", chiefComplaint: "胸腺摘出術後のフォロー", findings: "CT異常なし。再発兆候なし。", nextAction: "次回1年後。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: "ev3" },
      { id: "v4", date: "2025-11-12", clinicId: "c3", department: "眼科", doctor: "金山 美咲", chiefComplaint: "夕方の眼瞼下垂", findings: "軽度の眼瞼下垂残るが固定。", nextAction: "経過観察。症状増悪時は再診。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2025-12-01", clinicId: "c4", department: "呼吸器内科", doctor: "大須 樹", chiefComplaint: "呼吸機能評価", findings: "VC・FEV1ともに正常範囲。クリーゼ後の機能温存良好。", nextAction: "次回1年後。風邪・感染時は早めに受診。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
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
    clinics: [
      { id: "c1", name: "○○大学病院 ライソゾーム病センター", address: "東京都文京区", phone: "03-3815-5411", departments: ["小児科", "内科"], isPrimary: true, note: "ファブリー病拠点。隔週ERT。遺伝相談も。" },
      { id: "c2", name: "本郷腎臓内科", address: "東京都文京区", phone: "", departments: ["腎臓内科"], isPrimary: false, note: "腎機能フォロー（蛋白尿・eGFR）。" },
      { id: "c3", name: "御茶ノ水循環器クリニック", address: "東京都千代田区", phone: "", departments: ["循環器内科"], isPrimary: false, note: "心エコー・心肥大フォロー。" },
      { id: "c4", name: "湯島ペインクリニック", address: "東京都文京区", phone: "", departments: ["麻酔科"], isPrimary: false, note: "四肢疼痛発作時の対応。" },
    ],
    visits: [
      { id: "v1", date: "2026-02-15", clinicId: "c1", department: "内科", doctor: "本郷 清", chiefComplaint: "ERT継続中", findings: "Lyso-Gb3 4.5、α-Gal 2.1。安定。IRRなし。", nextAction: "ファブラザイム隔週点滴継続。次回ERT 2週後。", photos: [], relatedMedicationIds: ["m1"], relatedLabResultIds: ["l1"], relatedTimelineEventId: null },
      { id: "v2", date: "2025-08-15", clinicId: "c1", department: "内科", doctor: "本郷 清", chiefComplaint: "疼痛発作 月1〜2回", findings: "発作はテグレトールで概ねコントロール。Lyso-Gb3 4.8。", nextAction: "現薬継続。発作増えたら相談。", photos: [], relatedMedicationIds: ["m2"], relatedLabResultIds: ["l2"], relatedTimelineEventId: null },
      { id: "v3", date: "2023-05-15", clinicId: "c2", department: "腎臓内科", doctor: "本郷 翔", chiefComplaint: "腎生検フォロー", findings: "GL-3軽度蓄積。eGFR安定。尿蛋白 0.18 g/gCr。", nextAction: "ARB継続。半年後再評価。", photos: [], relatedMedicationIds: ["m3"], relatedLabResultIds: [], relatedTimelineEventId: "ev6" },
      { id: "v4", date: "2025-11-22", clinicId: "c3", department: "循環器内科", doctor: "御茶 律", chiefComplaint: "動悸が時々", findings: "心エコー LVEF 62%、左室肥大なし。BNP 28。", nextAction: "次回1年後。動悸増えたら24時間心電図検討。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2025-09-30", clinicId: "c4", department: "麻酔科", doctor: "湯島 涼", chiefComplaint: "夏場の疼痛発作対策", findings: "発作時の対処法を再確認。発汗低下に注意。", nextAction: "テグレトール頓用追加可。半年後フォロー。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
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

  oi: {
    profile: {
      displayName: "デモユーザー",
      diagnosisName: "骨形成不全症",
      diagnosisDate: "1992-04-10",
      diseaseId: "oi",
    },
    timeline: [
      { id: "ev1", date: "1992-04-10", category: "diagnosis", title: "骨形成不全症と診断", detail: "出生後の長管骨複数骨折と青色強膜から OI を疑い、当時の臨床所見でⅣ型と診断。", source: "manual" },
      { id: "ev2", date: "2005-09-02", category: "genetic_test", title: "遺伝子検査でCOL1A1変異確定", detail: "国立成育医療研究センター。COL1A1 ヘテロ接合性ミスセンス変異を確定。", source: "manual" },
      { id: "ev3", date: "2008-03-15", category: "bp_therapy", title: "パミドロン酸点滴（BP）開始", detail: "大阪母子医療センターで導入。3か月毎に外来点滴。", source: "manual" },
      { id: "ev4", date: "2012-07-20", category: "surgery", title: "右大腿骨 髄内釘挿入術", detail: "再骨折部位の変形矯正＋伸張型髄内釘。術後リハ8週間。", source: "manual" },
      { id: "ev5", date: "2015-11-10", category: "fracture", title: "左前腕骨折（軽微外傷）", detail: "ドアにぶつけ橈骨遠位端骨折。ギプス固定6週間。", source: "manual" },
      { id: "ev6", date: "2018-04-05", category: "hearing_check", title: "聴力低下指摘・補聴器導入", detail: "右耳混合性難聴 35dB。耳鼻科で気導補聴器を装用開始。", source: "manual" },
      { id: "ev7", date: "2020-06-12", category: "bp_therapy", title: "経口アレンドロン酸へ切替", detail: "成人移行に合わせ週1回経口BPに変更。点滴は年1回ゾレドロン酸でフォロー。", source: "manual" },
      { id: "ev8", date: "2023-09-08", category: "dxa", title: "定期DXA検査", detail: "腰椎 Z-score -1.8 / 大腿骨頸部 Z-score -1.5。BP治療効果は維持。", source: "manual" },
      { id: "ev9", date: "2025-02-14", category: "dental", title: "歯科処置（DI 対応）", detail: "象牙質形成不全のため左下大臼歯に被せ物。BP歴を歯科に共有済。", source: "manual" },
      { id: "ev10", date: "2026-03-22", category: "exam", title: "整形外来 定期フォロー", detail: "骨折なし。リハ継続でADL自立。次回6ヶ月後。", source: "manual" },
    ],
    medications: [
      { id: "m1", name: "ボナロン", genericName: "アレンドロン酸", category: "bisphosphonate_oral", dosageForm: "経口", startDate: "2020-06-12", endDate: null, isActive: true, changeReason: "成人移行で経口製剤に切替", sideNotes: "週1回35mg、起床時水コップ1杯で服用、30分は横にならない" },
      { id: "m2", name: "リクラスト", genericName: "ゾレドロン酸", category: "bisphosphonate_iv", dosageForm: "点滴", startDate: "2021-06-15", endDate: null, isActive: true, changeReason: "経口補完（年1回）", sideNotes: "5mg年1回点滴。投与翌日は発熱対策にカロナール" },
      { id: "m3", name: "デノタスチュアブル", genericName: "コレカルシフェロール/カルシウム配合", category: "calcium_vitd", dosageForm: "経口", startDate: "2008-03-15", endDate: null, isActive: true, changeReason: "BP治療の基礎補充", sideNotes: "1日1回 食後" },
      { id: "m4", name: "エディロール", genericName: "エルデカルシトール", category: "active_vitd", dosageForm: "経口", startDate: "2018-08-01", endDate: null, isActive: true, changeReason: "骨密度低下への上乗せ", sideNotes: "0.75μg/日。血清Caを定期確認" },
      { id: "m5", name: "カロナール", genericName: "アセトアミノフェン", category: "analgesic", dosageForm: "経口", startDate: "2015-11-10", endDate: null, isActive: true, changeReason: "骨折時・腰背部痛の頓用", sideNotes: "500mg 痛い時のみ" },
      { id: "m6", name: "パミドロン酸Ⅱ静注", genericName: "パミドロン酸ナトリウム", category: "bisphosphonate_iv", dosageForm: "点滴", startDate: "2008-03-15", endDate: "2020-06-12", isActive: false, changeReason: "成人移行で経口BPに切替", sideNotes: "3か月毎に外来点滴。初回急性期反応あり" },
    ],
    labResults: [
      { id: "l1", date: "2026-03-22", values: { bap: 12.4, p1np: 38, ntx_u: 16.2, tracp5b: 245, ca: 9.2, p: 3.4, alp: 78, vitd: 38, intactPth: 32, dxa_lumbar_yam: 78, dxa_lumbar_z: -1.8, dxa_femur_z: -1.5 } },
      { id: "l2", date: "2025-09-15", values: { bap: 13.1, p1np: 42, ntx_u: 18.5, tracp5b: 268, ca: 9.1, p: 3.3, alp: 82, vitd: 36, intactPth: 35, dxa_lumbar_yam: 76, dxa_lumbar_z: -1.9, dxa_femur_z: -1.6 } },
      { id: "l3", date: "2025-03-10", values: { bap: 14.0, p1np: 45, ntx_u: 22.1, tracp5b: 290, ca: 9.0, p: 3.5, alp: 85, vitd: 32, intactPth: 38, dxa_lumbar_yam: 75, dxa_lumbar_z: -2.0, dxa_femur_z: -1.7 } },
      { id: "l4", date: "2024-09-08", values: { bap: 14.8, p1np: 48, ntx_u: 24.6, tracp5b: 312, ca: 9.0, p: 3.4, alp: 88, vitd: 28, intactPth: 42 } },
      { id: "l5", date: "2024-03-05", values: { bap: 15.2, p1np: 52, ntx_u: 28.0, tracp5b: 345, ca: 8.9, p: 3.5, alp: 92, vitd: 25, intactPth: 48, dxa_lumbar_yam: 73, dxa_lumbar_z: -2.1, dxa_femur_z: -1.8 } },
    ],
    clinics: [
      { id: "c1", name: "大阪母子医療センター", address: "大阪府和泉市室堂町840", phone: "0725-56-1220", departments: ["整形外科", "リハビリテーション科"], isPrimary: true, note: "OI診療拠点。BP治療・髄内釘手術・成人移行のフォロー。" },
      { id: "c2", name: "近藤耳鼻咽喉科", address: "大阪府堺市", phone: "", departments: ["耳鼻咽喉科"], isPrimary: false, note: "混合性難聴のフォロー・補聴器調整。" },
      { id: "c3", name: "さくら歯科クリニック", address: "大阪府堺市", phone: "", departments: ["歯科"], isPrimary: false, note: "象牙質形成不全（DI）の管理。BP治療歴を共有済。" },
      { id: "c4", name: "市立堺総合病院 内分泌内科", address: "大阪府堺市西区家原寺町1-1-1", phone: "072-272-1199", departments: ["内分泌内科"], isPrimary: false, note: "骨代謝マーカー・DXAのフォロー。" },
    ],
    visits: [
      { id: "v1", date: "2023-09-08", clinicId: "c1", department: "整形外科", doctor: "大阪 一郎", chiefComplaint: "骨密度の定期評価", findings: "DXA腰椎 Z-score -1.8。BP治療効果維持。新規骨折なし。", nextAction: "アレンドロン酸＋年1回ゾレドロン酸継続。次回6か月後にDXA。", photos: [], relatedMedicationIds: ["m1", "m2"], relatedLabResultIds: [], relatedTimelineEventId: "ev8" },
      { id: "v2", date: "2025-02-14", clinicId: "c3", department: "歯科", doctor: "桜井 美香", chiefComplaint: "左下奥歯がしみる", findings: "象牙質形成不全（DI）に伴うエナメル質摩耗。BP治療歴ありのため抜歯回避し被せ物で対応。", nextAction: "被せ物完成後に再評価。3ヶ月後の定期クリーニング予約。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: "ev9" },
      { id: "v3", date: "2025-09-15", clinicId: "c4", department: "内分泌内科", doctor: "森下 健", chiefComplaint: "BP治療効果の評価", findings: "BAP 13.1・NTX 18.5 と骨吸収抑制良好。25(OH)D 36 ng/mL で十分。", nextAction: "現薬継続。半年後に再検査。", photos: [], relatedMedicationIds: ["m1", "m3", "m4"], relatedLabResultIds: ["l2"], relatedTimelineEventId: null },
      { id: "v4", date: "2025-11-05", clinicId: "c2", department: "耳鼻咽喉科", doctor: "近藤 弘子", chiefComplaint: "右耳の聞こえが少し低下した気がする", findings: "右耳気導 42dB（前回35dB）。混合性難聴の進行を確認。補聴器の出力調整。", nextAction: "補聴器再調整後 1ヶ月でフォロー。アブミ骨手術検討は次回相談。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2026-03-22", clinicId: "c1", department: "整形外科", doctor: "大阪 一郎", chiefComplaint: "腰背部痛が時々出る", findings: "胸椎側弯軽度進行なし。骨折なし。リハ継続でADL自立。", nextAction: "リハ週1回継続、痛み時はカロナール頓用。次回6ヶ月後。", photos: [], relatedMedicationIds: ["m5"], relatedLabResultIds: ["l1"], relatedTimelineEventId: "ev10" },
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
    clinics: [
      { id: "c1", name: "○○PAHセンター 循環器内科", address: "福岡県福岡市", phone: "092-111-2222", departments: ["循環器内科"], isPrimary: true, note: "PAH診療拠点。3ヶ月毎にBNP・心エコー。" },
      { id: "c2", name: "博多呼吸器クリニック", address: "福岡県福岡市", phone: "", departments: ["呼吸器内科"], isPrimary: false, note: "肺機能・在宅酸素のフォロー。" },
      { id: "c3", name: "天神膠原病内科", address: "福岡県福岡市", phone: "", departments: ["膠原病内科"], isPrimary: false, note: "膠原病合併（CTD-PAH 関連）スクリーニング。" },
      { id: "c4", name: "中央婦人クリニック", address: "福岡県福岡市", phone: "", departments: ["産婦人科"], isPrimary: false, note: "妊娠厳禁の確認・避妊指導。" },
    ],
    visits: [
      { id: "v1", date: "2026-03-05", clinicId: "c1", department: "循環器内科", doctor: "博多 玲", chiefComplaint: "息切れ軽度", findings: "WHO FC II維持。BNP 85、6MWD 480m。3剤併用で安定。", nextAction: "現薬継続。次回3ヶ月後。", photos: [], relatedMedicationIds: ["m1", "m2", "m3"], relatedLabResultIds: ["l1"], relatedTimelineEventId: null },
      { id: "v2", date: "2025-12-05", clinicId: "c1", department: "循環器内科", doctor: "博多 玲", chiefComplaint: "浮腫が少し", findings: "下腿浮腫軽度。利尿剤調整。BNP 92。", nextAction: "ラシックス20mg→40mg。塩分制限を再確認。", photos: [], relatedMedicationIds: ["m4"], relatedLabResultIds: ["l2"], relatedTimelineEventId: null },
      { id: "v3", date: "2025-09-10", clinicId: "c1", department: "循環器内科", doctor: "博多 玲", chiefComplaint: "右心カテーテル検査", findings: "mPAP 32mmHg、PVR 4.2 WU。改善維持。", nextAction: "現治療継続。次回6ヶ月後にRHC再評価。", photos: [], relatedMedicationIds: [], relatedLabResultIds: ["l3"], relatedTimelineEventId: "ev7" },
      { id: "v4", date: "2025-10-20", clinicId: "c2", department: "呼吸器内科", doctor: "博多 隼", chiefComplaint: "肺機能評価", findings: "肺拡散能やや低下。SpO2安静92%。", nextAction: "在宅酸素は不要。労作時のSpO2モニタ継続。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
      { id: "v5", date: "2025-11-15", clinicId: "c3", department: "膠原病内科", doctor: "天神 凛", chiefComplaint: "膠原病合併スクリーニング", findings: "強皮症・SLE所見なし。抗核抗体陰性。", nextAction: "1年後再スクリーニング。", photos: [], relatedMedicationIds: [], relatedLabResultIds: [], relatedTimelineEventId: null },
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
