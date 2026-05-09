export default function TelcoLogo({ size = 200 }) {
  const h = size * 0.55;
  return (
    <svg width={size} height={h} viewBox="0 0 220 121" xmlns="http://www.w3.org/2000/svg">
      {/* Red swoosh */}
      <path d="M 14 95 Q 75 118 148 98 Q 180 88 205 72" fill="none" stroke="#cc2020" strokeWidth="7" strokeLinecap="round"/>
      {/* TEL white */}
      <text x="8" y="82" fontFamily="Arial Black,Impact,sans-serif" fontWeight="900" fontSize="64" fill="white" letterSpacing="-2">TEL</text>
      {/* C red */}
      <text x="122" y="82" fontFamily="Arial Black,Impact,sans-serif" fontWeight="900" fontSize="64" fill="#cc2020">C</text>
      {/* O = red circle with tower */}
      <circle cx="192" cy="52" r="27" fill="#cc2020"/>
      {/* Tower */}
      <line x1="192" y1="33" x2="192" y2="70" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <line x1="180" y1="42" x2="204" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="183" y1="51" x2="201" y2="51" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="192" cy="70" r="3" fill="white"/>
      {/* Signal arcs left */}
      <path d="M 180 35 Q 171 44 180 54" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M 174 29 Q 161 42 174 58" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
      {/* Signal arcs right */}
      <path d="M 204 35 Q 213 44 204 54" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M 210 29 Q 223 42 210 58" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}
