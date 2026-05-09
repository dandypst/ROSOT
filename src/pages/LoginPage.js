import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { S } from "../styles";
import TelcoLogo from "../components/TelcoLogo";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError("Login gagal. Coba lagi.");
      setLoading(false);
    }
  };

  return (
    <div style={S.loginBg}>
      <div style={S.loginCard}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* TELCO Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <TelcoLogo size={180} />
          </div>
          {/* ROSOT title */}
          <div style={{
            fontFamily: "'Bebas Neue'", fontSize: 38,
            color: "#fff", letterSpacing: 5, lineHeight: 1.1
          }}>ROSOT</div>
          {/* Subtitle */}
          <div style={{
            color: "#cc2020", fontSize: 11, letterSpacing: 1.5,
            marginTop: 6, fontWeight: 600, textTransform: "uppercase"
          }}>
            Refreshment One Safety One Technical
          </div>
        </div>

        <div style={{
          background: "#0c1526", border: "1px solid #1e293b",
          borderRadius: 10, padding: "14px 18px", marginBottom: 22
        }}>
          <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Website ini hanya untuk personel yang berwenang. Silakan login menggunakan akun Google yang telah didaftarkan oleh admin.
          </p>
        </div>

        {error && (
          <div style={{ color: "#f87171", fontSize: 13, marginBottom: 14, padding: "10px 14px", background: "#7f1d1d22", borderRadius: 8 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            background: loading ? "#1e293b" : "#fff", color: "#1e293b", border: "none", borderRadius: 10,
            padding: "14px", fontWeight: 700, fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", transition: "all .2s"
          }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? "Memuat..." : "Masuk dengan Google"}
        </button>

        <p style={{ color: "#334155", fontSize: 12, textAlign: "center", marginTop: 18 }}>
          Hubungi admin jika akun kamu belum terdaftar.
        </p>
      </div>
    </div>
  );
}
