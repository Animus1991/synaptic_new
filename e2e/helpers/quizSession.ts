import { expect, type Page } from '@playwright/test';

/** Answer the current workspace quiz item (MC, short-answer, ordering, or matching). */
export async function answerCurrentQuizItem(page: Page) {
  const session = page.getByTestId('quiz-session');
  await expect(session).toBeVisible({ timeout: 10_000 });

  const mcButtons = session.getByRole('button', { name: /^[A-D]\s/ });
  const mcCount = await mcButtons.count();
  if (mcCount > 0) {
    for (let i = 0; i < mcCount; i++) {
      const label = (await mcButtons.nth(i).textContent()) ?? '';
      if (!/not stated|δεν αναφέρεται/i.test(label)) {
        await mcButtons.nth(i).click();
        await expect(session.getByTestId('quiz-confidence-rating')).toBeVisible({ timeout: 5_000 });
        return;
      }
    }
    await mcButtons.first().click();
    await expect(session.getByTestId('quiz-confidence-rating')).toBeVisible({ timeout: 5_000 });
    return;
  }

  const quiz = session.getByTestId('workspace-quiz');
  const shortInput = quiz.locator('input[type="text"]');
  if (await shortInput.isVisible().catch(() => false)) {
    await shortInput.fill('supply');
    await quiz.getByRole('button', { name: /Check|Έλεγχος/i }).click();
    await expect(session.getByTestId('quiz-confidence-rating')).toBeVisible({ timeout: 5_000 });
    return;
  }

  const orderCheck = quiz.getByRole('button', { name: /Check order|Έλεγχος σειράς/i });
  if (await orderCheck.isVisible().catch(() => false)) {
    await orderCheck.click();
    await expect(session.getByTestId('quiz-confidence-rating')).toBeVisible({ timeout: 5_000 });
    return;
  }

  const matchSelects = quiz.locator('select');
  const matchCount = await matchSelects.count();
  if (matchCount > 0) {
    for (let i = 0; i < matchCount; i++) {
      await matchSelects.nth(i).selectOption({ index: 1 });
    }
    await quiz.getByRole('button', { name: /Check matches|Έλεγχος αντιστοιχίσεων/i }).click();
    await expect(session.getByTestId('quiz-confidence-rating')).toBeVisible({ timeout: 5_000 });
    return;
  }

  throw new Error('quiz-workspace-flow: unrecognized quiz item UI');
}

/** Complete every question until quiz-session-complete. */
export async function completeQuizSession(page: Page, maxSteps = 24) {
  const session = page.getByTestId('quiz-session');

  for (let step = 0; step < maxSteps; step++) {
    if (await page.getByTestId('quiz-session-complete').isVisible().catch(() => false)) {
      return;
    }

    await expect(session).toBeVisible();

    if (await session.getByRole('button', { name: /^[A-D]\s/ }).first().isVisible().catch(() => false)) {
      await answerCurrentQuizItem(page);
    } else if (await session.getByTestId('workspace-quiz').isVisible().catch(() => false)) {
      await answerCurrentQuizItem(page);
    }

    const confidence = session.getByTestId('quiz-confidence-rating');
    if (await confidence.isVisible().catch(() => false)) {
      await session.getByTestId('quiz-confidence-3').click();
      await session.getByTestId('quiz-session-confirm').click();
    }
  }

  await expect(page.getByTestId('quiz-session-complete')).toBeVisible({ timeout: 15_000 });
}
