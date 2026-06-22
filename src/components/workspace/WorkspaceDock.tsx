import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import {
  FileText, Map, Calculator, PlayCircle, Focus, Shapes, CheckSquare, Layers,
  GitCompare, BrainCircuit, FileStack, Timer, MessageSquareText, LayoutDashboard
} from 'lucide-react';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { useI18n } from '../../lib/i18n';

interface Props {
  activeTool: WorkspaceToolId;
  onSelectTool: (tool: WorkspaceToolId) => void;
  availableTools: WorkspaceToolId[];
}

const TOOLS: Record<WorkspaceToolId, { icon: React.ElementType; labelEn: string; labelEl: string; description: string }> = {
  reader: { icon: FileText, labelEn: 'Reader', labelEl: 'Αναγνώστης', description: 'Deep reading & TTS' },
  'concept-map': { icon: Map, labelEn: 'Map', labelEl: 'Χάρτης', description: 'Concept graph' },
  scratchpad: { icon: Calculator, labelEn: 'Scratchpad', labelEl: 'Πρόχειρο', description: 'Formulas & math' },
  whiteboard: { icon: Shapes, labelEn: 'Whiteboard', labelEl: 'Πίνακας', description: 'Freeform drawing' },
  leitner: { icon: Layers, labelEn: 'Flashcards', labelEl: 'Κάρτες', description: 'Spaced repetition' },
  feynman: { icon: BrainCircuit, labelEn: 'Feynman', labelEl: 'Feynman', description: 'Explain it simply' },
  quiz: { icon: CheckSquare, labelEn: 'Quiz', labelEl: 'Κουίζ', description: 'Test knowledge' },
  simulator: { icon: PlayCircle, labelEn: 'Simulator', labelEl: 'Προσομοιωτής', description: 'Interactive models' },
  compare: { icon: GitCompare, labelEn: 'Compare', labelEl: 'Σύγκριση', description: 'Compare concepts' },
  debate: { icon: FileStack, labelEn: 'Debate', labelEl: 'Επιχειρήματα', description: 'Claims & evidence' },
  timer: { icon: Timer, labelEn: 'Timer', labelEl: 'Χρονόμετρο', description: 'Focus sessions' },
  annotations: { icon: MessageSquareText, labelEn: 'Notes', labelEl: 'Σημειώσεις', description: 'Highlights & notes' },
  dashboard: { icon: LayoutDashboard, labelEn: 'Dashboard', labelEl: 'Ταμπλό', description: 'Progress overview' },
};

export function WorkspaceDock({ activeTool, onSelectTool, availableTools }: Props) {
  const { lang } = useI18n();

  return (
    <div className="flex flex-col items-center gap-4 p-3 bg-surface-card/80 backdrop-blur-xl border-r border-border-subtle h-full w-20 shadow-xl overflow-y-auto hide-scrollbar z-20 shrink-0">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white mb-2 shadow-lg shadow-brand-500/20">
        <Focus className="w-5 h-5" />
      </div>

      <div className="flex flex-col gap-3 w-full">
        {availableTools.map((toolId) => {
          const def = TOOLS[toolId];
          if (!def) return null;
          const isActive = activeTool === toolId;
          const Icon = def.icon;

          return (
            <button
              key={toolId}
              onClick={() => onSelectTool(toolId)}
              className="relative group flex flex-col items-center justify-center gap-1 w-full"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 relative",
                  isActive
                    ? "bg-brand-500/15 text-brand-400 shadow-inner"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
                {isActive && (
                  <motion.div
                    layoutId="active-tool-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-500 rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-medium tracking-wide truncate w-full text-center transition-colors",
                isActive ? "text-brand-400" : "text-text-muted"
              )}>
                {lang === 'el' ? def.labelEl : def.labelEn}
              </span>

              {/* Tooltip */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 rounded-lg bg-surface-popover border border-border-subtle text-xs text-text-primary shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                <span className="font-semibold">{lang === 'el' ? def.labelEl : def.labelEn}</span>
                <span className="text-text-muted ml-2">— {def.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
