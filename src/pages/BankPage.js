import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { S } from "../styles";

export default function BankPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    getDocs(collection(db, "questions")).then(snap => {
      setQuestions(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const filtered = questions
    .filter(q => filter === "all" || q.type === filter)
    .filter(q => q.question?.toLowerCase().includes(search.toLowerCase()));

  const safetyCount = questions.filter(q => q.type === "safety").length;
  const teknisCount = questions.filter(q => q.type === "teknis").length;

  return (
    <div style={S.pageWrap}>
      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📚</span>
        <div>
          <div style={S.sectionTitle}>Bank Soal</div>
          <div style={S.sectionSub}>{questions.length} soal tersedia</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {["all","safety","teknis"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            ...S.btnGhost, fontFamily: "inherit",
            background: filter === f ? "#f59e0b" : "#1e293b",
            color: filter === f ? "#000" : "#94a3b8",
            border: filter === f ? "none" : "1px solid #334155"
          }}>
            {f === "all" ? `Semua (${questions.length})` : f === "safety" ? `🦺 Safety (${safetyCount})` : `⚙️ Teknis (${teknisCount})`}
          </button>
        ))}
        <input style={{ ...S.input, flex: 1, minWidth: 160 }}
          placeholder="🔍 Cari soal..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading && <div style={{ color: "#475569", fontSize: 14 }}>Memuat soal...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(q => (
          <div key={q.firestoreId} style={{ ...S.card, borderLeft: `4px solid ${q.type === "safety" ? "#ef4444" : "#3b82f6"}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={S.typeBadge(q.type === "safety" ? "#ef4444" : "#3b82f6")}>
                {q.type === "safety" ? "🦺 SAFETY" : "⚙️ TEKNIS"}
              </span>
            </div>
            <p style={{ margin: "0 0 10px", color: "#e2e8f0", fontWeight: 500, fontSize: 14 }}>{q.question}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {q.options?.map((opt, i) => (
                <span key={i} style={{
                  fontSize: 12, padding: "3px 10px", borderRadius: 999,
                  background: i === q.answer ? "#166534" : "#1e293b",
                  color: i === q.answer ? "#4ade80" : "#64748b",
                  border: `1px solid ${i === q.answer ? "#4ade80" : "#334155"}`
                }}>
                  {String.fromCharCode(65 + i)}. {opt}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
