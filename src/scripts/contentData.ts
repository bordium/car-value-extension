/**
 * contentData.ts
 * Data parsing functions for extracting car information from marketplace listings.
 */

import type { DataEntry } from '../shared/types';
import * as makesModelJSON from '../config/make_model.json';
import { similarity, bestModelMatch, getPrice, getNthAncestor, parseMileage } from './contentUtil';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type MakeModelsType = {
    [make: string]: string[];
};

/**
 * Result of matching a car make from title words.
 */
interface MakeMatch {
    make: string;
    models: string[];
}

/**
 * Parsed vehicle information extracted from a listing title.
 */
interface ParsedTitle {
    year: number;
    make: string;
    model: string;
}

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const makeModels: MakeModelsType = makesModelJSON as MakeModelsType;

/** Similarity threshold for fuzzy string matching (0-1 scale) */
const SIMILARITY_THRESHOLD = 0.4;

/** Regex pattern to match year formats: "2024", "24", or "'24" */
const YEAR_PATTERN = /\b(?:\d{4}|'?\d{2})\b/;

/** Minimum valid car manufacturing year */
const MIN_VALID_YEAR = 1900;

// ----------------------------------------------------------------------------
// Factory Functions
// ----------------------------------------------------------------------------

/**
 * Creates an empty DataEntry with default values for the specified source.
 *
 * @param source - The marketplace source ('facebook' or 'craigslist').
 * @returns A new DataEntry with default values.
 */
function createEmptyDataEntry(source: 'facebook' | 'craigslist'): DataEntry {
    return {
        make: '',
        model: '',
        url: '',
        year: 0,
        price: 0,
        mileage: null,
        location: null,
        imageUrl: null,
        title: '',
        source
    };
}

// ----------------------------------------------------------------------------
// Pure Helper Functions
// ----------------------------------------------------------------------------

/**
 * Extracts a valid car year from a word.
 *
 * @param word - A single word that may contain a year.
 * @returns The extracted year if valid, or null if not a valid year.
 */
function extractYear(word: string): number | null {
    const match = word.match(YEAR_PATTERN);
    if (!match) return null;

    let year = parseInt(match[0].replace("'", ''), 10);

    // Handle 2-digit years (e.g., "24" -> 2024, "99" -> 1999)
    if (year < 100) {
        year = year > 50 ? 1900 + year : 2000 + year;
    }

    const maxYear = new Date().getFullYear() + 1;

    return (year >= MIN_VALID_YEAR && year <= maxYear) ? year : null;
}

/**
 * Attempts to find a matching car make from a word using exact and fuzzy matching.
 *
 * @param word - A single word that may be a car make.
 * @returns MakeMatch containing the make and its models, or null if no match.
 */
function findMake(word: string): MakeMatch | null {
    const normalized = word.toLowerCase();

    // Try exact match first
    const exactModels = makeModels[normalized];
    if (exactModels) {
        return { make: normalized, models: exactModels };
    }

    // Try fuzzy match with first-character optimization
    const firstChar = normalized[0];
    if (!firstChar) return null;

    for (const make in makeModels) {
        if (make[0] === firstChar && similarity(make, normalized) > SIMILARITY_THRESHOLD) {
            const models = makeModels[make];
            if (models) {
                return { make, models };
            }
        }
    }

    return null;
}

/**
 * Parses a listing title to extract year, make, and model information.
 * This is a pure function that does not mutate any inputs.
 *
 * @param titleWords - Array of words from the listing title.
 * @returns ParsedTitle with extracted data, or null if parsing fails.
 */
function parseListingTitle(titleWords: readonly string[]): ParsedTitle | null {
    let year = 0;
    let makeMatch: MakeMatch | null = null;
    const remainingWords: string[] = [];

    for (const word of titleWords) {
        if (!word) continue;

        // Try year extraction (only accept first valid year)
        if (!year) {
            const extractedYear = extractYear(word);
            if (extractedYear) {
                year = extractedYear;
                continue;
            }
        }

        // Try make matching (only accept first valid make)
        if (!makeMatch) {
            const match = findMake(word);
            if (match) {
                makeMatch = match;
                continue;
            }
        }

        // Collect remaining words for model matching
        remainingWords.push(word);
    }

    // Both year and make are required
    if (!year || !makeMatch) return null;

    const model = bestModelMatch(makeMatch.models, remainingWords, SIMILARITY_THRESHOLD);

    return {
        year,
        make: makeMatch.make,
        model
    };
}

// ----------------------------------------------------------------------------
// DOM Text Extraction Helpers
// ----------------------------------------------------------------------------

/**
 * Safely extracts inner text from an element in a NodeList.
 *
 * @param nodeList - The NodeList to extract from.
 * @param index - The index of the element to extract.
 * @returns The trimmed lowercase text, or null if not available.
 */
function getNodeText(nodeList: NodeListOf<Element>, index: number): string | null {
    const element = nodeList[index] as HTMLElement | undefined;
    return element?.innerText?.trim().toLowerCase() ?? null;
}

// ----------------------------------------------------------------------------
// Exported Data Extraction Functions
// ----------------------------------------------------------------------------

/**
 * Creates a DataEntry from a Facebook Marketplace listing.
 *
 * @param infoDiv - NodeList containing informational sections of the listing.
 * @param price - The listing price.
 * @param imgEl - The listing's image element.
 * @returns Filled DataEntry, or null if parsing fails.
 */
function fillFBData(
    infoDiv: NodeListOf<Element>,
    price: number,
    imgEl: HTMLImageElement
): DataEntry | null {
    // Extract text from info sections
    const titleText = getNodeText(infoDiv, 1);
    const locationText = getNodeText(infoDiv, 2);
    const odometerText = getNodeText(infoDiv, 3);

    if (!titleText) return null;

    const titleWords = titleText.split(' ');
    const parsed = parseListingTitle(titleWords);

    if (!parsed) return null;

    // Get URL from first info div's anchor ancestor
    const firstInfoDiv = infoDiv[0];
    if (!firstInfoDiv) return null;

    const anchor = getNthAncestor(firstInfoDiv, 'a', 1) as HTMLAnchorElement | null;
    const anchorUrl = anchor?.href;
    if (!anchorUrl) return null;

    // Build the data entry
    const data = createEmptyDataEntry('facebook');

    data.title = titleText;
    data.year = parsed.year;
    data.make = parsed.make;
    data.model = parsed.model;
    data.price = price;
    data.location = locationText ?? 'unknown';
    data.mileage = odometerText ? parseMileage(odometerText) : null;
    data.imageUrl = imgEl?.src ?? null;
    data.url = anchorUrl.split('?')[0] ?? anchorUrl;

    return data;
}

/**
 * Creates a DataEntry from a Craigslist listing card.
 *
 * @param card - The Craigslist card container element.
 * @returns Filled DataEntry, or null if parsing fails.
 */
function fillCLData(card: Element): DataEntry | null {
    // Extract title
    const labelEl = card.querySelector('.label') as HTMLElement | null;
    const titleText = labelEl?.innerText;
    if (!titleText) return null;

    const titleWords = titleText.toLowerCase().split(' ');
    const parsed = parseListingTitle(titleWords);

    if (!parsed) return null;

    // Extract metadata
    const metaEl = card.querySelector('.meta') as HTMLElement | null;
    const metaText = metaEl?.innerText;
    if (!metaText) return null;

    const metaData = metaText.split('\n');

    // Build the data entry
    const data = createEmptyDataEntry('craigslist');

    data.title = titleText;
    data.year = parsed.year;
    data.make = parsed.make;
    data.model = parsed.model;

    // Extract price
    const priceEl = card.querySelector('.priceinfo') as HTMLElement | null;
    data.price = getPrice(priceEl?.innerText ?? '');

    // Parse metadata based on format
    // Format can be: [source] or [source, mileage] or [source, mileage, location]
    if (metaData.length === 3) {
        const mileageStr = metaData[1];
        const locationStr = metaData[2];
        data.mileage = mileageStr ? parseMileage(mileageStr) : null;
        data.location = locationStr ?? null;
    } else if (metaData.length === 2) {
        const secondElement = metaData[1];
        if (secondElement?.match(/^\d+k?.*/)) {
            data.mileage = parseMileage(secondElement);
        } else {
            data.location = secondElement ?? null;
        }
    }

    // Extract image
    const img = card.querySelector('img');
    data.imageUrl = img?.src ?? null;

    // Extract URL
    const anchor = card.querySelector('a');
    data.url = anchor?.href ?? '';

    return data;
}

export { fillFBData, fillCLData };
