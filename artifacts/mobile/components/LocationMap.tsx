import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { RiveEmptyState } from "@/components/RiveEmptyState";
import { RiveLocationPin } from "@/components/RiveLocationPin";

/**
 * Maximum number of fully-rendered photo pins on the map at once.
 * Anything beyond this is added as an invisible cluster-only member so
 * the cluster count stays accurate without paying the per-pin DOM cost.
 * Single source of truth — mirrored into the iframe script as
 * `VISIBLE_CAP` and used by callers when slicing their pin pool.
 */
export const MAX_VISIBLE_PINS = 30;

/** Upper bound on the pin pool we ship to the map (visible + overflow). */
export const MAX_PIN_POOL = 100;

interface UserPinPosition {
  x: number;
  y: number;
  visible: boolean;
}

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
  /**
   * Render as a clean map preview: hides the user-location Rive pin
   * overlay and the "no observations" empty-state scrim. Used by the
   * onboarding hero where the pin and overlay are owned by the parent.
   */
  preview?: boolean;
}

function buildLeafletHtml(
  lat: number,
  lng: number,
  radiusKm: number,
): string {
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

  /* User location is rendered as a Rive overlay above the map; the
     leaflet marker is invisible and exists only to mark the geographic
     anchor for popups and for centering on initial load. */
  .user-pin { width: 1px; height: 1px; opacity: 0; pointer-events: none; }

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

  .photo-pin {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-color: #0F1824;
    border: 2px solid var(--ring, #4ADE80);
    box-shadow:
      0 0 0 2px rgba(4, 16, 31, 0.9),
      0 0 var(--glow, 12px) var(--ring, #4ADE80),
      0 4px 10px rgba(0,0,0,0.55);
    transition: transform 200ms ease, box-shadow 200ms ease, border-width 120ms ease;
    position: relative;
    overflow: hidden;
  }
  .photo-pin > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 50%;
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
  .photo-pin.bounce { animation: pinbounce 360ms ease; }
  @keyframes pinbounce {
    0% { transform: scale(1); }
    40% { transform: scale(1.28); }
    70% { transform: scale(0.96); }
    100% { transform: scale(1.18); }
  }
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
    background-color: #0F1824;
    border: 2px solid #0B1320;
    box-shadow:
      0 0 12px rgba(74, 222, 128, 0.55),
      0 4px 8px rgba(0,0,0,0.6);
    position: absolute;
    transition: transform 160ms ease;
    overflow: hidden;
  }
  .photo-cluster .cp > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 50%;
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

  // User location marker — kept as an invisible geographic anchor so
  // the popup binds to the right point. The visible pin is a Rive
  // overlay rendered above the map by React Native; we post the
  // projected pixel coords to the host on every move/zoom so the
  // overlay tracks the user's geographic position.
  const userIcon = L.divIcon({
    className: 'user-pin-wrap',
    html: '<div class="user-pin"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  const userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
    .addTo(map)
    .bindPopup('<b>You are here</b>');

  function postUserPin() {
    try {
      const pt = map.latLngToContainerPoint([lat, lng]);
      const size = map.getSize();
      const visible = pt.x >= -32 && pt.y >= -32 && pt.x <= size.x + 32 && pt.y <= size.y + 32;
      const msg = JSON.stringify({ type: 'userPin', x: pt.x, y: pt.y, visible: visible });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    } catch (e) { /* map not ready yet */ }
  }
  map.on('move zoom moveend zoomend resize load', postUserPin);
  setTimeout(postUserPin, 0);
  setTimeout(postUserPin, 200);

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  // Conservatively encode any photo URL before injecting into HTML/CSS.
  // Allows only http(s) URLs; fully encodes special characters.
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

  // Single photo-stack cluster layer; rebuilt in place on pin updates
  // so the user's pan/zoom state is preserved across data refreshes.
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
        stackHtml += '<div class="cp cp' + (j + 1) + '"><img loading="lazy" decoding="async" src="' + photos[j] + '" alt="" /></div>';
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
  map.addLayer(cluster);

  // Mirrors MAX_VISIBLE_PINS in LocationMap.tsx.
  var VISIBLE_CAP = ${MAX_VISIBLE_PINS};

  function buildMarker(p, idx) {
    var url = safeUrl(p.photoUrl);
    if (!url) return null;
    if (idx < VISIBLE_CAP) {
      var ring = p.color || '#FBBF24';
      var imp = Math.max(0, Math.min(1, typeof p.importance === 'number' ? p.importance : 0.4));
      var size = Math.round(30 + imp * 22);
      var glow = Math.round(10 + imp * 14);
      var delay = ((idx * 137) % 1000) / 1000;
      var dur = 3.6 + ((idx * 53) % 100) / 80;
      var html =
        '<div class="pin-wrap" style="--float-delay:' + delay.toFixed(2) + 's;--float-dur:' + dur.toFixed(2) + 's;width:' + size + 'px;height:' + size + 'px;">' +
          '<div class="photo-pin" style="--ring:' + ring + ';--glow:' + glow + 'px;">' +
            '<img loading="lazy" decoding="async" src="' + url + '" alt="" />' +
          '</div>' +
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
        if (inner) {
          setSelected(inner);
          inner.classList.remove('bounce');
          void inner.offsetWidth;
          inner.classList.add('bounce');
        }
        postPinTap(p);
      });
      return marker;
    }
    return L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: 'overflow-pin', html: '', iconSize: [1, 1] }),
      _photoUrl: url,
      opacity: 0,
      interactive: false,
      keyboard: false,
    });
  }

  // Replace marker set in place; never recreates the map or tile layer
  // so pan/zoom/animation state survives data updates.
  window.__renderPins = function(nextPins) {
    setSelected(null);
    cluster.clearLayers();
    if (!Array.isArray(nextPins)) return;
    for (var i = 0; i < nextPins.length; i++) {
      var m = buildMarker(nextPins[i], i);
      if (m) cluster.addLayer(m);
    }
  };

  // Parent posts pin updates here whenever data changes.
  window.addEventListener('message', function(e) {
    if (!e || !e.data) return;
    if (e.data.type === 'set-pins' && Array.isArray(e.data.pins)) {
      window.__renderPins(e.data.pins);
    }
  });

  function postReady() {
    var msg = JSON.stringify({ type: 'mapReady' });
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(msg);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(msg, '*');
    }
  }

  map.on('click', function() { setSelected(null); });

  // Fit map to circle bounds on first load only — pin updates must NOT
  // re-fit, or the user's pan/zoom would be wiped on every refresh.
  var bounds = L.latLng(lat, lng).toBounds(radiusKm * 2200);
  map.fitBounds(bounds, { padding: [16, 16] });

  postReady();
  setTimeout(postReady, 80);
})();
</script>
</body>
</html>`;
}

const PIN_SIZE = 64;

type ParsedMessage =
  | { kind: "userPin"; pos: UserPinPosition }
  | { kind: "mapReady" }
  | { kind: "pinTap"; pin: PinTapPayload }
  | null;

interface RawMapMessage {
  type?: string;
  x?: number;
  y?: number;
  visible?: boolean;
  pin?: PinTapPayload;
  source?: string;
}

function parseMapMessage(raw: unknown): ParsedMessage {
  let m: RawMapMessage | null = null;
  if (typeof raw === "string") {
    try {
      m = JSON.parse(raw) as RawMapMessage;
    } catch {
      return null;
    }
  } else if (raw && typeof raw === "object") {
    m = raw as RawMapMessage;
  }
  if (!m || typeof m.type !== "string") return null;
  if (m.type === "userPin" && typeof m.x === "number" && typeof m.y === "number") {
    return { kind: "userPin", pos: { x: m.x, y: m.y, visible: m.visible !== false } };
  }
  if (m.type === "mapReady") return { kind: "mapReady" };
  if (m.type === "pin-tap" && m.source === "lifeweb-map" && m.pin && typeof m.pin.id === "number") {
    return { kind: "pinTap", pin: m.pin };
  }
  return null;
}

export function LocationMap({
  lat,
  lng,
  radiusKm = 10,
  pins = [],
  height = 280,
  onPinSelect,
  selectedPinId,
  preview = false,
}: Props) {
  const [debouncedPins, setDebouncedPins] = useState(pins);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedPins(pins), 250);
    return () => clearTimeout(id);
  }, [pins]);

  // HTML depends only on lat/lng/radius — never on pins. Pins are
  // streamed in via postMessage so refreshes preserve user pan/zoom.
  const html = useMemo(
    () => buildLeafletHtml(lat, lng, radiusKm),
    [lat, lng, radiusKm],
  );

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const webviewRef = useRef<WebView | null>(null);
  const onPinSelectRef = useRef(onPinSelect);
  useEffect(() => {
    onPinSelectRef.current = onPinSelect;
  }, [onPinSelect]);

  // Reset projected pin + ready flag whenever the map source changes.
  const [pinPos, setPinPos] = useState<UserPinPosition | null>(null);
  const [mapReady, setMapReady] = useState(false);
  useLayoutEffect(() => {
    setPinPos(null);
    setMapReady(false);
  }, [html]);

  // Push pins to the map whenever data changes (after it signals ready).
  useEffect(() => {
    if (!mapReady) return;
    if (Platform.OS === "web") {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "set-pins", pins: debouncedPins },
        "*",
      );
    } else {
      const json = JSON.stringify(JSON.stringify(debouncedPins));
      webviewRef.current?.injectJavaScript(
        `window.__renderPins && window.__renderPins(JSON.parse(${json})); true;`,
      );
    }
  }, [mapReady, debouncedPins]);

  const handleParsed = (parsed: ParsedMessage) => {
    if (!parsed) return;
    if (parsed.kind === "userPin") setPinPos(parsed.pos);
    else if (parsed.kind === "mapReady") setMapReady(true);
    else if (parsed.kind === "pinTap") onPinSelectRef.current?.(parsed.pin);
  };

  // Web: receive postMessage from the iframe.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    function handler(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      handleParsed(parseMapMessage(e.data));
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

  const onWebViewMessage = (e: WebViewMessageEvent) => {
    handleParsed(parseMapMessage(e.nativeEvent.data));
  };

  const pinOverlay =
    !preview && pinPos && pinPos.visible ? (
      <View
        pointerEvents="none"
        style={[
          styles.geoPin,
          {
            left: pinPos.x - PIN_SIZE / 2,
            top: pinPos.y - PIN_SIZE / 2,
            width: PIN_SIZE,
            height: PIN_SIZE,
          },
        ]}
      >
        <RiveLocationPin size={PIN_SIZE} />
      </View>
    ) : null;

  const emptyOverlay =
    !preview && pins.length === 0 ? (
      <View style={styles.emptyOverlay} pointerEvents="none">
        <RiveEmptyState
          icon="map"
          size={96}
          title="No observations on the map yet"
          description="Pan or expand your radius to find sightings."
        />
      </View>
    ) : null;

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
        {pinOverlay}
        {emptyOverlay}
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
        onMessage={onWebViewMessage}
      />
      {pinOverlay}
      {emptyOverlay}
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
  geoPin: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4,16,31,0.55)",
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
