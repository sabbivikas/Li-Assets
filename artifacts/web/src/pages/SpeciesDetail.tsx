import React from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchSpeciesById, fetchHistogram, getConservationLabel } from "@/lib/inat";
import { getEcosystemRoles, ROLE_LABELS } from "@/lib/ecology";
import { useLocation } from "@/hooks/use-location";
import { ArrowLeft, Globe, BookOpen } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function SpeciesDetail() {
  const [, params] = useRoute("/species/:id");
  const id = Number(params?.id);
  const { lat, lng, ready } = useLocation();

  const { data: taxon, isLoading: isTaxonLoading } = useQuery({
    queryKey: ["taxon", id],
    queryFn: () => fetchSpeciesById(id),
    enabled: !!id,
  });

  const { data: histogram, isLoading: isHistLoading } = useQuery({
    queryKey: ["histogram", id, lat, lng],
    queryFn: () => fetchHistogram(id, lat, lng),
    enabled: !!id && ready,
  });

  if (isTaxonLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center h-64"><div className="animate-pulse font-display text-2xl">Loading...</div></div>;
  }

  if (!taxon) {
    return <div className="container mx-auto p-4 text-center font-body">Species not found</div>;
  }

  const commonName = taxon.preferred_common_name || taxon.name;
  const scientificName = taxon.name;
  const photo = taxon.taxon_photos?.[0]?.photo?.large_url || taxon.default_photo?.medium_url;
  const cons = getConservationLabel(taxon.conservation_status?.status);
  const roles = getEcosystemRoles(taxon.iconic_taxon_name, commonName);

  // Parse histogram data
  const chartData = [];
  if (histogram?.results) {
    const today = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      chartData.push({
        name: d.toLocaleString('default', { month: 'short' }),
        count: histogram.results[key] || 0,
      });
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-6 paper-texture min-h-[calc(100vh-3.5rem)] pb-20"
    >
      <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-primary font-body mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Discover
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="polaroid !rotate-0 mb-6">
            <div className="aspect-[4/3] bg-muted overflow-hidden relative">
              {photo ? (
                <img src={photo} alt={commonName} className="object-cover w-full h-full" />
              ) : (
                <div className="flex items-center justify-center h-full font-body text-muted-foreground">No photo available</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <div 
              className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: cons.color }}
            >
              {cons.label}
            </div>
          </div>
        </div>

        <div>
          <h1 className="text-5xl font-display font-bold leading-tight mb-1">{commonName}</h1>
          <p className="text-xl font-body italic text-muted-foreground mb-6">{scientificName}</p>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-display border-b-2 border-border/50 pb-2 mb-4">Ecosystem Roles</h2>
              <div className="flex flex-col gap-3">
                {roles.map(r => {
                  const role = ROLE_LABELS[r];
                  return (
                    <div key={r} className="flex items-start">
                      <div className="w-3 h-3 rounded-full mt-1.5 mr-3 flex-shrink-0" style={{ backgroundColor: role.color }} />
                      <div>
                        <div className="font-body font-bold text-lg">{role.label}</div>
                        <div className="font-body text-muted-foreground text-sm leading-tight">{role.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-display border-b-2 border-border/50 pb-2 mb-4">Local Sightings (Last 24 mo)</h2>
              <div className="h-48 w-full bg-background rounded-lg border-2 border-border/50 p-2">
                {isHistLoading ? (
                  <div className="w-full h-full flex items-center justify-center font-body">Loading chart...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-body)', fontSize: 12 }} interval="preserveStartEnd" />
                      <Tooltip 
                        contentStyle={{ fontFamily: 'var(--font-body)', borderRadius: '8px', border: '2px solid var(--ink-soft)' }}
                        cursor={{ fill: 'var(--paper-deep)' }}
                      />
                      <Bar dataKey="count" fill="var(--grass)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <div className="flex items-center text-muted-foreground font-body">
                <Globe className="w-5 h-5 mr-3" />
                <span><strong className="text-foreground">{taxon.observations_count?.toLocaleString()}</strong> global observations</span>
              </div>
              {taxon.wikipedia_url && (
                <a href={taxon.wikipedia_url} target="_blank" rel="noreferrer" className="flex items-center text-primary hover:underline font-body">
                  <BookOpen className="w-5 h-5 mr-3" />
                  Read more on Wikipedia
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}