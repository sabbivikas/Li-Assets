import React from "react";
import { Link, useLocation } from "wouter";
import { Compass, Activity } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-display text-2xl font-bold text-primary">Natura</span>
          </Link>
          <div className="hidden md:flex space-x-4">
            <Link href="/" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
              <div className="flex items-center space-x-1">
                <Compass className="w-4 h-4" />
                <span>Discover</span>
              </div>
            </Link>
            <Link href="/signals" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/signals" ? "text-primary" : "text-muted-foreground"}`}>
              <div className="flex items-center space-x-1">
                <Activity className="w-4 h-4" />
                <span>Signals</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
      <div className="md:hidden flex border-t border-border/40 bg-background py-2 px-4 justify-around">
         <Link href="/" className={`flex flex-col items-center text-xs font-medium transition-colors hover:text-primary ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
            <Compass className="w-5 h-5 mb-1" />
            <span>Discover</span>
          </Link>
          <Link href="/signals" className={`flex flex-col items-center text-xs font-medium transition-colors hover:text-primary ${location === "/signals" ? "text-primary" : "text-muted-foreground"}`}>
            <Activity className="w-5 h-5 mb-1" />
            <span>Signals</span>
          </Link>
      </div>
    </nav>
  );
}