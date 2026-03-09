/**
 * Interlocking Hexagons Logo
 *
 * Props:
 *   size      - number (default: 24) — rendered width/height in px
 *   className - string — additional CSS classes
 *   animate   - boolean (default: false) — enables sequential pulse animation
 *   bgColor   - string (default: 'white') — background color for weave mask lines
 */
export default function Logo({ size = 24, className = '', animate = false, bgColor = 'white' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {animate && (
        <style>{`
          @keyframes hex-logo-pulse {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 1; }
          }
          .hex-logo-h1 { animation: hex-logo-pulse 2.4s ease-in-out 0s infinite; }
          .hex-logo-h2 { animation: hex-logo-pulse 2.4s ease-in-out 0.8s infinite; }
          .hex-logo-h3 { animation: hex-logo-pulse 2.4s ease-in-out 1.6s infinite; }
        `}</style>
      )}

      {/* Base hexagons */}
      <polygon
        className={animate ? 'hex-logo-h1' : undefined}
        points="100,30 132.9,49 132.9,87 100,106 67.1,87 67.1,49"
        stroke="currentColor" strokeWidth="5" strokeLinejoin="round" fill="none"
      />
      <polygon
        className={animate ? 'hex-logo-h2' : undefined}
        points="127.7,78 160.6,97 160.6,135 127.7,154 94.8,135 94.8,97"
        stroke="currentColor" strokeWidth="5" strokeLinejoin="round" fill="none"
      />
      <polygon
        className={animate ? 'hex-logo-h3' : undefined}
        points="72.3,78 105.2,97 105.2,135 72.3,154 39.4,135 39.4,97"
        stroke="currentColor" strokeWidth="5" strokeLinejoin="round" fill="none"
      />

      {/* Weave crossing 1: H3 over H1 (left intersection) */}
      <line x1="67.1" y1="87" x2="74" y2="92" stroke={bgColor} strokeWidth="12" />
      <line
        className={animate ? 'hex-logo-h3' : undefined}
        x1="72.3" y1="78" x2="105.2" y2="97"
        stroke="currentColor" strokeWidth="5"
      />

      {/* Weave crossing 2: H1 over H2 (right intersection) */}
      <line x1="94.8" y1="97" x2="104" y2="91" stroke={bgColor} strokeWidth="12" />
      <line
        className={animate ? 'hex-logo-h1' : undefined}
        x1="100" y1="106" x2="132.9" y2="87"
        stroke="currentColor" strokeWidth="5"
      />

      {/* Weave crossing 3: H2 over H3 (bottom intersection) */}
      <line x1="105.2" y1="135" x2="96" y2="130" stroke={bgColor} strokeWidth="12" />
      <line
        className={animate ? 'hex-logo-h2' : undefined}
        x1="127.7" y1="154" x2="94.8" y2="135"
        stroke="currentColor" strokeWidth="5"
      />
    </svg>
  );
}
