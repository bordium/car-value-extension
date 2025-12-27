/**
 * contentUtil.ts
 * Utility functions for DOM manipulation, string processing, and data extraction.
 */

import { distance } from 'fastest-levenshtein';

/**
 * Gets the integer price from a price string.
 *
 * @param {string} priceStr String containing the price.
 * @returns {number}        Price as an integer or undefined if invalid.
 */
export function getPrice(priceStr: string): number {
    priceStr = priceStr.replace(/\D/g, '');
    const price = parseInt(priceStr.trim(), 10) || NaN;

    if (isNaN(price)) {
        return 0;
    }

    return price;
}

/**
 * Start with el and traverse up the DOM tree to
 * find the nearest <img> element. If no <img> is found,
 * keep looking in parent elements.
 *
 * @param {Element} el              The starting element.
 * @returns {HTMLImageElement|null} HTMLImageElement or null if not found.
 */
export function findNearestImg(el: Element): HTMLImageElement | null {
    let ancestor = el.parentElement;
    while (ancestor) {
        const img = ancestor.querySelector<HTMLImageElement>('img');
        if (img) return img;

        ancestor = ancestor.parentElement;
    }
    return null;
}

/**
 * Walks up the DOM from `el` and returns
 * the nth ancestor matching the selector.
 *
 * @param {Element} el      The starting element.
 * @param {string} selector A CSS selector to match ancestors against.
 * @param {number} n        The 1-based index of the match you want.
 * @returns {Element|null}  The matching ancestor or null if none found.
 */
export function getNthAncestor(el: Element, selector: string, n: number): Element | null {
    let count = 0;
    let node = el.parentElement;

    while (node) {
        if (node.matches(selector)) {
            count++;
            if (count === n) {
                return node;
            }
        }
        node = node.parentElement;
        if (!node) {
            break;
        }
    }

    return null;
}

/**
 * Returns a similarity score between 0 and 1 (inclusive) based on Levenshtein distance.
 *
 * @param a First string to compare
 * @param b Second string to compare
 * @returns Similarity score between 0 and 1
 */
export function similarity(a: string, b: string): number {
    const dist = distance(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

/**
 * Normalizes strings for similarity comparison.
 *
 * @param s String to normalize.
 * @returns String with all non-alphanumeric characters removed and converted to lowercase.
 */
export function normalizeStr(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds the best matching model from a list of models and returns it,
 * or returns null if no match exceeds the threshold.
 *
 * @param models    List of raw model names (may contain hyphens).
 * @param titleWords  Array of words from the listing title (split on whitespace).
 * @param threshold Similarity threshold [0..1] for fuzzy matches.
 */
export function bestModelMatch(models: string[], titleWords: string[], threshold: number): string {
    const normalizedModels = models.map((m) => normalizeStr(m));

    for (let i = 0; i < titleWords.length; i++) {
        const titleWord = titleWords[i];
        if (!titleWord) continue;

        const w1 = normalizeStr(titleWord);

        const exactIndexes = normalizedModels
            .map((nm, idx) => (nm === w1 ? idx : -1))
            .filter((idx) => idx !== -1);
        if (exactIndexes.length === 1) {
            const exactIndex = exactIndexes[0];
            if (exactIndex !== undefined) {
                const model = models[exactIndex];
                if (model) return model;
            }
        }

        if (i + 1 < titleWords.length) {
            const nextWord = titleWords[i + 1];
            if (!nextWord) continue;

            const w2 = normalizeStr(nextWord);
            const phrase = w1 + w2;

            const scores = normalizedModels.map((nm, idx) => ({
                idx,
                score: similarity(phrase, nm),
            }));
            scores.sort((a, b) => b.score - a.score);

            const best = scores[0];
            if (best && best.score >= threshold) {
                const model = models[best.idx];
                if (model) return model;
            }
        }
    }

    return '';
}
