# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: file-upload-workspace.spec.ts >> Paste upload → course review → Study Workspace >> shows course diagnostics before opening the workspace
- Location: e2e\file-upload-workspace.spec.ts:29:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('app-toast')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 45000ms
  - waiting for getByTestId('app-toast')

```

```yaml
- complementary:
  - text: Synapse
  - navigation:
    - button "Dashboard"
    - button "Library"
    - button "Tasks"
    - button "Agent"
    - button "Analytics"
    - button "Teacher"
    - button "Settings"
  - button "Upload Material"
  - text: L
  - paragraph: Learner
  - paragraph: Level 1 · 0 XP
- banner:
  - text: "Economics: Each Price Level"
  - button "Search... ⌘K"
  - button
  - button "Switch to light mode"
  - text: L 🔥 0
- main:
  - button "Back to Library"
  - text: 📚
  - 'heading "Economics: Each Price Level" [level=1]'
  - paragraph: "Demand is the quantity that consumers are willing and able to buy at each price level. Market equilibrium occurs where the supply curve intersects the demand curve. # Price Elasticity Price elasticity of demand measures how responsive quantity demanded is to a change in price. Source signal is still sparse, so upload more material for deeper grounding."
  - text: 8 lessons 2h estimated 0% mastery
  - button "Add Material"
  - button "Ask Agent"
  - button "Continue"
  - text: Needs More Material Source quality 42/100
  - heading "Generation diagnostics" [level=2]
  - paragraph: The course outline was compacted to 4 modules so the source material stays grounded instead of being over-split.
  - paragraph: Detected topics
  - paragraph: "5"
  - paragraph: Final topics
  - paragraph: "4"
  - paragraph: Sections
  - paragraph: "2"
  - paragraph: Worked signals
  - paragraph: "0"
  - paragraph: "Watch-outs: The outline was compacted from 5 to 4 modules to match current source density. This course was generated from relatively sparse material, so some modules may remain lightly grounded. No worked examples or formula cues were detected, so practice generation will be lighter."
  - paragraph: "Best next upgrade: Upload another lecture, chapter, or fuller note set before relying on this course as the main study source."
  - text: Course Progress 0/8 lessons 0% complete ~2h remaining
  - paragraph: "21"
  - paragraph: Concepts
  - paragraph: "14"
  - paragraph: Glossary
  - paragraph: "12"
  - paragraph: Exercises
  - paragraph: enriched
  - paragraph: Source Mode
  - button "Learning Path"
  - button "Concept Map"
  - button "Source Files"
  - button "Analytics"
  - text: "1"
  - heading "Each Price Level & Prices Rise Sharply" [level=3]
  - paragraph: "Core concepts: Each Price Level, Price, Willing, Producers. Core concepts: Prices Rise Sharply, Buy, Elastic, Good."
  - text: 36m 4 lessons 8 concepts
  - button "Details"
  - text: Mastery 0%
  - button
  - text: "2"
  - heading "Supply Curve Intersects" [level=3]
  - paragraph: "Core concepts: Supply Curve Intersects, Demand Supply, Demand Curve, Demand."
  - text: 18m 3 lessons 5 concepts 1 prereq
  - button "Details"
  - text: Mastery 0%
  - button
  - text: "3"
  - heading "Quantity Demanded" [level=3]
  - paragraph: "Core concepts: Quantity Demanded, Consumers, Quantity, Change."
  - text: 18m 2 lessons 4 concepts 1 prereq
  - button "Details"
  - text: Mastery 0%
  - button
  - text: "4"
  - heading "Market Equilibrium" [level=3]
  - paragraph: "Core concepts: Market Equilibrium, Able, Inelastic, Microeconomics."
  - text: 18m 2 lessons 4 concepts 1 prereq
  - button "Details"
  - text: Mastery 0%
  - button
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const NOTES = `
  4  | # Microeconomics — Supply and Demand
  5  | 
  6  | Supply is the quantity of a good that producers are willing and able to sell at each price level.
  7  | Demand is the quantity that consumers are willing and able to buy at each price level.
  8  | Market equilibrium occurs where the supply curve intersects the demand curve.
  9  | 
  10 | # Price Elasticity
  11 | 
  12 | Price elasticity of demand measures how responsive quantity demanded is to a change in price.
  13 | When demand is inelastic, consumers buy similar quantities even when prices rise sharply.
  14 | When demand is elastic, small price changes cause large shifts in quantity demanded.
  15 | `.trim();
  16 | 
  17 | async function skipOnboarding(page: import('@playwright/test').Page) {
  18 |   await page.getByTestId('landing-get-started').click();
  19 |   await page.getByTestId('onboarding-continue').click();
  20 |   await page.getByRole('button', { name: 'Self-Learner' }).click();
  21 |   await page.getByTestId('onboarding-next').click();
  22 |   await page.getByRole('button', { name: 'Deeply understand material' }).click();
  23 |   await page.getByTestId('onboarding-next').click();
  24 |   await page.getByTestId('onboarding-next').click();
  25 |   await page.getByRole('button', { name: 'Skip — explore the demo first' }).click();
  26 | }
  27 | 
  28 | test.describe('Paste upload → course review → Study Workspace', () => {
  29 |   test('shows course diagnostics before opening the workspace', async ({ page }) => {
  30 |     await page.goto('/');
  31 |     await skipOnboarding(page);
  32 | 
  33 |     await page.getByTestId('nav-library').click();
  34 |     await page.getByTestId('library-upload').click();
  35 | 
  36 |     await page.getByTestId('upload-paste').fill(NOTES);
  37 |     await page.getByTestId('upload-continue').click();
  38 |     await expect(page.getByTestId('upload-outline-preview')).toBeVisible({ timeout: 15_000 });
  39 |     await expect(page.getByText(/supply|demand|elasticity/i).first()).toBeVisible();
  40 |     await page.getByTestId('upload-generate').click();
  41 | 
> 42 |     await expect(page.getByTestId('app-toast')).toBeVisible({ timeout: 45_000 });
     |                                                 ^ Error: expect(locator).toBeVisible() failed
  43 |     await expect(page.getByTestId('app-toast')).toContainText(/sections detected|ενότητες ανιχνεύθηκαν/i);
  44 |     await expect(page.getByTestId('course-generation-diagnostics')).toBeVisible({ timeout: 45_000 });
  45 |     await expect(page.getByTestId('course-title')).not.toHaveText('');
  46 | 
  47 |     await page.getByTestId('course-open-workspace').click();
  48 |     await expect(page.getByTestId('study-workspace')).toBeVisible({ timeout: 45_000 });
  49 |     await expect(page.getByText(/from your notes|από τις σημειώσεις σου/i).first()).toBeVisible();
  50 |     await expect(page.getByText(/supply|demand|elasticity/i).first()).toBeVisible({ timeout: 15_000 });
  51 |   });
  52 | });
  53 | 
```