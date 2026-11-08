/**
 * Deterministic number formatting utilities.
 * Uses explicit "en-US" locale to eliminate React hydration mismatch errors
 * when running Next.js SSR on systems with localized OS settings (such as Arabic / Egyptian Windows locales).
 */

export function formatNum(val: number | undefined | null, decimals: number = 0): string {
  if (val === undefined || val === null || isNaN(val)) return "0";
  return val.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

