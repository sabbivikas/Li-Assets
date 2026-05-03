import React, { useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

interface SpeciesPin {
  id: number;
  name: string;
  lat: number;
  lng: number;
  color?: string;
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
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #04101F; }
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

  /* Species pins */
  .species-pin {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.9);
    box-shadow: 0 0 10px currentColor, 0 2px 6px rgba(0,0,0,0.5);
  }

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

  // Species pins scattered within the radius
  pins.forEach((p) => {
    const color = p.color || '#FBBF24';
    const icon = L.divIcon({
      className: 'species-pin-wrap',
      html: '<div class="species-pin" style="background:' + color + ';color:' + color + ';"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([p.lat, p.lng], { icon })
      .addTo(map)
      .bindPopup('<b>' + p.name + '</b>');
  });

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E293B",
    backgroundColor: "#04101F",
  },
  webview: {
    flex: 1,
    backgroundColor: "#04101F",
  },
});
