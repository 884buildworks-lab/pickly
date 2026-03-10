export interface UrlMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  url: string;
}

/**
 * Extract content from meta tags using regex
 */
function extractMetaContent(html: string, property: string): string | undefined {
  // Try og: prefix first
  const ogRegex = new RegExp(
    `<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`,
    'i'
  );
  const ogMatch = html.match(ogRegex);
  if (ogMatch) return ogMatch[1];

  // Try content first then property (reverse order)
  const ogRegex2 = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`,
    'i'
  );
  const ogMatch2 = html.match(ogRegex2);
  if (ogMatch2) return ogMatch2[1];

  // Try twitter: prefix
  const twitterRegex = new RegExp(
    `<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']+)["']`,
    'i'
  );
  const twitterMatch = html.match(twitterRegex);
  if (twitterMatch) return twitterMatch[1];

  // Try content first then name (reverse order)
  const twitterRegex2 = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:${property}["']`,
    'i'
  );
  const twitterMatch2 = html.match(twitterRegex2);
  if (twitterMatch2) return twitterMatch2[1];

  return undefined;
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string | undefined {
  // Try OG title first
  const ogTitle = extractMetaContent(html, 'title');
  if (ogTitle) return decodeHtmlEntities(ogTitle);

  // Fall back to <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return decodeHtmlEntities(titleMatch[1].trim());

  return undefined;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

/**
 * Resolve relative URL to absolute
 */
function resolveUrl(base: string, relative: string | undefined): string | undefined {
  if (!relative) return undefined;
  if (relative.startsWith('http://') || relative.startsWith('https://')) {
    return relative;
  }
  if (relative.startsWith('//')) {
    return 'https:' + relative;
  }
  try {
    const baseUrl = new URL(base);
    if (relative.startsWith('/')) {
      return `${baseUrl.protocol}//${baseUrl.host}${relative}`;
    }
    return `${baseUrl.protocol}//${baseUrl.host}/${relative}`;
  } catch {
    return undefined;
  }
}

/**
 * Fetch metadata from a URL
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const result: UrlMetadata = { url };

  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid URL protocol');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Pickly/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();

    // Extract metadata
    result.title = extractTitle(html);
    result.description = extractMetaContent(html, 'description');
    result.siteName = extractMetaContent(html, 'site_name');

    // Extract image
    const imageUrl = extractMetaContent(html, 'image');
    result.image = resolveUrl(url, imageUrl);

  } catch (error) {
    // Return partial result with URL even if fetch fails
    console.warn('Failed to fetch URL metadata:', error);
  }

  return result;
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}
