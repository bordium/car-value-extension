import type { DataEntry } from '../shared/types.ts'
import * as makesModelJSON from '../config/make_model.json'

const url = window.location.href; 
const makeModels: MakeModelsType = makesModelJSON as MakeModelsType;
const THRESHOLD = 0.4;


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
function createCheckmarkButton(data: DataEntry, storageKey: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.background = '#2563eb';
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
    btn.style.marginRight = '8px';
    btn.style.position = 'relative';

    let alreadyClicked = false;

    const svgNS = 'http://www.w3.org/2000/svg';
    const plusSvg = document.createElementNS(svgNS, 'svg');
    plusSvg.setAttribute('width', '20');
    plusSvg.setAttribute('height', '20');
    plusSvg.setAttribute('viewBox', '0 0 20 20');
    plusSvg.style.display = 'block';
    plusSvg.innerHTML = `
      <line x1="10" y1="5" x2="10" y2="15" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <line x1="5" y1="10" x2="15" y2="10" stroke="white" stroke-width="2" stroke-linecap="round"/>
    `;
    const checkSvg = document.createElementNS(svgNS, 'svg');
    checkSvg.setAttribute('width', '20');
    checkSvg.setAttribute('height', '20');
    checkSvg.setAttribute('viewBox', '0 0 20 20');
    checkSvg.style.display = 'none';
    checkSvg.innerHTML = `
      <polyline points="5 11 9 15 15 7" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `;
    btn.appendChild(plusSvg);
    btn.appendChild(checkSvg);

    function showChecked() {
        btn.classList.add('checked');
        btn.style.background = '#16a34a';
        plusSvg.style.display = 'none';
        checkSvg.style.display = 'block';
    }

    if (data?.url) {
        chrome.storage.local.get([storageKey], (res) => {
            const arr: DataEntry[] = Array.isArray(res[storageKey]) ? res[storageKey] : [];
            if (arr.some(item => item && item.url === data.url)) {
                alreadyClicked = true;
                showChecked();
            }
        });
    }

    btn.addEventListener('mouseenter', () => {
        btn.style.background = alreadyClicked ? '#15803d' : '#1d4ed8';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.background = alreadyClicked ? '#16a34a' : '#2563eb';
    });

    btn.addEventListener('click', () => {
        if (!data) return;
        chrome.storage.local.get([storageKey], (res) => {
            const arr: DataEntry[] = Array.isArray(res[storageKey]) ? [...res[storageKey]] : [];
            const index = arr.findIndex(item => item && item.url === data.url);

            if (index === -1) {
                // Add
                arr.push(data);
                chrome.storage.local.set({ [storageKey]: arr });
                alreadyClicked = true;
                showChecked();
                // After adding, attempt to upgrade placeholder image via polling (option 3)
                if (!data.imageUrl || data.imageUrl.startsWith('data:')) {
                    startImageUpgrade(data, storageKey);
                }
            } else {
                // Remove
                arr.splice(index, 1);
                chrome.storage.local.set({ [storageKey]: arr });
                alreadyClicked = false;
                btn.classList.remove('checked');
                btn.style.background = '#2563eb';
                plusSvg.style.display = 'block';
                checkSvg.style.display = 'none';
            }
        });
    });


    return btn;
}

// Polling approach to upgrade a placeholder (data URI) Craigslist image
function startImageUpgrade(data: DataEntry, storageKey: string) {
    const MAX_ATTEMPTS = 8; // e.g., ~4s if interval=500ms
    const INTERVAL = 500;
    let attempts = 0;

    const timer = setInterval(() => {
        attempts++;
        // Find the card again by matching anchor href
        const cards = Array.from(document.querySelectorAll('.gallery-card'));
        const card = cards.find(c => {
            const a = c.querySelector('a');
            return a && data.url && a.href === data.url;
        });
        if (card) {
            const img = card.querySelector('img');
            if (img) {
                const realSrc = img.currentSrc || img.src;
                if (realSrc && !realSrc.startsWith('data:')) {
                    chrome.storage.local.get([storageKey], (res) => {
                        const arr: DataEntry[] = Array.isArray(res[storageKey]) ? [...res[storageKey]] : [];
                        const idx = arr.findIndex(item => item && item.url === data.url);
                        if (idx !== -1 && arr[idx].imageUrl !== realSrc) {
                            arr[idx] = { ...arr[idx], imageUrl: realSrc };
                            chrome.storage.local.set({ [storageKey]: arr });
                        }
                    });
                    clearInterval(timer);
                    return;
                }
            }
        }
        if (attempts >= MAX_ATTEMPTS) {
            clearInterval(timer);
        }
    }, INTERVAL);
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
    if (title.length === 0 ) {
        return null;
    }

    parseListingTitle(title, data)
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
            // console.log(data)
            // console.log(hasModel)

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
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    window.open(kbbLink, '_blank');
                }
                const imgEl = document.createElement('img');
                imgEl.src = chrome.runtime.getURL('assets/kbb-logo.png');
                imgEl.alt = (divs[1] && (divs[1] as HTMLElement).innerText)
                    ? (divs[1] as HTMLElement).innerText.trim()
                    : '';
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
            // console.log(cards);

            // Avoid duplicate buttons
            if (card.querySelector('.cl-btn-container')) {
                return;
            }

            const data = fillCLData(card);
            if (!data) {
                return;
            }

            // Create container div for buttons
            const btnContainer = document.createElement('div');
            btnContainer.className = 'cl-btn-container';
            btnContainer.style.display = 'flex';
            btnContainer.style.alignItems = 'center';
            btnContainer.style.marginTop = '4px';
            btnContainer.style.marginBottom = '2px';
            btnContainer.style.justifyContent = 'space-between';
                btnContainer.style.width = '100%'; // allow pushing elements to right
                btnContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });

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
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    window.open(kbbLink, '_blank');
                }
                const imgEl = document.createElement('img');
                try {
                    imgEl.src = chrome?.runtime?.getURL('assets/kbb-logo.png') ?? 'assets/kbb-logo.png';
                } catch {
                    // ignore
                }
                
                imgEl.alt = data.title;
                imgEl.style.display = 'block';
                imgEl.style.width = '100%';
                imgEl.style.height = '100%';
                imgEl.style.objectFit = 'contain';
                btn.appendChild(imgEl);
                btnContainer.appendChild(btn);
                // console.log(data)
            }

            const addBtn = createCheckmarkButton(data, 'value-craigslist');
            addBtn.className = 'cl-add-btn'
                addBtn.style.marginLeft = 'auto'; // push to right edge
                addBtn.style.marginRight = '0';
            btnContainer.appendChild(addBtn);
            card.appendChild(btnContainer);
            chrome.storage.local.get(null, (result) => {
                console.log(Object.keys(result))
                console.log(Object.values(result))
            });
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
