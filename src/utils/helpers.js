export const todayStr = () => new Date().toISOString().split("T")[0];

/**
 * Get daily questions for a specific user — random but seeded by userId + date.
 * Same user always gets the same soal on the same day.
 * Different users get different soal on the same day.
 */
export function getDailyQuestionsForUser(questions, userId) {
  const safetyQs = questions.filter(q => q.type === "safety");
  const teknisQs = questions.filter(q => q.type === "teknis");
  if (!safetyQs.length || !teknisQs.length) return { safety: null, teknis: null };

  const seed = hashCode(`${userId}_${todayStr()}`);
  const si = Math.abs(seed) % safetyQs.length;
  const ti = Math.abs(seed * 31) % teknisQs.length;

  return {
    safety: { ...safetyQs[si], id: safetyQs[si].firestoreId },
    teknis: { ...teknisQs[ti], id: teknisQs[ti].firestoreId },
  };
}

/** Simple deterministic hash — same string always same number */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export const isAdmin = (user) => {
  if (!user) return false;
  const adminEmails = (process.env.REACT_APP_ADMIN_EMAILS || "").split(",").map(e => e.trim());
  return adminEmails.includes(user.email);
};

export const exportCSV = (data, filename) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => `"${(row[h] || "").toString().replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
};
