/**
 * contentData.ts
 * Data parsing functions for extracting car information from marketplace listings.
 */

import type { DataEntry } from '../shared/types';
import * as makesModelJSON from '../config/make_model.json';
import { similarity, bestModelMatch, getPrice, getNthAncestor } from './contentUtil';

type MakeModelsType = {
    [makes: string]: string[];
}

const makeModels: MakeModelsType = makesModelJSON as MakeModelsType;
const THRESHOLD = 0.4;

/**
 * Parses the title from a listing and extracts make, model, and year.
 *
 * @param title Array of words from the listing title
 * @param data DataEntry object to populate with parsed data
 */
export function parseListingTitle(title: string[], data: DataEntry) {
    let models = null;
    let year = 0;
    const year_pattern = /\b(?:\d{4}|'?\d{2})\b/;

    for (let i = 0; i < title.length; i++) {
        const element = title[i].toLowerCase();
        const yearMatch = element.match(year_pattern);

        if (yearMatch) {
            year = parseInt(yearMatch[0], 10);
            if (year >= 1900 && year <= new Date().getFullYear() + 1) {
                data.year = year;
                title[i] = '';
                continue;
            }
        }

        if (!models) {
            if (makeModels[element]) {
                models = makeModels[element];
                data.make = element;
                title[i] = '';
            } else {
                const firstChar = title[i][0];
                for (const make in makeModels) {
                    if (make[0] === firstChar) {
                        if (similarity(make, title[i]) > THRESHOLD) {
                            models = makeModels[make];
                            data.make = make;
                            title[i] = '';
                            break;
                        }
                    }
                    if (models) {
                        break;
                    }
                }
            }
        }

        if (data.year && models) {
            data.model = bestModelMatch(models, title, THRESHOLD);
        }
    }
}

/**
 * Creates a DataEntry object if the listing can be parsed, otherwise null.
 *
 * @param infoDiv Div containing all informational sections
 * @param price Price of the listing
 * @param imgEl The image of the listing
 * @returns Filled in DataEntry object
 */
export function fillFBData(infoDiv: NodeListOf<Element>, price: number, imgEl: HTMLImageElement): DataEntry | null {
    const data: DataEntry = {
        make: '',
        model: '',
        url: '',
        year: 0,
        price: 0,
        mileage: null,
        location: null,
        imageUrl: null,
        title: '',
        source: 'facebook'
    };
    const titleText = (infoDiv[1] && (infoDiv[1] as HTMLElement).innerText)
        ? (infoDiv[1] as HTMLElement).innerText.trim().toLowerCase().split(' ')
        : [];
    const locationText = (infoDiv[2] && (infoDiv[2] as HTMLElement).innerText)
        ? (infoDiv[2] as HTMLElement).innerText.trim().toLowerCase()
        : null;
    const odometerText = (infoDiv[3] && (infoDiv[3] as HTMLElement).innerText)
        ? (infoDiv[3] as HTMLElement).innerText.trim().toLowerCase()
        : null;

    if (titleText.length === 0) {
        return null;
    }

    data.title = titleText.join(' ');
    parseListingTitle(titleText, data);

    if (data.make === '' || data.year === 0) {
        return null;
    }

    data.price = price;
    data.location = locationText || 'unknown';
    data.mileage = odometerText ? parseInt(odometerText.replace(/\D/g, ''), 10) : -1;
    if (imgEl && imgEl.src) {
        data.imageUrl = imgEl.src;
    }

    const anchor = getNthAncestor(infoDiv[0], 'a', 1) as HTMLAnchorElement;
    const anchorUrl = anchor ? anchor.href : null;
    if (!anchorUrl) {
        return null;
    }

    data.url = anchorUrl.split('?')[0];

    return data;
}

/**
 * Creates a DataEntry object if the Craigslist listing can be parsed, otherwise null.
 *
 * @param card Craigslist card container
 * @returns Filled dataEntry or null if not able to be parsed.
 */
export function fillCLData(card: Element): DataEntry | null {
    const data: DataEntry = {
        make: '',
        model: '',
        url: '',
        year: 0,
        price: 0,
        mileage: null,
        location: null,
        imageUrl: null,
        title: '',
        source: 'craigslist'
    };

    const labelEl = card.querySelector('.label') as HTMLElement | null;
    if (!labelEl) {
        return null;
    }

    data.title = labelEl.innerText;

    const title = labelEl.innerText
        ? labelEl.innerText.toLowerCase().split(' ')
        : [];
    if (title.length === 0) {
        return null;
    }

    parseListingTitle(title, data);
    if (data.make === '' || data.year === 0) {
        return null;
    }

    const priceEl = card.querySelector('.priceinfo') as HTMLElement | null;
    const price = priceEl && priceEl.innerText ? priceEl.innerText : '';
    data.price = getPrice(price);

    const metaEl = card.querySelector('.meta') as HTMLElement | null;
    const metaData = metaEl && metaEl.innerText ? metaEl.innerText.split('\n') : null;
    if (!metaData) {
        return null;
    }
    if (metaData.length === 3) {
        data.mileage = parseInt(metaData[1].replace(/\D/g, ''), 10);
        data.location = metaData[2];
    } else if (metaData.length === 2) {
        if (metaData[1].match(/^\d+k?.*/)) {
            data.mileage = parseInt(metaData[1].replace(/\D/g, ''), 10);
        } else {
            data.location = metaData[1];
        }
    }

    const img = card.querySelector('img');
    if (img) {
        data.imageUrl = img.src;
    }

    const anchor = card.querySelector('a');
    if (anchor) {
        data.url = anchor.href;
    }

    return data;
}
