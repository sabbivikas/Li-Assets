import { useState, useCallback } from 'react';

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied';

const FALLBACK_LAT = 37.7459;
const FALLBACK_LNG = -119.5332;
const FALLBACK_NAME = 'Yosemite Valley';

export interface LocationState {
  status: LocationStatus;
  lat: number | null;
  lng: number | null;
  placeName: string | null;
  request: () => void;
  useFallback: () => void;
}

export function useLocation(): LocationState {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setLat(FALLBACK_LAT);
      setLng(FALLBACK_LNG);
      setPlaceName(FALLBACK_NAME);
      setStatus('denied');
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setStatus('granted');
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const city =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            data?.address?.county ||
            data?.address?.state;
          if (city) setPlaceName(city);
        } catch {
          // silently ignore reverse geocode failure
        }
      },
      () => {
        setLat(FALLBACK_LAT);
        setLng(FALLBACK_LNG);
        setPlaceName(FALLBACK_NAME);
        setStatus('denied');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  const useFallback = useCallback(() => {
    setLat(FALLBACK_LAT);
    setLng(FALLBACK_LNG);
    setPlaceName(FALLBACK_NAME);
    setStatus('denied');
  }, []);

  return { status, lat, lng, placeName, request, useFallback };
}
