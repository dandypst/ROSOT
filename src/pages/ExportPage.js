import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { exportExcel, exportPDF, UPT_LIST } from "../utils/exportReport";
import { S } from "../styles";

export default function ExportPage() {
  const [ujian, setUjian]         = useState([]);
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [exporting, setExporting] = useState(null); // "pdf"|"excel"
  const [selectedUpt, setSelectedUpt] = useState("all");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [toast, setToast]         = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Ujian records
        const uSnap = await getDocs(query(collection(db, "answer_records"), orderBy("timestamp", "desc")));
        const uData = uSnap.docs.map(d => d.data());

        // Enrich with UPT from users collection
        const usersSnap = await getDocs(collection(db, "users"));
        const userMap = {};
        usersSnap.docs.forEach(d => { userMap[d.data().uid] = d.data(); });
        const enriched = uData.map(r => ({
          ...r,
          upt: userMap[r.userId]?.upt || "-",
          userName: userMap[r.userId]?.nama || r.userName,
        }));
        setUjian(enriched);

        // Briefing records
        const bSnap = await getDocs(query(collection(db, "briefings"), orderBy("timestamp", "desc")));
        setBriefings(bSnap.docs.map(d => d.data()));
      } catch (e) {
        showToast("Gagal memuat data: " + e.message, false);
      }
      setLoading(false);
    };
    load();
  }, []);

  // ── Filter by date range ──────────────────────────────────────
  const filterByDate = (records) => {
    return records.filter(r => {
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo   && r.date > dateTo)   return false;
      return true;
    });
  };

  const filteredUjian    = filterByDate(ujian);
  const filteredBriefing = filterByDate(briefings);

  // ── Stats per UPT ─────────────────────────────────────────────
  const uptStats = ["all", ...UPT_LIST].map(upt => {
    const u = upt === "all" ? filteredUjian    : filteredUjian.filter(r => r.upt === upt);
    const b = upt === "all" ? filteredBriefing : filteredBriefing.filter(r => r.upt === upt);
    return { upt, ujian: u.length, briefing: b.length };
  });

  const handleExport = async (format) => {
    setExporting(format);
    try {
      if (format === "excel") {
        await exportExcel(filteredUjian, filteredBriefing, selectedUpt);
      } else {
        await exportPDF(filteredUjian, filteredBriefing, selectedUpt);
      }
      showToast(`✅ File ${format.toUpperCase()} berhasil didownload!`, true);
    } catch (e) {
      showToast(`❌ Gagal export: ${e.message}`, false);
    }
    setExporting(null);
  };

  return (
    <div style={S.pageWrap}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.ok ? "#14532d" : "#7f1d1d",
          color: toast.ok ? "#4ade80" : "#f87171",
          border: `1px solid ${toast.ok ? "#4ade80" : "#f87171"}`,
          boxShadow: "0 8px 24px #00000066",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📤</span>
        <div>
          <div style={S.sectionTitle}>Export Laporan</div>
          <div style={S.sectionSub}>Download hasil ujian & briefing — dipisah per UPT</div>
        </div>
      </div>

      {/* Stats cards per UPT */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
        {uptStats.map((s, i) => (
          <div
            key={i}
            onClick={() => setSelectedUpt(s.upt)}
            style={{
              ...S.card, cursor: "pointer", textAlign: "center", padding: "14px 10px",
              borderTop: `3px solid ${selectedUpt === s.upt ? "#f59e0b" : "var(--border)"}`,
              outline: selectedUpt === s.upt ? "2px solid #f59e0b" : "none",
              transition: "all .15s"
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--textMuted)", marginBottom: 6, letterSpacing: 0.5 }}>
              {s.upt === "all" ? "SEMUA UPT" : s.upt.replace("UPT ", "").toUpperCase()}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#3b82f6" }}>{s.ujian}</div>
                <div style={{ fontSize: 10, color: "var(--textMuted)" }}>Ujian</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b" }}>{s.briefing}</div>
                <div style={{ fontSize: 10, color: "var(--textMuted)" }}>Briefing</div>
              </div>
            </div>
            {selectedUpt === s.upt && (
              <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 6, fontWeight: 600 }}>✓ Dipilih</div>
            )}
          </div>
        ))}
      </div>

      {/* Filter & Export */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={S.cardTitle}>⚙️ Filter & Export</div>

        {/* Date range */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ display: "block", color: "var(--textSecondary)", fontSize: 11, fontWeight: 600, marginBottom: 4, letterSpacing: 0.5 }}>
              DARI TANGGAL
            </label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ ...S.input, padding: "9px 12px" }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ display: "block", color: "var(--textSecondary)", fontSize: 11, fontWeight: 600, marginBottom: 4, letterSpacing: 0.5 }}>
              SAMPAI TANGGAL
            </label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ ...S.input, padding: "9px 12px" }} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ ...S.btnGhost, alignSelf: "flex-end", fontSize: 12 }}>
              ✕ Reset
            </button>
          )}
        </div>

        {/* Summary */}
        <div style={{
          background: "var(--bgInput)", borderRadius: 8, padding: "10px 14px",
          marginBottom: 16, fontSize: 13, color: "var(--textSecondary)"
        }}>
          Yang akan di-export: &nbsp;
          <strong style={{ color: "var(--textPrimary)" }}>
            {selectedUpt === "all" ? "Semua UPT" : selectedUpt}
          </strong>
          &nbsp;·&nbsp;
          <strong style={{ color: "#3b82f6" }}>{filteredUjian.filter(r => selectedUpt === "all" || r.upt === selectedUpt).length} data ujian</strong>
          &nbsp;·&nbsp;
          <strong style={{ color: "#f59e0b" }}>{filteredBriefing.filter(r => selectedUpt === "all" || r.upt === selectedUpt).length} data briefing</strong>
          {(dateFrom || dateTo) && (
            <span style={{ color: "var(--textMuted)", fontSize: 11, marginLeft: 8 }}>
              ({dateFrom || "awal"} s/d {dateTo || "sekarang"})
            </span>
          )}
        </div>

        {/* Export buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => handleExport("excel")}
            disabled={!!exporting || loading}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#166534", color: "#4ade80",
              border: "1px solid #4ade80", borderRadius: 8,
              padding: "11px 22px", fontWeight: 700, fontSize: 14,
              cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: exporting ? 0.7 : 1,
              transition: "all .2s"
            }}
          >
            📊 {exporting === "excel" ? "Mengekspor..." : "Export Excel (.xlsx)"}
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={!!exporting || loading}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#7f1d1d", color: "#f87171",
              border: "1px solid #f87171", borderRadius: 8,
              padding: "11px 22px", fontWeight: 700, fontSize: 14,
              cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: exporting ? 0.7 : 1,
              transition: "all .2s"
            }}
          >
            📄 {exporting === "pdf" ? "Mengekspor..." : "Export PDF"}
          </button>
        </div>

        <div style={{ color: "var(--textMuted)", fontSize: 11, marginTop: 10 }}>
          Excel berisi 3 sheet: Hasil Ujian, Laporan Briefing, dan Ringkasan per User. PDF berisi 3 halaman yang sama.
        </div>
      </div>

      {/* Preview briefing with photos */}
      {filteredBriefing.filter(r => selectedUpt === "all" || r.upt === selectedUpt).some(r => r.foto) && (
        <div style={S.card}>
          <div style={S.cardTitle}>📷 Foto Dokumentasi Briefing</div>
          <div style={{ color: "var(--textMuted)", fontSize: 12, marginBottom: 12 }}>
            Foto tersimpan di database. Untuk export foto, gunakan tombol di bawah setiap foto.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {filteredBriefing
              .filter(r => (selectedUpt === "all" || r.upt === selectedUpt) && r.foto)
              .map((r, i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                  <img src={r.foto} alt={`briefing-${r.date}`}
                    style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ color: "var(--textPrimary)", fontSize: 12, fontWeight: 600 }}>{r.userName}</div>
                    <div style={{ color: "var(--textMuted)", fontSize: 10 }}>{r.date} · {(r.upt || "-").replace("UPT ","")}</div>
                    <a
                      href={r.foto}
                      download={`briefing_${r.userName?.replace(/\s+/g,"_")}_${r.date}.jpg`}
                      style={{ display: "inline-block", marginTop: 6, fontSize: 10, color: "#60a5fa" }}
                    >
                      ⬇ Download foto
                    </a>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {loading && <div style={{ color: "var(--textMuted)", padding: "24px 0" }}>Memuat data...</div>}
    </div>
  );
}
