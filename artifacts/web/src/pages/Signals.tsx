import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCurrentYearSpecies, fetchPriorYearSpecies, getConservationLabel } from "@/lib/inat";
import { useLocation } from "@/hooks/use-location";
import { PolaroidCard } from "@/components/ui/polaroid-card";
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, AlertTriangle } from "lucide-react";

export default function Signals() {
  const { lat, lng, ready } = useLocation();

  const { data: current, isLoading: isCurLoading } = useQuery({
    queryKey: ["species-cur", lat, lng],
    queryFn: () => fetchCurrentYearSpecies(lat, lng),
    enabled: ready,
  });

  const { data: prior, isLoading: isPriorLoading } = useQuery({
    queryKey: ["species-prior", lat, lng],
    queryFn: () => fetchPriorYearSpecies(lat, lng),
    enabled: ready,
  });

  const isLoading = isCurLoading || isPriorLoading;

  // Compute signals
  const newArrivals = [];
  const increasing = [];
  const watchlist = [];

  if (current && prior) {
    const priorMap = new Map(prior.map(p => [p.taxon.id, p.count]));
    
    current.forEach(c => {
      const pCount = priorMap.get(c.taxon.id) || 0;
      const status = c.taxon.conservation_status?.status;

      // New arrival
      if (pCount === 0 && c.count > 2) {
        newArrivals.push(c);
      }
      // Increasing
      else if (pCount > 0 && c.count > pCount * 1.5 && c.count > 5) {
        increasing.push(c);
      }

      // Watchlist
      if (status && ["CR", "EN", "VU"].includes(status.toUpperCase())) {
        watchlist.push(c);
      }
    });
  }

  return (
    <div className="container mx-auto px-4 py-8 paper-texture min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-2xl mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
          Biodiversity <span className="text-sky scribble-underline">Signals</span>
        </h1>
        <p className="font-body text-xl text-muted-foreground">
          Real-time trends comparing local sightings this year vs last year.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 font-display text-2xl animate-pulse text-muted-foreground">
          Analyzing local ecosystem...
        </div>
      ) : (
        <motion.div 
          initial="hidden" animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
          className="space-y-12 pb-20"
        >
          {/* New Arrivals */}
          {newArrivals.length > 0 && (
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
              <div className="flex items-center mb-6 border-b-2 border-border/50 pb-2">
                <Sparkles className="w-6 h-6 text-sun mr-3" />
                <h2 className="text-3xl font-display font-bold">New Arrivals</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {newArrivals.slice(0, 4).map(s => (
                  <PolaroidCard key={s.taxon.id} id={s.taxon.id} imageUrl={s.taxon.default_photo?.medium_url} commonName={s.taxon.preferred_common_name || s.taxon.name} scientificName={s.taxon.name} iconicTaxonName={s.taxon.iconic_taxon_name} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Increasing */}
          {increasing.length > 0 && (
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
              <div className="flex items-center mb-6 border-b-2 border-border/50 pb-2">
                <TrendingUp className="w-6 h-6 text-grass mr-3" />
                <h2 className="text-3xl font-display font-bold">Surging Populations</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {increasing.slice(0, 4).map(s => (
                  <PolaroidCard key={s.taxon.id} id={s.taxon.id} imageUrl={s.taxon.default_photo?.medium_url} commonName={s.taxon.preferred_common_name || s.taxon.name} scientificName={s.taxon.name} iconicTaxonName={s.taxon.iconic_taxon_name} count={s.count} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Watchlist */}
          {watchlist.length > 0 && (
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
              <div className="flex items-center mb-6 border-b-2 border-border/50 pb-2">
                <AlertTriangle className="w-6 h-6 text-orange mr-3" />
                <h2 className="text-3xl font-display font-bold">Conservation Watchlist</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {watchlist.slice(0, 4).map(s => (
                  <PolaroidCard key={s.taxon.id} id={s.taxon.id} imageUrl={s.taxon.default_photo?.medium_url} commonName={s.taxon.preferred_common_name || s.taxon.name} scientificName={s.taxon.name} iconicTaxonName={s.taxon.iconic_taxon_name} />
                ))}
              </div>
            </motion.div>
          )}

          {newArrivals.length === 0 && increasing.length === 0 && watchlist.length === 0 && (
             <div className="text-center py-12 font-body text-xl text-muted-foreground">
               No significant signals detected in your area right now. Check back as more sightings are reported!
             </div>
          )}
        </motion.div>
      )}
    </div>
  );
}