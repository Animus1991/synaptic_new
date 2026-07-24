import { AlertTriangle } from '@/lib/lucide-shim';
import type { PrerequisiteRepair } from '../../lib/pedagogy';

interface Props {
  repairs: PrerequisiteRepair[];
  onStartRepair?: (repair: PrerequisiteRepair) => void;
}

export function PrerequisiteRepairPanel({ repairs, onStartRepair }: Props) {
  if (repairs.length === 0) return null;

  return (
    <div className="rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-accent-amber mb-3">
        <AlertTriangle className="w-4 h-4" />
        Prerequisite repair
      </h3>
      <div className="space-y-2">
        {repairs.map((r) => (
          <div key={`${r.prerequisite}-${r.concept}`} className="flex items-start justify-between gap-2">
            <p className="text-xs text-text-secondary leading-relaxed flex-1">
              Strengthen <span className="font-medium text-accent-amber">{r.prerequisite}</span>
              {' '}before tackling <span className="font-medium text-text-primary">{r.concept}</span>
            </p>
            {onStartRepair && (
              <button
                onClick={() => onStartRepair(r)}
                className="shrink-0 text-[10px] font-medium text-brand-400 hover:text-brand-300 whitespace-nowrap"
              >
                Start repair →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
