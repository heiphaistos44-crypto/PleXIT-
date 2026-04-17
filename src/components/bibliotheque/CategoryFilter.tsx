"use client";

import { Film, Tv, Library, Music } from "lucide-react";
import { Category } from "./types";

const CATEGORIES: { value: Category; label: string; icon: React.ReactNode }[] = [
  { value: "all",       label: "Tout",            icon: <Library size={14} /> },
  { value: "movie",     label: "Films",           icon: <Film size={14} /> },
  { value: "show",      label: "Séries",          icon: <Tv size={14} /> },
  { value: "anime",     label: "Animé",           icon: <span style={{ fontSize: 14 }}>⛩️</span> },
  { value: "music",     label: "Artiste Musical", icon: <Music size={14} /> },
  { value: "exclusive", label: "Exclusivités",    icon: <span style={{ fontSize: 14 }}>💎</span> },
];

const CATEGORY_COLOR: Record<Category, string> = {
  all:       "#9ca3af",
  movie:     "#ef4444",
  show:      "#3b82f6",
  anime:     "#f59e0b",
  music:     "#22c55e",
  exclusive: "#a855f7",
};

interface CategoryFilterProps {
  category: Category;
  counts:   { all: number; movie: number; show: number; anime: number; music: number; exclusive: number };
  onChange: (cat: Category) => void;
}

export default function CategoryFilter({ category, counts, onChange }: CategoryFilterProps) {
  return (
    <>
      {CATEGORIES.map(c => {
        const color = CATEGORY_COLOR[c.value];
        const count = c.value === "all" ? counts.all : counts[c.value as keyof typeof counts];
        return (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 10, cursor: "pointer",
              border: `1px solid ${category === c.value ? color : "rgba(255,255,255,0.07)"}`,
              background: category === c.value ? `${color}15` : "rgba(255,255,255,0.02)",
              color: category === c.value ? color : "#9ca3af",
              fontSize: "0.83rem", fontWeight: 600, transition: "all 0.2s",
            }}
          >
            {c.icon} {c.label}
            {counts.all > 0 && count > 0 && (
              <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>{count}</span>
            )}
          </button>
        );
      })}
    </>
  );
}
