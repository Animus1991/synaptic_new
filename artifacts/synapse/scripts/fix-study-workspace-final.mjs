import fs from 'fs';
import path from 'path';

const outDir = path.resolve('src/components/workspace/studyWorkspace');

// --- Fix component destructuring: only keys used in JSX ---
const hook = fs.readFileSync(path.join(outDir, 'useStudyWorkspace.ts'), 'utf8');
const hookLines = hook.split('\n');
const returnStart = hookLines.findIndex((l) => l.includes('// props passthrough')) - 1;
const returnEnd = hookLines.findIndex((l, i) => i > returnStart && l.trim() === '};');
const modelKeys = hookLines
  .slice(returnStart + 1, returnEnd)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('//'))
  .map((l) => l.replace(/,$/, ''));

function keysUsedInJsx(jsx, keys) {
  return keys.filter((k) => new RegExp(`(?<![.\\w])${k}(?![\\w])`).test(jsx));
}

function fixComponent(filename, extraImports = []) {
  const filePath = path.join(outDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  const returnIdx = content.indexOf('} = model;');
  const jsxStart = content.indexOf('<>', returnIdx);
  const jsxEnd = content.lastIndexOf('</>');
  if (jsxStart < 0 || jsxEnd < 0) {
    console.warn(filename, 'could not locate JSX — skipping');
    return;
  }
  const jsx = content.slice(jsxStart, jsxEnd);
  const used = keysUsedInJsx(jsx, modelKeys);
  if (used.length === 0) {
    console.warn(filename, 'no keys detected — skipping destructuring update');
    return;
  }
  const destructuring = `  const {\n    ${used.join(',\n    ')},\n  } = model;\n\n`;
  content = content.replace(
    /  const \{[\s\S]*?\} = model;\n\n/,
    destructuring,
  );
  for (const imp of extraImports) {
    if (!content.includes(imp.split("'")[1]?.split("'")[0] ?? imp)) {
      const insertAt = content.indexOf("import type { StudyWorkspaceModel }");
      content = content.slice(0, insertAt) + imp + '\n' + content.slice(insertAt);
    }
  }
  fs.writeFileSync(filePath, content);
  console.log(filename, 'uses', used.length, 'keys');
}

fixComponent('StudyWorkspaceChrome.tsx', [
  "import { activityFor } from '../../../lib/workspaceConceptBus';",
  "import { nextActionLabel } from '../../../lib/nextActionEngine';",
]);
fixComponent('StudyWorkspaceLessonPanel.tsx');
fixComponent('StudyWorkspaceToolSurface.tsx');
fixComponent('StudyWorkspaceOverlays.tsx');

console.log('Fixed hook imports and component destructuring');
