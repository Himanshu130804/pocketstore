const axios = require("axios");

function normalizePoint(input) {
  if (!input) return null;
  const lat = Number(input.lat ?? input.latitude ?? input.coordinates?.[1]);
  const lng = Number(input.lng ?? input.longitude ?? input.coordinates?.[0]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { type: "Point", coordinates: [lng, lat] };
}

function pointToLatLng(point) {
  if (!point?.coordinates || point.coordinates.length !== 2) return null;
  const [lng, lat] = point.coordinates.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function haversineKm(a, b) {
  const A = normalizePoint(a); const B = normalizePoint(b);
  if (!A || !B) return null;
  const [lng1, lat1] = A.coordinates; const [lng2, lat2] = B.coordinates;
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1); const dLng = toRad(lng2 - lng1);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function hasUsablePoint(point) {
  const ll = pointToLatLng(point);
  return !!ll && !(ll.lat === 0 && ll.lng === 0);
}

async function geocodeAddress(address) {
  const query = String(address || "").trim();
  if (!query) throw Object.assign(new Error("Enter an address to locate it."), { status: 400 });
  const parts = query.split(",").map(part => part.trim()).filter(Boolean);
  const candidates = [...new Set([
    query,
    parts.filter(part => !/^\d{5,6}$/.test(part)).join(", "),
    parts.slice(-4).join(", "),
    parts.slice(-3).join(", "),
  ].filter(Boolean))];
  for (const candidate of candidates) {
    try {
      const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q: candidate, format: "jsonv2", limit: 5, addressdetails: 1, countrycodes: "in" },
        headers: { "User-Agent": "PocketStore-College-Project/1.0", "Accept-Language": "en" },
        timeout: 12000,
      });
      const results = (Array.isArray(data) ? data : []).map(item => ({
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        address: item.address || {},
      })).filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng));
      if (results.length) return results;
    } catch (error) {
      if (candidate === candidates[candidates.length - 1]) throw error;
    }
  }
  return [];
}

async function reverseGeocode(lat, lng) {
  const point = normalizePoint({ lat, lng });
  if (!point) throw Object.assign(new Error("Invalid coordinates."), { status: 400 });
  const ll = pointToLatLng(point);
  try {
    const { data } = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { lat: ll.lat, lon: ll.lng, format: "jsonv2", addressdetails: 1 },
      headers: { "User-Agent": "PocketStore-College-Project/1.0", "Accept-Language": "en" },
      timeout: 12000,
    });
    return { label: data?.display_name || `${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`, lat: ll.lat, lng: ll.lng, address: data?.address || {} };
  } catch {
    return { label: `${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`, lat: ll.lat, lng: ll.lng, address: {} };
  }
}

module.exports = { normalizePoint, pointToLatLng, haversineKm, hasUsablePoint, geocodeAddress, reverseGeocode };
