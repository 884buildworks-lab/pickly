import type { Card } from '@/types';

export interface UrlCheckResult {
  cardId: string;
  url: string;
  status: 'ok' | 'broken' | 'error' | 'pending';
  statusCode?: number;
  errorMessage?: string;
}

export interface DuplicateGroup {
  url: string;
  cardIds: string[];
}

/**
 * Check if a URL is accessible
 */
export async function checkUrl(url: string): Promise<{ status: 'ok' | 'broken' | 'error'; statusCode?: number; errorMessage?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading content
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { status: 'ok', statusCode: response.status };
    } else if (response.status === 404) {
      return { status: 'broken', statusCode: response.status };
    } else {
      return { status: 'error', statusCode: response.status };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { status: 'error', errorMessage: 'Timeout' };
      }
      return { status: 'error', errorMessage: error.message };
    }
    return { status: 'error', errorMessage: 'Unknown error' };
  }
}

/**
 * Find duplicate URLs in a list of cards
 */
export function findDuplicates(cards: Card[]): DuplicateGroup[] {
  const urlMap = new Map<string, string[]>();

  cards.forEach((card) => {
    if (!card.url) return;
    // Normalize URL for comparison
    const normalizedUrl = normalizeUrl(card.url);
    const existing = urlMap.get(normalizedUrl) || [];
    existing.push(card.id);
    urlMap.set(normalizedUrl, existing);
  });

  // Return only groups with duplicates
  return Array.from(urlMap.entries())
    .filter(([, cardIds]) => cardIds.length > 1)
    .map(([url, cardIds]) => ({ url, cardIds }));
}

/**
 * Normalize URL for comparison (remove trailing slash, www, etc.)
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let normalized = parsed.hostname.replace(/^www\./, '') + parsed.pathname;
    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');
    // Add query string if present
    if (parsed.search) {
      normalized += parsed.search;
    }
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Check all URLs in a list of cards
 */
export async function checkAllUrls(
  cards: Card[],
  onProgress?: (completed: number, total: number) => void
): Promise<UrlCheckResult[]> {
  const results: UrlCheckResult[] = [];
  const cardsWithUrls = cards.filter((c) => c.url);

  for (let i = 0; i < cardsWithUrls.length; i++) {
    const card = cardsWithUrls[i];
    if (!card.url) continue;

    const result = await checkUrl(card.url);
    results.push({
      cardId: card.id,
      url: card.url,
      ...result,
    });

    if (onProgress) {
      onProgress(i + 1, cardsWithUrls.length);
    }
  }

  return results;
}
