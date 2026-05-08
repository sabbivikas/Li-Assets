import React from "react";
import { Link } from "wouter";
import { getIconicGroup } from "@/lib/inat";

interface PolaroidCardProps {
  id: number;
  imageUrl?: string;
  commonName: string;
  scientificName: string;
  count?: number;
  iconicTaxonName?: string;
}

export function PolaroidCard({ id, imageUrl, commonName, scientificName, count, iconicTaxonName }: PolaroidCardProps) {
  const group = getIconicGroup(iconicTaxonName);
  
  return (
    <Link href={`/species/${id}`} className="polaroid flex flex-col group cursor-pointer h-full">
      <div className="relative aspect-square w-full mb-3 bg-muted overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={commonName} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground font-body">No photo</div>
        )}
        {count !== undefined && (
          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-body shadow-sm">
            {count} sightings
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col">
        <h3 className="font-display text-xl leading-tight line-clamp-2">{commonName || "Unknown Species"}</h3>
        <p className="font-body text-sm text-muted-foreground italic mt-1">{scientificName}</p>
        
        <div className="mt-auto pt-3">
          <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full font-body">
            {group}
          </span>
        </div>
      </div>
    </Link>
  );
}