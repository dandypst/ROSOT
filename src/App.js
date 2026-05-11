import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { isAdmin } from "./utils/helpers";
import { applyTheme, getSavedTheme } from "./utils/theme";
import LoginPage from "./pages/LoginPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import ProfileEditPage from "./pages/ProfileEditPage";
import DailyPage from "./pages/DailyPage";
import BankPage from "./pages/BankPage";
import ScorePage from "./pages/ScorePage";
import RekapPage from "./pages/RekapPage";
import AdminPage from "./pages/AdminPage";
import UsersPage from "./pages/UsersPage";
import ExportPage from "./pages/ExportPage";
import TelcoLogo from "./components/TelcoLogo";
import { S } from "./styles";

export default function App() {
  const [user, setUser]               = useState(undefined);
  const [profile, setProfile]         = useState(null);
  const [blocked, setBlocked]         = useState(false);
  const [page, setPage]               = useState("daily");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme]             = useState(getSavedTheme);

  // Apply theme immediately on mount and whenever it changes
  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggleTheme = () => {
    const next = theme === "night" ? "day" : "night";
    setTheme(next);
    applyTheme(next);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setProfile(null); setBlocked(false); return; }
      setUser(u);
      const blockedSnap = await getDoc(doc(db, "blocked_users", u.uid));
      if (blockedSnap.exists()) { setBlocked(true); return; }
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists() && snap.data().nama && snap.data().upt) {
        setProfile(snap.data());
      } else {
        setProfile(false);
      }
    });
    return unsub;
  }, []);

  const goTo = (p) => { setPage(p); setSidebarOpen(false); };

  // ── Loading ──
  if (user === undefined || (user && profile === null && !blocked)) return (
    <div style={{ background: "var(--bgPage)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#f59e0b", fontFamily: "monospace", fontSize: 18 }}>Memuat…</div>
    </div>
  );

  if (!user) return <LoginPage />;

  // ── Blocked ──
  if (blocked) return (
    <div style={{ minHeight: "100vh", background: "var(--bgPage)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ background: "var(--bgCard)", border: "1px solid #7f1d1d", borderRadius: 16, padding: "40px 36px", maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🚫</div>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: "#ef4444", letterSpacing: 2, marginBottom: 10 }}>Akses Ditolak</div>
        <div style={{ color: "var(--textSecondary)", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Akun kamu telah dinonaktifkan oleh admin.<br />Hubungi admin untuk informasi lebih lanjut.
        </div>
        <button onClick={() => signOut(auth)} style={{ ...S.btnGhost }}>⏏ Keluar</button>
      </div>
    </div>
  );

  // ── Belum isi profil ──
  if (profile === false) return (
    <ProfileSetupPage user={user} onComplete={(p) => setProfile({ ...p, email: user.email, uid: user.uid })} />
  );

  const admin   = isAdmin(user);
  const isNight = theme === "night";

  const navItems = admin ? [
    { key: "daily",  label: "📅 Soal Harian" },
    { key: "bank",   label: "📚 Bank Soal" },
    { key: "score",  label: "📊 Skor Saya" },
    { key: "rekap",  label: "📋 Rekap Admin" },
    { key: "admin",  label: "⚙️ Kelola Soal" },
    { key: "users",  label: "🛡️ Manajemen User" },
    { key: "export", label: "📤 Export Laporan" },
    { key: "profil", label: "👤 Profil Saya" },
  ] : [
    { key: "daily",  label: "📅 Soal Harian" },
    { key: "profil", label: "👤 Profil Saya" },
  ];

  // ── Theme toggle widget ──────────────────────────────────────
  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      title={isNight ? "Ganti ke Day Mode" : "Ganti ke Night Mode"}
      style={{
        margin: "0 12px 12px",
        display: "flex", alignItems: "center", gap: 10,
        background: "var(--bgCard)",
        border: "1px solid var(--borderMid)",
        borderRadius: 10, padding: "10px 14px",
        cursor: "pointer", fontFamily: "inherit",
        transition: "all .25s", width: "calc(100% - 24px)"
      }}
    >
      {/* Toggle track */}
      <div style={{
        width: 38, height: 21, borderRadius: 999,
        background: isNight ? "#334155" : "#f59e0b",
        position: "relative", flexShrink: 0,
        transition: "background .3s"
      }}>
        {/* Thumb */}
        <div style={{
          position: "absolute", top: 3.5,
          left: isNight ? 3 : 18,
          width: 14, height: 14, borderRadius: "50%",
          background: "#fff",
          transition: "left .3s",
          fontSize: 9, lineHeight: "14px",
          textAlign: "center"
        }}>
          {isNight ? "🌙" : "☀️"}
        </div>
      </div>
      {/* Label */}
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--textPrimary)", lineHeight: 1.2 }}>
          {isNight ? "Night Mode" : "Day Mode"}
        </div>
        <div style={{ fontSize: 10, color: "var(--textMuted)", marginTop: 1 }}>
          Tap untuk {isNight ? "Day" : "Night"} Mode
        </div>
      </div>
    </button>
  );

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: "0 16px 16px", borderBottom: "1px solid var(--border)", marginBottom: 14 }}>
        <TelcoLogo size={150} />
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: "#fff", letterSpacing: 4, marginTop: 6, lineHeight: 1 }}>ROSOT</div>
        <div style={{ fontSize: 9, color: "#cc2020", letterSpacing: 1, marginTop: 3, fontWeight: 600 }}>
          Refreshment One Safety One Technical
        </div>
      </div>

      {/* User badge */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px", background: "var(--bgCard)", margin: "0 12px 20px", borderRadius: 10, border: "1px solid var(--border)" }}>
        {user.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
          : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f59e0b", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {profile?.nama?.[0]?.toUpperCase()}
            </div>
        }
        <div style={{ overflow: "hidden" }}>
          <div style={{ color: "var(--textPrimary)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {profile?.nama}
          </div>
          <div style={{ color: "var(--textMuted)", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {admin ? "👑 Admin · " : ""}{profile?.upt}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {navItems.map(n => (
          <button key={n.key} onClick={() => goTo(n.key)}
            style={{
              ...S.navBtn,
              background: page === n.key ? "var(--navActive)" : "transparent",
              color: page === n.key ? "#f59e0b" : "var(--textSecondary)",
              borderLeft: `3px solid ${page === n.key ? "#f59e0b" : "transparent"}`,
            }}>
            {n.label}
          </button>
        ))}
      </nav>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Logout */}
      <button style={S.logoutBtn} onClick={() => signOut(auth)}>⏏ Keluar</button>
    </>
  );

  return (
    <div style={S.appBg}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; transition: background .25s; }
        :root { color-scheme: ${isNight ? "dark" : "light"}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--scrollbarTrack); }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 3px; }

        .topbar {
          display: none; position: fixed; top: 0; left: 0; right: 0;
          height: 52px; background: var(--bgSidebar);
          border-bottom: 1px solid var(--border);
          align-items: center; padding: 0 16px; gap: 12px; z-index: 100;
          transition: background .25s;
        }
        .hamburger {
          background: none; border: none; color: #e2e8f0;
          font-size: 22px; cursor: pointer; padding: 4px 8px;
          border-radius: 6px; line-height: 1; font-family: inherit;
        }
        .overlay {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.6); z-index: 150;
        }
        .sidebar-desktop {
          width: 230px; background: var(--bgSidebar);
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          padding: 24px 0 0; position: sticky;
          top: 0; height: 100vh; flex-shrink: 0;
          transition: background .25s;
        }
        .sidebar-mobile {
          display: none; position: fixed; top: 0; left: 0;
          width: 240px; height: 100vh;
          background: var(--bgSidebar);
          border-right: 1px solid var(--border);
          flex-direction: column; padding: 24px 0 0;
          z-index: 200; transform: translateX(-100%);
          transition: transform 0.25s ease, background .25s;
          overflow-y: auto;
        }
        .sidebar-mobile.open { transform: translateX(0); }
        .main-content { flex: 1; overflow-y: auto; padding: 32px 28px; background: var(--bgPage); transition: background .25s; }

        @media (max-width: 768px) {
          .topbar { display: flex !important; }
          .sidebar-desktop { display: none !important; }
          .sidebar-mobile { display: flex !important; }
          .overlay.open { display: block !important; }
          .main-content { padding: 72px 16px 24px; }
        }
      `}</style>

      {/* Mobile topbar */}
      <div className="topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? "✕" : "☰"}
        </button>
        <TelcoLogo size={80} />
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: "#fff", letterSpacing: 3 }}>ROSOT</div>
        {/* Quick theme toggle for mobile topbar */}
        <button
          onClick={toggleTheme}
          title={isNight ? "Day Mode" : "Night Mode"}
          style={{
            marginLeft: "auto", background: "none",
            border: "1px solid var(--border)", borderRadius: 8,
            color: "#e2e8f0", padding: "5px 10px",
            cursor: "pointer", fontSize: 16, fontFamily: "inherit"
          }}
        >
          {isNight ? "☀️" : "🌙"}
        </button>
      </div>

      <div className={`overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className="sidebar-desktop">{sidebarContent}</div>
      <div className={`sidebar-mobile ${sidebarOpen ? "open" : ""}`}>{sidebarContent}</div>

      <div className="main-content">
        {page === "daily"  && <DailyPage user={user} profile={profile} />}
        {page === "bank"   && admin && <BankPage />}
        {page === "score"  && admin && <ScorePage user={user} />}
        {page === "rekap"  && admin && <RekapPage />}
        {page === "admin"  && admin && <AdminPage />}
        {page === "users"  && admin && <UsersPage />}
        {page === "export" && admin && <ExportPage />}
        {page === "profil" && (
          <ProfileEditPage
            user={user}
            profile={profile}
            onSave={(p) => setProfile(prev => ({ ...prev, ...p }))}
          />
        )}
      </div>
    </div>
  );
}
