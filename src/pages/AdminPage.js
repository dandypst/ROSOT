import { useState, useEffect, useRef } from "react";
import {
  collection, getDocs, addDoc, deleteDoc,
  doc, writeBatch, query, orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { parseWordFile, validateQuestions } from "../utils/parseWord";
import { S } from "../styles";

export default function AdminPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null); // parsed but not yet uploaded
  const fileRef = useRef();

  const loadQuestions = async () => {
    setLoading(true);
    const q = query(collection(db, "questions"), orderBy("type"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setQuestions(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { loadQuestions(); }, []);

  // ── File picked ────────────────────────────────────────────────
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) {
      setUploadResult({ error: "File harus berformat .docx (Word)" });
      return;
    }
    setUploading(true);
    setUploadResult(null);
    setPreview(null);
    try {
      const parsed = await parseWordFile(file);
      const validation = validateQuestions(parsed);
      if (!validation.valid) {
        setUploadResult({ error: validation.errors.join(" | ") });
      } else {
        setPreview({ questions: parsed, validation });
      }
    } catch (err) {
      setUploadResult({ error: "Gagal membaca file. Pastikan format Word sesuai template." });
    }
    setUploading(false);
    e.target.value = "";
  };

  // ── Confirm upload to Firebase ─────────────────────────────────
  const confirmUpload = async (mode) => {
    if (!preview) return;
    setUploading(true);
    try {
      if (mode === "replace") {
        // Delete all existing questions
        const snap = await getDocs(collection(db, "questions"));
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      // Add new questions
      const now = new Date().toISOString();
      for (const q of preview.questions) {
        await addDoc(collection(db, "questions"), { ...q, createdAt: now });
      }
      setUploadResult({
        success: true,
        message: `${preview.questions.length} soal berhasil ${mode === "replace" ? "diganti" : "ditambahkan"} ke database.`,
        safety: preview.validation.safetyCount,
        teknis: preview.validation.teknisCount,
      });
      setPreview(null);
      await loadQuestions();
    } catch (err) {
      setUploadResult({ error: "Gagal upload ke Firebase: " + err.message });
    }
    setUploading(false);
  };

  // ── Delete single question ──────────────────────────────────────
  const deleteQuestion = async (id) => {
    if (!window.confirm("Hapus soal ini?")) return;
    await deleteDoc(doc(db, "questions", id));
    setQuestions(prev => prev.filter(q => q.firestoreId !== id));
  };

  // ── Delete all ─────────────────────────────────────────────────
  const deleteAll = async () => {
    if (!window.confirm("Hapus SEMUA soal dari database? Tindakan ini tidak bisa dibatalkan.")) return;
    const snap = await getDocs(collection(db, "questions"));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    setQuestions([]);
  };

  const filtered = questions
    .filter(q => filter === "all" || q.type === filter)
    .filter(q => q.question?.toLowerCase().includes(search.toLowerCase()));

  const safetyCount = questions.filter(q => q.type === "safety").length;
  const teknisCount = questions.filter(q => q.type === "teknis").length;

  return (
    <div style={S.pageWrap}>
      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>⚙️</span>
        <div>
          <div style={S.sectionTitle}>Kelola Bank Soal</div>
          <div style={S.sectionSub}>Upload file Word → soal otomatis masuk database</div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Soal", val: questions.length, color: "#f59e0b" },
          { label: "Safety", val: safetyCount, color: "#ef4444" },
          { label: "Teknis", val: teknisCount, color: "#3b82f6" },
        ].map((s, i) => (
          <div key={i} style={{ ...S.card, textAlign: "center", borderTop: `3px solid ${s.color}`, padding: "14px 10px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Upload card ── */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.cardTitle}>📄 Upload File Word</div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: "2px dashed #334155", borderRadius: 10, padding: "28px 20px",
            textAlign: "center", cursor: "pointer", transition: "border-color .2s",
            background: "#080e1a", marginBottom: 12
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#f59e0b"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#334155"}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
            Klik untuk pilih file Word (.docx)
          </div>
          <div style={{ color: "#475569", fontSize: 12 }}>Format sesuai template yang sudah didownload</div>
          <input ref={fileRef} type="file" accept=".docx" style={{ display: "none" }} onChange={handleFile} />
        </div>

        {uploading && (
          <div style={{ color: "#f59e0b", fontSize: 13, padding: "8px 12px", background: "#78350f22", borderRadius: 8, border: "1px solid #78350f" }}>
            ⏳ Memproses file...
          </div>
        )}

        {/* Upload error */}
        {uploadResult?.error && (
          <div style={{ color: "#f87171", fontSize: 13, padding: "10px 14px", background: "#7f1d1d22", borderRadius: 8, border: "1px solid #7f1d1d" }}>
            ❌ {uploadResult.error}
          </div>
        )}

        {/* Upload success */}
        {uploadResult?.success && (
          <div style={{ color: "#4ade80", fontSize: 13, padding: "10px 14px", background: "#14532d22", borderRadius: 8, border: "1px solid #14532d" }}>
            ✅ {uploadResult.message} ({uploadResult.safety} safety, {uploadResult.teknis} teknis)
          </div>
        )}

        {/* Preview before confirm */}
        {preview && (
          <div style={{ border: "1px solid #f59e0b", borderRadius: 10, padding: 14, background: "#78350f11" }}>
            <div style={{ color: "#fbbf24", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              📋 Preview — {preview.questions.length} soal berhasil dibaca
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <span style={{ ...S.typeBadge("#ef4444"), fontSize: 12 }}>🦺 Safety: {preview.validation.safetyCount}</span>
              <span style={{ ...S.typeBadge("#3b82f6"), fontSize: 12 }}>⚙️ Teknis: {preview.validation.teknisCount}</span>
            </div>
            {/* Show first 3 as sample */}
            {preview.questions.slice(0, 3).map((q, i) => (
              <div key={i} style={{ background: "#0f172a", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12 }}>
                <div style={{ color: "#e2e8f0", marginBottom: 4 }}>{i + 1}. {q.question}</div>
                <div style={{ color: "#64748b" }}>Pilihan: {q.options.join(" / ")} | Benar: {q.options[q.answer]}</div>
              </div>
            ))}
            {preview.questions.length > 3 && (
              <div style={{ color: "#475569", fontSize: 12, marginBottom: 12 }}>... dan {preview.questions.length - 3} soal lainnya</div>
            )}
            <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 10 }}>Pilih mode upload:</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => confirmUpload("replace")}
                style={{ ...S.btnPrimary, fontSize: 13, background: "#ef4444", color: "#fff" }}
              >
                🔄 Ganti semua soal lama
              </button>
              <button
                onClick={() => confirmUpload("append")}
                style={{ ...S.btnPrimary, fontSize: 13 }}
              >
                ➕ Tambah ke soal yang ada
              </button>
              <button
                onClick={() => setPreview(null)}
                style={{ ...S.btnGhost, fontSize: 13 }}
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Question list ── */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={S.cardTitle}>Daftar Soal di Database</div>
          {questions.length > 0 && (
            <button onClick={deleteAll} style={{ ...S.btnDanger, fontSize: 12 }}>
              🗑 Hapus Semua
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {["all", "safety", "teknis"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              ...S.btnGhost, fontFamily: "inherit",
              background: filter === f ? "#f59e0b" : "#1e293b",
              color: filter === f ? "#000" : "#94a3b8",
              border: filter === f ? "none" : "1px solid #334155",
              fontSize: 12,
            }}>
              {f === "all" ? `Semua (${questions.length})` : f === "safety" ? `🦺 Safety (${safetyCount})` : `⚙️ Teknis (${teknisCount})`}
            </button>
          ))}
          <input
            style={{ ...S.input, flex: 1, minWidth: 140, padding: "7px 12px" }}
            placeholder="🔍 Cari soal..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading && <div style={{ color: "#475569", fontSize: 14 }}>Memuat soal...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ color: "#475569", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
            {questions.length === 0
              ? "Belum ada soal. Upload file Word untuk mulai."
              : "Tidak ada soal yang cocok."}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((q, i) => (
            <div key={q.firestoreId} style={{
              ...S.card,
              borderLeft: `4px solid ${q.type === "safety" ? "#ef4444" : "#3b82f6"}`,
              padding: "12px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                    <span style={S.typeBadge(q.type === "safety" ? "#ef4444" : "#3b82f6")}>
                      {q.type === "safety" ? "🦺 SAFETY" : "⚙️ TEKNIS"}
                    </span>
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{q.question}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {q.options?.map((opt, idx) => (
                      <span key={idx} style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 999,
                        background: idx === q.answer ? "#166534" : "#1e293b",
                        color: idx === q.answer ? "#4ade80" : "#64748b",
                        border: `1px solid ${idx === q.answer ? "#4ade80" : "#334155"}`
                      }}>
                        {"ABCD"[idx]}. {opt}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => deleteQuestion(q.firestoreId)} style={{ ...S.btnDanger, fontSize: 12, flexShrink: 0 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
