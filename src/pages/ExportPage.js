import { useState, useEffect } from "react";
import {
  collection, getDocs, deleteDoc,
  doc, writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import { exportExcel, exportPDF, UPT_LIST } from "../utils/exportReport";
import { S } from "../styles";

// ── Confirm modal ─────────────────────────────────────────────
function ConfirmModal({ data, onConfirm, onCancel, loading }) {
  if (!data) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:20 }}>
      <div style={{ background:"var(--bgCard)", border:"1px solid #7f1d1d", borderRadius:14, padding:"28px", maxWidth:420, width:"100%" }}>
        <div style={{ fontSize:36, textAlign:"center", marginBottom:10 }}>🗑️</div>
        <div style={{ color:"var(--textPrimary)", fontWeight:700, fontSize:16, textAlign:"center", marginBottom:10 }}>
          {data.type === "all" ? "Hapus SEMUA Laporan Briefing?" : "Hapus Laporan Briefing?"}
        </div>
        {data.type === "single" && (
          <div style={{ textAlign:"center", marginBottom:10 }}>
            <div style={{ color:"var(--textPrimary)", fontWeight:600 }}>{data.item.userName}</div>
            <div style={{ color:"var(--textMuted)", fontSize:12 }}>{data.item.date} · {data.item.upt}</div>
          </div>
        )}
        <div style={{ background:"#7f1d1d22", border:"1px solid #7f1d1d", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#f87171", marginBottom:20, lineHeight:1.7 }}>
          ⚠️ {data.type === "all"
            ? "Semua laporan briefing dari semua user akan dihapus permanen."
            : "Laporan briefing ini akan dihapus permanen."
          } Tindakan ini tidak bisa dibatalkan.
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

export default function ExportPage() {
  const [ujian, setUjian]             = useState([]);
  const [briefings, setBriefings]     = useState([]);
  const [briefingDocs, setBriefingDocs] = useState([]); // with doc IDs for delete
  const [loading, setLoading]         = useState(true);
  const [exporting, setExporting]     = useState(null);
  const [selectedUpt, setSelectedUpt] = useState("all");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [activeTab, setActiveTab]     = useState("export"); // export | briefing
  const [confirmDel, setConfirmDel]   = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (msg, ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  const loadData = async () => {
    setLoading(true);
    try {
      // Answer records — no orderBy to avoid composite index
      const uSnap = await getDocs(collection(db, "answer_records"));
      const usersSnap = await getDocs(collection(db, "users"));
      const userMap = {};
      usersSnap.docs.forEach(d => { userMap[d.data().uid] = d.data(); });
      const enriched = uSnap.docs.map(d => ({
        ...d.data(),
        upt: userMap[d.data().userId]?.upt || "-",
        userName: userMap[d.data().userId]?.nama || d.data().userName,
      })).sort((a,b) => (b.timestamp||"").localeCompare(a.timestamp||""));
      setUjian(enriched);

      // Briefing records — keep doc ID for deletion
      const bSnap = await getDocs(collection(db, "briefings"));
      const bDocs = bSnap.docs.map(d => ({ _docId: d.id, ...d.data() }))
        .sort((a,b) => (b.timestamp||"").localeCompare(a.timestamp||""));
      setBriefingDocs(bDocs);
      setBriefings(bDocs);
    } catch(e) { showToast("Gagal memuat: "+e.message, false); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Filter by date ────────────────────────────────────────────
  const filterByDate = (records) => records.filter(r => {
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo   && r.date > dateTo)   return false;
    return true;
  });

  // ── Delete single briefing ────────────────────────────────────
  const handleDeleteSingle = async () => {
    if (!confirmDel?.item?._docId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "briefings", confirmDel.item._docId));
      setBriefingDocs(prev => prev.filter(b => b._docId !== confirmDel.item._docId));
      setBriefings(prev => prev.filter(b => b._docId !== confirmDel.item._docId));
      showToast("Laporan briefing berhasil dihapus.");
    } catch(e) { showToast("Gagal: "+e.message, false); }
    setConfirmDel(null); setDeleting(false);
  };

  // ── Delete all briefings ──────────────────────────────────────
  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const snap = await getDocs(collection(db, "briefings"));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setBriefingDocs([]); setBriefings([]);
      showToast("Semua laporan briefing berhasil dihapus.");
    } catch(e) { showToast("Gagal: "+e.message, false); }
    setConfirmDel(null); setDeleting(false);
  };

  const filteredUjian    = filterByDate(ujian);
  const filteredBriefing = filterByDate(briefings);

  // Stats per UPT
  const uptStats = ["all", ...UPT_LIST].map(upt => {
    const u = upt==="all" ? filteredUjian    : filteredUjian.filter(r=>r.upt===upt);
    const b = upt==="all" ? filteredBriefing.filter(r=>r.isPIC&&!r.skipped)
                          : filteredBriefing.filter(r=>r.upt===upt&&r.isPIC&&!r.skipped);
    return { upt, ujian:u.length, briefing:b.length };
  });

  const handleExport = async (format) => {
    setExporting(format);
    try {
      if (format==="excel") await exportExcel(filteredUjian, filteredBriefing, selectedUpt, dateFrom, dateTo);
      else                  await exportPDF(filteredUjian, filteredBriefing, selectedUpt, dateFrom, dateTo);
      showToast(`✅ File ${format.toUpperCase()} berhasil didownload!`);
    } catch(e) { showToast("❌ Gagal export: "+e.message, false); }
    setExporting(null);
  };

  // Briefing list filter
  const [searchBrief, setSearchBrief] = useState("");
  const [filterUptBrief, setFilterUptBrief] = useState("all");
  const [filterPIC, setFilterPIC] = useState("all"); // all|pic|bukan

  const filteredBriefList = briefingDocs
    .filter(b => filterUptBrief==="all" || b.upt===filterUptBrief)
    .filter(b => {
      if (filterPIC==="pic")   return b.isPIC===true  && !b.skipped;
      if (filterPIC==="bukan") return b.isPIC!==true  || b.skipped;
      return true;
    })
    .filter(b => {
      const q = searchBrief.toLowerCase();
      return !q || b.userName?.toLowerCase().includes(q) || b.namaPemberi?.toLowerCase().includes(q);
    });

  return (
    <div style={S.pageWrap}>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:999, padding:"12px 20px", borderRadius:10, fontSize:13, fontWeight:600, background:toast.ok?"#14532d":"#7f1d1d", color:toast.ok?"#4ade80":"#f87171", border:`1px solid ${toast.ok?"#4ade80":"#f87171"}`, boxShadow:"0 8px 24px #00000066" }}>
          {toast.msg}
        </div>
      )}

      <ConfirmModal
        data={confirmDel}
        onConfirm={confirmDel?.type==="all" ? handleDeleteAll : handleDeleteSingle}
        onCancel={() => setConfirmDel(null)}
        loading={deleting}
      />

      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📤</span>
        <div>
          <div style={S.sectionTitle}>Export & Kelola Laporan</div>
          <div style={S.sectionSub}>Download & bersihkan data sebelum export</div>
        </div>
        <button onClick={loadData} style={{ ...S.btnGhost, marginLeft:"auto", fontSize:12 }}>🔄 Refresh</button>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"1px solid var(--border)" }}>
        {[
          { key:"export",   label:"📤 Export Laporan" },
          { key:"briefing", label:`📋 Kelola Briefing (${briefingDocs.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding:"10px 18px", border:"none", background:"transparent",
            cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600,
            color: activeTab===t.key ? "#f59e0b" : "var(--textMuted)",
            borderBottom: `2px solid ${activeTab===t.key ? "#f59e0b" : "transparent"}`,
            marginBottom: -1
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ TAB: EXPORT ══ */}
      {activeTab==="export" && (
        <>
          {/* Stats per UPT */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:20 }}>
            {uptStats.map((s,i) => (
              <div key={i} onClick={() => setSelectedUpt(s.upt)}
                style={{ ...S.card, cursor:"pointer", textAlign:"center", padding:"14px 10px",
                  borderTop:`3px solid ${selectedUpt===s.upt?"#f59e0b":"var(--border)"}`,
                  outline: selectedUpt===s.upt?"2px solid #f59e0b":"none" }}>
                <div style={{ fontSize:10, fontWeight:600, color:"var(--textMuted)", marginBottom:6, letterSpacing:0.5 }}>
                  {s.upt==="all"?"SEMUA UPT":s.upt.replace("UPT ","").toUpperCase()}
                </div>
                <div style={{ display:"flex", justifyContent:"center", gap:14 }}>
                  <div>
                    <div style={{ fontSize:20, fontWeight:700, color:"#3b82f6" }}>{s.ujian}</div>
                    <div style={{ fontSize:10, color:"var(--textMuted)" }}>Ujian</div>
                  </div>
                  <div>
                    <div style={{ fontSize:20, fontWeight:700, color:"#f59e0b" }}>{s.briefing}</div>
                    <div style={{ fontSize:10, color:"var(--textMuted)" }}>Briefing PIC</div>
                  </div>
                </div>
                {selectedUpt===s.upt && <div style={{ fontSize:10, color:"#f59e0b", marginTop:5, fontWeight:600 }}>✓ Dipilih</div>}
              </div>
            ))}
          </div>

          {/* Filter & Export */}
          <div style={{ ...S.card, marginBottom:16 }}>
            <div style={S.cardTitle}>⚙️ Filter & Export</div>
            <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:150 }}>
                <label style={{ display:"block", color:"var(--textSecondary)", fontSize:11, fontWeight:600, marginBottom:4 }}>DARI TANGGAL</label>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                  style={{ ...S.input, padding:"9px 12px" }} />
              </div>
              <div style={{ flex:1, minWidth:150 }}>
                <label style={{ display:"block", color:"var(--textSecondary)", fontSize:11, fontWeight:600, marginBottom:4 }}>SAMPAI TANGGAL</label>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                  style={{ ...S.input, padding:"9px 12px" }} />
              </div>
              {(dateFrom||dateTo) && (
                <button onClick={()=>{setDateFrom("");setDateTo("");}} style={{ ...S.btnGhost, alignSelf:"flex-end", fontSize:12 }}>✕ Reset</button>
              )}
            </div>

            {/* Summary info */}
            <div style={{ background:"var(--bgInput)", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, color:"var(--textSecondary)" }}>
              Export: <strong style={{ color:"var(--textPrimary)" }}>{selectedUpt==="all"?"Semua UPT":selectedUpt}</strong>
              &nbsp;·&nbsp;
              <strong style={{ color:"#3b82f6" }}>{filteredUjian.filter(r=>selectedUpt==="all"||r.upt===selectedUpt).length} ujian</strong>
              &nbsp;·&nbsp;
              <strong style={{ color:"#f59e0b" }}>{filteredBriefing.filter(r=>(selectedUpt==="all"||r.upt===selectedUpt)&&r.isPIC&&!r.skipped).length} briefing PIC</strong>
              <span style={{ color:"var(--textMuted)", fontSize:11, marginLeft:6 }}>(non-PIC tidak diexport)</span>
            </div>

            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button onClick={()=>handleExport("excel")} disabled={!!exporting||loading}
                style={{ display:"flex", alignItems:"center", gap:8, background:"#166534", color:"#4ade80", border:"1px solid #4ade80", borderRadius:8, padding:"11px 22px", fontWeight:700, fontSize:14, cursor:exporting?"not-allowed":"pointer", fontFamily:"inherit", opacity:exporting?0.7:1 }}>
                📊 {exporting==="excel" ? "Mengekspor..." : "Export Excel (.xlsx)"}
              </button>
              <button onClick={()=>handleExport("pdf")} disabled={!!exporting||loading}
                style={{ display:"flex", alignItems:"center", gap:8, background:"#7f1d1d", color:"#f87171", border:"1px solid #f87171", borderRadius:8, padding:"11px 22px", fontWeight:700, fontSize:14, cursor:exporting?"not-allowed":"pointer", fontFamily:"inherit", opacity:exporting?0.7:1 }}>
                📄 {exporting==="pdf" ? "Mengekspor..." : "Export PDF"}
              </button>
            </div>
            <div style={{ color:"var(--textMuted)", fontSize:11, marginTop:10 }}>
              Excel: 4 sheet (Hasil Ujian, Laporan Briefing, Foto Briefing, Ringkasan). PDF: halaman per halaman + foto briefing.
            </div>
          </div>

          {/* Photo gallery */}
          {filteredBriefing.filter(r=>(selectedUpt==="all"||r.upt===selectedUpt)&&r.foto&&r.isPIC).length > 0 && (
            <div style={S.card}>
              <div style={S.cardTitle}>📷 Foto Dokumentasi Briefing</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
                {filteredBriefing
                  .filter(r=>(selectedUpt==="all"||r.upt===selectedUpt)&&r.foto&&r.isPIC&&!r.skipped)
                  .map((r,i) => (
                    <div key={i} style={{ border:"1px solid var(--border)", borderRadius:10, overflow:"hidden" }}>
                      <img src={r.foto} alt="" style={{ width:"100%", height:150, objectFit:"cover", display:"block" }} />
                      <div style={{ padding:"8px 10px" }}>
                        <div style={{ color:"var(--textPrimary)", fontSize:12, fontWeight:600 }}>{r.userName}</div>
                        <div style={{ color:"var(--textMuted)", fontSize:10 }}>{r.date} · {(r.upt||"-").replace("UPT ","")}</div>
                        <a href={r.foto} download={`briefing_${r.userName?.replace(/\s+/g,"_")}_${r.date}.jpg`}
                          style={{ display:"inline-block", marginTop:5, fontSize:10, color:"#60a5fa" }}>
                          ⬇ Download foto
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ TAB: KELOLA BRIEFING ══ */}
      {activeTab==="briefing" && (
        <>
          {/* Hapus semua */}
          <div style={{ ...S.card, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ color:"var(--textPrimary)", fontWeight:600, fontSize:14 }}>
                  {briefingDocs.length} laporan briefing tersimpan
                </div>
                <div style={{ color:"var(--textMuted)", fontSize:12, marginTop:2 }}>
                  PIC: {briefingDocs.filter(b=>b.isPIC&&!b.skipped).length} &nbsp;·&nbsp; Bukan PIC: {briefingDocs.filter(b=>!b.isPIC||b.skipped).length}
                </div>
              </div>
              <button
                onClick={() => setConfirmDel({ type:"all" })}
                style={{ background:"#7f1d1d22", border:"1px solid #7f1d1d", color:"#f87171", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                🗑 Hapus Semua Briefing
              </button>
            </div>
          </div>

          {/* Filter */}
          <div style={{ ...S.card, marginBottom:14 }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              {/* UPT filter */}
              {["all", ...UPT_LIST].map(u => (
                <button key={u} onClick={() => setFilterUptBrief(filterUptBrief===u?"all":u)}
                  style={{ ...S.btnGhost, fontSize:12, fontFamily:"inherit",
                    background: filterUptBrief===u ? "#3b82f6" : "var(--bgInput)",
                    color: filterUptBrief===u ? "#fff" : "var(--textSecondary)",
                    border: filterUptBrief===u ? "none" : "1px solid var(--borderMid)" }}>
                  {u==="all" ? "Semua UPT" : u.replace("UPT ","")}
                </button>
              ))}
              {/* PIC filter */}
              {[["all","Semua"],["pic","PIC ✓"],["bukan","Bukan PIC"]].map(([v,l]) => (
                <button key={v} onClick={() => setFilterPIC(v)}
                  style={{ ...S.btnGhost, fontSize:12, fontFamily:"inherit",
                    background: filterPIC===v ? "#f59e0b" : "var(--bgInput)",
                    color: filterPIC===v ? "#000" : "var(--textSecondary)",
                    border: filterPIC===v ? "none" : "1px solid var(--borderMid)" }}>
                  {l}
                </button>
              ))}
              <input style={{ ...S.input, flex:1, minWidth:160, padding:"8px 12px" }}
                placeholder="🔍 Cari nama peserta / pemberi..."
                value={searchBrief} onChange={e => setSearchBrief(e.target.value)} />
            </div>
          </div>

          <div style={{ color:"var(--textMuted)", fontSize:12, marginBottom:10 }}>
            {filteredBriefList.length} laporan ditemukan
          </div>

          {loading && <div style={{ color:"var(--textMuted)", padding:"20px 0" }}>Memuat...</div>}

          {!loading && filteredBriefList.length === 0 && (
            <div style={{ color:"var(--textMuted)", textAlign:"center", padding:"40px 0", fontSize:14 }}>
              Tidak ada laporan briefing yang cocok.
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filteredBriefList.map((b, i) => {
              const isPIC = b.isPIC && !b.skipped;
              return (
                <div key={i} style={{ ...S.card, padding:"14px 16px", borderLeft:`4px solid ${isPIC?"#f59e0b":"#475569"}` }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    {/* Avatar */}
                    <div style={{ width:40, height:40, borderRadius:"50%", background:"var(--bgInput)", color:isPIC?"#f59e0b":"#64748b", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:16, flexShrink:0, border:`2px solid ${isPIC?"#f59e0b":"var(--borderMid)"}` }}>
                      {b.userName?.[0]?.toUpperCase() || "?"}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", marginBottom:4 }}>
                        <span style={{ color:"var(--textPrimary)", fontWeight:600, fontSize:14 }}>{b.userName || "-"}</span>
                        <span style={{
                          fontSize:10, padding:"2px 8px", borderRadius:999, fontWeight:600,
                          background: isPIC ? "#78350f22" : "#1e293b",
                          color: isPIC ? "#f59e0b" : "#64748b",
                          border: `1px solid ${isPIC ? "#f59e0b" : "var(--borderMid)"}`
                        }}>
                          {isPIC ? "👤 PIC Shift" : "👥 Bukan PIC"}
                        </span>
                        {b.foto && <span style={{ fontSize:10, color:"#60a5fa" }}>📷 Ada foto</span>}
                      </div>

                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:isPIC?6:0 }}>
                        <span style={{ fontSize:11, color:"var(--textMuted)" }}>{b.date}</span>
                        {b.upt && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:999, background:"#1e3a5f", color:"#60a5fa", border:"1px solid #1e40af" }}>{b.upt}</span>}
                      </div>

                      {isPIC && (
                        <>
                          <div style={{ color:"var(--textSecondary)", fontSize:12, marginBottom:2 }}>
                            <strong>Pemberi:</strong> {b.namaPemberi || "-"}
                          </div>
                          <div style={{ color:"var(--textMuted)", fontSize:12, lineHeight:1.5 }}>
                            {(b.catatan||"-").substring(0,120)}{b.catatan?.length>120?"...":""}
                          </div>
                        </>
                      )}
                      {!isPIC && (
                        <div style={{ color:"var(--textMuted)", fontSize:12, fontStyle:"italic" }}>
                          Tidak mengisi briefing (bukan PIC)
                        </div>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => setConfirmDel({ type:"single", item:b })}
                      style={{ background:"#7f1d1d22", border:"1px solid #7f1d1d", color:"#f87171", borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", flexShrink:0 }}
                      onMouseEnter={e => { e.currentTarget.style.background="#7f1d1d"; e.currentTarget.style.color="#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background="#7f1d1d22"; e.currentTarget.style.color="#f87171"; }}
                    >
                      🗑 Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {loading && activeTab==="export" && <div style={{ color:"var(--textMuted)", padding:"24px 0" }}>Memuat data...</div>}
    </div>
  );
}
