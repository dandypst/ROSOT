import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { isAdmin } from "./utils/helpers";
import LoginPage from "./pages/LoginPage";
import DailyPage from "./pages/DailyPage";
import BankPage from "./pages/BankPage";
import ScorePage from "./pages/ScorePage";
import RekapPage from "./pages/RekapPage";
import AdminPage from "./pages/AdminPage";
import TelcoLogo from "./components/TelcoLogo";
import { S } from "./styles";

export default function App() {
  const [user, setUser] = useState(undefined);
  const [page, setPage] = useState("daily");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return unsub;
  }, []);

  // Close sidebar when page changes on mobile
  const goTo = (p) => {
    setPage(p);
    setSidebarOpen(false);
  };

  if (user === undefined) return (
    <div style={{ background: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#f59e0b", fontFamily: "monospace", fontSize: 18 }}>Memuat…</div>
    </div>
  );

  if (!user) return <LoginPage />;

  const admin = isAdmin(user);

  // User hanya dapat Soal Harian
  // Admin dapat semua menu
  const navItems = admin ? [
    { key: "daily",  label: "📅 Soal Harian" },
    { key: "bank",   label: "📚 Bank Soal" },
    { key: "score",  label: "📊 Skor Saya" },
    { key: "rekap",  label: "📋 Rekap Admin" },
    { key: "admin",  label: "⚙️ Kelola Soal" },
  ] : [
    { key: "daily",  label: "📅 Soal Harian" },
  ];

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #1e293b", marginBottom: 14 }}>
        <TelcoLogo size={150} />
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: "#fff", letterSpacing: 4, marginTop: 6, lineHeight: 1 }}>ROSOT</div>
        <div style={{ fontSize: 9, color: "#cc2020", letterSpacing: 1, marginTop: 3, fontWeight: 600 }}>
          Refreshment One Safety One Technical
        </div>
      </div>

      {/* User badge */}
      <div style={S.userBadge}>
        {user.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
          : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f59e0b", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {user.displayName?.[0]?.toUpperCase()}
            </div>
        }
        <div style={{ overflow: "hidden" }}>
          <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {user.displayName}
          </div>
          <div style={{ color: "#475569", fontSize: 10 }}>{admin ? "👑 Admin" : "👤 User"}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {navItems.map(n => (
          <button key={n.key} onClick={() => goTo(n.key)}
            style={{
              ...S.navBtn,
              background: page === n.key ? "#1e293b" : "transparent",
              color: page === n.key ? "#f59e0b" : "#64748b",
              borderLeft: `3px solid ${page === n.key ? "#f59e0b" : "transparent"}`,
            }}>
            {n.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <button style={S.logoutBtn} onClick={() => signOut(auth)}>⏏ Keluar</button>
    </>
  );

  return (
    <div style={S.appBg}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }

        /* Mobile hamburger topbar */
        .topbar {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 52px;
          background: #080e1a;
          border-bottom: 1px solid #1e293b;
          align-items: center;
          padding: 0 16px;
          gap: 12px;
          z-index: 100;
        }
        .hamburger {
          background: none;
          border: none;
          color: #e2e8f0;
          font-size: 22px;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 6px;
          line-height: 1;
        }
        .hamburger:hover { background: #1e293b; }

        /* Overlay when sidebar open on mobile */
        .overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 150;
        }

        /* Desktop: sidebar always visible */
        .sidebar-desktop {
          width: 230px;
          background: #080e1a;
          border-right: 1px solid #1e293b;
          display: flex;
          flex-direction: column;
          padding: 24px 0 0;
          position: sticky;
          top: 0;
          height: 100vh;
          flex-shrink: 0;
        }

        /* Mobile sidebar: slide in from left */
        .sidebar-mobile {
          display: none;
          position: fixed;
          top: 0; left: 0;
          width: 240px;
          height: 100vh;
          background: #080e1a;
          border-right: 1px solid #1e293b;
          flex-direction: column;
          padding: 24px 0 0;
          z-index: 200;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
        }
        .sidebar-mobile.open {
          transform: translateX(0);
        }

        .main-content {
          flex: 1;
          overflow-y: auto;
          padding: 32px 28px;
        }

        @media (max-width: 768px) {
          .topbar { display: flex !important; }
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile { display: flex !important; }
          .overlay.open { display: block !important; }
          .main-content { padding: 72px 16px 24px; }
        }
      `}</style>

      {/* ── Mobile top bar ── */}
      <div className="topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? "✕" : "☰"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TelcoLogo size={80} />
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: "#fff", letterSpacing: 3 }}>ROSOT</div>
        </div>
      </div>

      {/* ── Overlay (mobile) ── */}
      <div
        className={`overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Desktop sidebar ── */}
      <div className="sidebar-desktop">
        {sidebarContent}
      </div>

      {/* ── Mobile sidebar ── */}
      <div className={`sidebar-mobile ${sidebarOpen ? "open" : ""}`}>
        {sidebarContent}
      </div>

      {/* ── Main content ── */}
      <div className="main-content">
        {page === "daily" && <DailyPage user={user} />}
        {page === "bank"  && admin && <BankPage />}
        {page === "score" && admin && <ScorePage user={user} />}
        {page === "rekap" && admin && <RekapPage />}
        {page === "admin" && admin && <AdminPage />}
      </div>
    </div>
  );
}
