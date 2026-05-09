export const todayStr = () => new Date().toISOString().split("T")[0];

export const getDailyQuestions = (questions) => {
  const start = new Date("2024-01-01");
  const day = Math.floor((new Date() - start) / 86400000);
  const safety = questions.filter(q => q.type === "safety");
  const teknis = questions.filter(q => q.type === "teknis");
  return {
    safety: safety[day % safety.length],
    teknis: teknis[day % teknis.length],
  };
};

export const isAdmin = (user) => {
  if (!user) return false;
  const adminEmails = (process.env.REACT_APP_ADMIN_EMAILS || "").split(",").map(e => e.trim());
  return adminEmails.includes(user.email);
};

export const exportToExcel = (data, filename) => {
  import("xlsx").then(XLSX => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, filename);
  });
};
