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

export function ReadinessRing({ value, size = 180, strokeWidth = 12, label = 'Exam Readiness', sublabel, showBand = true }: ReadinessRingProps) {
  const band = readinessBandMeta(value);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={center} cy={center} r={r} fill="none" stroke="var(--viz-track)" strokeWidth={strokeWidth} />
          <defs>
            <linearGradient id={`ring-grad-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={band.color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={band.color} />
            </linearGradient>
          </defs>
          <motion.circle
            cx={center} cy={center} r={r} fill="none"
            stroke={`url(#ring-grad-${value})`}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-black"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            style={{ color: band.color }}
          >
            {value}%
          </motion.span>
          <span className="text-xs text-text-tertiary font-medium">{label}</span>
        </div>
      </div>
      {showBand && (
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{
            color: band.color,
            backgroundColor: `color-mix(in srgb, ${band.color} 14%, transparent)`,
          }}
        >
          {band.label}
        </span>
      )}
      {sublabel && <p className="text-[10px] text-text-muted text-center max-w-[200px]">{sublabel}</p>}
    </div>
  );
}
