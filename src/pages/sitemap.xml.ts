import type { APIRoute } from 'astro';

// The pages search engines should know about (og and lab are working pages, left out).
const PAGES = ['', 'atlas/', 'hypotheses/', 'research/', 'simulation/', 'traditions/', 'library/', 'about/'];

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const today = new Date().toISOString().slice(0, 10);
  const urls = PAGES.map((path) => `  <url><loc>${new URL(base + path, site)}</loc><lastmod>${today}</lastmod></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
