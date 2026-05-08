import { useState, useEffect } from 'react';

const YOSEMITE_LAT = 37.7459;
const YOSEMITE_LNG = -119.5332;

export function useLocation() {
  const [lat, setLat] = useState(YOSEMITE_LAT);
  const [lng, setLng] = useState(YOSEMITE_LNG);
  const [denied, setDenied] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setUpgraded(true);
      },
      () => {
        setDenied(true);
      },
      { timeout: 8000 }
    );
  }, []);

  return { lat, lng, denied, upgraded, ready: true };
}
