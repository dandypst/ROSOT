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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u || null));
    return unsub;
  }, []);

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
    ...(admin ? [
      { key: "rekap", label: "📋 Rekap Admin" },
      { key: "admin", label: "⚙️ Kelola Soal" },
    ] : []),
  ];

  return (
    <div style={S.appBg}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>

      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={{ padding: "0 16px 20px", borderBottom: "1px solid #1e293b", marginBottom: 16 }}>
          <TelcoLogo size={150} />
          <div style={{
            fontFamily: "'Bebas Neue'", fontSize: 20, color: "#fff",
            letterSpacing: 4, marginTop: 8, lineHeight: 1
          }}>ROSOT</div>
          <div style={{ fontSize: 9, color: "#cc2020", letterSpacing: 1, marginTop: 3, fontWeight: 600 }}>
            Refreshment One Safety One Technical
          </div>
        </div>

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
        {page === "admin" && admin && <AdminPage />}
      </div>
    </div>
  );
}
