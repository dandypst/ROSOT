import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import TelcoLogo from "../components/TelcoLogo";

const UPT_LIST = [
  "UPT CCM Tegalluar",
  "UPT CCM Halim",
  "UPT NMC",
];

export default function ProfileSetupPage({ user, onComplete }) {
  const [nama, setNama] = useState(user.displayName || "");
  const [upt, setUpt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!nama.trim()) { setError("Nama wajib diisi."); return; }
    if (!upt) { setError("Pilih UPT terlebih dahulu."); return; }
    setLoading(true);
    setError("");
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        googleName: user.displayName,
        photoURL: user.photoURL,
        nama: nama.trim(),
        upt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onComplete({ nama: nama.trim(), upt });
    } catch (e) {
      setError("Gagal menyimpan. Coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0f172a",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif", padding: "20px"
    }}>
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b",
        borderRadius: 16, padding: "40px 36px",
        width: "100%", maxWidth: 440,
        boxShadow: "0 25px 60px #00000088"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <TelcoLogo size={160} />
          </div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: "#fff", letterSpacing: 4 }}>ROSOT</div>
          <div style={{ fontSize: 10, color: "#cc2020", letterSpacing: 1.5, fontWeight: 600, marginTop: 3 }}>
            Refreshment One Safety One Technical
          </div>
        </div>

        {/* Step indicator */}
        <div style={{
          background: "#0c1526", border: "1px solid #1e293b",
          borderRadius: 10, padding: "12px 16px", marginBottom: 24,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#f59e0b", color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14, flexShrink: 0
          }}>2</div>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>Lengkapi Profil</div>
            <div style={{ color: "#475569", fontSize: 11, marginTop: 1 }}>
              Login sebagai: {user.email}
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>
            NAMA LENGKAP
          </label>
          <input
            value={nama}
            onChange={e => setNama(e.target.value)}
            placeholder="Masukkan nama lengkap kamu"
            style={{
              width: "100%", background: "#1e293b",
              border: "1px solid #334155", borderRadius: 8,
              padding: "12px 14px", color: "#e2e8f0",
              fontSize: 14, outline: "none", fontFamily: "inherit"
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>
            UNIT PELAKSANA TEKNIS (UPT)
          </label>
          <select
            value={upt}
            onChange={e => setUpt(e.target.value)}
            style={{
              width: "100%", background: "#1e293b",
              border: `1px solid ${upt ? "#f59e0b" : "#334155"}`,
              borderRadius: 8, padding: "12px 14px",
              color: upt ? "#e2e8f0" : "#64748b",
              fontSize: 14, outline: "none",
              fontFamily: "inherit", cursor: "pointer",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px center",
              paddingRight: 36
            }}
          >
            <option value="" disabled>-- Pilih UPT --</option>
            {UPT_LIST.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{
            color: "#f87171", fontSize: 13, marginBottom: 14,
            padding: "10px 14px", background: "#7f1d1d22",
            borderRadius: 8, border: "1px solid #7f1d1d"
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", background: loading ? "#1e293b" : "#f59e0b",
            color: loading ? "#475569" : "#000",
            border: "none", borderRadius: 8,
            padding: "13px", fontWeight: 700,
            fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", letterSpacing: 0.5,
            transition: "all .2s"
          }}
        >
          {loading ? "Menyimpan..." : "Simpan & Mulai →"}
        </button>
      </div>
    </div>
  );
}
