/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

// Calculatorul e o pagină a site-ului: romaniatransparenta.eu/registre/salarii/… (nginx-ul site-ului face proxy aici
// și pune antetul/subsolul site-ului prin SSI, vezi lib/shell.ts). Subdomeniile vechi (salarii.romaniatransparenta.eu,
// salarizare.zed-zen.com) trec prin middleware.ts: servesc adresele vechi sau, cu SALARII_REDIRECT=1, trimit 301 spre site.
const BASE_PATH = '/registre/salarii';
// ruta widgetului (lib/widget.ts → CALE_EMBED), cu prefix sau fără, cu sau fără „/" la final
const EMBED_RE = '(?:registre/salarii/)?embed/?';

const nextConfig = {
  output: 'standalone',
  basePath: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    // 'unsafe-inline' in script-src/style-src is required because Next.js + Tailwind
    // inject inline <style> and Next bootstraps via inline script.
    // In dev, also allow 'unsafe-eval' for React Fast Refresh.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
    const politica = (frameAncestors) => [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self'" + (isDev ? ' ws: wss:' : ''),
      `frame-ancestors ${frameAncestors}`,
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ');
    // Paginile site-ului nu se pun în cadre. Excepția e ruta /embed (widgetul pentru alte site-uri,
    // docs/WIDGET-EMBED.md): acolo frame-ancestors vine din WIDGET_FRAME_ANCESTORS (la build), implicit orice site.
    const csp = politica("'none'");
    const cspEmbed = politica(process.env.WIDGET_FRAME_ANCESTORS || '*');
    const comune = [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    ];

    return [
      {
        // toate adresele, cu prefix (site) și fără (subdomeniile vechi), în afară de ruta embed
        source: `/:path((?!${EMBED_RE}$).*)`,
        basePath: false,
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          ...comune,
        ],
      },
      {
        // ruta embed: se poate pune în cadre, nu intră în index (pagina are și <meta name="robots">)
        source: `/:path(${EMBED_RE})`,
        basePath: false,
        headers: [
          { key: 'Content-Security-Policy', value: cspEmbed },
          { key: 'X-Robots-Tag', value: 'noindex' },
          ...comune,
        ],
      },
      {
        source: '/coefficients.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },

};

export default nextConfig;
