import { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { getDailyQuestionsForUser, todayStr } from "../utils/helpers";
import { S } from "../styles";
import BriefingPage from "./BriefingPage";

const TIMER_SECONDS = 90;

// ── Stage constants ────────────────────────────────────────────
const STAGE = { READY: "ready", SAFETY: "safety", TEKNIS: "teknis", BRIEFING: "briefing", DONE: "done" };

// ── Timer Ring ─────────────────────────────────────────────────
function TimerRing({ seconds, total }) {
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (seconds / total);
  const color = seconds > 30 ? "#4ade80" : seconds > 10 ? "#f59e0b" : "#ef4444";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <div style={{ position: "relative", width: 80, height: 80 }}>
      <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#1e293b" strokeWidth="5" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s linear, stroke 0.5s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{
          fontSize: 16, fontWeight: 700, fontFamily: "monospace",
          color: seconds <= 10 ? color : "#e2e8f0",
          animation: seconds <= 10 ? "pulse-text 0.5s ease-in-out infinite alternate" : "none"
        }}>
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

// ── Single Question Card (sequential) ─────────────────────────
function QuestionCard({ q, stageLabel, stageColor, onSubmit }) {
  const [selected, setSelected] = useState(null);
  const [seconds, setSeconds] = useState(TIMER_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef(null);
  const autoFiredRef = useRef(false);

  // auto-submit when time runs out
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!autoFiredRef.current) {
            autoFiredRef.current = true;
            handleSubmit(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line

  const handleSubmit = useCallback((isAuto = false) => {
    if (submitted) return;
    clearInterval(timerRef.current);
    setSubmitted(true);
    // slight delay so user sees result before moving on
    setTimeout(() => onSubmit(selected, isAuto), isAuto ? 1800 : 1200);
  }, [submitted, selected, onSubmit]);

  const isTimeout = submitted && selected === null;
  const isCorrect = submitted && selected === q.answer;

  return (
    <div style={{
      maxWidth: 600, margin: "0 auto",
      animation: "slideIn 0.35s ease"
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 20
      }}>
        <div>
          <span style={{
            ...S.typeBadge(stageColor), fontSize: 13, padding: "5px 14px"
          }}>{stageLabel}</span>
          <div style={{ color: "#475569", fontSize: 12, marginTop: 5 }}>{todayStr()}</div>
        </div>
        <TimerRing seconds={seconds} total={TIMER_SECONDS} />
      </div>

      {/* Question */}
      <div style={{
        ...S.card,
        borderTop: `4px solid ${stageColor}`,
        marginBottom: 16,
        padding: "20px 20px 10px"
      }}>
        <p style={{ color: "#e2e8f0", fontSize: 16, lineHeight: 1.7, margin: 0 }}>
          {q.question}
        </p>
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {q.options.map((opt, i) => {
          let bg = "#1e293b", border = "1px solid #334155", color = "#cbd5e1";
          if (!submitted && selected === i) {
            bg = "#1e3a5f"; border = `1px solid ${stageColor}`; color = "#fff";
          }
          if (submitted) {
            if (i === q.answer) { bg = "#166534"; border = "1px solid #4ade80"; color = "#4ade80"; }
            else if (i === selected && i !== q.answer) { bg = "#7f1d1d"; border = "1px solid #f87171"; color = "#f87171"; }
            else { color = "#475569"; }
          }
          return (
            <button key={i}
              onClick={() => !submitted && setSelected(i)}
              disabled={submitted}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: bg, border, borderRadius: 10,
                padding: "13px 16px", color, fontSize: 14,
                cursor: submitted ? "default" : "pointer",
                textAlign: "left", transition: "all .15s",
                fontFamily: "inherit",
                transform: !submitted && selected === i ? "translateX(4px)" : "none"
              }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%",
                background: submitted ? "transparent" : (selected === i ? stageColor : "#0f172a"),
                border: `2px solid ${submitted ? "transparent" : (selected === i ? stageColor : "#334155")}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: selected === i && !submitted ? "#000" : "#64748b",
                flexShrink: 0
              }}>{"ABCD"[i]}</span>
              {opt}
              {submitted && i === q.answer && (
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#4ade80" }}>✓ Benar</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Result message */}
      {submitted && (
        <div style={{
          padding: "12px 16px", borderRadius: 10, marginBottom: 16,
          background: isTimeout ? "#78350f22" : isCorrect ? "#14532d22" : "#7f1d1d22",
          border: `1px solid ${isTimeout ? "#78350f" : isCorrect ? "#14532d" : "#7f1d1d"}`,
          color: isTimeout ? "#fbbf24" : isCorrect ? "#4ade80" : "#f87171",
          fontSize: 14, fontWeight: 500
        }}>
          {isTimeout
            ? "⏰ Waktu habis! Tidak ada jawaban yang dipilih."
            : isCorrect
            ? "✅ Jawaban benar!"
            : `❌ Kurang tepat. Jawaban: ${q.options[q.answer]}`}
        </div>
      )}

      {/* Submit button */}
      {!submitted && (
        <button
          onClick={() => handleSubmit(false)}
          style={{
            width: "100%", padding: "14px",
            background: selected !== null ? stageColor : "#1e293b",
            color: selected !== null ? "#000" : "#475569",
            border: `1px solid ${selected !== null ? stageColor : "#334155"}`,
            borderRadius: 10, fontSize: 15, fontWeight: 700,
            cursor: "pointer", transition: "all .2s",
            fontFamily: "inherit", letterSpacing: 0.5
          }}
        >
          {selected !== null ? "✔ Submit Jawaban" : "Submit (pilih jawaban dulu)"}
        </button>
      )}

      {submitted && (
        <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "8px 0" }}>
          ⏳ Melanjutkan ke soal berikutnya...
        </div>
      )}
    </div>
  );
}

// ── Start Screen ───────────────────────────────────────────────
function StartScreen({ onStart, alreadyDone }) {
  if (alreadyDone) return null;
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", paddingTop: 20 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🛡️</div>
      <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: "#e2e8f0", letterSpacing: 2, marginBottom: 8 }}>
        SOAL HARIAN
      </div>
      <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
        Kamu akan mengerjakan <strong style={{ color: "#e2e8f0" }}>2 soal</strong> hari ini.<br />
        Masing-masing soal diberikan waktu <strong style={{ color: "#f59e0b" }}>1 menit 30 detik</strong>.<br />
        Soal akan otomatis di-submit jika waktu habis.
      </div>
      <div style={{
        display: "flex", gap: 12, justifyContent: "center",
        marginBottom: 28, flexWrap: "wrap"
      }}>
        {[
          { icon: "🦺", label: "1 Soal Safety", color: "#ef4444" },
          { icon: "⚙️", label: "1 Soal Teknis", color: "#3b82f6" },
        ].map((b, i) => (
          <div key={i} style={{
            border: `1px solid ${b.color}33`, borderRadius: 12,
            padding: "14px 20px", background: `${b.color}11`,
            display: "flex", alignItems: "center", gap: 10, minWidth: 160
          }}>
            <span style={{ fontSize: 24 }}>{b.icon}</span>
            <div>
              <div style={{ color: b.color, fontWeight: 600, fontSize: 13 }}>{b.label}</div>
              <div style={{ color: "#475569", fontSize: 11 }}>1:30 per soal</div>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onStart}
        style={{
          background: "#f59e0b", color: "#000", border: "none",
          borderRadius: 12, padding: "16px 48px",
          fontSize: 16, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit", letterSpacing: 1,
          boxShadow: "0 4px 24px #f59e0b44",
          transition: "transform .15s, box-shadow .15s"
        }}
        onMouseEnter={e => { e.target.style.transform = "scale(1.04)"; e.target.style.boxShadow = "0 6px 32px #f59e0b66"; }}
        onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 4px 24px #f59e0b44"; }}
      >
        ▶ MULAI MENGERJAKAN
      </button>
      <div style={{ color: "#334155", fontSize: 12, marginTop: 16 }}>
        Soal baru tersedia setiap hari. Setiap user mendapat soal berbeda.
      </div>
    </div>
  );
}

// ── Result Screen ──────────────────────────────────────────────
function ResultScreen({ results, questions }) {
  const score = results.filter(r => r.correct).length;
  const configs = [
    { bg: "#14532d", border: "#4ade80", color: "#4ade80", icon: "🏆", msg: "Sempurna! Dua soal benar semua." },
    { bg: "#78350f", border: "#fbbf24", color: "#fbbf24", icon: "👍", msg: "Satu benar. Besok lebih baik lagi!" },
    { bg: "#7f1d1d", border: "#f87171", color: "#f87171", icon: "💪", msg: "Belum berhasil. Semangat untuk besok!" },
  ];
  const cfg = configs[2 - score];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", animation: "slideIn 0.4s ease" }}>
      <div style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 14, padding: "20px 24px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 14
      }}>
        <span style={{ fontSize: 40 }}>{cfg.icon}</span>
        <div>
          <div style={{ color: cfg.color, fontWeight: 700, fontSize: 18 }}>Skor hari ini: {score}/2</div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 3 }}>{cfg.msg}</div>
        </div>
      </div>

      {results.map((r, i) => {
        const q = questions.find(q => q.firestoreId === r.questionId);
        if (!q) return null;
        const typeColor = q.type === "safety" ? "#ef4444" : "#3b82f6";
        return (
          <div key={i} style={{ ...S.card, borderLeft: `4px solid ${typeColor}`, marginBottom: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={S.typeBadge(typeColor)}>{q.type === "safety" ? "🦺 SAFETY" : "⚙️ TEKNIS"}</span>
              <span style={{
                fontSize: 11, padding: "2px 10px", borderRadius: 999,
                background: r.timeout ? "#78350f22" : r.correct ? "#14532d22" : "#7f1d1d22",
                color: r.timeout ? "#fbbf24" : r.correct ? "#4ade80" : "#f87171",
                border: `1px solid ${r.timeout ? "#78350f" : r.correct ? "#14532d" : "#7f1d1d"}`
              }}>
                {r.timeout ? "⏰ Timeout" : r.correct ? "✅ Benar" : "❌ Salah"}
              </span>
            </div>
            <div style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 8 }}>{q.question}</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {r.timeout
                ? <span>Tidak dijawab · Jawaban benar: <span style={{ color: "#4ade80" }}>{q.options[q.answer]}</span></span>
                : r.correct
                ? <span style={{ color: "#4ade80" }}>Jawaban: {q.options[r.chosen]}</span>
                : <span>Jawabanmu: <span style={{ color: "#f87171" }}>{q.options[r.chosen]}</span> · Benar: <span style={{ color: "#4ade80" }}>{q.options[q.answer]}</span></span>
              }
            </div>
          </div>
        );
      })}

      <div style={{ color: "#334155", fontSize: 12, textAlign: "center", marginTop: 8 }}>
        Kembali lagi besok untuk soal baru!
      </div>
    </div>
  );
}

// ── Main DailyPage ─────────────────────────────────────────────
export default function DailyPage({ user, profile }) {
  const [questions, setQuestions] = useState([]);
  const [stage, setStage] = useState(STAGE.READY);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noQuestions, setNoQuestions] = useState(false);
  const dailyQs = useRef({ safety: null, teknis: null });

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "questions"));
      const qs = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
      if (!qs.length) { setNoQuestions(true); setLoading(false); return; }
      setQuestions(qs);

      const daily = getDailyQuestionsForUser(qs, user.uid);
      dailyQs.current = daily;

      if (!daily.safety || !daily.teknis) { setNoQuestions(true); setLoading(false); return; }

      // Check if already done today
      const snap2 = await getDoc(doc(db, "daily_answers", `${user.uid}_${todayStr()}`));
      if (snap2.exists() && snap2.data().completed) {
        const saved = snap2.data().results || [];
        setResults(saved);
        // Check briefing too
        const bSnap = await getDoc(doc(db, "briefings", `${u.uid}_${todayStr()}`));
        setStage(bSnap.exists() ? STAGE.DONE : STAGE.BRIEFING);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const saveResult = useCallback(async (result) => {
    const q = questions.find(q => q.firestoreId === result.questionId);
    if (!q) return;
    // Save individual record
    await setDoc(doc(db, "answer_records", `${user.uid}_${result.questionId}_${todayStr()}`), {
      userId: user.uid, userName: user.displayName,
      userEmail: user.email, questionId: result.questionId,
      questionText: q.question, type: q.type,
      chosen: result.timeout ? null : result.chosen,
      chosenText: result.timeout ? "(waktu habis)" : q.options[result.chosen],
      correct: result.correct, timeout: result.timeout,
      correctAnswer: q.options[q.answer],
      date: todayStr(), timestamp: new Date().toISOString(),
    });
  }, [questions, user]);

  const handleSafetySubmit = useCallback(async (chosen, isAuto) => {
    const q = dailyQs.current.safety;
    const timeout = chosen === null || isAuto && chosen === null;
    const correct = !timeout && chosen === q.answer;
    const result = { questionId: q.firestoreId, chosen, correct, timeout: chosen === null };
    const newResults = [result];
    setResults(newResults);
    await saveResult(result);
    setStage(STAGE.TEKNIS);
  }, [saveResult]);

  const handleTeknisSubmit = useCallback(async (chosen, isAuto) => {
    const q = dailyQs.current.teknis;
    const correct = chosen !== null && chosen === q.answer;
    const result = { questionId: q.firestoreId, chosen, correct, timeout: chosen === null };
    const newResults = prev => {
      const updated = [...prev, result];
      // Save completed session to Firestore
      setDoc(doc(db, "daily_answers", `${user.uid}_${todayStr()}`), {
        userId: user.uid, userName: user.displayName,
        userEmail: user.email, userPhoto: user.photoURL,
        date: todayStr(), completed: true, results: updated,
      }, { merge: true });
      return updated;
    };
    setResults(newResults);
    await saveResult(result);
    setStage(STAGE.BRIEFING);
  }, [saveResult, user]);

  if (loading) return <div style={{ color: "#475569", padding: 40 }}>Memuat soal hari ini...</div>;

  if (noQuestions) return (
    <div style={{ ...S.pageWrap, textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
      <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Belum ada soal</div>
      <div style={{ color: "#475569", fontSize: 14 }}>Admin belum upload bank soal.</div>
    </div>
  );

  const { safety, teknis } = dailyQs.current;

  return (
    <div style={S.pageWrap}>
      <style>{`
        @keyframes pulse-text { from{opacity:1} to{opacity:0.4} }
        @keyframes slideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Page header */}
      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📅</span>
        <div>
          <div style={S.sectionTitle}>Soal Harian</div>
          <div style={S.sectionSub}>
            {stage === STAGE.READY && "Siap mengerjakan? Tekan Mulai."}
            {stage === STAGE.SAFETY && <span>Soal 1 dari 2 — <span style={{ color: "#ef4444", fontWeight: 600 }}>Safety</span></span>}
            {stage === STAGE.TEKNIS && <span>Soal 2 dari 2 — <span style={{ color: "#3b82f6", fontWeight: 600 }}>Teknis</span></span>}
            {stage === STAGE.DONE && "Selesai untuk hari ini!"}
            {stage === STAGE.BRIEFING && <span>Langkah 3 dari 3 — <span style={{ color: "#f59e0b", fontWeight: 600 }}>Briefing</span></span>}
          </div>
        </div>
        {/* Progress dots */}
        {(stage === STAGE.SAFETY || stage === STAGE.TEKNIS || stage === STAGE.BRIEFING) && (
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: (stage === STAGE.TEKNIS || stage === STAGE.BRIEFING) ? "#3b82f6" : "#1e293b", border: "2px solid #334155" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: stage === STAGE.BRIEFING ? "#f59e0b" : "#1e293b", border: "2px solid #334155" }} />
          </div>
        )}
      </div>

      {stage === STAGE.READY && (
        <StartScreen onStart={() => setStage(STAGE.SAFETY)} alreadyDone={false} />
      )}

      {stage === STAGE.SAFETY && safety && (
        <QuestionCard
          key="safety"
          q={{ ...safety, id: safety.firestoreId }}
          stageLabel="🦺 SAFETY"
          stageColor="#ef4444"
          onSubmit={handleSafetySubmit}
        />
      )}

      {stage === STAGE.TEKNIS && teknis && (
        <QuestionCard
          key="teknis"
          q={{ ...teknis, id: teknis.firestoreId }}
          stageLabel="⚙️ TEKNIS"
          stageColor="#3b82f6"
          onSubmit={handleTeknisSubmit}
        />
      )}

      {stage === STAGE.BRIEFING && (
        <BriefingPage
          user={user}
          profile={profile}
          onComplete={() => setStage(STAGE.DONE)}
        />
      )}

      {stage === STAGE.DONE && (
        <ResultScreen results={results} questions={questions} />
      )}
    </div>
  );
}
