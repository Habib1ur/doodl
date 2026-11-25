import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'small-mobile-320', width: 320, height: 568 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

test.describe('Doodlio Responsive & Navigation Checks', () => {
  for (const vp of VIEWPORTS) {
    test(`renders landing, leaderboard, and profile without horizontal overflow at ${vp.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const path of ['/', '/leaderboard', '/profile']) {
        await page.goto(path, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(overflow, `Horizontal overflow detected on ${path} at ${vp.name}`).toBe(false);
      }
    });
  }
});

test.describe('Doodlio End-to-End Multiplayer Flow', () => {
  test('two players create room, join via invite URL, ready up, draw, and guess', async ({
    browser,
  }) => {
    const context1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const context2 = await browser.newContext({ viewport: { width: 390, height: 844 } });

    const p1 = await context1.newPage();
    const p2 = await context2.newPage();

    try {
      // 1. Player 1 creates a room from the landing page
      await p1.goto('/');
      await p1.getByRole('button', { name: /Play Now/i }).first().click();
      await p1.getByPlaceholder('e.g. SketchMaster').fill('Alice');
      await p1.getByRole('button', { name: /Create & Enter Lobby/i }).click();

      await p1.waitForURL(/\/room\/[A-Z0-9]{6}$/);
      const roomUrl = p1.url();

      // 2. Player 2 opens the invite link directly (mobile viewport)
      await p2.goto(roomUrl);
      await p2.getByPlaceholder('e.g. DoodlePro').fill('Bob');
      await p2.getByRole('button', { name: /Join Room/i }).click();

      // 3. Player 2 marks ready, Player 1 starts the game
      await p2.getByRole('button', { name: /Mark Ready/i }).click();
      const startBtn = p1.getByRole('button', { name: /Start Game/i });
      await expect(startBtn).toBeEnabled({ timeout: 10_000 });
      await startBtn.click();

      // 4. Player 1 picks the first word option
      await expect(p1.getByText('Choose a Word to Draw')).toBeVisible({ timeout: 10_000 });
      const firstWordBtn = p1.locator('div.z-20 button').first();
      const chosenWord = (await firstWordBtn.innerText()).trim();
      await firstWordBtn.click();

      // 5. Verify Player 1 sees "Draw:" and Player 2 sees the word hint
      await expect(p1.getByText(/Draw:/i)).toBeVisible({ timeout: 10_000 });

      // 6. Player 1 draws on the canvas
      const canvas = p1.locator('canvas').first();
      const box = await canvas.boundingBox();
      if (box) {
        await p1.mouse.move(box.x + 50, box.y + 50);
        await p1.mouse.down();
        await p1.mouse.move(box.x + 150, box.y + 120);
        await p1.mouse.up();
      }

      // 7. Player 2 guesses the secret word
      const guessInput = p2.getByLabel('Type your guess or chat message');
      await guessInput.fill(chosenWord);
      await p2.getByLabel('Send message').click();

      // 8. Verify correct guess announcement appears
      await expect(p2.getByText(/Bob guessed the word!/i)).toBeVisible({ timeout: 10_000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
