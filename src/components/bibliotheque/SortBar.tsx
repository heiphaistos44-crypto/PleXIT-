"use client";

import { SortMode } from "./types";

interface SortBarProps {
  sort:           SortMode;
  total:          number;
  page:           number;
  totalPages:     number;
  pageSize:       number;
  debouncedSearch: string;
  onChange:       (sort: SortMode) => void;
}

export default function SortBar({
  sort, total, page, totalPages, pageSize, debouncedSearch, onChange,
}: SortBarProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 6 }}>
      <p style={{ fontSize: "0.82rem", color: "#4b5563" }}>
        {total.toLocaleString("fr")} résultat{total !== 1 ? "s" : ""}
        {debouncedSearch && ` pour "${debouncedSearch}"`}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {totalPages > 1 && (
          <p style={{ fontSize: "0.82rem", color: "#4b5563" }}>
            Page <strong style={{ color: "#9ca3af" }}>{page}</strong> / {totalPages}
            <span style={{ marginLeft: 8, color: "#374151" }}>
              ({((page - 1) * pageSize + 1).toLocaleString("fr")}–{Math.min(page * pageSize, total).toLocaleString("fr")})
            </span>
          </p>
        )}
        <select
          value={sort}
          onChange={e => onChange(e.target.value as SortMode)}
          className="input-plexit"
          style={{ width: "auto", paddingLeft: 12, cursor: "pointer" }}
        >
          <option value="recent">Plus récents</option>
          <option value="alpha">A → Z</option>
          <option value="rating">Mieux notés</option>
          <option value="year">Année</option>
        </select>
      </div>
    </div>
  );
}
