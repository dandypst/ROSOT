import { useState, useEffect } from "react";
import {
  collection, getDocs, query, deleteDoc,
  doc, writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import { S } from "../styles";

function exportCSV(data, filename) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${(row[h]||"").toString().replace(/"/g,'""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type:"text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=filename; a.click();
}

function MiniBar({ value, max, color }) {
  const pct = max ? Math.round((value/max)*100) : 0;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, background:"var(--bgInput)", borderRadius:999, height:6, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, background:color, height:"100%", borderRadius:999 }} />
      </div>
      <span style={{ color, fontSize:12, fontWeight:600, minWidth:36, textAlign:"right" }}>{pct}%</span>
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────
function ConfirmDeleteModal({ data, onConfirm, onCancel, loading }) {
  if (!data) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:20 }}>
      <div style={{ background:"var(--bgCard)", border:"1px solid #7f1d1d", borderRadius:14, padding:"28px", maxWidth:420, width:"100%" }}>
        <div style={{ fontSize:36, textAlign:"center", marginBottom:10 }}>🗑️</div>
        <div style={{ color:"var(--textPrimary)", fontWeight:700, fontSize:16, textAlign:"center", marginBottom:10 }}>
          {data.type === "user"
            ? `Hapus semua data jawaban & skor untuk:`
            : "Hapus SEMUA data jawaban & skor?"}
        </div>
        {data.type === "user" && (
          <div style={{ textAlign:"center", marginBottom:10 }}>
            <div style={{ color:"var(--textPrimary)", fontWeight:600 }}>{data.name}</div>
            <div style={{ color:"var(--textMuted)", fontSize:12 }}>{data.email}</div>
          </div>
        )}
        <div style={{ background:"#7f1d1d22", border:"1px solid #7f1d1d", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#f87171", marginBottom:20, lineHeight:1.7 }}>
          ⚠️ Data yang dihapus: <strong>answer_records</strong> dan <strong>daily_answers</strong>.
          {data.type === "all" && " Semua user akan terdampak."}<br/>
          Tindakan ini <strong>tidak bisa dibatalkan</strong>. Profil user tetap ada.
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex:1, background:"#7f1d1d", border:"none", color:"#f87171", borderRadius:8, padding:"11px", fontWeight:700, fontSize:14, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit", opacity:loading?0.7:1 }}>
            {loading ? "Menghapus..." : "🗑 Ya, Hapus"}
          </button>
          <button onClick={onCancel} disabled={loading}
            style={{ flex:1, background:"var(--bgInput)", color:"var(--textSecondary)", border:"1px solid var(--borderMid)", borderRadius:8, padding:"11px", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RekapPage() {
  const [records, setRecords]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState("summary");
  const [filterDate, setFilterDate] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "answer_records"));
      const data = snap.docs.map(d => ({ _id: d.id, ...d.data() }))
        .sort((a,b) => (b.timestamp||"").localeCompare(a.timestamp||""));
      setRecords(data);
    } catch(e) { showToast("Gagal memuat: "+e.message, false); }
    setLoading(false);
  };

  useEffect(() => { loadRecords(); }, []);

  // ── Delete semua record untuk 1 user ────────────────────────
  const handleDeleteUser = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      const uid = confirmDel.userId;
      // Delete answer_records
      const rSnap = await getDocs(collection(db, "answer_records"));
      const batch1 = writeBatch(db);
      rSnap.docs.forEach(d => { if(d.data().userId===uid) batch1.delete(d.ref); });
      await batch1.commit();
      // Delete daily_answers
      const dSnap = await getDocs(collection(db, "daily_answers"));
      const batch2 = writeBatch(db);
      dSnap.docs.forEach(d => { if(d.data().userId===uid) batch2.delete(d.ref); });
      await batch2.commit();
      setRecords(prev => prev.filter(r => r.userId !== uid));
      showToast(`Data jawaban ${confirmDel.name} berhasil dihapus.`);
    } catch(e) { showToast("Gagal hapus: "+e.message, false); }
    setConfirmDel(null); setDeleting(false);
  };

  // ── Delete semua record (all users) ─────────────────────────
  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const rSnap = await getDocs(collection(db, "answer_records"));
      const dSnap = await getDocs(collection(db, "daily_answers"));
      const batch = writeBatch(db);
      rSnap.docs.forEach(d => batch.delete(d.ref));
      dSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setRecords([]);
      showToast("Semua data jawaban berhasil dihapus.");
    } catch(e) { showToast("Gagal hapus: "+e.message, false); }
    setConfirmDel(null); setDeleting(false);
  };

  // Build per-user summary
  const userMap = {};
  records.forEach(r => {
    if (!userMap[r.userId]) {
      userMap[r.userId] = { userId:r.userId, name:r.userName, email:r.userEmail, total:0, correct:0, safety:0, safetyCorrect:0, teknis:0, teknisCorrect:0, lastActive:r.date };
    }
    const u = userMap[r.userId];
    u.total++; if(r.correct) u.correct++;
    if(r.type==="safety") { u.safety++; if(r.correct) u.safetyCorrect++; }
    if(r.type==="teknis")  { u.teknis++;  if(r.correct) u.teknisCorrect++;  }
    if(r.date > u.lastActive) u.lastActive = r.date;
  });
  const userList = Object.values(userMap);

  const totalAnswers  = records.length;
  const totalCorrect  = records.filter(r=>r.correct).length;
  const overallPct    = totalAnswers ? Math.round(totalCorrect/totalAnswers*100) : 0;
  const safetyRec     = records.filter(r=>r.type==="safety");
  const teknisRec     = records.filter(r=>r.type==="teknis");
  const safetyPct     = safetyRec.length ? Math.round(safetyRec.filter(r=>r.correct).length/safetyRec.length*100) : 0;
  const teknisPct     = teknisRec.length ? Math.round(teknisRec.filter(r=>r.correct).length/teknisRec.length*100) : 0;

  const last7 = [];
  for (let i=6;i>=0;i--) {
    const d=new Date(); d.setDate(d.getDate()-i);
    const ds=d.toISOString().split("T")[0];
    const dr=records.filter(r=>r.date===ds);
    last7.push({ date:ds, label:d.toLocaleDateString("id-ID",{weekday:"short",day:"numeric"}), count:dr.length, correct:dr.filter(r=>r.correct).length });
  }
  const maxCount = Math.max(...last7.map(d=>d.count),1);

  const filteredRecords = records.filter(r =>
    (!filterDate || r.date===filterDate) &&
    (!filterUser || r.userName?.toLowerCase().includes(filterUser.toLowerCase()) || r.userEmail?.toLowerCase().includes(filterUser.toLowerCase()))
  );

  const exportSummary = () => exportCSV(userList.map(u=>({
    Nama:u.name, Email:u.email,
    "Total Dijawab":u.total, Benar:u.correct,
    "Akurasi (%)": u.total?Math.round(u.correct/u.total*100):0,
    "Akurasi Safety (%)": u.safety?Math.round(u.safetyCorrect/u.safety*100):0,
    "Akurasi Teknis (%)": u.teknis?Math.round(u.teknisCorrect/u.teknis*100):0,
    "Terakhir Aktif":u.lastActive,
  })), "rekap-user.csv");

  const exportDetail = () => exportCSV(filteredRecords.map(r=>({
    Tanggal:r.date, Nama:r.userName, Email:r.userEmail,
    Kategori:r.type, Soal:r.questionText,
    Jawaban:r.chosenText, "Jawaban Benar":r.correctAnswer,
    Hasil: r.timeout?"TIMEOUT":r.correct?"BENAR":"SALAH",
  })), "detail-jawaban.csv");

  return (
    <div style={S.pageWrap}>
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:999, padding:"12px 20px", borderRadius:10, fontSize:13, fontWeight:600, background:toast.ok?"#14532d":"#7f1d1d", color:toast.ok?"#4ade80":"#f87171", border:`1px solid ${toast.ok?"#4ade80":"#f87171"}`, boxShadow:"0 8px 24px #00000066" }}>
          {toast.msg}
        </div>
      )}

      <ConfirmDeleteModal
        data={confirmDel}
        onConfirm={confirmDel?.type==="all" ? handleDeleteAll : handleDeleteUser}
        onCancel={() => setConfirmDel(null)}
        loading={deleting}
      />

      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📋</span>
        <div>
          <div style={S.sectionTitle}>Rekap Jawaban</div>
          <div style={S.sectionSub}>Admin dashboard — semua data terpusat</div>
        </div>
        {/* Hapus semua */}
        <button
          onClick={() => setConfirmDel({ type:"all" })}
          style={{ marginLeft:"auto", background:"#7f1d1d22", border:"1px solid #7f1d1d", color:"#f87171", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
        >
          🗑 Hapus Semua Data
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:24, borderBottom:"1px solid var(--border)", paddingBottom:0 }}>
        {[["summary","📊 Ringkasan"],["detail","📝 Detail Jawaban"],["users","👥 Per User"]].map(([key,label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            padding:"10px 18px", border:"none", background:"transparent", cursor:"pointer",
            color: activeTab===key ? "#f59e0b" : "var(--textMuted)", fontWeight:600, fontSize:14,
            borderBottom: `2px solid ${activeTab===key ? "#f59e0b" : "transparent"}`,
            marginBottom:-1, fontFamily:"inherit"
          }}>{label}</button>
        ))}
      </div>

      {/* ── SUMMARY ── */}
      {activeTab==="summary" && (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:14, marginBottom:22 }}>
            {[
              { label:"Total Jawaban",  val:totalAnswers,    color:"#f59e0b" },
              { label:"Akurasi Global", val:`${overallPct}%`, color:"#4ade80" },
              { label:"Akurasi Safety", val:`${safetyPct}%`,  color:"#ef4444" },
              { label:"Akurasi Teknis", val:`${teknisPct}%`,  color:"#3b82f6" },
              { label:"Jumlah User",    val:userList.length, color:"#a78bfa" },
            ].map((s,i) => (
              <div key={i} style={{ ...S.card, textAlign:"center", borderTop:`3px solid ${s.color}`, padding:"16px 10px" }}>
                <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.val}</div>
                <div style={{ color:"var(--textSecondary)", fontSize:12, marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Chart 7 hari */}
          <div style={{ ...S.card, marginBottom:18 }}>
            <div style={S.cardTitle}>📈 Aktivitas 7 Hari Terakhir</div>
            <div style={{ display:"flex", gap:6, alignItems:"flex-end", height:110 }}>
              {last7.map((d,i) => (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <span style={{ color:"var(--textMuted)", fontSize:10, fontWeight:600 }}>{d.count}</span>
                  <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:80, gap:2 }}>
                    <div style={{ width:"100%", background:"#4ade80", borderRadius:"3px 3px 0 0", height:`${maxCount?(d.correct/maxCount)*80:0}px`, minHeight:d.correct>0?3:0 }} />
                    <div style={{ width:"100%", background:"#f87171", borderRadius:d.correct>0?0:"3px 3px 0 0", height:`${maxCount?((d.count-d.correct)/maxCount)*80:0}px`, minHeight:(d.count-d.correct)>0?3:0 }} />
                  </div>
                  <span style={{ color:"var(--textMuted)", fontSize:9 }}>{d.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:14, marginTop:10 }}>
              <span style={{ fontSize:11, color:"var(--textMuted)" }}><span style={{ color:"#4ade80" }}>■</span> Benar</span>
              <span style={{ fontSize:11, color:"var(--textMuted)" }}><span style={{ color:"#f87171" }}>■</span> Salah</span>
            </div>
          </div>

          {/* Peringkat */}
          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={S.cardTitle}>🏆 Peringkat User</div>
              <button onClick={exportSummary} style={{ ...S.btnGhost, fontSize:12 }}>⬇ Export CSV</button>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    <th style={S.th}>Nama</th>
                    <th style={S.th}>Total</th>
                    <th style={S.th}>Akurasi</th>
                    <th style={S.th}>Safety</th>
                    <th style={S.th}>Teknis</th>
                    <th style={S.th}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...userList].sort((a,b)=>(b.correct/(b.total||1))-(a.correct/(a.total||1))).map((u,i) => (
                    <tr key={i} style={{ background:i%2===0?"var(--bgPage)":"transparent" }}>
                      <td style={{ ...S.td, color:i<3?["#f59e0b","#94a3b8","#b45309"][i]:"var(--textMuted)", fontWeight:700 }}>{i+1}</td>
                      <td style={S.td}>
                        <div style={{ fontWeight:600, color:"var(--textPrimary)" }}>{u.name}</div>
                        <div style={{ fontSize:11, color:"var(--textMuted)" }}>{u.email}</div>
                      </td>
                      <td style={S.td}>{u.total}</td>
                      <td style={{ ...S.td, minWidth:110 }}><MiniBar value={u.correct} max={u.total} color="#4ade80" /></td>
                      <td style={{ ...S.td, minWidth:110 }}><MiniBar value={u.safetyCorrect} max={u.safety} color="#ef4444" /></td>
                      <td style={{ ...S.td, minWidth:110 }}><MiniBar value={u.teknisCorrect} max={u.teknis} color="#3b82f6" /></td>
                      <td style={S.td}>
                        <button
                          onClick={() => setConfirmDel({ type:"user", userId:u.userId, name:u.name, email:u.email })}
                          style={{ background:"#7f1d1d22", border:"1px solid #7f1d1d", color:"#f87171", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
                        >
                          🗑 Hapus Skor
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── DETAIL ── */}
      {activeTab==="detail" && (
        <div style={S.card}>
          <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
            <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)}
              style={{ ...S.input, width:"auto" }} />
            <input placeholder="🔍 Filter nama / email..." value={filterUser} onChange={e=>setFilterUser(e.target.value)}
              style={{ ...S.input, flex:1, minWidth:160 }} />
            <button onClick={exportDetail} style={{ ...S.btnGhost, fontSize:12, whiteSpace:"nowrap" }}>⬇ Export CSV</button>
            {(filterDate||filterUser) && (
              <button onClick={()=>{setFilterDate("");setFilterUser("");}} style={{ ...S.btnDanger, fontSize:12 }}>✕ Reset</button>
            )}
          </div>
          <div style={{ color:"var(--textMuted)", fontSize:12, marginBottom:10 }}>{filteredRecords.length} record ditemukan</div>
          <div style={{ overflowX:"auto" }}>
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
                {filteredRecords.map((r,i) => (
                  <tr key={i} style={{ background:i%2===0?"var(--bgPage)":"transparent" }}>
                    <td style={{ ...S.td, whiteSpace:"nowrap", color:"var(--textMuted)" }}>{r.date}</td>
                    <td style={S.td}>
                      <div style={{ fontWeight:600, color:"var(--textPrimary)", fontSize:13 }}>{r.userName}</div>
                      <div style={{ fontSize:11, color:"var(--textMuted)" }}>{r.userEmail}</div>
                    </td>
                    <td style={S.td}><span style={S.typeBadge(r.type==="safety"?"#ef4444":"#3b82f6")}>{r.type?.toUpperCase()}</span></td>
                    <td style={{ ...S.td, maxWidth:240, fontSize:12 }}>{r.questionText}</td>
                    <td style={{ ...S.td, fontSize:12 }}>
                      <span style={{ color:r.correct?"#4ade80":r.timeout?"#fbbf24":"#f87171" }}>{r.chosenText}</span>
                      {!r.correct && !r.timeout && <div style={{ color:"var(--textMuted)", fontSize:11 }}>Benar: {r.correctAnswer}</div>}
                    </td>
                    <td style={S.td}>{r.timeout?"⏰":r.correct?"✅":"❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PER USER ── */}
      {activeTab==="users" && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {userList.map((u,i) => {
            const pct   = u.total ? Math.round(u.correct/u.total*100) : 0;
            const sPct  = u.safety ? Math.round(u.safetyCorrect/u.safety*100) : 0;
            const tPct  = u.teknis  ? Math.round(u.teknisCorrect/u.teknis*100)  : 0;
            return (
              <div key={i} style={S.card}>
                <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:"var(--bgInput)", color:"#f59e0b", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:18, border:"2px solid var(--borderMid)", flexShrink:0 }}>
                    {u.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:"var(--textPrimary)", fontWeight:600 }}>{u.name}</div>
                    <div style={{ color:"var(--textMuted)", fontSize:12 }}>{u.email}</div>
                  </div>
                  <div style={{ textAlign:"right", marginRight:8 }}>
                    <div style={{ color:pct>=70?"#4ade80":pct>=50?"#f59e0b":"#f87171", fontSize:22, fontWeight:700 }}>{pct}%</div>
                    <div style={{ color:"var(--textMuted)", fontSize:11 }}>{u.correct}/{u.total} benar</div>
                  </div>
                  {/* Tombol hapus skor user */}
                  <button
                    onClick={() => setConfirmDel({ type:"user", userId:u.userId, name:u.name, email:u.email })}
                    style={{ background:"#7f1d1d22", border:"1px solid #7f1d1d", color:"#f87171", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}
                  >
                    🗑 Hapus Skor
                  </button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ color:"var(--textSecondary)", fontSize:12 }}>🦺 Safety</span>
                      <span style={{ color:"#ef4444", fontSize:12, fontWeight:600 }}>{sPct}%</span>
                    </div>
                    <MiniBar value={u.safetyCorrect} max={u.safety} color="#ef4444" />
                  </div>
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ color:"var(--textSecondary)", fontSize:12 }}>⚙️ Teknis</span>
                      <span style={{ color:"#3b82f6", fontSize:12, fontWeight:600 }}>{tPct}%</span>
                    </div>
                    <MiniBar value={u.teknisCorrect} max={u.teknis} color="#3b82f6" />
                  </div>
                </div>
                <div style={{ marginTop:8, color:"var(--textMuted)", fontSize:11 }}>Terakhir aktif: {u.lastActive}</div>
              </div>
            );
          })}
        </div>
      )}

      {loading && <div style={{ color:"var(--textMuted)", padding:40 }}>Memuat data rekap…</div>}
    </div>
  );
}
