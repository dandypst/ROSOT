// ── Theme definitions ─────────────────────────────────────────
export const THEMES = {
  night: {
    label: "🌙 Night",
    vars: {
      "--bgPage":             "#0f172a",
      "--bgSidebar":          "#080e1a",
      "--bgCard":             "#0f172a",
      "--bgInput":            "#1e293b",
      "--border":             "#1e293b",
      "--borderMid":          "#334155",
      "--textPrimary":        "#e2e8f0",
      "--textSecondary":      "#94a3b8",
      "--textMuted":          "#475569",
      "--accent":             "#f59e0b",
      "--scrollbar":          "#334155",
      "--scrollbarTrack":     "#0f172a",
      "--answerWrongBg":      "#7f1d1d22",
      "--answerWrongBorder":  "#7f1d1d",
      "--answerWrongText":    "#f87171",
      "--answerRightBg":      "#166534",
      "--answerRightBorder":  "#4ade80",
      "--answerRightText":    "#4ade80",
      "--navActive":          "#1e293b",
    }
  },
  day: {
    label: "☀️ Day",
    vars: {
      "--bgPage":             "#f1f5f9",
      "--bgSidebar":          "#1e293b",
      "--bgCard":             "#ffffff",
      "--bgInput":            "#f8fafc",
      "--border":             "#e2e8f0",
      "--borderMid":          "#cbd5e1",
      "--textPrimary":        "#0f172a",
      "--textSecondary":      "#475569",
      "--textMuted":          "#94a3b8",
      "--accent":             "#f59e0b",
      "--scrollbar":          "#cbd5e1",
      "--scrollbarTrack":     "#f1f5f9",
      "--answerWrongBg":      "#fee2e2",
      "--answerWrongBorder":  "#fca5a5",
      "--answerWrongText":    "#dc2626",
      "--answerRightBg":      "#dcfce7",
      "--answerRightBorder":  "#86efac",
      "--answerRightText":    "#16a34a",
      "--navActive":          "#0f172a",
    }
  },
};

const STORAGE_KEY = "rosot_theme";

export function getSavedTheme() {
  return localStorage.getItem(STORAGE_KEY) || "night";
}

export function applyTheme(key) {
  const theme = THEMES[key];
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  localStorage.setItem(STORAGE_KEY, key);
}
