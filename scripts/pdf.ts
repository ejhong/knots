/**
 * The research documents as PDFs: the preprint and the one-page pilot, printed from their pages (A4, the reading
 * layout's print rules) into public/research/. Run against a running site after the guide's data changes:
 *
 *   npm run dev   (or npx astro preview)
 *   npx tsx scripts/pdf.ts [--base http://127.0.0.1:4321]
 */
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const i = args.indexOf('--base');
const base = i >= 0 ? args[i + 1] : 'http://127.0.0.1:4321';
const DOCS: [string, string][] = [
  ['/knots/research/preprint/', 'public/research/preprint.pdf'],
  ['/knots/research/pilot/', 'public/research/pilot.pdf'],
];

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.SHOT_CHROMIUM || undefined });
  const page = await browser.newPage();
  for (const [path, out] of DOCS) {
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: out,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="font-size:7px;width:100%;text-align:center;color:#8a7d6d;font-family:Georgia,serif">' +
        'Knots of Existence · ejhong.github.io/knots · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    console.log(`${out}  from ${path}`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
