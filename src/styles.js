export const S = {
  // Layout
  appBg: { display: "flex", minHeight: "100vh", background: "#0f172a", fontFamily: "'DM Sans', sans-serif" },
  sidebar: { width: 230, background: "#080e1a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", padding: "24px 0", position: "sticky", top: 0, height: "100vh", flexShrink: 0 },
  main: { flex: 1, overflowY: "auto", padding: "32px 28px" },
  pageWrap: { maxWidth: 960, margin: "0 auto" },

  // Sidebar
  sidebarLogo: { display: "flex", gap: 10, alignItems: "center", padding: "0 20px 24px", borderBottom: "1px solid #1e293b", marginBottom: 16 },
  userBadge: { display: "flex", gap: 10, alignItems: "center", padding: "12px", background: "#0f172a", margin: "0 12px 20px", borderRadius: 10, border: "1px solid #1e293b" },
  navBtn: { display: "block", width: "100%", textAlign: "left", padding: "12px 20px", border: "none", fontSize: 14, fontWeight: 500, transition: "all .15s", borderRadius: 0, cursor: "pointer", background: "transparent" },
  logoutBtn: { margin: "0 12px", padding: "10px 0", background: "transparent", border: "1px solid #1e293b", borderRadius: 8, color: "#475569", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },

  // Login
  loginBg: { minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" },
  loginCard: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "48px 40px", width: "100%", maxWidth: 420, boxShadow: "0 25px 60px #00000088" },

  // Cards
  card: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 },
  cardTitle: { color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },

  // Inputs
  input: { width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "inherit" },
  select: { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "inherit", cursor: "pointer" },

  // Buttons
  btnPrimary: { background: "#f59e0b", color: "#000", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
  btnDanger: { background: "#7f1d1d", border: "none", color: "#f87171", borderRadius: 6, padding: "5px 12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  btnGhost: { background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },

  // Typography
  sectionHead: { display: "flex", gap: 14, alignItems: "center", marginBottom: 24 },
  sectionIcon: { fontSize: 36 },
  sectionTitle: { fontFamily: "'Bebas Neue'", fontSize: 26, color: "#e2e8f0", letterSpacing: 2 },
  sectionSub: { color: "#475569", fontSize: 13 },

  // Badges
  typeBadge: (color) => ({ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999, color: "#fff", background: color, letterSpacing: 1 }),
  roleBadge: (isAdmin) => ({
    fontSize: 11, padding: "3px 12px", borderRadius: 999,
    background: isAdmin ? "#7c3aed" : "#0f172a",
    border: `1px solid ${isAdmin ? "#a78bfa" : "#334155"}`,
    color: isAdmin ? "#c4b5fd" : "#64748b"
  }),

  // Quiz
  optionBtn: (bg, border) => ({ display: "flex", alignItems: "center", gap: 10, background: bg, border, borderRadius: 8, padding: "10px 14px", color: "#cbd5e1", fontSize: 14, textAlign: "left", cursor: "pointer", width: "100%", fontFamily: "inherit", transition: "all .15s" }),
  optionLetter: { background: "#0f172a", color: "#64748b", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontSize: 12, fontWeight: 700, flexShrink: 0 },

  // Table
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid #1e293b" },
  td: { padding: "12px 14px", color: "#cbd5e1", borderBottom: "1px solid #0f172a" },
};
