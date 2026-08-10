import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
lines = Path("src/components/Dashboard.tsx").read_text(encoding="utf-8").splitlines()

ranges = [
    (200, 280),   # root + empty sparkles
    (560, 760),   # readiness / coverage
    (760, 920),   # mastery / needs fixing
    (960, 1160),  # weak / almost
    (1160, 1320), # exam / insight
    (1320, 1445), # misconceptions / spaced / tasks area start earlier
    (900, 960),
]

# priority tasks around 37121 chars - find line
text = Path("src/components/Dashboard.tsx").read_text(encoding="utf-8")
# line of Priority tasks
for i, l in enumerate(lines, 1):
    if "Priority tasks" in l or "dashPriorityTasks" in l or "criticalTasks" in l:
        print("task marker", i, l[:100])

for start, end in [(1180, 1300), (680, 840), (200, 250), (220, 250)]:
    print(f"\n==== {start}-{end} ====")
    for i in range(start, min(end, len(lines) + 1)):
        print(f"{i}:{lines[i-1][:160]}")

# SectionLabel definition
for p in Path("src").rglob("*.tsx"):
    t = p.read_text(encoding="utf-8", errors="ignore")
    if "function SectionLabel" in t or "export function SectionLabel" in t:
        print("SectionLabel in", p)
        j = t.find("SectionLabel")
        print(t[j : j + 600])
