import fs from 'fs';
import path from 'path';

const outDir = path.resolve('src/components/workspace/studyWorkspace');
const hookSrc = fs.readFileSync(path.join(outDir, 'useStudyWorkspace.ts'), 'utf8');

// Extract return object keys
const returnMatch = hookSrc.match(/return \{([\s\S]*?)\n  \};\n\}/);
if (!returnMatch) throw new Error('Could not find return block');
const keys = [...returnMatch[1].matchAll(/^\s{4}(\w+),?/gm)].map((m) => m[1]);
const destructuring = `  const {\n    ${keys.join(',\n    ')},\n  } = model;\n\n  return (\n    <>\n`;
const closing = `\n    </>\n  );\n`;

function fixComponent(filename, bodyTransform) {
  const filePath = path.join(outDir, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  const fnStart = content.indexOf('export function');
  const bodyStart = content.indexOf('{', fnStart) + 1;
  let body = content.slice(bodyStart);
  // remove trailing }
  body = body.replace(/\n\}$/, '');
  body = bodyTransform(body.trim());
  const header = content.slice(0, bodyStart);
  fs.writeFileSync(filePath, header + destructuring + body + closing + '}\n');
}

// Fix LessonPanel - add missing closing )}
fixComponent('StudyWorkspaceLessonPanel.tsx', (body) => {
  if (!body.endsWith(')}')) {
    body = body.replace(/\s*<\/>[\s\n]*$/, '              </>\n            )}\n');
  }
  return body.split('\n').map((l) => '      ' + l.trimStart()).join('\n');
});

// Fix ToolSurface - add missing closing )}
fixComponent('StudyWorkspaceToolSurface.tsx', (body) => {
  if (!body.endsWith(')}')) {
    body = body + '\n            )}\n';
  }
  return body.split('\n').map((l) => '      ' + l.trimStart()).join('\n');
});

// Fix Chrome
fixComponent('StudyWorkspaceChrome.tsx', (body) =>
  body.split('\n').map((l) => '      ' + l.trimStart()).join('\n'),
);

// Fix Overlays
fixComponent('StudyWorkspaceOverlays.tsx', (body) =>
  body.split('\n').map((l) => '      ' + l.trimStart()).join('\n'),
);

// Fix MainLayout - simpler imports + destructuring
const mainLayout = `import { Group } from 'react-resizable-panels';
import { WorkspaceDock } from '../WorkspaceDock';
import { StudyWorkspaceLessonPanel } from './StudyWorkspaceLessonPanel';
import { StudyWorkspaceToolSurface } from './StudyWorkspaceToolSurface';
import type { StudyWorkspaceModel } from './useStudyWorkspace';
import { AVAILABLE_TOOLS } from './types';

interface StudyWorkspaceMainLayoutProps {
  model: StudyWorkspaceModel;
}

export function StudyWorkspaceMainLayout({ model }: StudyWorkspaceMainLayoutProps) {
  const {
    chromeHidden,
    isMobile,
    activeTool,
    openWorkspaceTool,
    lang,
  } = model;

  return (
    <div className="relative z-10 flex-1 flex overflow-hidden" id="workspace-main" role="main" tabIndex={-1}>
      {!chromeHidden && !isMobile && (
        <WorkspaceDock
          activeTool={activeTool}
          onSelectTool={openWorkspaceTool}
          availableTools={AVAILABLE_TOOLS}
          lang={lang}
        />
      )}
      <Group orientation={isMobile ? 'vertical' : 'horizontal'} className="flex-1 w-full h-full">
        <StudyWorkspaceLessonPanel model={model} />
        <StudyWorkspaceToolSurface model={model} />
      </Group>
    </div>
  );
}
`;

fs.writeFileSync(path.join(outDir, 'StudyWorkspaceMainLayout.tsx'), mainLayout);

console.log('Fixed components with destructuring for', keys.length, 'model keys');
