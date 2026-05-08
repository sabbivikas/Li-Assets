import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNearbySpecies } from "@/lib/inat";
import { useLocation } from "@/hooks/use-location";
import { PolaroidCard } from "@/components/ui/polaroid-card";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = ["All", "Birds", "Plants", "Insects", "Mammals", "Amphibians", "Fungi", "Reptiles"];

export default function Discover() {
  const { lat, lng, loading: locLoading, denied, ready } = useLocation();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const { data: species, isLoading } = useQuery({
    queryKey: ["nearby-species", lat, lng],
    queryFn: () => fetchNearbySpecies(lat, lng, 10, 50),
    enabled: ready,
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

  return (
    <div className="container mx-auto px-4 py-8 paper-texture min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-xl mb-8">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
          Discover Local <span className="text-primary scribble-underline">Wildlife</span>
        </h1>
        {denied && (
          <div className="flex items-center text-sm text-orange-600 bg-orange-100/50 p-3 rounded-lg font-body">
            <MapPin className="w-4 h-4 mr-2" />
            Using Yosemite Valley as your location
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search species..." 
            className="pl-9 font-body text-lg border-2"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-body text-lg transition-colors ${
                filter === cat 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background border-2 border-border/50 hover:border-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {(locLoading || isLoading) ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="polaroid animate-pulse h-64">
              <div className="w-full h-3/4 bg-muted mb-4" />
              <div className="h-4 bg-muted w-3/4 mb-2" />
              <div className="h-3 bg-muted w-1/2" />
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
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
        >
          {filteredSpecies.map(s => (
            <motion.div key={s.taxon.id} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
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
          
          {filteredSpecies.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground font-body text-lg">
              No species found matching your criteria.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}