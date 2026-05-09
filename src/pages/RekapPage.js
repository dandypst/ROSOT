import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { S } from "../styles";

function exportCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${(row[h] || "").toString().replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
}

function MiniBar({ value, max, color }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, background: "#1e293b", borderRadius: 999, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 999 }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 600, minWidth: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

export default function RekapPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");
  const [filterDate, setFilterDate] = useState("");
  const [filterUser, setFilterUser] = useState("");

  useEffect(() => {
    const load = async () => {
      const q = query(collection(db, "answer_records"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => d.data()));
      setLoading(false);
    };
    load();
  }, []);

  // Build per-user summary
  const userMap = {};
  records.forEach(r => {
    if (!userMap[r.userId]) {
      userMap[r.userId] = { name: r.userName, email: r.userEmail, total: 0, correct: 0, safety: 0, safetyCorrect: 0, teknis: 0, teknisCorrect: 0, lastActive: r.date };
    }
    const u = userMap[r.userId];
    u.total++;
    if (r.correct) u.correct++;
    if (r.type === "safety") { u.safety++; if (r.correct) u.safetyCorrect++; }
    if (r.type === "teknis") { u.teknis++; if (r.correct) u.teknisCorrect++; }
    if (r.date > u.lastActive) u.lastActive = r.date;
  });
  const userList = Object.values(userMap);

  // Overall stats
  const totalAnswers = records.length;
  const totalCorrect = records.filter(r => r.correct).length;
  const overallPct = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
  const safetyRecords = records.filter(r => r.type === "safety");
  const teknisRecords = records.filter(r => r.type === "teknis");
  const safetyPct = safetyRecords.length ? Math.round((safetyRecords.filter(r => r.correct).length / safetyRecords.length) * 100) : 0;
  const teknisPct = teknisRecords.length ? Math.round((teknisRecords.filter(r => r.correct).length / teknisRecords.length) * 100) : 0;

  // Daily activity (last 7 days)
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const dayRecords = records.filter(r => r.date === ds);
    last7.push({ date: ds, label: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" }), count: dayRecords.length, correct: dayRecords.filter(r => r.correct).length });
  }
  const maxCount = Math.max(...last7.map(d => d.count), 1);

  // Filtered detail records
  const filteredRecords = records.filter(r =>
    (!filterDate || r.date === filterDate) &&
    (!filterUser || r.userName?.toLowerCase().includes(filterUser.toLowerCase()) || r.userEmail?.toLowerCase().includes(filterUser.toLowerCase()))
  );

  // Export functions
  const exportSummary = () => {
    exportCSV(userList.map(u => ({
      Nama: u.name, Email: u.email,
      "Total Dijawab": u.total, "Benar": u.correct,
      "Akurasi (%)": u.total ? Math.round((u.correct / u.total) * 100) : 0,
      "Akurasi Safety (%)": u.safety ? Math.round((u.safetyCorrect / u.safety) * 100) : 0,
      "Akurasi Teknis (%)": u.teknis ? Math.round((u.teknisCorrect / u.teknis) * 100) : 0,
      "Terakhir Aktif": u.lastActive,
    })), "rekap-user.csv");
  };

  const exportDetail = () => {
    exportCSV(filteredRecords.map(r => ({
      Tanggal: r.date, Nama: r.userName, Email: r.userEmail,
      Kategori: r.type, Soal: r.questionText,
      Jawaban: r.chosenText, "Jawaban Benar": r.correctAnswer,
      Hasil: r.timeout ? "TIMEOUT" : r.correct ? "BENAR" : "SALAH",
    })), "detail-jawaban.csv");
  };

  if (loading) return <div style={{ color: "#475569", padding: 40 }}>Memuat data rekap…</div>;

  return (
    <div style={S.pageWrap}>
      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📋</span>
        <div>
          <div style={S.sectionTitle}>Rekap Jawaban</div>
          <div style={S.sectionSub}>Admin dashboard — semua data terpusat</div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #1e293b", paddingBottom: 0 }}>
        {[["summary","📊 Ringkasan"],["detail","📝 Detail Jawaban"],["users","👥 Per User"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding: "10px 18px", border: "none", background: "transparent", cursor: "pointer",
            color: activeTab === key ? "#f59e0b" : "#64748b", fontWeight: 600, fontSize: 14,
            borderBottom: `2px solid ${activeTab === key ? "#f59e0b" : "transparent"}`,
            marginBottom: -1, fontFamily: "inherit"
          }}>{label}</button>
        ))}
      </div>

      {/* ===== SUMMARY TAB ===== */}
      {activeTab === "summary" && (
        <>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Total Jawaban", val: totalAnswers, color: "#f59e0b" },
              { label: "Akurasi Global", val: `${overallPct}%`, color: "#4ade80" },
              { label: "Akurasi Safety", val: `${safetyPct}%`, color: "#ef4444" },
              { label: "Akurasi Teknis", val: `${teknisPct}%`, color: "#3b82f6" },
              { label: "Jumlah User", val: userList.length, color: "#a78bfa" },
              { label: "Timeout", val: records.filter(r => r.timeout).length, color: "#f87171" },
            ].map((s, i) => (
              <div key={i} style={{ ...S.card, textAlign: "center", borderTop: `3px solid ${s.color}`, padding: "18px 12px" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Activity chart — last 7 days */}
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={S.cardTitle}>📈 Aktivitas 7 Hari Terakhir</div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
              {last7.map((d, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ color: "#64748b", fontSize: 10, fontWeight: 600 }}>{d.count}</span>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 80, gap: 2 }}>
                    <div style={{ width: "100%", background: "#4ade80", borderRadius: "3px 3px 0 0", height: `${maxCount ? (d.correct / maxCount) * 80 : 0}px`, minHeight: d.correct > 0 ? 4 : 0, transition: "height .3s" }} />
                    <div style={{ width: "100%", background: "#f87171", borderRadius: d.correct > 0 ? 0 : "3px 3px 0 0", height: `${maxCount ? ((d.count - d.correct) / maxCount) * 80 : 0}px`, minHeight: (d.count - d.correct) > 0 ? 4 : 0, transition: "height .3s" }} />
                  </div>
                  <span style={{ color: "#475569", fontSize: 10 }}>{d.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "#64748b" }}><span style={{ color: "#4ade80" }}>■</span> Benar</span>
              <span style={{ fontSize: 11, color: "#64748b" }}><span style={{ color: "#f87171" }}>■</span> Salah</span>
            </div>
          </div>

          {/* Top performers */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={S.cardTitle}>🏆 Peringkat User</div>
              <button onClick={exportSummary} style={{ ...S.btnGhost, fontSize: 12 }}>⬇ Export CSV</button>
            </div>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>#</th>
                  <th style={S.th}>Nama</th>
                  <th style={S.th}>Total</th>
                  <th style={S.th}>Akurasi</th>
                  <th style={S.th}>Safety</th>
                  <th style={S.th}>Teknis</th>
                </tr>
              </thead>
              <tbody>
                {[...userList].sort((a, b) => (b.correct / (b.total || 1)) - (a.correct / (a.total || 1))).map((u, i) => {
                  const pct = u.total ? Math.round((u.correct / u.total) * 100) : 0;
                  const sPct = u.safety ? Math.round((u.safetyCorrect / u.safety) * 100) : 0;
                  const tPct = u.teknis ? Math.round((u.teknisCorrect / u.teknis) * 100) : 0;
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#080e1a" : "transparent" }}>
                      <td style={{ ...S.td, color: i < 3 ? ["#f59e0b","#94a3b8","#b45309"][i] : "#475569", fontWeight: 700 }}>{i + 1}</td>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: "#475569" }}>{u.email}</div>
                      </td>
                      <td style={S.td}>{u.total}</td>
                      <td style={{ ...S.td, minWidth: 120 }}><MiniBar value={u.correct} max={u.total} color="#4ade80" /></td>
                      <td style={{ ...S.td, minWidth: 120 }}><MiniBar value={u.safetyCorrect} max={u.safety} color="#ef4444" /></td>
                      <td style={{ ...S.td, minWidth: 120 }}><MiniBar value={u.teknisCorrect} max={u.teknis} color="#3b82f6" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== DETAIL TAB ===== */}
      {activeTab === "detail" && (
        <div style={S.card}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              style={{ ...S.input, width: "auto" }} />
            <input placeholder="🔍 Filter nama / email..." value={filterUser} onChange={e => setFilterUser(e.target.value)}
              style={{ ...S.input, flex: 1, minWidth: 160 }} />
            <button onClick={exportDetail} style={{ ...S.btnGhost, fontSize: 12, whiteSpace: "nowrap" }}>⬇ Export CSV</button>
            {(filterDate || filterUser) && (
              <button onClick={() => { setFilterDate(""); setFilterUser(""); }} style={{ ...S.btnDanger, fontSize: 12 }}>✕ Reset</button>
            )}
          </div>
          <div style={{ color: "#475569", fontSize: 12, marginBottom: 12 }}>{filteredRecords.length} record ditemukan</div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Tanggal</th>
                  <th style={S.th}>User</th>
                  <th style={S.th}>Kategori</th>
                  <th style={S.th}>Soal</th>
                  <th style={S.th}>Jawaban</th>
                  <th style={S.th}>Hasil</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#080e1a" : "transparent" }}>
                    <td style={{ ...S.td, whiteSpace: "nowrap", color: "#64748b" }}>{r.date}</td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 13 }}>{r.userName}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{r.userEmail}</div>
                    </td>
                    <td style={S.td}><span style={S.typeBadge(r.type === "safety" ? "#ef4444" : "#3b82f6")}>{r.type?.toUpperCase()}</span></td>
                    <td style={{ ...S.td, maxWidth: 260, fontSize: 12 }}>{r.questionText}</td>
                    <td style={{ ...S.td, fontSize: 12 }}>
                      <span style={{ color: r.correct ? "#4ade80" : "#f87171" }}>{r.chosenText}</span>
                      {!r.correct && <div style={{ color: "#475569", fontSize: 11 }}>Benar: {r.correctAnswer}</div>}
                    </td>
                    <td style={S.td}>{r.correct ? "✅" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== PER USER TAB ===== */}
      {activeTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {userList.map((u, i) => {
            const pct = u.total ? Math.round((u.correct / u.total) * 100) : 0;
            const sPct = u.safety ? Math.round((u.safetyCorrect / u.safety) * 100) : 0;
            const tPct = u.teknis ? Math.round((u.teknisCorrect / u.teknis) * 100) : 0;
            return (
              <div key={i} style={S.card}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1e293b", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, border: "2px solid #334155", flexShrink: 0 }}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{u.name}</div>
                    <div style={{ color: "#475569", fontSize: 12 }}>{u.email}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: pct >= 70 ? "#4ade80" : pct >= 50 ? "#f59e0b" : "#f87171", fontSize: 22, fontWeight: 700 }}>{pct}%</div>
                    <div style={{ color: "#475569", fontSize: 11 }}>{u.correct}/{u.total} benar</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>🦺 Safety</span>
                      <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>{sPct}%</span>
                    </div>
                    <MiniBar value={u.safetyCorrect} max={u.safety} color="#ef4444" />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>⚙️ Teknis</span>
                      <span style={{ color: "#3b82f6", fontSize: 12, fontWeight: 600 }}>{tPct}%</span>
                    </div>
                    <MiniBar value={u.teknisCorrect} max={u.teknis} color="#3b82f6" />
                  </div>
                </div>
                <div style={{ marginTop: 10, color: "#334155", fontSize: 11 }}>Terakhir aktif: {u.lastActive}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
