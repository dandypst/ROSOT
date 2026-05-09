import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { isAdmin } from "./utils/helpers";
import LoginPage from "./pages/LoginPage";
import DailyPage from "./pages/DailyPage";
import BankPage from "./pages/BankPage";
import ScorePage from "./pages/ScorePage";
import RekapPage from "./pages/RekapPage";
import { S } from "./styles";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [page, setPage] = useState("daily");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return unsub;
  }, []);

  // Loading state
  if (user === undefined) return (
    <div style={{ background: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#f59e0b", fontFamily: "monospace", fontSize: 18 }}>Memuat…</div>
    </div>
  );

  if (!user) return <LoginPage />;

  const admin = isAdmin(user);

  const navItems = [
    { key: "daily", label: "📅 Soal Harian" },
    { key: "bank", label: "📚 Bank Soal" },
    { key: "score", label: "📊 Skor Saya" },
    ...(admin ? [{ key: "rekap", label: "📋 Rekap Admin" }] : []),
  ];

  return (
    <div style={S.appBg}>
      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <div style={{ fontSize: 30 }}>🛡️</div>
          <div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 19, color: "#f59e0b", letterSpacing: 2 }}>BANK SOAL</div>
            <div style={{ fontSize: 10, color: "#475569" }}>Safety & Teknis</div>
          </div>
        </div>

        {/* User info */}
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
            <button key={n.key} onClick={() => setPage(n.key)}
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

        <button style={S.logoutBtn} onClick={() => signOut(auth)}>⏏ Keluar</button>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        {page === "daily" && <DailyPage user={user} />}
        {page === "bank" && <BankPage />}
        {page === "score" && <ScorePage user={user} />}
        {page === "rekap" && admin && <RekapPage />}
      </div>
    </div>
  );
}
