export default function TelcoLogo({ size = 200 }) {
  const h = size * 0.5;
  return (
    <svg width={size} height={h} viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">

      {/* ── Swoosh merah melengkung di bawah ── */}
      <path
        d="M 30 155 Q 100 185 200 170 Q 280 158 340 130"
        fill="none" stroke="#e01010" strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Swoosh dalam (lebih tipis, slight offset) */}
      <path
        d="M 20 168 Q 95 200 200 184 Q 285 170 348 140"
        fill="none" stroke="#e01010" strokeWidth="5"
        strokeLinecap="round" opacity="0.5"
      />

      {/* ── TEL putih ── */}
      <text
        x="8" y="145"
        fontFamily="Arial Black, Impact, sans-serif"
        fontWeight="900"
        fontSize="130"
        fill="white"
        letterSpacing="-4"
      >TEL</text>

      {/* ── C merah ── */}
      <text
        x="242" y="145"
        fontFamily="Arial Black, Impact, sans-serif"
        fontWeight="900"
        fontSize="130"
        fill="#e01010"
      >C</text>

      {/* ── O = lingkaran sinyal merah ── */}
      {/* Lingkaran-lingkaran sinyal dari luar ke dalam */}
      <circle cx="352" cy="80" r="58" fill="none" stroke="#e01010" strokeWidth="12"/>
      <circle cx="352" cy="80" r="42" fill="none" stroke="#e01010" strokeWidth="10"/>
      <circle cx="352" cy="80" r="26" fill="none" stroke="#e01010" strokeWidth="9"/>
      <circle cx="352" cy="80" r="10" fill="#e01010"/>

      {/* Menara tower putih */}
      {/* Kaki kiri */}
      <line x1="335" y1="155" x2="352" y2="80" stroke="white" strokeWidth="4" strokeLinecap="round"/>
      {/* Kaki kanan */}
      <line x1="369" y1="155" x2="352" y2="80" stroke="white" strokeWidth="4" strokeLinecap="round"/>
      {/* Cross bar bawah */}
      <line x1="331" y1="145" x2="373" y2="145" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Cross bar tengah */}
      <line x1="338" y1="122" x2="366" y2="122" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      {/* Cross bar atas */}
      <line x1="344" y1="102" x2="360" y2="102" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Tiang atas ke titik puncak */}
      <line x1="352" y1="80" x2="352" y2="68" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      {/* Titik puncak */}
      <circle cx="352" cy="65" r="4" fill="white"/>

    </svg>
  );
}
