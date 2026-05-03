import React, { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

interface SpeciesPin {
  id: number;
  name: string;
  lat: number;
  lng: number;
  color?: string;
  photoUrl?: string;
}

interface Props {
  lat: number;
  lng: number;
  radiusKm?: number;
  pins?: SpeciesPin[];
  height?: number;
}

function buildLeafletHtml(
  lat: number,
  lng: number,
  radiusKm: number,
  pins: SpeciesPin[],
): string {
  const pinsJson = JSON.stringify(pins);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #04101F; }

  /* Tint the dark tiles toward the app's deep green/earth palette */
  .leaflet-tile-pane {
    filter: hue-rotate(85deg) saturate(0.55) brightness(0.78) contrast(1.05);
  }

  /* Soft vignette / gradient edge that fades the map into the page background */
  #map::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: 20px;
    box-shadow:
      inset 0 0 60px 20px rgba(4, 16, 31, 0.85),
      inset 0 0 24px 4px rgba(15, 48, 32, 0.6);
    background:
      radial-gradient(ellipse at center, transparent 55%, rgba(4, 16, 31, 0.55) 100%);
  }

  .leaflet-container { background: #04101F !important; outline: none; }
  .leaflet-control-attribution {
    background: rgba(8, 12, 20, 0.7) !important;
    color: #64748B !important;
    font-size: 9px !important;
    padding: 2px 6px !important;
    border-radius: 6px;
    margin: 6px !important;
    backdrop-filter: blur(8px);
  }
  .leaflet-control-attribution a { color: #4ADE80 !important; }
  .leaflet-control-zoom {
    border: none !important;
    margin: 12px !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
  }
  .leaflet-control-zoom a {
    background: rgba(15, 24, 36, 0.9) !important;
    color: #4ADE80 !important;
    border: 1px solid #1E293B !important;
    backdrop-filter: blur(8px);
  }
  .leaflet-control-zoom a:hover {
    background: rgba(34, 197, 94, 0.15) !important;
  }

  /* User location pin — pulsing glow */
  .user-pin {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #4ADE80;
    border: 3px solid #FFFFFF;
    box-shadow: 0 0 18px #4ADE80, 0 0 36px #4ADE80;
    position: relative;
  }
  .user-pin::before {
    content: '';
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    background: #4ADE80;
    opacity: 0.4;
    animation: pulse 2.2s ease-out infinite;
  }
  .user-pin::after {
    content: '';
    position: absolute;
    inset: -16px;
    border-radius: 50%;
    background: #4ADE80;
    opacity: 0.18;
    animation: pulse 2.2s 0.4s ease-out infinite;
  }
  @keyframes pulse {
    0% { transform: scale(0.55); opacity: 0.65; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  /* Photo pin — circular avatar with tinted glowing ring */
  .photo-pin {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
    background-color: #0F1824;
    border: 2px solid var(--ring, #4ADE80);
    box-shadow:
      0 0 0 2px rgba(4, 16, 31, 0.9),
      0 0 12px var(--ring, #4ADE80),
      0 4px 10px rgba(0,0,0,0.55);
    transition: transform 160ms ease;
  }
  .photo-pin:hover { transform: scale(1.12); }

  /* Fallback pin when no photo is available */
  .dot-pin {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--ring, #4ADE80);
    border: 2px solid rgba(255,255,255,0.9);
    box-shadow: 0 0 10px var(--ring, #4ADE80), 0 2px 6px rgba(0,0,0,0.5);
  }

  /* Cluster bubble */
  .marker-cluster-custom {
    background: rgba(74, 222, 128, 0.18);
    border-radius: 999px;
    backdrop-filter: blur(4px);
  }
  .marker-cluster-custom div {
    width: 36px;
    height: 36px;
    margin: 4px;
    border-radius: 50%;
    background: linear-gradient(135deg, #14532D 0%, #0F2027 100%);
    border: 2px solid #4ADE80;
    box-shadow: 0 0 14px rgba(74, 222, 128, 0.6), 0 4px 10px rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ECFDF5;
    font-family: -apple-system, system-ui, sans-serif;
    font-weight: 700;
    font-size: 13px;
  }
  .marker-cluster-custom-lg div { background: linear-gradient(135deg, #166534 0%, #0F2027 100%); }

  .leaflet-popup-content-wrapper {
    background: rgba(15, 24, 36, 0.95) !important;
    color: #F8FAFC !important;
    border-radius: 12px !important;
    border: 1px solid #1E293B;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
  }
  .leaflet-popup-content { margin: 10px 14px !important; font-family: -apple-system, system-ui, sans-serif; font-size: 13px; font-weight: 500; }
  .leaflet-popup-tip { background: rgba(15, 24, 36, 0.95) !important; border: 1px solid #1E293B; }
  .leaflet-popup-close-button { color: #64748B !important; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
  const lat = ${lat};
  const lng = ${lng};
  const radiusKm = ${radiusKm};
  const pins = ${pinsJson};

  const map = L.map('map', {
    center: [lat, lng],
    zoom: 12,
    zoomControl: true,
    attributionControl: true,
    zoomSnap: 0.5,
    preferCanvas: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // Radius circle — glowing search ring
  L.circle([lat, lng], {
    radius: radiusKm * 1000,
    color: '#4ADE80',
    weight: 1.5,
    opacity: 0.55,
    fillColor: '#4ADE80',
    fillOpacity: 0.06,
    dashArray: '4, 6',
  }).addTo(map);

  L.circle([lat, lng], {
    radius: radiusKm * 1000 * 0.6,
    color: '#22D3EE',
    weight: 0.8,
    opacity: 0.3,
    fill: false,
    dashArray: '2, 8',
  }).addTo(map);

  // User location marker
  const userIcon = L.divIcon({
    className: 'user-pin-wrap',
    html: '<div class="user-pin"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
    .addTo(map)
    .bindPopup('<b>You are here</b>');

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // Cluster group — collapses overlapping markers into a counted bubble
  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 42,
    spiderfyOnMaxZoom: true,
    iconCreateFunction: (c) => {
      const count = c.getChildCount();
      const sizeClass = count >= 10 ? ' marker-cluster-custom-lg' : '';
      return L.divIcon({
        html: '<div><span>' + count + '</span></div>',
        className: 'marker-cluster-custom' + sizeClass,
        iconSize: L.point(44, 44),
      });
    },
  });

  // Conservatively encode any photo URL before injecting into HTML/CSS.
  // Allows only http(s) URLs; fully encodes special characters.
  function safeUrl(u) {
    if (typeof u !== 'string') return '';
    if (!/^https?:\\/\\//i.test(u)) return '';
    return encodeURI(u).replace(/['"<>\\\\]/g, encodeURIComponent);
  }

  pins.forEach((p) => {
    const ring = p.color || '#FBBF24';
    const safeName = escapeHtml(p.name);
    const url = safeUrl(p.photoUrl);
    const html = url
      ? '<div class="photo-pin" style="--ring:' + ring + ';background-image:url(&quot;' + url + '&quot;);"></div>'
      : '<div class="dot-pin" style="--ring:' + ring + ';"></div>';
    const size = url ? 38 : 16;
    const icon = L.divIcon({
      className: 'species-pin-wrap',
      html,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    const popupHtml = url
      ? '<div style="display:flex;gap:8px;align-items:center;">'
        + '<img src="' + url + '" style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:1px solid #1E293B;" />'
        + '<b>' + safeName + '</b></div>'
      : '<b>' + safeName + '</b>';
    L.marker([p.lat, p.lng], { icon }).bindPopup(popupHtml).addTo(cluster);
  });
  map.addLayer(cluster);

  // Fit map to circle bounds
  const bounds = L.latLng(lat, lng).toBounds(radiusKm * 2200);
  map.fitBounds(bounds, { padding: [16, 16] });
</script>
</body>
</html>`;
}

export function LocationMap({
  lat,
  lng,
  radiusKm = 10,
  pins = [],
  height = 280,
}: Props) {
  const html = useMemo(
    () => buildLeafletHtml(lat, lng, radiusKm, pins),
    [lat, lng, radiusKm, pins],
  );

  if (Platform.OS === "web") {
    return (
      <View style={[styles.wrap, { height }]}>
        <iframe
          srcDoc={html}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            borderRadius: 20,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ allow: "geolocation" } as any)}
        />
        <View style={styles.edgeFade} pointerEvents="none" />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        scalesPageToFit
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
      />
      <View style={styles.edgeFade} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#0F3020",
    backgroundColor: "#04101F",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  webview: {
    flex: 1,
    backgroundColor: "#04101F",
  },
  // Outer soft edge that blends the map into the page background
  edgeFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 12,
    borderColor: "rgba(8, 16, 28, 0.55)",
  },
});
