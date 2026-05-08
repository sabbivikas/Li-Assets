import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNearbySpecies } from "@/lib/inat";
import { useLocation } from "@/hooks/use-location";
import { PolaroidCard } from "@/components/ui/polaroid-card";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Locate, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import mascotSrc from "../../../mobile/assets/images/icon.png";

const CATEGORIES = ["All", "Birds", "Plants", "Insects", "Mammals", "Amphibians", "Fungi", "Reptiles"];

function LocationPrompt({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 paper-texture">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full text-center"
      >
        <motion.img
          src={mascotSrc}
          alt="Natura"
          className="w-36 h-36 mx-auto mb-6 drop-shadow-lg"
          animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        <h1 className="font-display text-4xl font-bold text-foreground mb-3">
          What's living near <span className="text-primary">you?</span>
        </h1>
        <p className="font-body text-lg text-muted-foreground mb-8 leading-relaxed">
          Natura uses your location to show the real birds, plants, insects, and fungi sharing your neighborhood — powered by live iNaturalist data.
        </p>

        <div className="space-y-3">
          <motion.button
            onClick={onAllow}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-foreground rounded-2xl font-body text-lg font-bold border-2 border-foreground shadow-[4px_4px_0px_var(--ink)] hover:shadow-[2px_2px_0px_var(--ink)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Locate className="w-5 h-5" />
            Allow location access
          </motion.button>

          <button
            onClick={onSkip}
            className="w-full px-6 py-3 font-body text-base text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Skip — show me Yosemite Valley instead
          </button>
        </div>

        <p className="mt-6 font-body text-sm text-muted-foreground/70">
          Your location is only used to fetch nearby species. Nothing is stored.
        </p>
      </motion.div>
    </div>
  );
}

function LocationRequesting() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 paper-texture">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-14 h-14 mx-auto mb-6"
        >
          <Loader2 className="w-14 h-14 text-primary" />
        </motion.div>
        <p className="font-display text-2xl font-bold text-foreground mb-2">Finding your neighborhood…</p>
        <p className="font-body text-muted-foreground">Allow the browser prompt to continue</p>
      </motion.div>
    </div>
  );
}

export default function Discover() {
  const { status, lat, lng, placeName, request, useFallback } = useLocation();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const hasLocation = (status === "granted" || status === "denied") && lat !== null && lng !== null;

  const { data: species, isLoading: speciesLoading } = useQuery({
    queryKey: ["nearby-species", lat, lng],
    queryFn: () => fetchNearbySpecies(lat!, lng!, 10, 50),
    enabled: hasLocation,
    staleTime: 5 * 60 * 1000,
  });

  const filteredSpecies = species?.filter(s => {
    if (filter !== "All") {
      const g = s.taxon.iconic_taxon_name;
      if (filter === "Birds" && g !== "Aves") return false;
      if (filter === "Plants" && g !== "Plantae") return false;
      if (filter === "Insects" && g !== "Insecta") return false;
      if (filter === "Mammals" && g !== "Mammalia") return false;
      if (filter === "Amphibians" && g !== "Amphibia") return false;
      if (filter === "Fungi" && g !== "Fungi") return false;
      if (filter === "Reptiles" && g !== "Reptilia") return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const cn = (s.taxon.preferred_common_name || s.taxon.name).toLowerCase();
      const sn = s.taxon.name.toLowerCase();
      if (!cn.includes(q) && !sn.includes(q)) return false;
    }
    return true;
  }) || [];

  if (status === "idle") {
    return <LocationPrompt onAllow={request} onSkip={useFallback} />;
  }

  if (status === "requesting") {
    return <LocationRequesting />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="discover"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="container mx-auto px-4 py-8 paper-texture min-h-[calc(100vh-3.5rem)]"
      >
        <div className="max-w-xl mb-6">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-3">
            Discover Local <span className="text-primary scribble-underline">Wildlife</span>
          </h1>

          <div className="flex items-center gap-2 font-body text-base">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            {status === "granted" ? (
              <span className="text-foreground font-bold">
                {placeName ?? "Your location"}
                <span className="font-normal text-muted-foreground ml-1">
                  — {species?.length ?? "…"} species found within 10km
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">
                Showing <strong className="text-foreground">Yosemite Valley</strong> — location access was declined.{" "}
                <button onClick={request} className="underline underline-offset-2 text-primary hover:text-primary/80 transition-colors">
                  Try again
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search species..."
              className="pl-9 font-body text-base border-2"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full font-body text-base transition-all ${
                  filter === cat
                    ? "bg-primary text-foreground shadow-sm font-bold"
                    : "bg-background border-2 border-border/50 hover:border-primary text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {speciesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="polaroid animate-pulse h-64">
                <div className="w-full h-3/4 bg-muted rounded mb-3" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
          >
            {filteredSpecies.map(s => (
              <motion.div
                key={s.taxon.id}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              >
                <PolaroidCard
                  id={s.taxon.id}
                  imageUrl={s.taxon.default_photo?.medium_url}
                  commonName={s.taxon.preferred_common_name || s.taxon.name}
                  scientificName={s.taxon.name}
                  count={s.count}
                  iconicTaxonName={s.taxon.iconic_taxon_name}
                />
              </motion.div>
            ))}

            {filteredSpecies.length === 0 && !speciesLoading && (
              <div className="col-span-full py-16 text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                <p className="font-body text-lg text-muted-foreground">No species match your search.</p>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
