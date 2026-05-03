import React, { useDeferredValue, useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export interface SpeciesPin {
  id: number;
  taxonId?: number;
  name: string;
  scientificName?: string;
  lat: number;
  lng: number;
  color?: string;
  /** Low-res square photo (used on the map). */
  photoUrl?: string;
  /** Higher-res photo loaded on tap to upgrade the bottom sheet. */
  photoMediumUrl?: string;
  /** 0..1 — drives marker size and ring intensity. */
  importance?: number;
  role?: string;
  group?: string;
  /** Number of recent observations of this taxon in the visible window. */
  recentNearbyCount?: number;
}

export interface PinTapPayload {
  id: number;
  taxonId?: number;
  name: string;
  scientificName?: string;
  photoUrl?: string;
  photoMediumUrl?: string;
  role?: string;
  roleColor?: string;
  group?: string;
  recentNearbyCount?: number;
}

interface Props {
  lat: number;
  lng: number;
  radiusKm?: number;
  pins?: SpeciesPin[];
  height?: number;
  onPinSelect?: (pin: PinTapPayload) => void;
  selectedPinId?: number | null;
}

function buildLeafletHtml(
  lat: number,
  lng: number,
  radiusKm: number,
  pins: SpeciesPin[],
): string {
  // Escape angle brackets and JS line separators so untrusted pin name /
  // scientificName values cannot break out of the inline <script> tag.
  const pinsJson = JSON.stringify(pins)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
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
    animation: userpulse 2.2s ease-out infinite;
  }
  .user-pin::after {
    content: '';
    position: absolute;
    inset: -16px;
    border-radius: 50%;
    background: #4ADE80;
    opacity: 0.18;
    animation: userpulse 2.2s 0.4s ease-out infinite;
  }
  @keyframes userpulse {
    0% { transform: scale(0.55); opacity: 0.65; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  /* Photo pin wrapper — gentle floating animation */
  .pin-wrap {
    animation: float var(--float-dur, 4.2s) ease-in-out infinite;
    animation-delay: var(--float-delay, 0s);
    cursor: pointer;
    will-change: transform;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  /* Photo pin — circular avatar with tinted glowing ring */
  .photo-pin {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
    background-color: #0F1824;
    border: 2px solid var(--ring, #4ADE80);
    box-shadow:
      0 0 0 2px rgba(4, 16, 31, 0.9),
      0 0 var(--glow, 12px) var(--ring, #4ADE80),
      0 4px 10px rgba(0,0,0,0.55);
    transition: transform 200ms ease, box-shadow 200ms ease, border-width 120ms ease;
    position: relative;
  }
  .photo-pin::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 2px solid var(--ring, #4ADE80);
    opacity: 0.45;
    pointer-events: none;
    animation: ringpulse 3.6s ease-in-out infinite;
    animation-delay: var(--float-delay, 0s);
  }
  @keyframes ringpulse {
    0%, 100% { transform: scale(1); opacity: 0.45; }
    50% { transform: scale(1.22); opacity: 0; }
  }
  .photo-pin:hover { transform: scale(1.1); }
  .photo-pin.is-selected {
    transform: scale(1.18);
    border-width: 3px;
    box-shadow:
      0 0 0 2px rgba(4, 16, 31, 0.95),
      0 0 24px var(--ring, #4ADE80),
      0 0 48px var(--ring, #4ADE80),
      0 6px 16px rgba(0,0,0,0.7);
    z-index: 999 !important;
  }

  /* Photo-stack cluster bubble */
  .photo-cluster {
    position: relative;
    height: 38px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }
  .photo-cluster .cp {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
    background-color: #0F1824;
    border: 2px solid #0B1320;
    box-shadow:
      0 0 12px rgba(74, 222, 128, 0.55),
      0 4px 8px rgba(0,0,0,0.6);
    position: absolute;
    transition: transform 160ms ease;
  }
  .photo-cluster:hover .cp { transform: translateY(-2px); }
  .photo-cluster .cp1 { left: 0; z-index: 4; }
  .photo-cluster .cp2 { left: 18px; z-index: 3; }
  .photo-cluster .cp3 { left: 36px; z-index: 2; }
  .photo-cluster .cp4 { left: 54px; z-index: 1; }
  .photo-cluster .cluster-badge {
    position: absolute;
    top: -2px;
    right: -10px;
    min-width: 24px;
    height: 22px;
    padding: 0 7px;
    border-radius: 999px;
    background: linear-gradient(135deg, #14532D 0%, #0F2027 100%);
    border: 1.5px solid #4ADE80;
    box-shadow: 0 0 10px rgba(74,222,128,0.55), 0 3px 8px rgba(0,0,0,0.55);
    color: #ECFDF5;
    font-family: -apple-system, system-ui, sans-serif;
    font-weight: 700;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
  }

  .leaflet-popup, .leaflet-popup-pane { display: none !important; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script>
(function() {
  var lat = ${lat};
  var lng = ${lng};
  var radiusKm = ${radiusKm};
  var pins = ${pinsJson};

  var map = L.map('map', {
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

  // Glowing radius rings
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
  var userIcon = L.divIcon({
    className: 'user-pin-wrap',
    html: '<div class="user-pin"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

  function safeUrl(u) {
    if (typeof u !== 'string') return '';
    if (!/^https?:\\/\\//i.test(u)) return '';
    return encodeURI(u).replace(/['"<>\\\\]/g, encodeURIComponent);
  }

  function postPinTap(p) {
    var payload = {
      type: 'pin-tap',
      source: 'lifeweb-map',
      pin: {
        id: p.id,
        taxonId: p.taxonId,
        name: p.name,
        scientificName: p.scientificName,
        photoUrl: p.photoUrl,
        photoMediumUrl: p.photoMediumUrl,
        role: p.role,
        roleColor: p.color,
        group: p.group,
        recentNearbyCount: p.recentNearbyCount,
      },
    };
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, '*');
    }
  }

  // Track currently selected pin element so we can deselect later
  var selectedEl = null;
  function setSelected(el) {
    if (selectedEl && selectedEl !== el) {
      selectedEl.classList.remove('is-selected');
    }
    selectedEl = el || null;
    if (selectedEl) selectedEl.classList.add('is-selected');
  }
  window.__deselectPin = function() { setSelected(null); };
  window.addEventListener('message', function(e) {
    if (e && e.data && e.data.type === 'deselect' && e.source === window.parent) {
      setSelected(null);
    }
  });

  var cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 52,
    spiderfyOnMaxZoom: true,
    iconCreateFunction: function(c) {
      var children = c.getAllChildMarkers();
      var photos = [];
      for (var i = 0; i < children.length && photos.length < 4; i++) {
        var u = children[i].options._photoUrl;
        if (u) photos.push(u);
      }
      var count = c.getChildCount();
      var stackHtml = '';
      for (var j = 0; j < photos.length; j++) {
        stackHtml += '<div class="cp cp' + (j + 1) + '" style="background-image:url(&quot;' + photos[j] + '&quot;);"></div>';
      }
      var badge = '<div class="cluster-badge">+' + count + '</div>';
      var w = Math.max(photos.length, 1) * 18 + 28;
      return L.divIcon({
        html: '<div class="photo-cluster" style="width:' + w + 'px;">' + stackHtml + badge + '</div>',
        className: '',
        iconSize: L.point(w + 12, 44),
      });
    },
  });

  pins.slice(0, 30).forEach(function(p, idx) {
    var url = safeUrl(p.photoUrl);
    if (!url) return;
    var ring = p.color || '#FBBF24';
    var imp = Math.max(0, Math.min(1, typeof p.importance === 'number' ? p.importance : 0.4));
    var size = Math.round(30 + imp * 22);
    var glow = Math.round(10 + imp * 14);
    var delay = ((idx * 137) % 1000) / 1000;
    var dur = 3.6 + ((idx * 53) % 100) / 80;
    var html =
      '<div class="pin-wrap" style="--float-delay:' + delay.toFixed(2) + 's;--float-dur:' + dur.toFixed(2) + 's;width:' + size + 'px;height:' + size + 'px;">' +
        '<div class="photo-pin" style="--ring:' + ring + ';--glow:' + glow + 'px;background-image:url(&quot;' + url + '&quot;);"></div>' +
      '</div>';
    var marker = L.marker([p.lat, p.lng], {
      icon: L.divIcon({
        className: 'species-pin-wrap',
        html: html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
      _photoUrl: url,
      bubblingMouseEvents: false,
    });
    marker.on('click', function() {
      var el = marker.getElement();
      var inner = el ? el.querySelector('.photo-pin') : null;
      if (inner) setSelected(inner);
      postPinTap(p);
    });
    cluster.addLayer(marker);
  });
  map.addLayer(cluster);

  map.on('click', function() { setSelected(null); });

  // Fit map to circle bounds
  var bounds = L.latLng(lat, lng).toBounds(radiusKm * 2200);
  map.fitBounds(bounds, { padding: [16, 16] });
})();
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
  onPinSelect,
  selectedPinId,
}: Props) {
  const deferredPins = useDeferredValue(pins);
  const html = useMemo(
    () => buildLeafletHtml(lat, lng, radiusKm, deferredPins),
    [lat, lng, radiusKm, deferredPins],
  );

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const webviewRef = useRef<WebView | null>(null);
  const onPinSelectRef = useRef(onPinSelect);
  useEffect(() => {
    onPinSelectRef.current = onPinSelect;
  }, [onPinSelect]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    function handler(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data;
      if (
        !data ||
        typeof data !== "object" ||
        data.type !== "pin-tap" ||
        data.source !== "lifeweb-map" ||
        !data.pin ||
        typeof data.pin.id !== "number"
      ) {
        return;
      }
      onPinSelectRef.current?.(data.pin);
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (selectedPinId !== null && selectedPinId !== undefined) return;
    if (Platform.OS === "web") {
      iframeRef.current?.contentWindow?.postMessage({ type: "deselect" }, "*");
    } else {
      webviewRef.current?.injectJavaScript(
        "window.__deselectPin && window.__deselectPin(); true;",
      );
    }
  }, [selectedPinId]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.wrap, { height }]}>
        <iframe
          ref={iframeRef}
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
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        scalesPageToFit
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === "pin-tap" && data.pin) {
              onPinSelectRef.current?.(data.pin);
            }
          } catch {
          }
        }}
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
