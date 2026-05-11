import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { S } from "../styles";

export default function ScorePage({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // No orderBy — avoid needing composite index. Sort client-side.
        const q = query(
          collection(db, "answer_records"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const data = snap.docs
          .map(d => d.data())
          .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
        setRecords(data);
      } catch (e) {
        setError("Gagal memuat skor: " + e.message);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const correct  = records.filter(r => r.correct).length;
  const timeouts = records.filter(r => r.timeout).length;
  const total    = records.length;
  const pct      = total ? Math.round((correct / total) * 100) : 0;
  const safetyR  = records.filter(r => r.type === "safety");
  const teknisR  = records.filter(r => r.type === "teknis");
  const safetyPct = safetyR.length ? Math.round((safetyR.filter(r => r.correct).length / safetyR.length) * 100) : 0;
  const teknisPct = teknisR.length ? Math.round((teknisR.filter(r => r.correct).length / teknisR.length) * 100) : 0;

  if (loading) return <div style={{ color: "var(--textMuted)", padding: 40 }}>Memuat skor…</div>;

  if (error) return (
    <div style={{ color: "#f87171", padding: "20px 0", fontSize: 14 }}>
      ❌ {error}
    </div>
  );

  return (
    <div style={S.pageWrap}>
      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📊</span>
        <div>
          <div style={S.sectionTitle}>Skor Saya</div>
          <div style={S.sectionSub}>Rekap jawaban harian kamu</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Total Dijawab",  val: total,          color: "#f59e0b" },
          { label: "Benar",          val: `${correct} (${pct}%)`, color: "#4ade80" },
          { label: "Waktu Habis",    val: timeouts,       color: "#f87171" },
          { label: "Akurasi Safety", val: `${safetyPct}%`, color: "#ef4444" },
          { label: "Akurasi Teknis", val: `${teknisPct}%`, color: "#3b82f6" },
        ].map((s, i) => (
          <div key={i} style={{ ...S.card, textAlign: "center", borderTop: `3px solid ${s.color}`, padding: "16px 10px" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ color: "var(--textSecondary)", fontSize: 12, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Akurasi bar */}
      <div style={{ ...S.card, marginBottom: 18 }}>
        <div style={S.cardTitle}>Akurasi per Kategori</div>
        {[
          { label: "🦺 Safety", pct: safetyPct, color: "#ef4444", total: safetyR.length },
          { label: "⚙️ Teknis", pct: teknisPct, color: "#3b82f6", total: teknisR.length },
        ].map((b, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "var(--textPrimary)", fontSize: 14 }}>{b.label}</span>
              <span style={{ color: b.color, fontSize: 14, fontWeight: 600 }}>
                {b.pct}% <span style={{ color: "var(--textMuted)", fontWeight: 400 }}>({b.total} soal)</span>
              </span>
            </div>
            <div style={{ background: "var(--bgInput)", borderRadius: 999, height: 8, overflow: "hidden" }}>
              <div style={{ width: `${b.pct}%`, background: b.color, height: "100%", borderRadius: 999, transition: "width .5s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Riwayat */}
      <div style={S.card}>
        <div style={S.cardTitle}>Riwayat Jawaban</div>
        {records.length === 0 && (
          <div style={{ color: "var(--textMuted)", fontSize: 14 }}>Belum ada jawaban. Mulai dari Soal Harian!</div>
        )}
        {records.map((r, i) => (
          <div key={i} style={{ borderBottom: "1px solid var(--border)", padding: "11px 0", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>
              {r.timeout ? "⏰" : r.correct ? "✅" : "❌"}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--textPrimary)", fontSize: 13, marginBottom: 4 }}>{r.questionText}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "var(--textMuted)", fontSize: 11 }}>{r.date}</span>
                <span style={S.typeBadge(r.type === "safety" ? "#ef4444" : "#3b82f6")}>{r.type?.toUpperCase()}</span>
                {r.timeout && <span style={{ fontSize: 11, color: "#fbbf24" }}>waktu habis</span>}
              </div>
              {!r.correct && !r.timeout && (
                <div style={{ fontSize: 12, color: "var(--textMuted)", marginTop: 4 }}>
                  Jawabanmu: <span style={{ color: "#f87171" }}>{r.chosenText}</span>
                  {" · "}Benar: <span style={{ color: "#4ade80" }}>{r.correctAnswer}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
