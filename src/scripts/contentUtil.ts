/**
 * contentUtil.ts
 * Utility functions for DOM manipulation, string processing, and data extraction.
 */

import { distance } from 'fastest-levenshtein';

/** Regex to match non-digit characters */
const NON_DIGIT_REGEX = /\D/g;

/**
 * Gets the integer price from a price string.
 *
 * @param priceStr - String containing the price.
 * @returns Price as an integer, or 0 if invalid.
 */
export function getPrice(priceStr: string): number {
    const digits = priceStr.replace(NON_DIGIT_REGEX, '');
    const price = parseInt(digits.trim(), 10);

    return isNaN(price) ? 0 : price;
}

/**
 * Parses mileage from a text string containing numeric mileage data.
 *
 * @param text - String containing mileage information (e.g., "50k miles", "50000").
 * @returns Parsed mileage as a number, or null if parsing fails.
 */
export function parseMileage(text: string): number | null {
    const digits = text.replace(NON_DIGIT_REGEX, '');
    const value = parseInt(digits, 10);

    return isNaN(value) ? null : value;
}

/**
 * Traverses up the DOM tree from the starting element to find the nearest img element.
 *
 * @param el - The starting element.
 * @returns The nearest HTMLImageElement, or null if not found.
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
 * Walks up the DOM from the starting element and returns the nth ancestor matching the selector.
 *
 * @param el - The starting element.
 * @param selector - A CSS selector to match ancestors against.
 * @param n - The 1-based index of the match to return.
 * @returns The matching ancestor element, or null if not found.
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
    }

    return null;
}

/**
 * Calculates a similarity score between two strings using Levenshtein distance.
 *
 * @param a - First string to compare.
 * @param b - Second string to compare.
 * @returns Similarity score between 0 (completely different) and 1 (identical).
 */
export function similarity(a: string, b: string): number {
    const dist = distance(a, b);
    const maxLen = Math.max(a.length, b.length);

    return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

/**
 * Normalizes a string for similarity comparison by converting to lowercase
 * and removing all non-alphanumeric characters.
 *
 * @param s - String to normalize.
 * @returns Normalized string.
 */
export function normalizeStr(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds the best matching model from a list of models based on fuzzy string matching.
 *
 * @param models - List of model names to search through.
 * @param titleWords - Array of words from the listing title.
 * @param threshold - Similarity threshold (0-1) for fuzzy matches.
 * @returns The best matching model name, or empty string if no match exceeds threshold.
 */
export function bestModelMatch(models: string[], titleWords: string[], threshold: number): string {
    const normalizedModels = models.map((m) => normalizeStr(m));

    for (let i = 0; i < titleWords.length; i++) {
        const titleWord = titleWords[i];
        if (!titleWord) continue;

        const w1 = normalizeStr(titleWord);

        // Check for exact match
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

        // Try combining with next word for multi-word models
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
