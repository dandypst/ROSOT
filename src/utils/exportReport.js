// Export utilities — PDF (jspdf + autotable) and Excel (xlsx)
// PDF: foto briefing disisipkan langsung per halaman
// Excel: sheet briefing + sheet foto terpisah (base64 preview)

const UPT_LIST = ["UPT CCM Tegalluar", "UPT CCM Halim", "UPT NMC"];

function fmtDate(str) {
  if (!str) return "-";
  return new Date(str).toLocaleDateString("id-ID", { day:"2-digit", month:"short", year:"numeric" });
}

function todayForFile() {
  return new Date().toISOString().split("T")[0];
}

function filterRecords(records, upt, dateFrom, dateTo) {
  return records.filter(r => {
    if (upt !== "all" && r.upt !== upt) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo   && r.date > dateTo)   return false;
    return true;
  });
}

// ── EXCEL EXPORT ───────────────────────────────────────────────
export async function exportExcel(ujianRecords, briefingRecords, upt, dateFrom="", dateTo="") {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const ujianF  = filterRecords(ujianRecords, upt, dateFrom, dateTo);
  const briefF  = filterRecords(briefingRecords, upt, dateFrom, dateTo);

  // ── Sheet 1: Hasil Ujian ──────────────────────────────────────
  const ujianRows = ujianF.map(r => ({
    "Tanggal":       r.date || "-",
    "Nama":          r.userName || "-",
    "UPT":           r.upt || "-",
    "Email":         r.userEmail || "-",
    "Kategori":      r.type === "safety" ? "Safety" : "Teknis",
    "Soal":          r.questionText || "-",
    "Jawaban User":  r.chosenText || "(tidak dijawab)",
    "Jawaban Benar": r.correctAnswer || "-",
    "Hasil":         r.timeout ? "TIMEOUT" : r.correct ? "BENAR" : "SALAH",
    "Waktu":         r.timestamp ? fmtDate(r.timestamp) : "-",
  }));
  const wsUjian = XLSX.utils.json_to_sheet(ujianRows.length ? ujianRows : [{ Info: "Belum ada data" }]);
  wsUjian["!cols"] = [{wch:12},{wch:22},{wch:20},{wch:28},{wch:10},{wch:50},{wch:30},{wch:30},{wch:10},{wch:14}];
  XLSX.utils.book_append_sheet(wb, wsUjian, "Hasil Ujian");

  // ── Sheet 2: Laporan Briefing ─────────────────────────────────
  const briefRows = briefF.map((r, idx) => ({
    "No":                idx + 1,
    "Tanggal":           r.date || "-",
    "Nama Peserta":      r.userName || "-",
    "UPT":               r.upt || "-",
    "Email":             r.userEmail || "-",
    "Nama Pemberi":      r.namaPemberi || "-",
    "Catatan Briefing":  r.catatan || "-",
    "Ada Foto":          r.foto ? `Ya (lihat sheet Foto Briefing baris ${idx + 2})` : "Tidak",
    "Waktu":             r.timestamp ? fmtDate(r.timestamp) : "-",
  }));
  const wsBrief = XLSX.utils.json_to_sheet(briefRows.length ? briefRows : [{ Info: "Belum ada data" }]);
  wsBrief["!cols"] = [{wch:5},{wch:12},{wch:22},{wch:20},{wch:28},{wch:22},{wch:60},{wch:35},{wch:14}];
  XLSX.utils.book_append_sheet(wb, wsBrief, "Laporan Briefing");

  // ── Sheet 3: Foto Briefing (base64 preview info) ──────────────
  // Excel tidak support embed gambar via xlsx library,
  // jadi kita simpan info foto + instruksi cara lihat foto
  const fotoRows = briefF
    .filter(r => r.foto)
    .map((r, idx) => ({
      "No":           idx + 1,
      "Tanggal":      r.date || "-",
      "Nama":         r.userName || "-",
      "UPT":          r.upt || "-",
      "Pemberi":      r.namaPemberi || "-",
      "Keterangan":   "Foto tersedia — lihat PDF untuk tampilan foto langsung",
      "Data Base64":  r.foto ? r.foto.substring(0, 60) + "..." : "-",
    }));
  const wsFoto = XLSX.utils.json_to_sheet(
    fotoRows.length ? fotoRows : [{ Info: "Tidak ada foto briefing" }]
  );
  wsFoto["!cols"] = [{wch:5},{wch:12},{wch:22},{wch:20},{wch:22},{wch:50},{wch:40}];
  // Add note at top
  XLSX.utils.sheet_add_aoa(wsFoto, [
    ["CATATAN: Foto briefing hanya bisa ditampilkan di export PDF. Export Excel ini hanya mencatat metadata foto."]
  ], { origin: "A1" });
  XLSX.utils.book_append_sheet(wb, wsFoto, "Foto Briefing");

  // ── Sheet 4: Ringkasan per User ───────────────────────────────
  const userMap = {};
  ujianF.forEach(r => {
    if (!userMap[r.userId]) userMap[r.userId] = {
      nama: r.userName, email: r.userEmail, upt: r.upt,
      total: 0, benar: 0, timeout: 0,
      safety: 0, safetyBenar: 0, teknis: 0, teknisBenar: 0
    };
    const u = userMap[r.userId];
    u.total++; if (r.correct) u.benar++; if (r.timeout) u.timeout++;
    if (r.type === "safety") { u.safety++; if (r.correct) u.safetyBenar++; }
    if (r.type === "teknis") { u.teknis++; if (r.correct) u.teknisBenar++; }
  });
  const summaryRows = Object.values(userMap).map(u => ({
    "Nama":            u.nama, "UPT": u.upt, "Email": u.email,
    "Total Soal":      u.total, "Benar": u.benar,
    "Salah":           u.total - u.benar - u.timeout,
    "Timeout":         u.timeout,
    "Akurasi (%)":     u.total ? Math.round(u.benar / u.total * 100) : 0,
    "Safety Benar":    u.safetyBenar, "Safety Total": u.safety,
    "Teknis Benar":    u.teknisBenar, "Teknis Total": u.teknis,
  }));
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows.length ? summaryRows : [{ Info: "Belum ada data" }]);
  wsSummary["!cols"] = [{wch:22},{wch:20},{wch:28},{wch:10},{wch:8},{wch:8},{wch:10},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12}];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan User");

  const filename = `ROSOT_${upt === "all" ? "SemuaUPT" : upt.replace(/\s+/g, "_")}_${todayForFile()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ── PDF EXPORT ─────────────────────────────────────────────────
export async function exportPDF(ujianRecords, briefingRecords, upt, dateFrom="", dateTo="") {
  const { jsPDF } = await import("jspdf");
  const autoTable  = (await import("jspdf-autotable")).default;

  const uptLabel = upt === "all" ? "Semua UPT" : upt;
  const ujianF   = filterRecords(ujianRecords, upt, dateFrom, dateTo);
  const briefF   = filterRecords(briefingRecords, upt, dateFrom, dateTo);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297; // page width landscape A4

  // ── Header helper ─────────────────────────────────────────────
  const addHeader = (title) => {
    doc.setFillColor(160, 21, 48);
    doc.rect(0, 0, W, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5); doc.setFont("helvetica", "bold");
    doc.text("ROSOT — Refreshment One Safety One Technical", 8, 8);
    doc.text(`HIGHLY CONFIDENTIAL  |  ${new Date().toLocaleDateString("id-ID")}`, W-8, 8, { align:"right" });
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(title, 8, 22);
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`UPT: ${uptLabel}  |  Diekspor: ${new Date().toLocaleString("id-ID")}`, 8, 29);
    doc.setDrawColor(200); doc.line(8, 32, W-8, 32);
  };

  // ── Hal 1: Hasil Ujian ────────────────────────────────────────
  addHeader("Laporan Hasil Ujian Harian");
  autoTable(doc, {
    startY: 36,
    head: [["Tanggal","Nama","UPT","Kategori","Soal","Jawaban","Jawaban Benar","Hasil"]],
    body: ujianF.length ? ujianF.map(r => [
      r.date || "-",
      r.userName || "-",
      (r.upt||"-").replace("UPT ",""),
      r.type === "safety" ? "Safety" : "Teknis",
      (r.questionText||"-").substring(0,55)+(r.questionText?.length>55?"...":""),
      (r.chosenText||"(kosong)").substring(0,28),
      (r.correctAnswer||"-").substring(0,28),
      r.timeout?"TIMEOUT":r.correct?"✓ BENAR":"✗ SALAH",
    ]) : [["Belum ada data","","","","","","",""]],
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor:[160,21,48], textColor:255, fontStyle:"bold" },
    alternateRowStyles: { fillColor:[248,248,248] },
    columnStyles: {
      0:{cellWidth:22},1:{cellWidth:30},2:{cellWidth:22},3:{cellWidth:17},
      4:{cellWidth:68},5:{cellWidth:36},6:{cellWidth:36},7:{cellWidth:20}
    },
  });

  // ── Hal 2: Laporan Briefing (teks) ────────────────────────────
  doc.addPage();
  addHeader("Laporan Briefing Harian");
  autoTable(doc, {
    startY: 36,
    head: [["No","Tanggal","Nama Peserta","UPT","Pemberi Briefing","Catatan Briefing","Foto"]],
    body: briefF.length ? briefF.map((r, i) => [
      i+1,
      r.date||"-",
      r.userName||"-",
      (r.upt||"-").replace("UPT ",""),
      r.namaPemberi||"-",
      (r.catatan||"-").substring(0,110)+(r.catatan?.length>110?"...":""),
      r.foto ? `Ada (hal. ${3+i})` : "Tidak",
    ]) : [["","Belum ada data","","","","",""]],
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor:[160,21,48], textColor:255, fontStyle:"bold" },
    alternateRowStyles: { fillColor:[248,248,248] },
    columnStyles: {
      0:{cellWidth:8,halign:"center"},1:{cellWidth:22},2:{cellWidth:32},
      3:{cellWidth:22},4:{cellWidth:32},5:{cellWidth:140},6:{cellWidth:25}
    },
  });

  // ── Hal 3+: Foto Dokumentasi (1 foto per halaman) ─────────────
  const withFoto = briefF.filter(r => r.foto);
  for (const r of withFoto) {
    doc.addPage();
    addHeader("Dokumentasi Foto Briefing");

    // Info box
    doc.setFillColor(248, 248, 248);
    doc.rect(8, 35, W-16, 28, "F");
    doc.setDrawColor(220); doc.rect(8, 35, W-16, 28, "S");

    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30);
    doc.text("Nama Peserta:", 12, 43);
    doc.text("UPT:", 12, 50);
    doc.text("Tanggal:", 12, 57);
    doc.text("Pemberi Briefing:", 90, 43);
    doc.text("Catatan:", 90, 50);

    doc.setFont("helvetica", "normal"); doc.setTextColor(60);
    doc.text(r.userName || "-", 50, 43);
    doc.text((r.upt||"-"), 50, 50);
    doc.text(r.date||"-", 50, 57);
    doc.text(r.namaPemberi||"-", 140, 43);

    // Catatan (wrapped)
    const catatanLines = doc.splitTextToSize(r.catatan||"-", W-160);
    doc.text(catatanLines.slice(0,3), 140, 50);

    // Foto — embed base64 image
    try {
      const imgData = r.foto; // base64 data URL
      const ext = imgData.startsWith("data:image/png") ? "PNG" : "JPEG";

      // Create temp image to get dimensions
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const maxW = W - 24;   // 12mm margin each side
          const maxH = 145;      // available height
          const ratio = img.width / img.height;
          let iw = maxW, ih = maxW / ratio;
          if (ih > maxH) { ih = maxH; iw = ih * ratio; }
          const ix = (W - iw) / 2;  // center horizontally
          doc.addImage(imgData, ext, ix, 67, iw, ih);
          resolve();
        };
        img.onerror = resolve;
        img.src = imgData;
      });

      // Caption below photo
      doc.setFontSize(7.5); doc.setTextColor(120); doc.setFont("helvetica","italic");
      doc.text(`Foto dokumentasi briefing — ${r.userName} — ${r.date}`, W/2, 215, { align:"center" });
    } catch(e) {
      doc.setFontSize(10); doc.setTextColor(150);
      doc.text("Foto tidak dapat ditampilkan", W/2, 130, { align:"center" });
    }
  }

  // ── Hal terakhir: Ringkasan per User ──────────────────────────
  doc.addPage();
  addHeader("Ringkasan Hasil per User");
  const userMap = {};
  ujianF.forEach(r => {
    if (!userMap[r.userId]) userMap[r.userId] = {
      nama:r.userName, upt:r.upt,
      total:0,benar:0,timeout:0,
      safety:0,safetyBenar:0,teknis:0,teknisBenar:0
    };
    const u = userMap[r.userId];
    u.total++; if(r.correct)u.benar++; if(r.timeout)u.timeout++;
    if(r.type==="safety"){u.safety++;if(r.correct)u.safetyBenar++;}
    if(r.type==="teknis"){u.teknis++;if(r.correct)u.teknisBenar++;}
  });
  autoTable(doc, {
    startY: 36,
    head: [["Nama","UPT","Total","Benar","Salah","Timeout","Akurasi","Safety","Teknis"]],
    body: Object.values(userMap).length ? Object.values(userMap).map(u => [
      u.nama,
      (u.upt||"-").replace("UPT ",""),
      u.total, u.benar,
      u.total-u.benar-u.timeout,
      u.timeout,
      u.total?`${Math.round(u.benar/u.total*100)}%`:"0%",
      u.safety?`${u.safetyBenar}/${u.safety}`:"-",
      u.teknis?`${u.teknisBenar}/${u.teknis}`:"-",
    ]) : [["Belum ada data","","","","","","","",""]],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor:[160,21,48], textColor:255, fontStyle:"bold" },
    alternateRowStyles: { fillColor:[248,248,248] },
    columnStyles: {
      0:{cellWidth:40},1:{cellWidth:28},
      2:{cellWidth:20,halign:"center"},3:{cellWidth:18,halign:"center"},
      4:{cellWidth:18,halign:"center"},5:{cellWidth:20,halign:"center"},
      6:{cellWidth:20,halign:"center"},7:{cellWidth:26,halign:"center"},
      8:{cellWidth:26,halign:"center"}
    },
  });

  // ── Footer semua halaman ───────────────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(150); doc.setFont("helvetica","normal");
    doc.text(`Halaman ${i} dari ${total}  |  HIGHLY CONFIDENTIAL ©2026 PT KCIC`, W/2, 205, { align:"center" });
  }

  const filename = `ROSOT_${upt==="all"?"SemuaUPT":upt.replace(/\s+/g,"_")}_${todayForFile()}.pdf`;
  doc.save(filename);
}

export { UPT_LIST };
