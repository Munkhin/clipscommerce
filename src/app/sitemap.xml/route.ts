export async function GET() {
  const urls = [
    '',
    'landing',
    'landing/pricing',
    'dashboard',
  ];
  const hostname = 'https://clipscommerce.com';
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(u => `<url><loc>${hostname}/${u}</loc></url>`)
      .join('\n') +
    `\n</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
} 