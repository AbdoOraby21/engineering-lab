import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const REFERENCE_PATH = join(process.cwd(), 'docs', 'reference', 'home-desktop.png');
const DIFF_PATH = join(process.cwd(), 'test-results', 'home-desktop.diff.png');
const VIEWPORT = { width: 1536, height: 1024 };
const MAX_DIFF_PERCENT = 4; // fail if more than 4% of pixels differ
const PIXEL_THRESHOLD = 0.15; // per-pixel color tolerance

function decodePng(buffer: Buffer): { width: number; height: number; data: Buffer } {
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height, data: Buffer.from(png.data) };
}

function cropTo(data: Buffer, width: number, height: number, targetW: number, targetH: number): Buffer {
  const out = Buffer.alloc(targetW * targetH * 4);
  const copyW = Math.min(width, targetW);
  const copyH = Math.min(height, targetH);
  for (let y = 0; y < copyH; y += 1) {
    const srcRow = y * width * 4;
    const dstRow = y * targetW * 4;
    data.copy(out, dstRow, srcRow, srcRow + copyW * 4);
  }
  return out;
}

function comparePngs(actual: Buffer, reference: Buffer): { percent: number; count: number; total: number; diff: Buffer; width: number; height: number } {
  const a = decodePng(actual);
  const r = decodePng(reference);
  const width = Math.min(a.width, r.width);
  const height = Math.min(a.height, r.height);
  const aData = cropTo(a.data, a.width, a.height, width, height);
  const rData = cropTo(r.data, r.width, r.height, width, height);
  const diff = Buffer.alloc(width * height * 4);
  const count = pixelmatch(aData, rData, diff, width, height, {
    threshold: PIXEL_THRESHOLD,
    includeAA: false,
  });
  return { percent: (count / (width * height)) * 100, count, total: width * height, diff, width, height };
}

test.describe('visual reference (home, 1536x1024)', () => {
  test.use({ viewport: VIEWPORT });

  test('matches the reference design within the pixel budget', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());

    const reference = readFileSync(REFERENCE_PATH);
    const screenshot = await page.screenshot({ fullPage: false });

    const { percent, count, total, diff, width, height } = comparePngs(screenshot, reference);

    writeFileSync(DIFF_PATH, PNG.sync.write(new PNG({ width, height, fill: true, data: diff })));

    console.log(`Visual diff: ${count}/${total} pixels (${percent.toFixed(2)}%)`);

    expect(percent).toBeLessThanOrEqual(MAX_DIFF_PERCENT);
  });

  test('key geometry matches the spec', async ({ page }) => {
    await page.goto('/en', { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');

    const header = page.locator('header').first();
    const hero = page.locator('section').first();
    const tilesRow = page.locator('.flex.flex-row.gap-2').first();
    const trustBar = page.locator('.rounded-\\[14px\\].border.border-line.bg-surface').first();

    const headerBox = await header.boundingBox();
    expect(headerBox?.height).toBeCloseTo(143, -1);

    const heroBox = await hero.boundingBox();
    expect(heroBox?.height).toBeCloseTo(370, -1);

    const tilesBox = await tilesRow.boundingBox();
    if (tilesBox) {
      expect(tilesBox.height).toBeCloseTo(117, -1);
    }

    const trustBox = await trustBar.boundingBox();
    if (trustBox) {
      expect(trustBox.height).toBeCloseTo(62, -1);
    }

    // 6 product cards per row at 1536 on the featured rail.
    const cards = page.locator('main section .rounded-\\[14px\\].border.border-line.bg-surface');
    expect(await cards.count()).toBeGreaterThanOrEqual(6);
  });
});
