import type { DataEntry } from '../shared/types.ts'
import * as makesModelJSON from '../config/make_model.json'

const url = window.location.href; 
const makeModels: MakeModelsType = makesModelJSON as MakeModelsType;
const THRESHOLD = 0.6;


type MakeModelsType = {
    [makes: string]: string[];
}


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
 * Generates a checkmark button.
 * 
 * @returns {HTMLButtonElement} that allows users to add a listing into their tracker
 */
function createCheckmarkButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.background = '#16a34a'; // green-600
    btn.style.border = 'none';
    btn.style.borderRadius = '50%';
    btn.style.width = '1.5rem';
    btn.style.height = '1.5rem';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'background 0.2s';
    btn.style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)';
    btn.style.marginLeft = '8px';
    btn.style.position = 'relative';

    // Checkmark SVG
    const svgNS = 'http://www.w3.org/2000/svg';
    const checkSvg = document.createElementNS(svgNS, 'svg');
    checkSvg.setAttribute('width', '20');
    checkSvg.setAttribute('height', '20');
    checkSvg.setAttribute('viewBox', '0 0 20 20');
    checkSvg.style.display = 'block';
    checkSvg.innerHTML = `
      <polyline points="5 11 9 15 15 7" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `;

    btn.appendChild(checkSvg);

    // Hover effect: darken green
    btn.addEventListener('mouseenter', () => {
        btn.style.background = '#15803d'; // darker green
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.background = '#16a34a';
    });

    return btn;
}

/**
 * Gets the integer price from a price string.
 * 
 * @param {string} priceStr String containing the price.  
 * @returns {number}        Price as an integer or undefined if invalid.
 */
function getPrice(priceStr: string): number {
    // console.log('priceStr:', priceStr);
    priceStr = priceStr.replace(/\D/g, '');
    const price = parseInt(priceStr.trim(), 10) || NaN;
    
    if (isNaN(price)) {
        // console.warn('Invalid price found:', priceStr);
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
 * 
 * @param {string} a word that generates rows
 * @param {string} b word that generates columns
 * 
 * @return {number} edit distance between two strings
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
 * 
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

/**
 * Parses the title from a listing and extracts make, model, and year.
 * 
 * @param title Array of words from the listing title.
 * @returns DataEntry object with parsed make, model, year, or null.
 */
function parseListingTitle(title: string[], data: DataEntry) {
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
                title[i] = ''; // Clear year from title
                continue
            }
        }

        if (!models) {
            if (makeModels[element]) {
                models = makeModels[element];
                data.make = element;
                title[i] = ''; // Clear make from title
            } else {
                // Try fuzzy match on makes with same starting character
                const firstChar = title[i][0];
                for (const make in makeModels) {
                    if (make[0] === firstChar) {
                        if (similarity(make, title[i]) > THRESHOLD) {
                            models = makeModels[make];
                            data.make = make;
                            title[i] = ''; // Clear make from title
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
function fillFBData(infoDiv: NodeListOf<Element>, price: number, imgEl: HTMLImageElement): DataEntry | null {
    const data: DataEntry = {
        make: '',
        model: '',
        url: '',
        year: 0,
        price: 0,
        mileage: -1,
        location: '',
        imageUrl: '',
        title: '',
        source: 'facebook'
    }; 
    const titleText = infoDiv[1] ? (infoDiv[1] as HTMLElement).innerText.trim().toLowerCase().split(' ') : [];
    const locationText = infoDiv[2] ? (infoDiv[2] as HTMLElement).innerText.trim().toLowerCase() : null;
    const odometerText = infoDiv[3] ? (infoDiv[3] as HTMLElement).innerText.trim().toLowerCase() : null;

    if (titleText.length === 0) {
        return null;
    }

    data.title = titleText.join(' ')
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
        return null
    }

    data.url = anchorUrl.split('?')[0] // Selects only necessary listing url

    return data;
} 

/**
 * 
 * @param card Craigslist card container
 * @returns Filled dataEntry or null if not able to be parsed.
 */
function fillCLData(card: Element): DataEntry | null {
    const data: DataEntry = {
        make: '',
        model: '',
        url: '',
        year: 0,
        price: 0,
        mileage: -1,
        location: '',
        imageUrl: '',
        title: '',
        source: 'craigslist'
    }; 

    const title = (card.querySelector('.label') as HTMLElement).innerText.toLowerCase().split(' ');
    if (title.length === 0 ) {
        return null;
    }

    parseListingTitle(title, data)
    if (data.make === '' || data.year === 0) {
        return null;
    }

    const price = (card.querySelector('.priceinfo') as HTMLElement).innerText;
    if (!price || price === 'free') {
        return null;
    }
    data.price = getPrice(price);

    const metaData = (card.querySelector('.meta') as HTMLElement).innerText.split('\n');
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
            data.location = metaData[1]
        }
    }

    const img = card.querySelector('img') 
    if (img) {
        data.imageUrl = img.src
    }

    const anchor = card.querySelector('a');
    if (anchor) {
        data.url = anchor.href;
    }

    return data;
}



if (site === 'facebook') {
    function injectFBButtons() {
        if (productPage) {
            return;
        }

        const currencyRegex = /^[$€£¥₹₽₩₪₫฿₴₦]\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$/;
        const priceElements = Array.from(document.querySelectorAll('span'))
            .filter((el) => currencyRegex.test(el.innerHTML.trim()))

        priceElements.forEach((priceEl) => {
            const divs = getNthAncestor(priceEl, 'div', 3)?.querySelectorAll(':scope > div');
            if (!divs || divs.length < 1) {
                return;
            }

            const buttonSpan = divs[0] ? divs[0].querySelector(':scope > span') : null; // Selects price row 
            if (!buttonSpan || buttonSpan.querySelector('.fbm-alt-btn')) {
                return null; // No repeat buttons
            }

            const price = getPrice(priceEl.innerHTML.trim());
            if (price < 500) {
                return; // low price indicates parts/or other non-vehicle item
            }

            const data = fillFBData(divs, price, findNearestImg(priceEl) as HTMLImageElement); 
            if (!data) {
                return;
            }

            const hasModel: boolean = (data.model !== '');
            console.log(data)
            console.log(hasModel)

            // Creates KBB buttons
            if (hasModel) {
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

    injectFBButtons();
    // MutationObserver to inject buttons for new listings
    let debounceTimeout: number | undefined;
    const observer = new MutationObserver(() => {
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }
        debounceTimeout = window.setTimeout(() => {
            injectFBButtons();
        }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });

} else if (site === 'craigslist') {
    function injectCLButtons() {
        const cards = Array.from(document.querySelectorAll('.gallery-card'));
        cards.forEach((card) => {
            console.log(cards);
            // Avoid duplicate button
            if (card.querySelector('.cl-alt-btn')) {
                return;
            }

            const data = fillCLData(card);
            if (!data) {
                return;
            }
            
            const hasModel = (data.model !== '')
            if (hasModel) {
                const kbbLink = `https://www.kbb.com/${data.make}/${data.model}/${data.year}/`;
                const btn = document.createElement('button');
                btn.className = 'cl-alt-btn';
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
                imgEl.alt = data.title;
                imgEl.style.display = 'block';
                imgEl.style.width = '100%';
                imgEl.style.height = '100%';
                imgEl.style.objectFit = 'contain';
                btn.appendChild(imgEl);
                card.appendChild(btn);
                console.log(data)
            }
            
            const addBtn = createCheckmarkButton();
            addBtn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                await chrome.storage.local.set({ craigslist: data })
                }
            card.appendChild(addBtn);
        });
    }

    injectCLButtons();

    // MutationObserver to inject buttons for new listings
    let debounceTimeout: number | undefined;
    const observer = new MutationObserver(() => {
        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }
        debounceTimeout = window.setTimeout(() => {
            injectCLButtons();
        }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
} 
