import { useState } from "react";
import QUESTIONS from "../data/questions";
import { S } from "../styles";

export default function BankPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = QUESTIONS
    .filter(q => filter === "all" || q.type === filter)
    .filter(q => q.question.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={S.pageWrap}>
      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📚</span>
        <div>
          <div style={S.sectionTitle}>Bank Soal</div>
          <div style={S.sectionSub}>{QUESTIONS.length} soal tersedia</div>
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
            {f === "all" ? "Semua" : f === "safety" ? "🦺 Safety" : "⚙️ Teknis"}
          </button>
        ))}
        <input style={{ ...S.input, flex: 1, minWidth: 160 }}
          placeholder="🔍 Cari soal..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(q => (
          <div key={q.id} style={{ ...S.card, borderLeft: `4px solid ${q.type === "safety" ? "#ef4444" : "#3b82f6"}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={S.typeBadge(q.type === "safety" ? "#ef4444" : "#3b82f6")}>
                {q.type === "safety" ? "🦺 SAFETY" : "⚙️ TEKNIS"}
              </span>
              <span style={{ color: "#334155", fontSize: 12 }}>#{q.id}</span>
            </div>
            <p style={{ margin: "0 0 10px", color: "#e2e8f0", fontWeight: 500, fontSize: 14 }}>{q.question}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {q.options.map((opt, i) => (
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
