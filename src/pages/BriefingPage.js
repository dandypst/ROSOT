import { useState, useRef } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { todayStr } from "../utils/helpers";
import { S } from "../styles";

const MAX_BYTES = 1 * 1024 * 1024;
const MAX_DIMENSION = 1600;

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width >= height) { height = Math.round(height * MAX_DIMENSION / width); width = MAX_DIMENSION; }
          else { width = Math.round(width * MAX_DIMENSION / height); height = MAX_DIMENSION; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        let quality = 0.85;
        let result = canvas.toDataURL("image/jpeg", quality);
        while (result.length * 0.75 > MAX_BYTES && quality > 0.10) {
          quality -= 0.08;
          result = canvas.toDataURL("image/jpeg", Math.max(quality, 0.10));
        }
        resolve({ dataUrl: result, sizeKB: Math.round(result.length * 0.75 / 1024), quality: Math.round(quality * 100) });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Pilihan peran ─────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: "pic",    label: "👤 Ya, saya PIC Shift",    desc: "Saya yang bertugas melaporkan briefing hari ini" },
  { value: "bukan",  label: "👥 Bukan PIC Shift",        desc: "Ada personil lain yang bertugas melaporkan briefing" },
];

export default function BriefingPage({ user, profile, onComplete }) {
  const [role, setRole]               = useState(null);     // "pic" | "bukan" | null
  const [namaPemberi, setNamaPemberi] = useState("");
  const [catatan, setCatatan]         = useState("");
  const [foto, setFoto]               = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoInfo, setFotoInfo]       = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const fileRef = useRef();

  const handleFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(""); setCompressing(true);
    setFoto(null); setFotoPreview(null); setFotoInfo(null);
    try {
      const originalKB = Math.round(file.size / 1024);
      const { dataUrl, sizeKB, quality } = await compressImage(file);
      setFoto(dataUrl); setFotoPreview(dataUrl);
      setFotoInfo({ originalKB, sizeKB, quality });
    } catch { setError("Gagal memproses foto. Coba foto lain."); }
    setCompressing(false);
    e.target.value = "";
  };

  // ── Skip (bukan PIC) ─────────────────────────────────────────
  const handleSkip = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "briefings", `${user.uid}_${todayStr()}`), {
        userId: user.uid, userName: profile.nama,
        userEmail: user.email, upt: profile.upt,
        isPIC: false, skipped: true,
        namaPemberi: null, catatan: null, foto: null,
        date: todayStr(), timestamp: new Date().toISOString(),
      });
      onComplete();
    } catch (e) { setError("Gagal menyimpan: " + e.message); setSaving(false); }
  };

  // ── Submit (PIC) ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!namaPemberi.trim()) { setError("Nama Pemberi Briefing wajib diisi."); return; }
    if (!catatan.trim())     { setError("Catatan Briefing wajib diisi."); return; }
    setSaving(true); setError("");
    try {
      await setDoc(doc(db, "briefings", `${user.uid}_${todayStr()}`), {
        userId: user.uid, userName: profile.nama,
        userEmail: user.email, upt: profile.upt,
        isPIC: true, skipped: false,
        namaPemberi: namaPemberi.trim(),
        catatan: catatan.trim(),
        foto: foto || null,
        date: todayStr(), timestamp: new Date().toISOString(),
      });
      onComplete();
    } catch (e) { setError("Gagal menyimpan: " + e.message); setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", animation: "slideIn .35s ease" }}>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📋</span>
        <div>
          <div style={S.sectionTitle}>Briefing Harian</div>
          <div style={S.sectionSub}>Langkah terakhir sebelum selesai</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display:"flex", marginBottom:24, background:"var(--bgCard)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
        {[
          { icon:"🦺", label:"Safety",  done:true  },
          { icon:"⚙️", label:"Teknis",  done:true  },
          { icon:"📋", label:"Briefing", active:true },
        ].map((s, i) => (
          <div key={i} style={{
            flex:1, padding:"10px 8px", textAlign:"center",
            background: s.active ? "#f59e0b" : s.done ? "var(--answerRightBg)" : "transparent",
            borderRight: i < 2 ? "1px solid var(--border)" : "none"
          }}>
            <div style={{ fontSize:16 }}>{s.icon}</div>
            <div style={{ fontSize:10, fontWeight:600, marginTop:2,
              color: s.active ? "#000" : s.done ? "var(--answerRightText)" : "var(--textMuted)"
            }}>{s.done && !s.active ? "✓ " : ""}{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── STEP 1: Pilih peran ── */}
      {!role && (
        <div style={S.card}>
          <div style={{ color:"var(--textSecondary)", fontSize:12, fontWeight:600, letterSpacing:0.5, marginBottom:14 }}>
            APAKAH KAMU PIC SHIFT HARI INI?
          </div>
          <div style={{ color:"var(--textMuted)", fontSize:13, lineHeight:1.6, marginBottom:18 }}>
            PIC Shift bertugas mengisi laporan briefing. Jika kamu bukan PIC, kamu tetap bisa menyelesaikan sesi tanpa mengisi form briefing.
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {ROLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRole(opt.value)}
                style={{
                  display:"flex", alignItems:"center", gap:14,
                  background:"var(--bgInput)", border:"1.5px solid var(--borderMid)",
                  borderRadius:10, padding:"14px 16px",
                  cursor:"pointer", textAlign:"left", fontFamily:"inherit",
                  transition:"all .15s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = opt.value === "pic" ? "#f59e0b" : "#64748b";
                  e.currentTarget.style.background = "var(--bgCard)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--borderMid)";
                  e.currentTarget.style.background = "var(--bgInput)";
                }}
              >
                <div style={{
                  width:42, height:42, borderRadius:"50%", flexShrink:0,
                  background: opt.value === "pic" ? "#78350f22" : "#1e293b",
                  border: `2px solid ${opt.value === "pic" ? "#f59e0b" : "var(--borderMid)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20
                }}>
                  {opt.value === "pic" ? "👤" : "👥"}
                </div>
                <div>
                  <div style={{ color:"var(--textPrimary)", fontWeight:600, fontSize:14, marginBottom:3 }}>
                    {opt.label}
                  </div>
                  <div style={{ color:"var(--textMuted)", fontSize:12 }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2a: Bukan PIC — konfirmasi skip ── */}
      {role === "bukan" && (
        <div style={S.card}>
          <div style={{ textAlign:"center", padding:"8px 0 16px" }}>
            <div style={{ fontSize:42, marginBottom:12 }}>👥</div>
            <div style={{ color:"var(--textPrimary)", fontWeight:700, fontSize:16, marginBottom:8 }}>
              Kamu bukan PIC Shift
            </div>
            <div style={{ color:"var(--textMuted)", fontSize:13, lineHeight:1.7, marginBottom:20 }}>
              Form briefing akan diisi oleh PIC Shift yang bertugas.<br />
              Sesi kamu hari ini sudah selesai. Terima kasih!
            </div>
            {error && (
              <div style={{ color:"#f87171", fontSize:13, marginBottom:14, padding:"10px 14px", background:"#7f1d1d22", borderRadius:8, border:"1px solid #7f1d1d" }}>
                {error}
              </div>
            )}
            <div style={{ display:"flex", gap:10, flexDirection:"column" }}>
              <button
                onClick={handleSkip}
                disabled={saving}
                style={{ ...S.btnPrimary, width:"100%", padding:"13px", fontSize:15, opacity:saving?0.7:1, cursor:saving?"not-allowed":"pointer" }}
              >
                {saving ? "Menyimpan..." : "✔ Selesai — Lanjutkan"}
              </button>
              <button
                onClick={() => setRole(null)}
                disabled={saving}
                style={{ ...S.btnGhost, width:"100%", padding:"11px", fontSize:13 }}
              >
                ← Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2b: PIC — isi form briefing ── */}
      {role === "pic" && (
        <div style={S.card}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18, paddingBottom:14, borderBottom:"1px solid var(--border)" }}>
            <span style={{ fontSize:18 }}>👤</span>
            <div>
              <div style={{ color:"var(--textPrimary)", fontWeight:600, fontSize:14 }}>Kamu adalah PIC Shift</div>
              <div style={{ color:"var(--textMuted)", fontSize:11 }}>Isi form briefing berikut</div>
            </div>
            <button onClick={() => setRole(null)} style={{ marginLeft:"auto", ...S.btnGhost, fontSize:11, padding:"4px 10px" }}>← Kembali</button>
          </div>

          {/* Nama Pemberi Briefing */}
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", color:"var(--textSecondary)", fontSize:12, fontWeight:600, marginBottom:6, letterSpacing:0.5 }}>
              NAMA PEMBERI BRIEFING <span style={{ color:"#ef4444" }}>*</span>
            </label>
            <input
              value={namaPemberi}
              onChange={e => setNamaPemberi(e.target.value)}
              placeholder="Nama supervisor / pemberi briefing"
              style={S.input}
            />
          </div>

          {/* Catatan */}
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", color:"var(--textSecondary)", fontSize:12, fontWeight:600, marginBottom:6, letterSpacing:0.5 }}>
              CATATAN BRIEFING <span style={{ color:"#ef4444" }}>*</span>
            </label>
            <textarea
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Tuliskan poin-poin briefing yang disampaikan hari ini..."
              rows={5}
              style={{ ...S.input, resize:"vertical", lineHeight:1.6, minHeight:110, fontFamily:"inherit" }}
            />
          </div>

          {/* Upload Foto */}
          <div style={{ marginBottom:22 }}>
            <label style={{ display:"block", color:"var(--textSecondary)", fontSize:12, fontWeight:600, marginBottom:6, letterSpacing:0.5 }}>
              FOTO DOKUMENTASI
              <span style={{ fontWeight:400, color:"var(--textMuted)", marginLeft:6 }}>(otomatis dikompres ≤ 1 MB)</span>
            </label>

            {compressing && (
              <div style={{ border:"1px solid var(--border)", borderRadius:10, padding:"28px 20px", textAlign:"center", background:"var(--bgInput)" }}>
                <div style={{ width:32, height:32, border:"3px solid var(--borderMid)", borderTop:"3px solid #f59e0b", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 10px" }} />
                <div style={{ color:"var(--textPrimary)", fontWeight:600, fontSize:13 }}>Mengompres foto...</div>
              </div>
            )}

            {!fotoPreview && !compressing && (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border:"2px dashed var(--borderMid)", borderRadius:10, padding:"24px 20px", textAlign:"center", cursor:"pointer", background:"var(--bgInput)", transition:"border-color .2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#f59e0b"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--borderMid)"}
              >
                <div style={{ fontSize:28, marginBottom:6 }}>📷</div>
                <div style={{ color:"var(--textPrimary)", fontWeight:600, fontSize:13, marginBottom:3 }}>Tap untuk ambil / upload foto</div>
                <div style={{ color:"var(--textMuted)", fontSize:11 }}>Semua ukuran diterima — dikompres otomatis</div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handleFoto} />
              </div>
            )}

            {fotoPreview && !compressing && (
              <div>
                <div style={{ position:"relative", borderRadius:10, overflow:"hidden", border:"1px solid var(--border)" }}>
                  <img src={fotoPreview} alt="preview" style={{ width:"100%", maxHeight:260, objectFit:"cover", display:"block" }} />
                  <button onClick={() => { setFoto(null); setFotoPreview(null); setFotoInfo(null); }} style={{ position:"absolute", top:8, right:8, background:"#ef4444", color:"#fff", border:"none", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                </div>
                {fotoInfo && (
                  <div style={{ marginTop:8, padding:"8px 12px", background:"var(--answerRightBg)", border:"1px solid var(--answerRightBorder)", borderRadius:8 }}>
                    <span style={{ fontSize:11, color:"var(--answerRightText)" }}>
                      ✅ Dikompres: {fotoInfo.originalKB >= 1024 ? `${(fotoInfo.originalKB/1024).toFixed(1)} MB` : `${fotoInfo.originalKB} KB`}
                      {" → "}{fotoInfo.sizeKB >= 1024 ? `${(fotoInfo.sizeKB/1024).toFixed(1)} MB` : `${fotoInfo.sizeKB} KB`}
                      {" (kualitas "}{fotoInfo.quality}{"%)"}
                    </span>
                  </div>
                )}
                <button onClick={() => fileRef.current?.click()} style={{ ...S.btnGhost, marginTop:8, fontSize:12, width:"100%", textAlign:"center" }}>
                  🔄 Ganti Foto
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handleFoto} />
              </div>
            )}
          </div>

          {error && (
            <div style={{ color:"#f87171", fontSize:13, marginBottom:14, padding:"10px 14px", background:"#7f1d1d22", borderRadius:8, border:"1px solid #7f1d1d" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving || compressing}
            style={{ ...S.btnPrimary, width:"100%", padding:"14px", fontSize:15, letterSpacing:0.5, opacity:(saving||compressing)?0.7:1, cursor:(saving||compressing)?"not-allowed":"pointer" }}
          >
            {saving ? "Menyimpan..." : "✔ Simpan Laporan Briefing"}
          </button>

          <div style={{ color:"var(--textMuted)", fontSize:11, textAlign:"center", marginTop:10 }}>
            Data tersimpan ke database dan bisa di-export oleh admin per UPT.
          </div>
        </div>
      )}
    </div>
  );
}
