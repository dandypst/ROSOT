import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { S } from "../styles";

const UPT_LIST = [
  "UPT CCM Tegalluar",
  "UPT CCM Halim",
  "UPT NMC",
];

export default function ProfileEditPage({ user, profile, onSave }) {
  const [nama, setNama] = useState(profile.nama || "");
  const [upt, setUpt] = useState(profile.upt || "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
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
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSave({ nama: nama.trim(), upt });
    } catch (e) {
      setError("Gagal menyimpan. Coba lagi.");
    }
    setLoading(false);
  };

  return (
    <div style={S.pageWrap}>
      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>👤</span>
        <div>
          <div style={S.sectionTitle}>Profil Saya</div>
          <div style={S.sectionSub}>Edit nama dan UPT kamu</div>
        </div>
      </div>

      <div style={{ ...S.card, maxWidth: 480 }}>
        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #1e293b" }}>
          {user.photoURL
            ? <img src={user.photoURL} alt="" style={{ width: 52, height: 52, borderRadius: "50%", border: "2px solid #334155" }} />
            : <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f59e0b", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20 }}>
                {user.displayName?.[0]?.toUpperCase()}
              </div>
          }
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>{user.displayName}</div>
            <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>{user.email}</div>
            <div style={{ color: "#334155", fontSize: 11, marginTop: 2 }}>Akun Google (tidak bisa diubah)</div>
          </div>
        </div>

        {/* Nama */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>
            NAMA LENGKAP
          </label>
          <input
            value={nama}
            onChange={e => setNama(e.target.value)}
            placeholder="Nama lengkap"
            style={{
              width: "100%", background: "#1e293b",
              border: "1px solid #334155", borderRadius: 8,
              padding: "11px 14px", color: "#e2e8f0",
              fontSize: 14, outline: "none", fontFamily: "inherit"
            }}
          />
        </div>

        {/* UPT */}
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
              borderRadius: 8, padding: "11px 14px",
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
          <div style={{ color: "#f87171", fontSize: 13, marginBottom: 14, padding: "10px 14px", background: "#7f1d1d22", borderRadius: 8, border: "1px solid #7f1d1d" }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{ color: "#4ade80", fontSize: 13, marginBottom: 14, padding: "10px 14px", background: "#14532d22", borderRadius: 8, border: "1px solid #14532d" }}>
            ✅ Profil berhasil disimpan!
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            background: loading ? "#1e293b" : "#f59e0b",
            color: loading ? "#475569" : "#000",
            border: "none", borderRadius: 8,
            padding: "12px 28px", fontWeight: 700,
            fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit"
          }}
        >
          {loading ? "Menyimpan..." : "💾 Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}
