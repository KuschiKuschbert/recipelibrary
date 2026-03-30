/**
 * Cloudflare Worker: fetch a recipe URL server-side (bypasses browser CORS).
 *
 * Deploy: Wrangler → create Worker → paste this handler, or use `wrangler deploy`.
 * Request: GET https://YOUR_WORKER.workers.dev?url=https%3A%2F%2Fexample.com%2Frecipe
 * Response: HTML body as text/plain or text/html with Access-Control-Allow-Origin: *
 *
 * Optional hardening (add before fetch): allowlist hostnames, cap response bytes.
 */
export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    const urlObj = new URL(request.url);
    const target = urlObj.searchParams.get('url');
    if (!target || !/^https?:\/\//i.test(target)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid url query parameter' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    const res = await fetch(target, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'KuschiKitchenLibraryRecipeFetch/1.0',
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
    });
    const html = await res.text();
    const max = 2000000;
    const body = html.length > max ? html.slice(0, max) : html;
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'private, max-age=60',
      },
    });
  },
};
