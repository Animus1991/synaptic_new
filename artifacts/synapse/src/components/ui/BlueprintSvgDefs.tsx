/** Shared SVG gradient defs for Option-B diagram strokes (Wave E7). */
export function BlueprintSvgDefs() {
  return (
    <svg aria-hidden className="absolute w-0 h-0 overflow-hidden" focusable="false">
      <defs>
        <linearGradient id="blueprint-stroke-cve" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
      </defs>
    </svg>
  );
}
