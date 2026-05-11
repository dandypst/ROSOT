import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { S } from "../styles";

const UPT_LIST = ["UPT CCM Tegalluar", "UPT CCM Halim", "UPT NMC"];

// ── Confirm modal ─────────────────────────────────────────────
function ConfirmModal({ data, onConfirm, onCancel, loading }) {
  if (!data) return null;
  const cfg = {
    block:   { icon:"🚫", title:"Blokir User?",      border:"#78350f", bg:"#78350f22", btnBg:"#78350f", btnColor:"#fbbf24", btnText:"🚫 Ya, Blokir" },
    unblock: { icon:"✅", title:"Buka Blokir User?",  border:"#14532d", bg:"#14532d22", btnBg:"#14532d", btnColor:"#4ade80", btnText:"✅ Ya, Buka Blokir" },
    delete:  { icon:"🗑️", title:"Hapus Data User?",   border:"#7f1d1d", bg:"#7f1d1d22", btnBg:"#7f1d1d", btnColor:"#f87171", btnText:"🗑 Ya, Hapus Data" },
  }[data.action];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:20 }}>
      <div style={{ background:"var(--bgCard)", border:`1px solid ${cfg.border}`, borderRadius:14, padding:"28px", maxWidth:400, width:"100%" }}>
        <div style={{ fontSize:36, marginBottom:10, textAlign:"center" }}>{cfg.icon}</div>
        <div style={{ color:"var(--textPrimary)", fontWeight:700, fontSize:16, marginBottom:8, textAlign:"center" }}>{cfg.title}</div>
        <div style={{ color:"var(--textSecondary)", fontSize:13, lineHeight:1.7, marginBottom:6, textAlign:"center" }}>
          <strong style={{ color:"var(--textPrimary)" }}>{data.user.nama || data.user.email}</strong><br/>
          <span style={{ fontSize:12 }}>{data.user.email}</span><br/>
          <span style={{ fontSize:12, color:"#60a5fa" }}>{data.user.upt || "-"}</span>
        </div>
        {data.action === "block" && (
          <div style={{ background:"#78350f22", border:"1px solid #78350f", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#fbbf24", marginBottom:16, lineHeight:1.6 }}>
            User tidak bisa login. Data tetap tersimpan. Bisa dibuka blokir kapan saja.
          </div>
        )}
        {data.action === "unblock" && (
          <div style={{ background:"#14532d22", border:"1px solid #14532d", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#4ade80", marginBottom:16, lineHeight:1.6 }}>
            User bisa login kembali dengan akun Google-nya.
          </div>
        )}
        {data.action === "delete" && (
          <div style={{ background:"#7f1d1d22", border:"1px solid #7f1d1d", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#f87171", marginBottom:16, lineHeight:1.6 }}>
            ⚠️ Semua data jawaban & briefing user ini akan ikut dihapus permanen. Tidak bisa dibatalkan.
          </div>
        )}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex:1, background:cfg.btnBg, border:"none", color:cfg.btnColor, borderRadius:8, padding:"11px", fontWeight:700, fontSize:14, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit", opacity:loading?0.7:1 }}>
            {loading ? "Memproses..." : cfg.btnText}
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

// ── Main ──────────────────────────────────────────────────────
export default function UsersPage() {
  const [tab, setTab]                       = useState("active");
  const [users, setUsers]                   = useState([]);
  const [blockedIds, setBlockedIds]         = useState(new Set());
  const [blockedHistory, setBlockedHistory] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [filterUpt, setFilterUpt]           = useState("all");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [confirm, setConfirm]               = useState(null);
  const [processing, setProcessing]         = useState(false);
  const [toast, setToast]                   = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const uSnap = await getDocs(collection(db, "users"));
      const bSnap = await getDocs(collection(db, "blocked_users"));
      setUsers(
        uSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      );
      setBlockedIds(new Set(bSnap.docs.map(d => d.id)));
      setBlockedHistory(
        bSnap.docs.map(d => ({ uid: d.id, ...d.data() }))
          .sort((a, b) => (b.blockedAt || "").localeCompare(a.blockedAt || ""))
      );
    } catch (e) {
      showToast("Gagal memuat data: " + e.message, false);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleConfirm = async () => {
    if (!confirm) return;
    setProcessing(true);
    const { action, user: u } = confirm;
    try {
      if (action === "block") {
        await setDoc(doc(db, "blocked_users", u.uid), {
          uid: u.uid, email: u.email, nama: u.nama, upt: u.upt,
          blockedAt: new Date().toISOString(), reason: "Blocked by admin",
        });
        setBlockedIds(prev => new Set([...prev, u.uid]));
        setBlockedHistory(prev => [{ uid: u.uid, email: u.email, nama: u.nama, upt: u.upt, blockedAt: new Date().toISOString() }, ...prev]);
        showToast(`${u.nama || u.email} berhasil diblokir.`);

      } else if (action === "unblock") {
        await deleteDoc(doc(db, "blocked_users", u.uid));
        setBlockedIds(prev => { const s = new Set(prev); s.delete(u.uid); return s; });
        setBlockedHistory(prev => prev.filter(x => x.uid !== u.uid));
        showToast(`${u.nama || u.email} berhasil dibuka blokirnya.`);

      } else if (action === "delete") {
        await deleteDoc(doc(db, "users", u.firestoreId));
        await deleteDoc(doc(db, "blocked_users", u.uid)).catch(() => {});
        const cols = ["daily_answers", "answer_records", "briefings"];
        for (const col of cols) {
          const snap = await getDocs(collection(db, col));
          for (const d of snap.docs) {
            if (d.data().userId === u.uid) await deleteDoc(d.ref);
          }
        }
        setUsers(prev => prev.filter(x => x.firestoreId !== u.firestoreId));
        setBlockedIds(prev => { const s = new Set(prev); s.delete(u.uid); return s; });
        setBlockedHistory(prev => prev.filter(x => x.uid !== u.uid));
        showToast(`Data ${u.nama || u.email} berhasil dihapus permanen.`);
      }
    } catch (e) {
      showToast("Gagal: " + e.message, false);
    }
    setConfirm(null);
    setProcessing(false);
  };

  const filtered = users
    .filter(u => filterUpt === "all" || u.upt === filterUpt)
    .filter(u => {
      if (filterStatus === "active")  return !blockedIds.has(u.uid);
      if (filterStatus === "blocked") return  blockedIds.has(u.uid);
      return true;
    })
    .filter(u => {
      const q = search.toLowerCase();
      return !q || u.nama?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.upt?.toLowerCase().includes(q);
    });

  const activeCount  = users.filter(u => !blockedIds.has(u.uid)).length;
  const blockedCount = users.filter(u =>  blockedIds.has(u.uid)).length;

  return (
    <div style={S.pageWrap}>
      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:999, padding:"12px 20px", borderRadius:10, fontSize:13, fontWeight:600, background:toast.ok?"#14532d":"#7f1d1d", color:toast.ok?"#4ade80":"#f87171", border:`1px solid ${toast.ok?"#4ade80":"#f87171"}`, boxShadow:"0 8px 24px #00000066", animation:"fadeUp .3s ease" }}>
          {toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <ConfirmModal data={confirm} onConfirm={handleConfirm} onCancel={() => setConfirm(null)} loading={processing} />

      {/* Header */}
      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>🛡️</span>
        <div>
          <div style={S.sectionTitle}>Manajemen User</div>
          <div style={S.sectionSub}>Kelola akses, blokir, dan hapus data user</div>
        </div>
        <button onClick={loadData} style={{ ...S.btnGhost, marginLeft:"auto", fontSize:12 }}>🔄 Refresh</button>
      </div>

      {/* Tab */}
      <div style={{ display:"flex", gap:0, marginBottom:20, borderBottom:"1px solid var(--border)" }}>
        {[
          { key:"active",  label:"👥 User" },
          { key:"history", label:"🕓 History Blokir" + (blockedHistory.length ? ` (${blockedHistory.length})` : "") },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:"10px 18px", border:"none", background:"transparent",
            cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600,
            color: tab === t.key ? "#f59e0b" : "var(--textMuted)",
            borderBottom: `2px solid ${tab === t.key ? "#f59e0b" : "transparent"}`,
            marginBottom: -1
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: History Blokir ── */}
      {tab === "history" && (
        <div>
          <div style={{ color:"var(--textMuted)", fontSize:13, marginBottom:14 }}>
            Semua akun yang pernah diblokir — termasuk yang datanya sudah dihapus. Tap <strong style={{ color:"#4ade80" }}>Buka Blokir</strong> untuk mengaktifkan kembali.
          </div>
          {loading && <div style={{ color:"var(--textMuted)", fontSize:14, padding:"20px 0" }}>Memuat...</div>}
          {!loading && blockedHistory.length === 0 && (
            <div style={{ color:"var(--textMuted)", fontSize:14, textAlign:"center", padding:"40px 0" }}>Belum ada riwayat pemblokiran.</div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {blockedHistory.map((b, i) => (
              <div key={i} style={{ ...S.card, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, borderLeft:"4px solid #f87171" }}>
                <div style={{ width:42, height:42, borderRadius:"50%", background:"#7f1d1d22", color:"#f87171", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, border:"2px solid #7f1d1d" }}>
                  🚫
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:"var(--textPrimary)", fontWeight:600, fontSize:14, marginBottom:2 }}>
                    {b.nama || <span style={{ color:"var(--textMuted)", fontStyle:"italic" }}>Nama tidak tersedia</span>}
                  </div>
                  <div style={{ color:"var(--textMuted)", fontSize:12, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.email}</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {b.upt && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:999, background:"#1e3a5f", color:"#60a5fa", border:"1px solid #1e40af" }}>{b.upt}</span>}
                    <span style={{ fontSize:10, color:"#f87171" }}>
                      Diblokir: {b.blockedAt
                        ? new Date(b.blockedAt).toLocaleString("id-ID", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
                        : "-"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setConfirm({ action:"unblock", user:{ uid:b.uid, nama:b.nama, email:b.email, upt:b.upt } })}
                  style={{ background:"#14532d22", border:"1px solid #14532d", color:"#4ade80", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0 }}
                  onMouseEnter={e => { e.currentTarget.style.background="#14532d"; e.currentTarget.style.color="#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="#14532d22"; e.currentTarget.style.color="#4ade80"; }}
                >
                  ✅ Buka Blokir
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: User Aktif ── */}
      {tab === "active" && (
        <div>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
            {[
              { label:"Total User", val:users.length,  color:"#f59e0b", status:"all" },
              { label:"Aktif",      val:activeCount,   color:"#4ade80", status:"active" },
              { label:"Diblokir",   val:blockedCount,  color:"#f87171", status:"blocked" },
            ].map((s,i) => (
              <div key={i} onClick={() => setFilterStatus(filterStatus===s.status?"all":s.status)}
                style={{ ...S.card, textAlign:"center", borderTop:`3px solid ${s.color}`, padding:"14px 10px", cursor:"pointer", outline:filterStatus===s.status?`2px solid ${s.color}`:"none" }}>
                <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.val}</div>
                <div style={{ color:"var(--textSecondary)", fontSize:12, marginTop:3 }}>{s.label}</div>
                {filterStatus===s.status && <div style={{ fontSize:10, color:s.color, marginTop:4, fontWeight:600 }}>✓ Filter aktif</div>}
              </div>
            ))}
          </div>

          {/* Filter */}
          <div style={{ ...S.card, marginBottom:16 }}>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <button onClick={() => setFilterUpt("all")} style={{ ...S.btnGhost, fontSize:12, fontFamily:"inherit", background:filterUpt==="all"?"#f59e0b":"var(--bgInput)", color:filterUpt==="all"?"#000":"var(--textSecondary)", border:filterUpt==="all"?"none":"1px solid var(--borderMid)" }}>
                Semua UPT
              </button>
              {UPT_LIST.map(u => (
                <button key={u} onClick={() => setFilterUpt(filterUpt===u?"all":u)}
                  style={{ ...S.btnGhost, fontSize:12, fontFamily:"inherit", background:filterUpt===u?"#3b82f6":"var(--bgInput)", color:filterUpt===u?"#fff":"var(--textSecondary)", border:filterUpt===u?"none":"1px solid var(--borderMid)" }}>
                  {u.replace("UPT ","")}
                </button>
              ))}
              <input style={{ ...S.input, flex:1, minWidth:160, padding:"8px 12px" }}
                placeholder="🔍 Cari nama / email..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading && <div style={{ color:"var(--textMuted)", fontSize:14, padding:"20px 0" }}>Memuat data user...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ color:"var(--textMuted)", fontSize:14, textAlign:"center", padding:"40px 0" }}>
              {users.length === 0 ? "Belum ada user yang mendaftar." : "Tidak ada user yang cocok."}
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filtered.map(u => {
              const isBlocked = blockedIds.has(u.uid);
              return (
                <div key={u.firestoreId} style={{ ...S.card, padding:"14px 16px", display:"flex", alignItems:"center", gap:12, borderLeft:`4px solid ${isBlocked?"#f87171":"#4ade80"}`, opacity:isBlocked?0.85:1 }}>
                  {u.photoURL
                    ? <img src={u.photoURL} alt="" style={{ width:42, height:42, borderRadius:"50%", flexShrink:0, border:"2px solid var(--borderMid)", filter:isBlocked?"grayscale(1)":"none" }} />
                    : <div style={{ width:42, height:42, borderRadius:"50%", background:"var(--bgInput)", color:"#f59e0b", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:16, flexShrink:0, border:"2px solid var(--borderMid)" }}>
                        {u.nama?.[0]?.toUpperCase() || "?"}
                      </div>
                  }
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                      <div style={{ color:"var(--textPrimary)", fontWeight:600, fontSize:14 }}>
                        {u.nama || <span style={{ color:"var(--textMuted)", fontStyle:"italic" }}>Nama belum diisi</span>}
                      </div>
                      {isBlocked && <span style={{ fontSize:10, padding:"1px 7px", borderRadius:999, background:"#7f1d1d22", color:"#f87171", border:"1px solid #7f1d1d", fontWeight:600 }}>🚫 DIBLOKIR</span>}
                    </div>
                    <div style={{ color:"var(--textMuted)", fontSize:12, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {u.upt && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:999, background:"#1e3a5f", color:"#60a5fa", border:"1px solid #1e40af" }}>{u.upt}</span>}
                      {u.createdAt && <span style={{ fontSize:10, color:"var(--textMuted)" }}>Daftar: {u.createdAt?.split("T")[0]}</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    {isBlocked ? (
                      <button onClick={() => setConfirm({ action:"unblock", user:u })}
                        style={{ background:"#14532d22", border:"1px solid #14532d", color:"#4ade80", borderRadius:8, padding:"7px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
                        onMouseEnter={e => { e.currentTarget.style.background="#14532d"; e.currentTarget.style.color="#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background="#14532d22"; e.currentTarget.style.color="#4ade80"; }}>
                        ✅ Buka Blokir
                      </button>
                    ) : (
                      <button onClick={() => setConfirm({ action:"block", user:u })}
                        style={{ background:"#78350f22", border:"1px solid #78350f", color:"#fbbf24", borderRadius:8, padding:"7px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
                        onMouseEnter={e => { e.currentTarget.style.background="#78350f"; e.currentTarget.style.color="#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background="#78350f22"; e.currentTarget.style.color="#fbbf24"; }}>
                        🚫 Blokir
                      </button>
                    )}
                    <button onClick={() => setConfirm({ action:"delete", user:u })}
                      style={{ background:"#7f1d1d22", border:"1px solid #7f1d1d", color:"#f87171", borderRadius:8, padding:"7px 12px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}
                      onMouseEnter={e => { e.currentTarget.style.background="#7f1d1d"; e.currentTarget.style.color="#fff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background="#7f1d1d22"; e.currentTarget.style.color="#f87171"; }}>
                      🗑 Hapus Data
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
