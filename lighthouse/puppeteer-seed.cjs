/**
 * B5 — seed onboarding-complete profile so ?view=dashboard and ?demo=1 resolve
 * into app chrome (shared Chromium profile / localStorage for the LHCI run).
 *
 * @param {import('puppeteer').Browser} browser
 */
module.exports = async (browser) => {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.evaluate(() => {
    localStorage.setItem(
      'synapse:user-profile-v1',
      JSON.stringify({
        onboardingComplete: true,
        name: 'LHCI',
        segment: 'selflearner',
        role: 'self-learner',
      }),
    );
    localStorage.setItem(
      'synapse:session-v2',
      JSON.stringify({
        userSettings: {
          showDemoContent: true,
          language: 'en',
          theme: 'minimal',
        },
      }),
    );
  });
  await page.close();
};
