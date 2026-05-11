// Export utilities — PDF (jspdf + autotable) and Excel (xlsx)
// Both export data filtered per UPT

const UPT_LIST = ["UPT CCM Tegalluar", "UPT CCM Halim", "UPT NMC"];

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return "-";
  const d = new Date(str);
  return d.toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
}

// ── EXCEL EXPORT ──────────────────────────────────────────────
export async function exportExcel(ujianRecords, briefingRecords, upt) {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();
  const uptLabel = upt === "all" ? "Semua UPT" : upt;

  // ── Sheet 1: Hasil Ujian ─────────────────────────────────────
  const ujianFiltered = upt === "all"
    ? ujianRecords
    : ujianRecords.filter(r => r.upt === upt);

  const ujianRows = ujianFiltered.map(r => ({
    "Tanggal":        r.date || "-",
    "Nama":           r.userName || "-",
    "UPT":            r.upt || "-",
    "Email":          r.userEmail || "-",
    "Kategori":       r.type === "safety" ? "Safety" : "Teknis",
    "Soal":           r.questionText || "-",
    "Jawaban User":   r.chosenText || "(tidak dijawab)",
    "Jawaban Benar":  r.correctAnswer || "-",
    "Hasil":          r.timeout ? "TIMEOUT" : r.correct ? "BENAR" : "SALAH",
    "Timestamp":      r.timestamp ? fmtDate(r.timestamp) : "-",
  }));

  const wsUjian = XLSX.utils.json_to_sheet(ujianRows.length ? ujianRows : [{ Info: "Belum ada data" }]);
  // Column widths
  wsUjian["!cols"] = [
    {wch:12},{wch:22},{wch:20},{wch:28},{wch:10},
    {wch:50},{wch:30},{wch:30},{wch:10},{wch:14}
  ];
  XLSX.utils.book_append_sheet(wb, wsUjian, "Hasil Ujian");

  // ── Sheet 2: Laporan Briefing ─────────────────────────────────
  const briefFiltered = upt === "all"
    ? briefingRecords
    : briefingRecords.filter(r => r.upt === upt);

  const briefRows = briefFiltered.map(r => ({
    "Tanggal":            r.date || "-",
    "Nama Peserta":       r.userName || "-",
    "UPT":                r.upt || "-",
    "Email":              r.userEmail || "-",
    "Nama Pemberi":       r.namaPemberi || "-",
    "Catatan Briefing":   r.catatan || "-",
    "Ada Foto":           r.foto ? "Ya" : "Tidak",
    "Timestamp":          r.timestamp ? fmtDate(r.timestamp) : "-",
  }));

  const wsBrief = XLSX.utils.json_to_sheet(briefRows.length ? briefRows : [{ Info: "Belum ada data" }]);
  wsBrief["!cols"] = [
    {wch:12},{wch:22},{wch:20},{wch:28},{wch:22},{wch:60},{wch:10},{wch:14}
  ];
  XLSX.utils.book_append_sheet(wb, wsBrief, "Laporan Briefing");

  // ── Sheet 3: Ringkasan per User ───────────────────────────────
  const userMap = {};
  ujianFiltered.forEach(r => {
    if (!userMap[r.userId]) userMap[r.userId] = {
      nama: r.userName, email: r.userEmail, upt: r.upt,
      total: 0, benar: 0, safety: 0, safetyBenar: 0,
      teknis: 0, teknisBenar: 0, timeout: 0
    };
    const u = userMap[r.userId];
    u.total++;
    if (r.correct) u.benar++;
    if (r.timeout) u.timeout++;
    if (r.type === "safety") { u.safety++; if (r.correct) u.safetyBenar++; }
    if (r.type === "teknis") { u.teknis++; if (r.correct) u.teknisBenar++; }
  });

  const summaryRows = Object.values(userMap).map(u => ({
    "Nama":             u.nama,
    "UPT":              u.upt,
    "Email":            u.email,
    "Total Soal":       u.total,
    "Benar":            u.benar,
    "Salah":            u.total - u.benar - u.timeout,
    "Timeout":          u.timeout,
    "Akurasi (%)":      u.total ? Math.round(u.benar / u.total * 100) : 0,
    "Safety Benar":     u.safetyBenar,
    "Safety Total":     u.safety,
    "Teknis Benar":     u.teknisBenar,
    "Teknis Total":     u.teknis,
  }));

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ Info: "Belum ada data" }]);
  wsSummary["!cols"] = [{wch:22},{wch:20},{wch:28},{wch:10},{wch:8},{wch:8},{wch:10},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12}];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan User");

  // Write
  const filename = `ROSOT_${upt === "all" ? "SemuaUPT" : upt.replace(/\s+/g, "_")}_${todayForFile()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ── PDF EXPORT ────────────────────────────────────────────────
export async function exportPDF(ujianRecords, briefingRecords, upt) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const uptLabel = upt === "all" ? "Semua UPT" : upt;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const ujianFiltered = upt === "all" ? ujianRecords : ujianRecords.filter(r => r.upt === upt);
  const briefFiltered = upt === "all" ? briefingRecords : briefingRecords.filter(r => r.upt === upt);

  // ── Header helper ─────────────────────────────────────────────
  const addHeader = (title) => {
    doc.setFillColor(160, 21, 48); // TELCO red
    doc.rect(0, 0, 297, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("ROSOT — Refreshment One Safety One Technical", 8, 8);
    doc.text(`HIGHLY CONFIDENTIAL  |  ${new Date().toLocaleDateString("id-ID")}`, 297-8, 8, { align: "right" });

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(title, 8, 22);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`UPT: ${uptLabel}  |  Diekspor: ${new Date().toLocaleString("id-ID")}`, 8, 29);
    doc.setDrawColor(200, 200, 200);
    doc.line(8, 32, 289, 32);
  };

  // ── Page 1: Hasil Ujian ───────────────────────────────────────
  addHeader("Laporan Hasil Ujian Harian");

  const ujianBody = ujianFiltered.map(r => [
    r.date || "-",
    r.userName || "-",
    (r.upt || "-").replace("UPT ", ""),
    r.type === "safety" ? "Safety" : "Teknis",
    (r.questionText || "-").substring(0, 55) + (r.questionText?.length > 55 ? "..." : ""),
    (r.chosenText || "(kosong)").substring(0, 30),
    (r.correctAnswer || "-").substring(0, 30),
    r.timeout ? "TIMEOUT" : r.correct ? "✓ BENAR" : "✗ SALAH",
  ]);

  autoTable(doc, {
    startY: 36,
    head: [["Tanggal","Nama","UPT","Kategori","Soal","Jawaban","Jawaban Benar","Hasil"]],
    body: ujianBody.length ? ujianBody : [["Belum ada data","","","","","","",""]],
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [160, 21, 48], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 30 }, 2: { cellWidth: 22 },
      3: { cellWidth: 18 }, 4: { cellWidth: 70 }, 5: { cellWidth: 38 },
      6: { cellWidth: 38 }, 7: { cellWidth: 20 }
    },
    didDrawCell: (data) => {
      if (data.column.index === 7 && data.section === "body") {
        const val = String(data.cell.raw);
        if (val.includes("BENAR")) data.cell.styles.textColor = [22, 101, 52];
        else if (val.includes("SALAH")) data.cell.styles.textColor = [127, 29, 29];
        else if (val.includes("TIMEOUT")) data.cell.styles.textColor = [120, 53, 15];
      }
    }
  });

  // ── Page 2: Laporan Briefing ──────────────────────────────────
  doc.addPage();
  addHeader("Laporan Briefing Harian");

  const briefBody = briefFiltered.map(r => [
    r.date || "-",
    r.userName || "-",
    (r.upt || "-").replace("UPT ", ""),
    r.namaPemberi || "-",
    (r.catatan || "-").substring(0, 120) + (r.catatan?.length > 120 ? "..." : ""),
    r.foto ? "Ada" : "Tidak",
  ]);

  autoTable(doc, {
    startY: 36,
    head: [["Tanggal","Nama Peserta","UPT","Pemberi Briefing","Catatan Briefing","Foto"]],
    body: briefBody.length ? briefBody : [["Belum ada data","","","","",""]],
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [160, 21, 48], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 22 }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 },
      3: { cellWidth: 35 }, 4: { cellWidth: 155 }, 5: { cellWidth: 15 }
    },
  });

  // ── Page 3: Ringkasan per User ────────────────────────────────
  doc.addPage();
  addHeader("Ringkasan Hasil per User");

  const userMap = {};
  ujianFiltered.forEach(r => {
    if (!userMap[r.userId]) userMap[r.userId] = {
      nama: r.userName, upt: r.upt,
      total: 0, benar: 0, timeout: 0,
      safety: 0, safetyBenar: 0, teknis: 0, teknisBenar: 0
    };
    const u = userMap[r.userId];
    u.total++; if (r.correct) u.benar++; if (r.timeout) u.timeout++;
    if (r.type === "safety") { u.safety++; if (r.correct) u.safetyBenar++; }
    if (r.type === "teknis") { u.teknis++; if (r.correct) u.teknisBenar++; }
  });

  const summaryBody = Object.values(userMap).map(u => [
    u.nama,
    (u.upt || "-").replace("UPT ", ""),
    u.total,
    u.benar,
    u.total - u.benar - u.timeout,
    u.timeout,
    u.total ? `${Math.round(u.benar / u.total * 100)}%` : "0%",
    u.safety ? `${u.safetyBenar}/${u.safety}` : "-",
    u.teknis ? `${u.teknisBenar}/${u.teknis}` : "-",
  ]);

  autoTable(doc, {
    startY: 36,
    head: [["Nama","UPT","Total Soal","Benar","Salah","Timeout","Akurasi","Safety","Teknis"]],
    body: summaryBody.length ? summaryBody : [["Belum ada data","","","","","","","",""]],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [160, 21, 48], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 40 }, 1: { cellWidth: 28 },
      2: { cellWidth: 22, halign: "center" }, 3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 18, halign: "center" }, 5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 20, halign: "center" }, 7: { cellWidth: 28, halign: "center" },
      8: { cellWidth: 28, halign: "center" }
    },
  });

  // Footer on all pages
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(150);
    doc.text(`Halaman ${i} dari ${pageCount}  |  HIGHLY CONFIDENTIAL ©2026 PT KCIC`, 148.5, 205, { align: "center" });
  }

  const filename = `ROSOT_${upt === "all" ? "SemuaUPT" : upt.replace(/\s+/g, "_")}_${todayForFile()}.pdf`;
  doc.save(filename);
}

function todayForFile() {
  return new Date().toISOString().split("T")[0];
}

export { UPT_LIST };
