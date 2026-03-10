/**
 * Fetches HTML content from a URL for offline viewing.
 * Returns cleaned HTML string suitable for rendering in a WebView.
 */
export async function fetchPageContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Pickly/1.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Wraps cached HTML content with a base tag so relative URLs resolve correctly.
 */
export function wrapWithBase(html: string, baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    const base = `${url.protocol}//${url.host}`;
    // Insert <base> tag after <head> if it exists, otherwise prepend
    if (html.includes('<head>')) {
      return html.replace('<head>', `<head><base href="${base}">`);
    }
    if (html.includes('<head ')) {
      return html.replace(/<head\s/, `<base href="${base}"><head `);
    }
    return `<base href="${base}">${html}`;
  } catch {
    return html;
  }
}
