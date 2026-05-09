import { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getDailyQuestions, todayStr } from "../utils/helpers";
import QUESTIONS from "../data/questions";
import { S } from "../styles";

const TIMER_SECONDS = 90;

function TimerRing({ seconds, total }) {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const dash = circ * (seconds / total);
  const color = seconds > 30 ? "#4ade80" : seconds > 10 ? "#f59e0b" : "#ef4444";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
      <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s linear, stroke 0.5s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{
          fontSize: 13, fontWeight: 700, color: seconds <= 10 ? color : "#e2e8f0",
          animation: seconds <= 10 ? "pulse-text 0.5s ease-in-out infinite alternate" : "none"
        }}>
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}

function QuizCard({ q, answered, onAnswer, onTimeout }) {
  const [seconds, setSeconds] = useState(TIMER_SECONDS);
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const typeColor = q.type === "safety" ? "#ef4444" : "#3b82f6";
  const typeLabel = q.type === "safety" ? "🦺 SAFETY" : "⚙️ TEKNIS";

  useEffect(() => {
    if (answered) { clearInterval(timerRef.current); return; }
    setSeconds(TIMER_SECONDS);
    firedRef.current = false;
    timerRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!firedRef.current) { firedRef.current = true; onTimeout(q.id, q.type); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [q.id, answered]); // eslint-disable-line

  const isTimeout = answered?.timeout;

  return (
    <div style={{ ...S.card, borderTop: `4px solid ${typeColor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={S.typeBadge(typeColor)}>{typeLabel}</span>
          <span style={{ color: "#475569", fontSize: 11 }}>{todayStr()}</span>
        </div>
        {!answered
          ? <TimerRing seconds={seconds} total={TIMER_SECONDS} />
          : <span style={{
              fontSize: 12, padding: "4px 12px", borderRadius: 999,
              background: answered.correct ? "#166534" : "#7f1d1d",
              color: answered.correct ? "#4ade80" : "#f87171",
              border: `1px solid ${answered.correct ? "#4ade80" : "#f87171"}`
            }}>
              {isTimeout ? "⏰ Waktu habis" : answered.correct ? "✅ Benar" : "❌ Salah"}
            </span>
        }
      </div>

      <p style={{ color: "#e2e8f0", fontSize: 15, lineHeight: 1.6, margin: "0 0 14px" }}>{q.question}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map((opt, i) => {
          let bg = "#1e293b", border = "1px solid #334155";
          if (answered) {
            if (i === q.answer) { bg = "#166534"; border = "1px solid #4ade80"; }
            else if (i === answered.chosen && i !== q.answer) { bg = "#7f1d1d"; border = "1px solid #f87171"; }
          }
          return (
            <button key={i}
              style={{ ...S.optionBtn(bg, border), cursor: answered ? "default" : "pointer" }}
              onClick={() => !answered && onAnswer(q.id, i, q.type)}
              disabled={!!answered}
            >
              <span style={S.optionLetter}>{String.fromCharCode(65 + i)}</span>
              {opt}
              {isTimeout && i === q.answer && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#4ade80" }}>← jawaban benar</span>
              )}
            </button>
          );
        })}
      </div>

      {answered && !isTimeout && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#ffffff08", borderRadius: 8, fontSize: 14, fontWeight: 500, color: answered.correct ? "#4ade80" : "#f87171" }}>
          {answered.correct ? "✅ Benar! Jawaban kamu tepat." : `❌ Kurang tepat. Jawaban: ${q.options[q.answer]}`}
        </div>
      )}
      {isTimeout && (
        <div style={{ marginTop: 14, padding: "10px 14px", background: "#78350f22", borderRadius: 8, fontSize: 14, color: "#fbbf24", border: "1px solid #78350f" }}>
          ⏰ Waktu habis! Soal dihitung salah.
        </div>
      )}
    </div>
  );
}

export default function DailyPage({ user }) {
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const { safety, teknis } = getDailyQuestions(QUESTIONS);

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "daily_answers", `${user.uid}_${todayStr()}`));
      if (snap.exists()) setAnswers(snap.data().answers || {});
      setLoading(false);
    };
    load();
  }, [user]);

  const saveAnswer = useCallback(async (questionId, chosen, type, timeout = false) => {
    const q = QUESTIONS.find(q => q.id === questionId);
    const correct = !timeout && chosen === q.answer;
    const newAnswers = { ...answers, [questionId]: { chosen, correct, timeout } };
    setAnswers(newAnswers);

    await setDoc(doc(db, "daily_answers", `${user.uid}_${todayStr()}`), {
      userId: user.uid, userName: user.displayName,
      userEmail: user.email, userPhoto: user.photoURL,
      date: todayStr(), answers: newAnswers,
    }, { merge: true });

    await setDoc(doc(db, "answer_records", `${user.uid}_${questionId}_${todayStr()}`), {
      userId: user.uid, userName: user.displayName,
      userEmail: user.email, questionId,
      questionText: q.question, type,
      chosen: timeout ? null : chosen,
      chosenText: timeout ? "(waktu habis)" : q.options[chosen],
      correct, timeout,
      correctAnswer: q.options[q.answer],
      date: todayStr(), timestamp: new Date().toISOString(),
    });
  }, [answers, user]);

  const handleAnswer = useCallback((qid, chosen, type) => saveAnswer(qid, chosen, type, false), [saveAnswer]);
  const handleTimeout = useCallback((qid, type) => saveAnswer(qid, null, type, true), [saveAnswer]);

  const bothDone = answers[safety.id] && answers[teknis.id];
  const score = [answers[safety.id], answers[teknis.id]].filter(a => a?.correct).length;

  if (loading) return <div style={{ color: "#475569", padding: 40 }}>Memuat soal…</div>;

  return (
    <div style={S.pageWrap}>
      <style>{`
        @keyframes pulse-text { from{opacity:1} to{opacity:0.4} }
      `}</style>

      <div style={S.sectionHead}>
        <span style={S.sectionIcon}>📅</span>
        <div>
          <div style={S.sectionTitle}>Soal Harian</div>
          <div style={S.sectionSub}>
            Jawab dalam <span style={{ color: "#f59e0b", fontWeight: 600 }}>1:30</span> — waktu habis = salah
          </div>
        </div>
      </div>

      {bothDone && (
        <div style={{
          background: score === 2 ? "#14532d" : score === 1 ? "#78350f" : "#7f1d1d",
          border: `1px solid ${score === 2 ? "#4ade80" : score === 1 ? "#fbbf24" : "#f87171"}`,
          borderRadius: 12, padding: "14px 20px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12
        }}>
          <span style={{ fontSize: 28 }}>{score === 2 ? "🏆" : score === 1 ? "👍" : "💪"}</span>
          <div>
            <div style={{ color: score === 2 ? "#4ade80" : score === 1 ? "#fbbf24" : "#f87171", fontWeight: 700, fontSize: 15 }}>
              Skor hari ini: {score}/2
            </div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
              {score === 2 ? "Sempurna! Dua soal benar semua." : score === 1 ? "Satu benar, besok lebih baik lagi." : "Belum berhasil. Semangat untuk besok!"}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <QuizCard q={safety} answered={answers[safety.id]} onAnswer={handleAnswer} onTimeout={handleTimeout} />
        <QuizCard q={teknis} answered={answers[teknis.id]} onAnswer={handleAnswer} onTimeout={handleTimeout} />
      </div>

      {!bothDone && (
        <div style={{ marginTop: 16, padding: "10px 16px", background: "#0c1526", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12, color: "#475569" }}>
          ⏱ Timer masing-masing soal berjalan secara terpisah dan dimulai saat halaman dibuka.
        </div>
      )}
    </div>
  );
}
