import { useState, useRef } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { todayStr } from "../utils/helpers";
import { S } from "../styles";

export default function BriefingPage({ user, profile, onComplete }) {
  const [namaPemberi, setNamaPemberi] = useState("");
  const [catatan, setCatatan]         = useState("");
  const [foto, setFoto]               = useState(null);      // base64
  const [fotoPreview, setFotoPreview] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const fileRef = useRef();

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Ukuran foto maksimal 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFoto(ev.target.result);       // base64 data URL
      setFotoPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
    setError("");
  };

  const handleSubmit = async () => {
    if (!namaPemberi.trim()) { setError("Nama Pemberi Briefing wajib diisi."); return; }
    if (!catatan.trim())     { setError("Catatan Briefing wajib diisi."); return; }
    setSaving(true);
    setError("");
    try {
      const docId = `${user.uid}_${todayStr()}`;
      await setDoc(doc(db, "briefings", docId), {
        userId:       user.uid,
        userName:     profile.nama,
        userEmail:    user.email,
        upt:          profile.upt,
        namaPemberi:  namaPemberi.trim(),
        catatan:      catatan.trim(),
        foto:         foto || null,       // base64 stored in Firestore (≤1MB after compression)
        date:         todayStr(),
        timestamp:    new Date().toISOString(),
      });
      onComplete();
    } catch (e) {
      setError("Gagal menyimpan: " + e.message);
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", animation: "slideIn .35s ease" }}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📋</span>
        <div>
          <div style={S.sectionTitle}>Form Briefing Harian</div>
          <div style={S.sectionSub}>Isi setelah mengerjakan soal — wajib setiap hari kerja</div>
        </div>
      </div>

      {/* Progress indicator */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        marginBottom: 24, background: "var(--bgCard)",
        border: "1px solid var(--border)", borderRadius: 10,
        overflow: "hidden"
      }}>
        {[
          { icon: "🦺", label: "Safety", done: true },
          { icon: "⚙️", label: "Teknis", done: true },
          { icon: "📋", label: "Briefing", done: false, active: true },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: "10px 8px", textAlign: "center",
            background: s.active ? "#f59e0b" : s.done ? "var(--answerRightBg)" : "transparent",
            borderRight: i < 2 ? "1px solid var(--border)" : "none"
          }}>
            <div style={{ fontSize: 16 }}>{s.icon}</div>
            <div style={{
              fontSize: 10, fontWeight: 600, marginTop: 2,
              color: s.active ? "#000" : s.done ? "var(--answerRightText)" : "var(--textMuted)"
            }}>
              {s.done && !s.active ? "✓ " : ""}{s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        {/* Nama Pemberi Briefing */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", color: "var(--textSecondary)", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>
            NAMA PEMBERI BRIEFING <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            value={namaPemberi}
            onChange={e => setNamaPemberi(e.target.value)}
            placeholder="Masukkan nama supervisor / pemberi briefing"
            style={{ ...S.input }}
          />
        </div>

        {/* Catatan Briefing */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", color: "var(--textSecondary)", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>
            CATATAN BRIEFING <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            placeholder="Tuliskan poin-poin briefing yang disampaikan hari ini..."
            rows={5}
            style={{
              ...S.input,
              resize: "vertical", lineHeight: 1.6,
              minHeight: 110, fontFamily: "inherit"
            }}
          />
        </div>

        {/* Upload Foto */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ display: "block", color: "var(--textSecondary)", fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: 0.5 }}>
            FOTO DOKUMENTASI
          </label>

          {!fotoPreview ? (
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: "2px dashed var(--borderMid)", borderRadius: 10,
                padding: "28px 20px", textAlign: "center",
                cursor: "pointer", background: "var(--bgInput)",
                transition: "border-color .2s"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#f59e0b"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--borderMid)"}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
              <div style={{ color: "var(--textPrimary)", fontWeight: 600, fontSize: 13, marginBottom: 3 }}>
                Tap untuk upload foto
              </div>
              <div style={{ color: "var(--textMuted)", fontSize: 11 }}>JPG, PNG — maks. 3 MB</div>
              <input
                ref={fileRef} type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFoto}
              />
            </div>
          ) : (
            <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
              <img
                src={fotoPreview} alt="preview"
                style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block" }}
              />
              <button
                onClick={() => { setFoto(null); setFotoPreview(null); }}
                style={{
                  position: "absolute", top: 8, right: 8,
                  background: "#ef4444", color: "#fff",
                  border: "none", borderRadius: "50%",
                  width: 28, height: 28, cursor: "pointer",
                  fontSize: 14, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >✕</button>
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: "#f87171", fontSize: 13, marginBottom: 14, padding: "10px 14px", background: "#7f1d1d22", borderRadius: 8, border: "1px solid #7f1d1d" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            ...S.btnPrimary,
            width: "100%", padding: "14px",
            fontSize: 15, letterSpacing: 0.5,
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer"
          }}
        >
          {saving ? "Menyimpan..." : "✔ Simpan Laporan Briefing"}
        </button>

        <div style={{ color: "var(--textMuted)", fontSize: 11, textAlign: "center", marginTop: 10 }}>
          Data briefing tersimpan ke database dan bisa di-export oleh admin per UPT.
        </div>
      </div>
    </div>
  );
}
