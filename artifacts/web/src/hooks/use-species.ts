import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Types for iNaturalist response
export interface INatSpecies {
  count: number;
  taxon: {
    id: number;
    name: string;
    preferred_common_name?: string;
    iconic_taxon_name?: string;
    default_photo?: {
      medium_url: string;
      attribution: string;
    };
  };
}

export interface INatResponse {
  total_results: number;
  results: INatSpecies[];
}

const YOSEMITE_LAT = 37.7459;
const YOSEMITE_LNG = -119.5332;

export function useSpecies() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("Yosemite Valley");
  const [status, setStatus] = useState<'loading' | 'locating' | 'success' | 'fallback'>('locating');

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ lat: YOSEMITE_LAT, lng: YOSEMITE_LNG });
      setStatus('fallback');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setStatus('success');
        
        // Try to get a rough location name using reverse geocoding (OpenStreetMap Nominatim)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.county || "Your Neighborhood";
            setLocationName(city);
          } else {
            setLocationName("Your Neighborhood");
          }
        } catch (e) {
          setLocationName("Your Neighborhood");
        }
      },
      () => {
        // Fallback to Yosemite if user denies
        setLocation({ lat: YOSEMITE_LAT, lng: YOSEMITE_LNG });
        setStatus('fallback');
      },
      { timeout: 5000 }
    );
  }, []);

  const { data, isLoading, error } = useQuery<INatResponse>({
    queryKey: ['species', location?.lat, location?.lng],
    queryFn: async () => {
      if (!location) throw new Error("No location");
      const res = await fetch(
        `https://api.inaturalist.org/v1/observations/species_counts?lat=${location.lat}&lng=${location.lng}&radius=10&quality_grade=research&per_page=12`
      );
      if (!res.ok) throw new Error("Failed to fetch species");
      return res.json();
    },
    enabled: !!location,
  });

  return {
    data: data?.results || [],
    isLoading: isLoading || status === 'locating',
    error,
    status,
    locationName
  };
}
