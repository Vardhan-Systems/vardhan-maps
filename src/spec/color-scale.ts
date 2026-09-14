/** Default choropleth ramp (low → high), a light-to-dark blue. */
export const DEFAULT_RAMP = ["#eff6ff", "#bfdbfe", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"];

export interface ColorScale {
  min: number;
  max: number;
  /** Colour for a value, bucketed linearly across the ramp. */
  colorFor(value: number): string;
}

/**
 * Build a linear bucketed colour scale over `values`. When all values are equal
 * (or there's one), every value maps to the top colour. An empty ramp falls back
 * to the default; an empty value set yields a scale that always returns the ramp's
 * first colour.
 */
export function buildColorScale(values: number[], colors: string[] = DEFAULT_RAMP): ColorScale {
  const ramp = colors.length > 0 ? colors : DEFAULT_RAMP;
  const finite = values.filter((v) => Number.isFinite(v));
  const hasData = finite.length > 0;
  const min = hasData ? Math.min(...finite) : 0;
  const max = hasData ? Math.max(...finite) : 0;
  return {
    min,
    max,
    colorFor(value: number): string {
      // No data, or a non-numeric value → the lightest (neutral) colour.
      if (!hasData || !Number.isFinite(value)) return ramp[0];
      // A single distinct value (all equal) reads as the top of the ramp.
      if (max <= min) return ramp[ramp.length - 1];
      const t = (value - min) / (max - min); // 0..1
      const idx = Math.min(ramp.length - 1, Math.floor(t * ramp.length));
      return ramp[idx];
    },
  };
}
