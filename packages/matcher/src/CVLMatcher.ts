/**
 * CVLMatcher
 *
 * Reverse lookup: finds elements on a page by CVL pattern.
 * This enables "record once, run anywhere" - recorded CVL patterns
 * can find similar elements on different websites.
 */

import type { Page } from 'playwright';

export interface CVLMatchResult {
  element: any; // Playwright ElementHandle
  cvl: string;
  similarity: number; // 0-1, how well it matches
  selector: string;
}

export interface CVLMatcherConfig {
  /**
   * Minimum similarity threshold (0-1)
   */
  minSimilarity?: number;

  /**
   * Maximum number of results to return
   */
  maxResults?: number;

  /**
   * Whether to use fuzzy matching
   */
  fuzzyMatch?: boolean;

  /**
   * Whether to cache scene graphs for performance
   */
  cacheSceneGraphs?: boolean;
}

export class CVLMatcher {
  private page: Page;
  private config: CVLMatcherConfig;
  private sceneGraphCache: Map<string, any> = new Map();

  constructor(page: Page, config: CVLMatcherConfig = {}) {
    this.page = page;
    this.config = {
      minSimilarity: config.minSimilarity ?? 0.85,
      maxResults: config.maxResults ?? 5,
      fuzzyMatch: config.fuzzyMatch ?? true,
      cacheSceneGraphs: config.cacheSceneGraphs ?? true
    };
  }

  /**
   * Find elements matching a CVL pattern
   */
  async findByCVL(cvlPattern: string): Promise<CVLMatchResult[]> {
    // Get all interactive elements on page
    const elements = await this.page.$$('button, a, input, select, [role="button"]');

    const results: CVLMatchResult[] = [];

    for (const element of elements) {
      // Generate CVL for this element
      const elementCVL = await this.generateCVL(element);

      // Calculate similarity
      const similarity = this.calculateSimilarity(cvlPattern, elementCVL);

      if (similarity >= this.config.minSimilarity!) {
        const selector = await this.generateSelector(element);

        results.push({
          element,
          cvl: elementCVL,
          similarity,
          selector
        });
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    // Return top N results
    return results.slice(0, this.config.maxResults);
  }

  /**
   * Find the best matching element for a CVL pattern
   */
  async findBestMatch(cvlPattern: string): Promise<CVLMatchResult | null> {
    const results = await this.findByCVL(cvlPattern);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find multiple elements matching CVL patterns (batch)
   */
  async findBatch(cvlPatterns: string[]): Promise<Map<string, CVLMatchResult[]>> {
    const resultMap = new Map<string, CVLMatchResult[]>();

    for (const pattern of cvlPatterns) {
      const results = await this.findByCVL(pattern);
      resultMap.set(pattern, results);
    }

    return resultMap;
  }

  /**
   * Generate CVL tokens for an element
   * TODO: Integrate with Morpheus CVLEncoder
   */
  private async generateCVL(element: any): Promise<string> {
    // Get element properties
    const tag = await element.evaluate((el: HTMLElement) => el.tagName.toLowerCase());
    const text = await element.evaluate((el: HTMLElement) => el.textContent?.trim().slice(0, 100) || '');
    const classes = await element.evaluate((el: HTMLElement) => Array.from(el.classList));

    const tokens: string[] = [];

    // Element type
    if (tag === 'button') tokens.push('E.BTN');
    else if (tag === 'input') tokens.push('E.INP');
    else if (tag === 'a') tokens.push('E.LNK');
    else if (tag === 'select') tokens.push('E.SEL');

    // Text content hints
    const lowerText = text.toLowerCase();
    if (lowerText.includes('login')) tokens.push('T.LOG');
    else if (lowerText.includes('sign')) tokens.push('T.SIG');
    else if (lowerText.includes('search')) tokens.push('T.SRC');
    else if (lowerText.includes('submit')) tokens.push('T.SUB');
    else if (lowerText.includes('close')) tokens.push('T.CLS');
    else if (lowerText.includes('menu')) tokens.push('T.MNU');
    else if (lowerText.includes('cart')) tokens.push('T.CRT');

    // Common classes
    if (classes.some((c: string) => c.includes('primary'))) tokens.push('C.BLU');
    if (classes.some((c: string) => c.includes('danger'))) tokens.push('C.RED');
    if (classes.some((c: string) => c.includes('success'))) tokens.push('C.GRN');

    return tokens.join(' ');
  }

  /**
   * Calculate similarity between two CVL patterns
   * Uses token overlap and fuzzy matching
   */
  private calculateSimilarity(pattern1: string, pattern2: string): number {
    const tokens1 = pattern1.split(' ').filter(t => t.length > 0);
    const tokens2 = pattern2.split(' ').filter(t => t.length > 0);

    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }

    // Exact match
    if (pattern1 === pattern2) {
      return 1.0;
    }

    // Token overlap
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    const intersection = new Set([...set1].filter(t => set2.has(t)));
    const union = new Set([...set1, ...set2]);

    const jaccardSimilarity = intersection.size / union.size;

    // Fuzzy matching: allow partial matches
    if (this.config.fuzzyMatch) {
      // Boost similarity if key tokens match
      const keyTokens = ['E.BTN', 'E.INP', 'E.LNK', 'T.LOG', 'T.SIG', 'T.SRC', 'T.SUB'];
      const keyMatches = keyTokens.filter(kt => set1.has(kt) && set2.has(kt)).length;

      if (keyMatches > 0) {
        return Math.min(1.0, jaccardSimilarity + (keyMatches * 0.1));
      }
    }

    return jaccardSimilarity;
  }

  /**
   * Generate CSS selector for an element
   */
  private async generateSelector(element: any): Promise<string> {
    return await element.evaluate((el: HTMLElement) => {
      if (el.id) return `#${el.id}`;

      const path: string[] = [];
      let current: HTMLElement | null = el;

      while (current && current.tagName) {
        let selector = current.tagName.toLowerCase();

        if (current.className) {
          selector += '.' + Array.from(current.classList).join('.');
        }

        path.unshift(selector);
        current = current.parentElement;

        if (path.length > 3) break; // Limit depth
      }

      return path.join(' > ');
    });
  }

  /**
   * Clear scene graph cache
   */
  clearCache(): void {
    this.sceneGraphCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.sceneGraphCache.size,
      hitRate: 0 // TODO: Track hits/misses
    };
  }
}
