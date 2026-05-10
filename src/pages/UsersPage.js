import { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, query, orderBy, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { S } from "../styles";
import { todayStr } from "../utils/helpers";

const UPT_LIST = ["UPT CCM Tegalluar", "UPT CCM Halim", "UPT NMC"];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUpt, setFilterUpt] = useState("all");
  const [confirmDelete, setConfirmDelete] = useState(null); // user obj
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      // Sort by createdAt desc
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      setUsers(list);
    } catch (e) {
      showToast("Gagal memuat data user.", "err");
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  // ── Delete user data (tidak bisa hapus akun Google, tapi hapus data & blokir) ──
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const u = confirmDelete;
      // Hapus profil user
      await deleteDoc(doc(db, "users", u.firestoreId));
      // Hapus semua jawaban harian user
      const ansSnap = await getDocs(collection(db, "daily_answers"));
      for (const d of ansSnap.docs) {
        if (d.data().userId === u.uid) await deleteDoc(d.ref);
      }
      // Hapus semua answer records user
      const recSnap = await getDocs(collection(db, "answer_records"));
      for (const d of recSnap.docs) {
        if (d.data().userId === u.uid) await deleteDoc(d.ref);
      }
      // Tandai sebagai banned di collection blocked_users
      await setDoc(doc(db, "blocked_users", u.uid), {
        uid: u.uid,
        email: u.email,
        nama: u.nama,
        upt: u.upt,
        blockedAt: new Date().toISOString(),
        reason: "Removed by admin",
      });

      setUsers(prev => prev.filter(x => x.firestoreId !== u.firestoreId));
      showToast(`${u.nama || u.email} berhasil dihapus & diblokir.`, "ok");
    } catch (e) {
      showToast("Gagal menghapus user: " + e.message, "err");
    }
    setConfirmDelete(null);
    setDeleting(false);
  };

  const filtered = users
    .filter(u => filterUpt === "all" || u.upt === filterUpt)
    .filter(u => {
      const q = search.toLowerCase();
      return !q ||
        u.nama?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.upt?.toLowerCase().includes(q);
    });

  const uptCounts = UPT_LIST.map(u => ({
    upt: u, count: users.filter(x => x.upt === u).length
  }));

  return (
    <div style={S.pageWrap}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.type === "ok" ? "#14532d" : "#7f1d1d",
          color: toast.type === "ok" ? "#4ade80" : "#f87171",
          border: `1px solid ${toast.type === "ok" ? "#4ade80" : "#f87171"}`,
          boxShadow: "0 8px 24px #00000066",
          animation: "slideUp .3s ease"
        }}>
          {toast.type === "ok" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Confirm modal */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 500, padding: 20
        }}>
          <div style={{
            background: "#0f172a", border: "1px solid #ef4444",
            borderRadius: 14, padding: "28px 28px", maxWidth: 400, width: "100%"
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Hapus & Blokir User?
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              Kamu akan menghapus data dan memblokir:<br />
              <strong style={{ color: "#e2e8f0" }}>{confirmDelete.nama || "-"}</strong><br />
              <span style={{ fontSize: 12 }}>{confirmDelete.email}</span><br />
              <span style={{ fontSize: 12, color: "#f59e0b" }}>{confirmDelete.upt || "-"}</span>
              <br /><br />
              <span style={{ color: "#f87171" }}>
                Semua data jawaban user ini akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, background: "#ef4444", color: "#fff",
                  border: "none", borderRadius: 8, padding: "11px",
                  fontWeight: 700, fontSize: 14, cursor: deleting ? "not-allowed" : "pointer",
                  fontFamily: "inherit"
                }}
              >
                {deleting ? "Menghapus..." : "🗑 Ya, Hapus & Blokir"}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1, background: "#1e293b", color: "#94a3b8",
                  border: "1px solid #334155", borderRadius: 8, padding: "11px",
                  fontWeight: 600, fontSize: 14, cursor: "pointer",
                  fontFamily: "inherit"
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Header */}
      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>🛡️</span>
        <div>
          <div style={S.sectionTitle}>Manajemen User</div>
          <div style={S.sectionSub}>Pantau dan hapus user mencurigakan</div>
        </div>
        <button onClick={loadUsers} style={{ ...S.btnGhost, marginLeft: "auto", fontSize: 12 }}>
          🔄 Refresh
        </button>
      </div>

      {/* Stats per UPT */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ ...S.card, textAlign: "center", borderTop: "3px solid #f59e0b", padding: "14px 10px" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>{users.length}</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>Total User</div>
        </div>
        {uptCounts.map((u, i) => (
          <div key={i} style={{ ...S.card, textAlign: "center", borderTop: "3px solid #3b82f6", padding: "14px 10px", cursor: "pointer" }}
            onClick={() => setFilterUpt(filterUpt === u.upt ? "all" : u.upt)}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#3b82f6" }}>{u.count}</div>
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 3 }}>{u.upt.replace("UPT ", "")}</div>
          </div>
        ))}
      </div>

      {/* Filter & Search */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setFilterUpt("all")} style={{
            ...S.btnGhost, fontSize: 12, fontFamily: "inherit",
            background: filterUpt === "all" ? "#f59e0b" : "#1e293b",
            color: filterUpt === "all" ? "#000" : "#94a3b8",
            border: filterUpt === "all" ? "none" : "1px solid #334155"
          }}>Semua</button>
          {UPT_LIST.map(u => (
            <button key={u} onClick={() => setFilterUpt(filterUpt === u ? "all" : u)} style={{
              ...S.btnGhost, fontSize: 12, fontFamily: "inherit",
              background: filterUpt === u ? "#3b82f6" : "#1e293b",
              color: filterUpt === u ? "#fff" : "#94a3b8",
              border: filterUpt === u ? "none" : "1px solid #334155"
            }}>{u.replace("UPT ", "")}</button>
          ))}
          <input
            style={{ ...S.input, flex: 1, minWidth: 160, padding: "8px 12px" }}
            placeholder="🔍 Cari nama / email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* User list */}
      {loading && <div style={{ color: "#475569", fontSize: 14, padding: "20px 0" }}>Memuat data user...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ color: "#475569", fontSize: 14, textAlign: "center", padding: "40px 0" }}>
          {users.length === 0 ? "Belum ada user yang mendaftar." : "Tidak ada user yang cocok."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((u, i) => (
          <div key={u.firestoreId} style={{
            ...S.card, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 12
          }}>
            {/* Avatar */}
            {u.photoURL
              ? <img src={u.photoURL} alt="" style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, border: "2px solid #334155" }} />
              : <div style={{
                  width: 42, height: 42, borderRadius: "50%", background: "#1e293b",
                  color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 16, flexShrink: 0, border: "2px solid #334155"
                }}>
                  {u.nama?.[0]?.toUpperCase() || "?"}
                </div>
            }

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                {u.nama || <span style={{ color: "#475569", fontStyle: "italic" }}>Nama belum diisi</span>}
              </div>
              <div style={{ color: "#64748b", fontSize: 12, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {u.email}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {u.upt && (
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 999,
                    background: "#1e3a5f", color: "#60a5fa",
                    border: "1px solid #1e40af"
                  }}>{u.upt}</span>
                )}
                {u.createdAt && (
                  <span style={{ fontSize: 10, color: "#334155" }}>
                    Daftar: {u.createdAt?.split("T")[0] || "-"}
                  </span>
                )}
                {!u.nama && !u.upt && (
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 999,
                    background: "#78350f22", color: "#fbbf24",
                    border: "1px solid #78350f"
                  }}>⚠️ Profil tidak lengkap</span>
                )}
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={() => setConfirmDelete(u)}
              style={{
                background: "#7f1d1d22", border: "1px solid #7f1d1d",
                color: "#f87171", borderRadius: 8,
                padding: "8px 14px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                flexShrink: 0, whiteSpace: "nowrap",
                transition: "all .15s"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#7f1d1d"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#7f1d1d22"; e.currentTarget.style.color = "#f87171"; }}
            >
              🗑 Hapus & Blokir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
