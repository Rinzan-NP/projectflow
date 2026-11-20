"use client";

import React, { useState } from "react";
import { Pipette, Check } from "lucide-react";

export const CURATED_PALETTE = [
  // Blues & Indigos
  "#3b82f6", // Blue
  "#2563eb", // Royal Blue
  "#6366f1", // Indigo
  "#0284c7", // Sky Blue
  "#06b6d4", // Cyan
  // Purples & Pinks
  "#8b5cf6", // Purple
  "#a855f7", // Violet
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  "#f43f5e", // Rose
  // Greens & Teals
  "#10b981", // Emerald
  "#059669", // Deep Emerald
  "#14b8a6", // Teal
  "#22c55e", // Green
  "#84cc16", // Lime
  // Ambers & Oranges
  "#eab308", // Yellow
  "#f59e0b", // Amber
  "#f97316", // Orange
  "#ea580c", // Deep Orange
  "#e11d48", // Crimson
  // Neutrals & Monochromes
  "#64748b", // Slate
  "#71717a", // Zinc
  "#475569", // Dark Slate
  "#0f172a", // Midnight
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function ColorPicker({
  value,
  onChange,
  label,
  className = "",
  size = "md",
}: ColorPickerProps) {
  const [customHex, setCustomHex] = useState(value || "#3b82f6");

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    onChange(val);
  };

  const isPreset = CURATED_PALETTE.includes(value?.toLowerCase());

  const buttonSizeClass = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">{label}</label>
          <span className="text-[11px] font-mono text-muted-foreground uppercase">{value}</span>
        </div>
      )}

      {/* Grid of Presets */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border bg-card/60">
        {CURATED_PALETTE.map((c) => {
          const isSelected = value?.toLowerCase() === c.toLowerCase();
          return (
            <button
              type="button"
              key={c}
              onClick={() => {
                setCustomHex(c);
                onChange(c);
              }}
              title={c}
              className={`${buttonSizeClass} rounded-full transition-transform cursor-pointer flex items-center justify-center shrink-0 ${
                isSelected
                  ? "scale-115 ring-2 ring-primary ring-offset-1 ring-offset-background z-10"
                  : "hover:scale-110 opacity-90 hover:opacity-100"
              }`}
              style={{ backgroundColor: c }}
            >
              {isSelected && <Check className="h-3 w-3 text-white drop-shadow-md" />}
            </button>
          );
        })}

        {/* Custom Color Eyedropper / Color Wheel Picker */}
        <div className="relative flex items-center pl-1 border-l ml-1">
          <label
            title="Choose custom color"
            className={`${buttonSizeClass} rounded-full border-2 border-dashed border-muted-foreground/50 hover:border-primary flex items-center justify-center cursor-pointer transition-all hover:scale-110 overflow-hidden ${
              !isPreset ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
            }`}
            style={{ backgroundColor: !isPreset ? value : undefined }}
          >
            <input
              type="color"
              value={value || "#3b82f6"}
              onChange={handleCustomChange}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
            {isPreset ? (
              <Pipette className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Check className="h-3 w-3 text-white drop-shadow-md" />
            )}
          </label>
        </div>
      </div>
    </div>
  );
}
