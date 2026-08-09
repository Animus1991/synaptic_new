import { motion } from 'framer-motion';
import { readinessBandMeta } from '../../lib/masteryPalette';

interface ReadinessRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  showBand?: boolean;
}

/**
 * OPT-K114 — Exam readiness gauge (−1% after OPT-K113).
 * Size vs original 165 → 174. Percent is sole ink inside the ring, geometrically
 * centered (static translate wrapper; motion is opacity-only so transforms never fight).
 */
export function ReadinessRing({
  value,
  size = 174,
  strokeWidth = 11.5,
  label = 'Exam Readiness',
  sublabel,
  showBand = true,
}: ReadinessRingProps) {
  const band = readinessBandMeta(value);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const center = size / 2;
  const pctFontSize = Math.max(22, Math.round(size * 0.27));

  return (
    <div className="dashboard-readiness-ring flex flex-col items-center gap-2" data-testid="dashboard-readiness-ring">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={center} cy={center} r={r} fill="none" stroke="var(--viz-track)" strokeWidth={strokeWidth} />
          <defs>
            <linearGradient id={`ring-grad-${value}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={band.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={band.color} />
            </linearGradient>
          </defs>
          <motion.circle
            cx={center} cy={center} r={r} fill="none"
            stroke={`url(#ring-grad-${value}-${size})`}
            strokeWidth={strokeWidth}
            strokeDasharray={c}
            strokeLinecap="round"
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          <motion.circle
            cx={center + r * Math.cos(((value / 100) * 360 - 90) * (Math.PI / 180))}
            cy={center + r * Math.sin(((value / 100) * 360 - 90) * (Math.PI / 180))}
            r={strokeWidth / 2 + 2}
            fill={band.color}
            opacity={0.5}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1.2 }}
          />
        </svg>
        {/* Geometric center: left/top 50% + translate; motion opacity only (no scale). */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.span
            className="dashboard-readiness-pct block font-black tabular-nums tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            style={{
              color: band.color,
              fontSize: pctFontSize,
              lineHeight: 1,
              margin: 0,
              padding: 0,
            }}
          >
            {value}%
          </motion.span>
        </div>
      </div>
      {label ? (
        <span className="type-caption font-medium text-center text-text-tertiary leading-snug px-1">
          {label}
        </span>
      ) : null}
      {showBand && (
        <span className="type-caption font-semibold px-3 py-1 rounded-full border-0 bg-surface-secondary text-text-primary">
          {band.label}
        </span>
      )}
      {sublabel && <p className="type-caption text-text-secondary text-center max-w-[200px]">{sublabel}</p>}
    </div>
  );
}
