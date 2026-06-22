import { describe, it, expect } from 'vitest';
import { extractCodeBlocks, extractPythonBlocks, classifyCodeLanguage, isExecutableLanguage } from './codeBlockExtract';

describe('codeBlockExtract', () => {
  it('extracts fenced code blocks', () => {
    const text = `
Some text.

\`\`\`python
def add(a, b):
    return a + b
\`\`\`

More text.
    `.trim();
    const blocks = extractCodeBlocks(text);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.language).toBe('python');
    expect(blocks[0]!.code).toContain('def add');
    expect(blocks[0]!.inline).toBe(false);
  });

  it('extracts inline code spans', () => {
    const text = 'Use the `print()` function to show output.';
    const blocks = extractCodeBlocks(text);
    const inline = blocks.find((b) => b.inline);
    expect(inline).toBeDefined();
    expect(inline!.code).toBe('print()');
  });

  it('classifies languages from hints and content', () => {
    expect(classifyCodeLanguage('console.log("hi")', 'js')).toBe('javascript');
    expect(classifyCodeLanguage('def f(): pass', '')).toBe('python');
    expect(classifyCodeLanguage('const x: number = 1;', '')).toBe('typescript');
    expect(classifyCodeLanguage('hello world', '')).toBe('text');
  });

  it('filters executable python blocks', () => {
    const text = `
\`\`\`python
print(1)
\`\`\`

\`\`\`javascript
console.log(2)
\`\`\`
    `.trim();
    const python = extractPythonBlocks(text);
    expect(python.length).toBe(1);
    expect(python[0]!.language).toBe('python');
  });

  it('reports executable languages correctly', () => {
    expect(isExecutableLanguage('python')).toBe(true);
    expect(isExecutableLanguage('javascript')).toBe(false);
  });
});
