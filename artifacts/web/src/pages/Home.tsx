import { motion, useScroll, useTransform } from "framer-motion";
import { useSpecies, INatSpecies } from "@/hooks/use-species";
import { useRef } from "react";
import { Download, Leaf, Bird, Bug, Compass, ArrowDown } from "lucide-react";
import mascotSrc from "../../../mobile/assets/images/icon.png";

export default function Home() {
  const { data: species, isLoading, locationName, status } = useSpecies();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const mascotY = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <div ref={containerRef} className="w-full min-h-screen bg-background paper-texture font-body text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 mix-blend-multiply">
        <div className="font-display text-3xl font-bold tracking-wider text-ink">Natura</div>
        <a 
          href="#download" 
          className="px-6 py-2 bg-[var(--grass)] text-ink rounded-full border-2 border-ink shadow-[4px_4px_0px_var(--ink)] font-bold text-lg transition-transform hover:translate-y-1 hover:translate-x-1 hover:shadow-[0px_0px_0px_var(--ink)]"
        >
          Get the App
        </a>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-10 px-6 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="z-10 text-center max-w-3xl"
        >
          <h1 className="font-display text-6xl md:text-8xl text-ink font-bold mb-6 leading-tight">
            Meet the wild things <br /> <span className="text-[var(--grass)] scribble-underline">living next door.</span>
          </h1>
          <p className="text-2xl md:text-3xl text-ink-soft max-w-2xl mx-auto mb-10 leading-relaxed">
            Turn your neighborhood into a living field guide. Discover every bird, plant, and insect sharing your habitat.
          </p>
          <a href="#discover" className="inline-flex items-center gap-2 text-ink-mute hover:text-ink transition-colors group text-xl">
            <span>Scroll to explore</span>
            <ArrowDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
          </a>
        </motion.div>

        {/* Mascot / Floating elements */}
        <motion.img 
          src={mascotSrc} 
          alt="Natura Mascot" 
          style={{ y: mascotY }}
          animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-64 h-64 md:w-96 md:h-96 opacity-20 -right-10 md:right-10 top-1/4 pointer-events-none drop-shadow-xl"
        />
        
        {/* Decorative Doodles */}
        <div className="absolute left-10 top-1/3 opacity-30 text-[var(--orange)]">
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            <path d="M20,50 Q40,20 60,50 T100,50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <circle cx="20" cy="50" r="4" fill="currentColor" />
            <circle cx="60" cy="50" r="4" fill="currentColor" />
            <circle cx="100" cy="50" r="4" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* Discovery Section */}
      <section id="discover" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-5xl md:text-6xl font-bold mb-4">
              Recently spotted in <span className="text-[var(--sun)] bg-ink px-2 inline-block -rotate-1 rounded-sm">{locationName}</span>
            </h2>
            <p className="text-xl text-ink-soft">
              {status === 'fallback' 
                ? "Since we couldn't get your location, here's a peek at Yosemite. Allow location to see your own neighborhood!" 
                : "Real data fetched right now from your local ecosystem."}
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="polaroid animate-pulse bg-paper-deep h-64 rounded-md"></div>
              ))}
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              variants={{
                hidden: {},
                show: {
                  transition: { staggerChildren: 0.1 }
                }
              }}
            >
              {species.map((item: INatSpecies, i: number) => (
                <motion.div 
                  key={item.taxon.id}
                  variants={{
                    hidden: { opacity: 0, y: 50, scale: 0.9 },
                    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4 } }
                  }}
                  className="polaroid flex flex-col"
                  style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}
                >
                  <div className="w-full aspect-square bg-paper-deep mb-3 overflow-hidden rounded-sm relative group">
                    {item.taxon.default_photo ? (
                      <img 
                        src={item.taxon.default_photo.medium_url} 
                        alt={item.taxon.name}
                        className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink-mute">
                        <Leaf size={40} />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-paper/90 px-2 py-1 rounded text-xs font-bold font-sans uppercase text-ink flex items-center gap-1">
                      {getTaxonIcon(item.taxon.iconic_taxon_name)}
                      {item.taxon.iconic_taxon_name || "Unknown"}
                    </div>
                  </div>
                  <h3 className="font-display text-2xl font-bold leading-tight">
                    {item.taxon.preferred_common_name || item.taxon.name}
                  </h3>
                  <p className="text-ink-soft italic text-sm font-serif">
                    {item.taxon.name}
                  </p>
                  <p className="mt-auto pt-2 text-xs text-ink-mute">
                    Spotted {item.count} times nearby
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* How it Works / Magic Section */}
      <section className="py-24 px-6 bg-[var(--paper-deep)] border-y-2 border-ink border-dashed">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-5xl font-bold mb-8">A pocket-sized <br/><span className="text-[var(--purple)]">naturalist.</span></h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 shrink-0 bg-[var(--sky)] rounded-full flex items-center justify-center border-2 border-ink shadow-[2px_2px_0px_var(--ink)]">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold font-display">Wander</h4>
                    <p className="text-lg text-ink-soft">Step outside. Natura alerts you to species hovering nearby, mapped by real naturalists.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 shrink-0 bg-[var(--pink)] rounded-full flex items-center justify-center border-2 border-ink shadow-[2px_2px_0px_var(--ink)]">
                    <Leaf className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-bold font-display">Collect</h4>
                    <p className="text-lg text-ink-soft">Snap a photo to log your findings. Build your own personal field notebook of life.</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className="relative aspect-[4/5] bg-paper border-4 border-ink shadow-[12px_12px_0px_var(--ink)] rounded-2xl overflow-hidden p-4"
              initial={{ opacity: 0, rotate: 5 }}
              whileInView={{ opacity: 1, rotate: -2 }}
              viewport={{ once: true }}
            >
              <div className="w-full h-full border-2 border-ink/20 rounded-xl relative">
                {/* Simulated App Screen */}
                <div className="absolute inset-0 p-6 flex flex-col bg-paper">
                  <div className="w-full h-48 bg-[var(--sky)] rounded-xl mb-4 border-2 border-ink flex items-center justify-center">
                    <Bird className="w-16 h-16 text-ink/50" />
                  </div>
                  <div className="h-6 w-2/3 bg-ink/10 rounded mb-2"></div>
                  <div className="h-4 w-1/2 bg-ink/10 rounded mb-6"></div>
                  
                  <div className="flex-1"></div>
                  <div className="w-full h-12 bg-[var(--grass)] rounded-full border-2 border-ink shadow-[2px_2px_0px_var(--ink)]"></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Field Notes Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-5xl font-bold mb-4">
              Your digital <span className="text-[var(--grass)] scribble-underline">field notebook</span>
            </h2>
            <p className="text-xl text-ink-soft">Every observation becomes part of your story.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div 
              className="bg-paper-deep p-6 rounded-lg border-2 border-ink shadow-[4px_4px_0px_var(--ink)] transform -rotate-2"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="font-display text-4xl mb-2 text-[var(--orange)]">8.5M+</div>
              <div className="font-bold text-lg">Species identified</div>
              <div className="text-ink-soft text-sm mt-2">Powered by iNaturalist's global community of naturalists.</div>
            </motion.div>
            
            <motion.div 
              className="bg-paper p-6 rounded-lg border-2 border-ink shadow-[4px_4px_0px_var(--ink)] transform rotate-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="font-display text-4xl mb-2 text-[var(--purple)]">Offline</div>
              <div className="font-bold text-lg">Works anywhere</div>
              <div className="text-ink-soft text-sm mt-2">Wander deep into the woods. Your field guide works without a signal.</div>
            </motion.div>

            <motion.div 
              className="bg-paper-deep p-6 rounded-lg border-2 border-ink shadow-[4px_4px_0px_var(--ink)] transform -rotate-1"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="font-display text-4xl mb-2 text-[var(--grass)]">100%</div>
              <div className="font-bold text-lg">Free & Open</div>
              <div className="text-ink-soft text-sm mt-2">No ads. No paywalls. Just you and the natural world.</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="download" className="py-32 px-6 text-center relative overflow-hidden">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto relative z-10"
        >
          <h2 className="font-display text-6xl font-bold mb-6">Ready to meet the neighbors?</h2>
          <p className="text-2xl text-ink-soft mb-12">Join the TestFlight beta and start your collection today.</p>
          
          <a 
            href="#download" 
            className="inline-flex items-center gap-3 px-8 py-4 bg-[var(--ink)] text-paper rounded-full text-2xl font-bold hover:bg-ink-soft transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1"
          >
            <Download className="w-6 h-6" />
            Available on iOS
          </a>
        </motion.div>
        
        {/* Background blobs */}
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-[var(--pink)] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[var(--sun)] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: "1s" }}></div>
      </section>

      <footer className="py-8 text-center border-t-2 border-ink/10 text-ink-mute">
        <p className="text-lg">© {new Date().getFullYear()} Natura. Built with wonder.</p>
      </footer>
    </div>
  );
}

// Helper to render correct icon
function getTaxonIcon(name?: string) {
  if (!name) return <Leaf size={14} />;
  const n = name.toLowerCase();
  if (n.includes('aves') || n.includes('bird')) return <Bird size={14} />;
  if (n.includes('insect') || n.includes('arachnid')) return <Bug size={14} />;
  return <Leaf size={14} />;
}
