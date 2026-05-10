import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { isAdmin } from "./utils/helpers";
import LoginPage from "./pages/LoginPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import ProfileEditPage from "./pages/ProfileEditPage";
import DailyPage from "./pages/DailyPage";
import BankPage from "./pages/BankPage";
import ScorePage from "./pages/ScorePage";
import RekapPage from "./pages/RekapPage";
import AdminPage from "./pages/AdminPage";
import UsersPage from "./pages/UsersPage";
import TelcoLogo from "./components/TelcoLogo";
import { S } from "./styles";

export default function App() {
  const [user, setUser]           = useState(undefined);
  const [profile, setProfile]     = useState(null);
  const [blocked, setBlocked]     = useState(false);
  const [page, setPage]           = useState("daily");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setProfile(null); setBlocked(false); return; }
      setUser(u);

      // Cek apakah user diblokir
      const blockedSnap = await getDoc(doc(db, "blocked_users", u.uid));
      if (blockedSnap.exists()) { setBlocked(true); return; }

      // Load profil
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
    <div style={{ background: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#f59e0b", fontFamily: "monospace", fontSize: 18 }}>Memuat…</div>
    </div>
  );

  // ── Belum login ──
  if (!user) return <LoginPage />;

  // ── User diblokir ──
  if (blocked) return (
    <div style={{
      minHeight: "100vh", background: "#0f172a",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", padding: 20
    }}>
      <div style={{
        background: "#0f172a", border: "1px solid #7f1d1d",
        borderRadius: 16, padding: "40px 36px",
        maxWidth: 400, width: "100%", textAlign: "center"
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🚫</div>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: "#ef4444", letterSpacing: 2, marginBottom: 10 }}>
          Akses Ditolak
        </div>
        <div style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Akun kamu telah dinonaktifkan oleh admin.<br />
          Hubungi admin untuk informasi lebih lanjut.
        </div>
        <button
          onClick={() => signOut(auth)}
          style={{
            background: "#1e293b", color: "#94a3b8",
            border: "1px solid #334155", borderRadius: 8,
            padding: "11px 24px", fontSize: 14,
            cursor: "pointer", fontFamily: "inherit"
          }}
        >
          ⏏ Keluar
        </button>
      </div>
    </div>
  );

  // ── Belum isi profil ──
  if (profile === false) return (
    <ProfileSetupPage
      user={user}
      onComplete={(p) => setProfile({ ...p, email: user.email, uid: user.uid })}
    />
  );

  const admin = isAdmin(user);

  const navItems = admin ? [
    { key: "daily",  label: "📅 Soal Harian" },
    { key: "bank",   label: "📚 Bank Soal" },
    { key: "score",  label: "📊 Skor Saya" },
    { key: "rekap",  label: "📋 Rekap Admin" },
    { key: "admin",  label: "⚙️ Kelola Soal" },
    { key: "users",  label: "🛡️ Manajemen User" },
    { key: "profil", label: "👤 Profil Saya" },
  ] : [
    { key: "daily",  label: "📅 Soal Harian" },
    { key: "profil", label: "👤 Profil Saya" },
  ];

  const sidebarContent = (
    <>
      <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #1e293b", marginBottom: 14 }}>
        <TelcoLogo size={150} />
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: "#fff", letterSpacing: 4, marginTop: 6, lineHeight: 1 }}>ROSOT</div>
        <div style={{ fontSize: 9, color: "#cc2020", letterSpacing: 1, marginTop: 3, fontWeight: 600 }}>
          Refreshment One Safety One Technical
        </div>
      </div>

      <div style={S.userBadge}>
        {user.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
          : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f59e0b", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {profile?.nama?.[0]?.toUpperCase()}
            </div>
        }
        <div style={{ overflow: "hidden" }}>
          <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {profile?.nama}
          </div>
          <div style={{ color: "#475569", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {admin ? "👑 Admin · " : ""}{profile?.upt}
          </div>
        </div>
      </div>

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

      <button style={S.logoutBtn} onClick={() => signOut(auth)}>⏏ Keluar</button>
    </>
  );

  return (
    <div style={S.appBg}>
      <style>{`
        * { box-sizing: border-box; } body { margin: 0; }
        .topbar { display:none; position:fixed; top:0; left:0; right:0; height:52px; background:#080e1a; border-bottom:1px solid #1e293b; align-items:center; padding:0 16px; gap:12px; z-index:100; }
        .hamburger { background:none; border:none; color:#e2e8f0; font-size:22px; cursor:pointer; padding:4px 8px; border-radius:6px; line-height:1; font-family:inherit; }
        .hamburger:hover { background:#1e293b; }
        .overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:150; }
        .sidebar-desktop { width:230px; background:#080e1a; border-right:1px solid #1e293b; display:flex; flex-direction:column; padding:24px 0 0; position:sticky; top:0; height:100vh; flex-shrink:0; }
        .sidebar-mobile { display:none; position:fixed; top:0; left:0; width:240px; height:100vh; background:#080e1a; border-right:1px solid #1e293b; flex-direction:column; padding:24px 0 0; z-index:200; transform:translateX(-100%); transition:transform 0.25s ease; overflow-y:auto; }
        .sidebar-mobile.open { transform:translateX(0); }
        .main-content { flex:1; overflow-y:auto; padding:32px 28px; }
        @media (max-width:768px) {
          .topbar { display:flex !important; }
          .sidebar-desktop { display:none !important; }
          .sidebar-mobile { display:flex !important; }
          .overlay.open { display:block !important; }
          .main-content { padding:72px 16px 24px; }
        }
      `}</style>

      <div className="topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? "✕" : "☰"}
        </button>
        <TelcoLogo size={80} />
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, color: "#fff", letterSpacing: 3 }}>ROSOT</div>
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
