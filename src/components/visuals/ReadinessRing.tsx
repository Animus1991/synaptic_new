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
 * OPT-K115 — Exam readiness gauge (−0.5% after OPT-K114).
 * Size vs original 165 → 173. Percent is painted as SVG text on an unrotated
 * overlay so dominantBaseline="central" is true geometric center.
 */
export function ReadinessRing({
  value,
  size = 173,
  strokeWidth = 11.4,
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
        </svg>
        {/* Unrotated SVG label layer — true geometric center via dominantBaseline */}
        <svg
          width={size}
          height={size}
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <motion.text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="central"
            className="dashboard-readiness-pct"
            fill={band.color}
            style={{ fontSize: pctFontSize, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            {value}%
          </motion.text>
        </svg>
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
