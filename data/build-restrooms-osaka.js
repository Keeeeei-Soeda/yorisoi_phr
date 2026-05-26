// 大阪市公衆トイレ・オープンデータ（マップナビおおさか）→ JSON 変換
// 出典: https://www.mapnavi.city.osaka.lg.jp/osakacity/osakacity/opendatafile/map_1/CSV/opendata_1011.csv
// ライセンス: CC-BY 4.0
// 実行: cd yorisoi-phr/data && node build-restrooms-osaka.js

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "opendata_1011_raw.csv");
const DST = path.join(__dirname, "restrooms-osaka.json");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = false; }
      } else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') { inQuote = true; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const raw = fs.readFileSync(SRC, "utf8").replace(/^﻿/, "");
const lines = raw.split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines[0]);

const idx = (name) => header.indexOf(name);
const C = {
  name: idx("施設名称"),
  address: idx("所在地"),
  kana: idx("施設名かな"),
  category: idx("カテゴリ"),
  type: idx("分類"),
  tel: idx("TEL"),
  url: idx("URL"),
  barrierInfo: idx("バリアフリー情報"),
  detail: idx("詳細情報"),
  note: idx("備考"),
  lng: idx("経度"),
  lat: idx("緯度"),
};

const items = [];
for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  const lat = parseFloat(cols[C.lat]);
  const lng = parseFloat(cols[C.lng]);
  if (!isFinite(lat) || !isFinite(lng)) continue;

  const type = (cols[C.type] || "").trim();
  const barrierFree = type.includes("車いす");

  items.push({
    id: `osaka-${i}`,
    name: cols[C.name].trim(),
    address: cols[C.address].trim(),
    type,
    lat,
    lng,
    detail: (cols[C.detail] || "").trim() || (cols[C.barrierInfo] || "").trim(),
    note: (cols[C.note] || "").trim(),
    barrierFree,
  });
}

const out = {
  source: "大阪市オープンデータ（マップナビおおさか／施設情報ポイントデータ：公衆トイレ）",
  sourceUrl: "https://www.geospatial.jp/ckan/dataset/mapnavi-city-osaka",
  license: "CC-BY 4.0",
  attribution: "出典：マップナビおおさか（大阪市計画調整局）",
  fetched: new Date().toISOString().slice(0, 10),
  count: items.length,
  items,
};

fs.writeFileSync(DST, JSON.stringify(out, null, 2));
console.log(`Wrote ${items.length} restrooms → ${DST}`);
console.log(`  - 車いす対応: ${items.filter(i => i.barrierFree).length}`);
console.log(`  - 通常: ${items.filter(i => !i.barrierFree).length}`);
