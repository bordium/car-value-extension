import type { dataEntry } from '../shared/types.ts'
import * as makesModelJSON from '../config/make_model.json'
// import { title } from 'process';

type makeModelsType = {
    [makes: string]: string[];
}

const url = window.location.href; 
const makeModels: makeModelsType = makesModelJSON as makeModelsType;
const THRESHOLD = 0.6;

let site: 'facebook' | 'craigslist' | null = null;
let productPage: boolean = false;

if (url.includes('facebook.com/marketplace')) {
    site = 'facebook';
    if (url.includes('item')) {
        productPage = true; 
    }
} else if (url.includes('craigslist.org/search')) {
    site = 'craigslist';
    if (url.includes('.html')) {
        productPage = true; 
    }
}

/**
 * Gets the integer price from a price string.
 * 
 * @param {string} priceEl String containing the price.  
 * @returns {number|null}  Price as an integer or undefined if invalid.
 */
function getPrice(priceStr: string): number {
    // console.log('priceStr:', priceStr);
    priceStr = priceStr.replace(/\D/g, '');
    const price = parseInt(priceStr.trim(), 10) || NaN;
    
    if (isNaN(price)) {
        // console.warn('Invalid price found:', priceStr);
        return -1; // -1 indicates an invalid price
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
function findNearestImg(el: Element): HTMLImageElement | null {
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
function getNthAncestor(el: Element, selector: string, n: number): Element | null {
  let count = 0;
  let node = el.parentElement; // start one level up

  while (node) {
    if (node.matches(selector)) {
      count++;
      if (count === n) {
        return node;
      }
    }
    node = node.parentElement;
    if (!node) {
      break; // reached the top of the DOM tree
    }
  }

  return null;
}

/**
 * Compute the Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
    const dp: number[][] = Array(a.length + 1).fill(0).map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) {
        dp[i][0] = i;
    }
    for (let j = 0; j <= b.length; j++) {
        dp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return dp[a.length][b.length];
}

/**
 * Returns a similarity score between 0 and 1 (inclusive) based on Levenshtein distance.
 */
function similarity(a: string, b: string): number {
    const dist = levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length);
    return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

/**
 * Normalizes strings for similarity comparison.
 * 
 * @param s String to normalize.
 * @returns String with all non-alphanumeric characters removed and converted to lowercase.
 */
function normalizeStr(s: string): string {
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
function bestModelMatch(models: string[], titleWords: string[], threshold: number): string {
    const normalizedModels = models.map((m) => normalizeStr(m));

    for (let i = 0; i < titleWords.length; i++) {
        const w1 = normalizeStr(titleWords[i]);

        const exactIndexes = normalizedModels
        .map((nm, idx) => (nm === w1 ? idx : -1))
        .filter((idx) => idx !== -1);
        if (exactIndexes.length === 1) {
        return models[exactIndexes[0]];
        }

        if (i + 1 < titleWords.length) {
            const w2 = normalizeStr(titleWords[i + 1]);
            const phrase = w1 + w2; 

            // compute similarity against all normalizedModels
            const scores = normalizedModels.map((nm, idx) => ({
                idx,
                score: similarity(phrase, nm),
        }));
        // sort descending by score
        scores.sort((a, b) => b.score - a.score);

        const best = scores[0];
        if (best.score >= threshold) {
            return models[best.idx];
        }
        }
    }

    // no suitable match
    return '';
}

function parseListingTitle(title: string[]): dataEntry | null  {
    let models = null;
    let year = 0;
    const year_pattern = /\b(?:\d{4}|'?\d{2})\b/;

    const data: dataEntry = {
        make: '',
        model: '',
        url: '',
        source: null,
        title:  title.join(' '),
        year: 0,
        price: 0
    }; 

    for (let i = 0; i < title.length; i++) {
        const element = title[i].toLowerCase();
        const yearMatch = element.match(year_pattern) || null;

        if (yearMatch) {
            year = parseInt(yearMatch[0], 10);
            if (year >= 1900 && year <= new Date().getFullYear() + 1) {
                data.year = year;
                // console.log('year:', year);
                title[i] = ''; // Clear year from title
                continue
            }
        }

        if (!models && makeModels[element]) {
            models = makeModels[element];
            data.make = element; 
            title[i] = ''; // Clear make from title
        }

        if (data.year && models) {
            data.model = bestModelMatch(models, title, THRESHOLD);
        }
    }

    if (data.make === '' || data.year === 0) {
        return null;
    }

    return data;
}


if (site === 'facebook') {
    function injectButtons() {
        const currencyRegex = /^[$€£¥₹₽₩₪₫฿₴₦]\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$/;
        const priceElements = Array.from(document.querySelectorAll('span'))
            .filter((el) => currencyRegex.test(el.innerHTML.trim()))

        priceElements.forEach((priceEl) => {
            const divs = getNthAncestor(priceEl, 'div', 3)?.querySelectorAll(':scope > div');
            const price = getPrice(priceEl.innerHTML.trim());
            if (price < 500) {
                console.log('Low price detected, skipping button injection:', price);
                return; // low price indicates parts
            }
            console.log('child span:', priceEl);
            console.log('divs: ', divs)

            if (!divs || divs.length < 1) {
                console.log('No parent div found for price element:', priceEl);
                return;
            }

            const buttonSpan = divs[0].querySelector(':scope > span'); // selects price row to place button 
            console.log(buttonSpan);

            if (!buttonSpan || buttonSpan.querySelector('.fbm-alt-btn')) {
                return;
            }

            if (!productPage) {
                const titleText = divs[1] ? (divs[1] as HTMLElement).innerText.trim().toLowerCase().split(' ') : [];
                if (titleText.length === 0) {
                    return;
                }

                const data = parseListingTitle(titleText);
                if (!data) {
                    return;
                }

                const locationText = divs[2] ? (divs[2] as HTMLElement).innerText.trim().toLowerCase() : null;
                if (divs.length > 3) {
                    const odometerText = divs[3] ? (divs[3] as HTMLElement).innerText.trim().toLowerCase() : null;
                    data.mileage = odometerText ? parseInt(odometerText.replace(/\D/g, ''), 10) : -1;
                }

                data.source = 'facebook';
                data.price = price;
                data.location = locationText || 'unknown';
                const img = findNearestImg(priceEl); 
                console.log('image:',img);
                const kbbLink = `https://www.kbb.com/${data.make}/${data.model}/${data.year}/`;

                const btn = document.createElement('button');
                btn.className = 'fbm-alt-btn';
                btn.style.marginLeft = '5px';
                btn.style.background = '#10105c';
                btn.style.borderRadius = '10%';
                btn.style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)';
                btn.style.border = '#101080 solid 1px';
                btn.style.padding = '0';
                btn.style.cursor = 'pointer';
                btn.style.height = '1.50rem';
                btn.style.aspectRatio = '2.5 / 1';
                btn.style.width = 'auto';
                btn.style.display = 'inline-block';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    window.open(kbbLink, '_blank');
                }

                const imgEl = document.createElement('img');
                imgEl.src = chrome.runtime.getURL('assets/kbb-logo.png');
                imgEl.alt = (divs[1] as HTMLElement).innerText.trim();
                imgEl.style.display = 'block';
                imgEl.style.width = '100%';
                imgEl.style.height = '100%';
                imgEl.style.objectFit = 'contain';
                btn.appendChild(imgEl);
                buttonSpan.appendChild(btn);
            } 
        });
    }

    injectButtons();
    // MutationObserver to inject buttons for new listings
    let debounceTimeout: number | undefined;
    const observer = new MutationObserver(() => {
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }
        debounceTimeout = window.setTimeout(() => {
            injectButtons();
        }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });

} else if (site === 'craigslist') {
    const titles = Array.from(document.querySelectorAll('a.result-title.hdrlnk'))
        .map(el => el.textContent)
        .filter(text => !!text);

    console.log('Craigslist listing titles:', titles);
} 
