export type GlossaRunResult = {
  ok: boolean;
  output: string[];
  error?: string;
  variables: Record<string, number | string>;
};

type GlossaState = {
  variables: Record<string, number | string>;
  output: string[];
  pc: number;
  halted: boolean;
};

const MAX_STEPS = 5000;

function evalExpr(expr: string, vars: Record<string, number | string>): number | string {
  const t = expr.trim();
  if (/^-?\d+$/.test(t)) return Number(t);
  if (t in vars) return vars[t]!;
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  const bin = t.match(/^(.+?)\s*([+\-*/])\s*(.+)$/);
  if (bin) {
    const left = evalExpr(bin[1]!, vars);
    const right = evalExpr(bin[3]!, vars);
    if (typeof left === 'number' && typeof right === 'number') {
      switch (bin[2]) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return right === 0 ? NaN : Math.trunc(left / right);
      }
    }
  }
  return t;
}

function compare(left: number | string, op: string, right: number | string): boolean {
  switch (op) {
    case '=':
    case '==':
      return left === right;
    case '<>':
    case '!=':
      return left !== right;
    case '<':
      return Number(left) < Number(right);
    case '>':
      return Number(left) > Number(right);
    case '<=':
      return Number(left) <= Number(right);
    case '>=':
      return Number(left) >= Number(right);
    default:
      return false;
  }
}

/** Minimal educational GLOSSA-like interpreter (subset, not full exam spec). */
export function runGlossa(source: string): GlossaRunResult {
  const lines = source
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('//'));

  const state: GlossaState = {
    variables: {},
    output: [],
    pc: 0,
    halted: false,
  };

  let steps = 0;
  while (state.pc < lines.length && !state.halted && steps < MAX_STEPS) {
    steps++;
    const line = lines[state.pc]!;
    state.pc++;

    const assign = line.match(/^(.+?)\s*<-\s*(.+)$/i) ?? line.match(/^(.+?)\s*:=\s*(.+)$/i);
    if (assign) {
      const value = evalExpr(assign[2]!, state.variables);
      if (typeof value === 'number' && Number.isNaN(value)) {
        return { ok: false, output: state.output, error: `Invalid expression: ${assign[2]}`, variables: state.variables };
      }
      state.variables[assign[1]!.trim()] = value;
      continue;
    }

    const writeMatch = line.match(/^ΓΡΑΨΕ\s+(.+)$/i) ?? line.match(/^WRITE\s+(.+)$/i);
    if (writeMatch) {
      const value = evalExpr(writeMatch[1]!, state.variables);
      state.output.push(String(value));
      continue;
    }

    const readMatch = line.match(/^ΔΙΑΒΑΣΕ\s+(.+)$/i) ?? line.match(/^READ\s+(.+)$/i);
    if (readMatch) {
      state.variables[readMatch[1]!.trim()] = 0;
      continue;
    }

    const ifMatch = line.match(/^ΑΝ\s+(.+?)\s+(=|<|>|<=|>=|<>)\s+(.+?)\s+ΤΟΤΕ\s+(.+)$/i)
      ?? line.match(/^IF\s+(.+?)\s+(=|<|>|<=|>=|<>|==|!=)\s+(.+?)\s+THEN\s+(.+)$/i);
    if (ifMatch) {
      const left = evalExpr(ifMatch[1]!, state.variables);
      const right = evalExpr(ifMatch[3]!, state.variables);
      if (compare(left, ifMatch[2]!, right)) {
        const inner = ifMatch[4]!.trim();
        if (/^(ΤΕΛΟΣ|END)$/i.test(inner)) state.halted = true;
        else lines.splice(state.pc, 0, inner);
      }
      continue;
    }

    const whileMatch = line.match(/^ΟΣΟ\s+(.+?)\s+(=|<|>|<=|>=|<>)\s+(.+?)\s+ΕΚΤΕΛΕΣΕ\s+(.+)$/i)
      ?? line.match(/^WHILE\s+(.+?)\s+(=|<|>|<=|>=|<>|==|!=)\s+(.+?)\s+DO\s+(.+)$/i);
    if (whileMatch) {
      const left = evalExpr(whileMatch[1]!, state.variables);
      const right = evalExpr(whileMatch[3]!, state.variables);
      if (compare(left, whileMatch[2]!, right)) {
        lines.splice(state.pc, 0, whileMatch[4]!.trim(), line);
      }
      continue;
    }

    if (/^(ΤΕΛΟΣ|STOP|END)$/i.test(line)) {
      state.halted = true;
      continue;
    }

    return { ok: false, output: state.output, error: `Unsupported line: ${line}`, variables: state.variables };
  }

  if (steps >= MAX_STEPS) {
    return { ok: false, output: state.output, error: 'Step limit exceeded', variables: state.variables };
  }

  return { ok: true, output: state.output, variables: state.variables };
}

export const GLOSSA_STARTER = `// Minimal GLOSSA subset sandbox
x <- 1
y <- 5
z <- x + y
ΓΡΑΨΕ z
ΤΕΛΟΣ
`;
