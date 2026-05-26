// 公衆トイレ・オープンデータ API
// データソース：大阪市オープンデータ（マップナビおおさか） CC-BY 4.0
// 認証不要・デモ/本番どちらでも動作

const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

let CACHE = null;
function loadData() {
  if (CACHE) return CACHE;
  const file = path.join(__dirname, "../../data/restrooms-osaka.json");
  CACHE = JSON.parse(fs.readFileSync(file, "utf8"));
  return CACHE;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

// GET /api/public/restrooms?lat=34.7&lng=135.5&radius=2000&limit=80
// lat/lng 未指定なら大阪駅周辺を中心に返す
router.get("/api/public/restrooms", (req, res) => {
  const data = loadData();
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseInt(req.query.radius) || 0; // 0=無制限
  const limit = Math.min(parseInt(req.query.limit) || 80, 500);

  const center =
    isFinite(lat) && isFinite(lng) ? { lat, lng } : { lat: 34.7024, lng: 135.4959 };

  const enriched = data.items.map((it) => ({
    ...it,
    distance: haversineMeters(center, { lat: it.lat, lng: it.lng }),
  }));

  let filtered = enriched;
  if (radius > 0) filtered = enriched.filter((it) => it.distance <= radius);
  filtered.sort((a, b) => a.distance - b.distance);

  res.json({
    source: data.source,
    sourceUrl: data.sourceUrl,
    license: data.license,
    attribution: data.attribution,
    center,
    total: data.items.length,
    returned: Math.min(filtered.length, limit),
    items: filtered.slice(0, limit),
  });
});

// メタ情報のみ
router.get("/api/public/restrooms/meta", (_req, res) => {
  const data = loadData();
  res.json({
    source: data.source,
    sourceUrl: data.sourceUrl,
    license: data.license,
    attribution: data.attribution,
    fetched: data.fetched,
    count: data.count,
  });
});

module.exports = router;
