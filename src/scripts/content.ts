import type { dataEntry } from '../shared/types.ts'
import * as carMakesJSON from '../config/makes.json'
import * as carModelsJSON from '../config/models.json'
// import { title } from 'process';

type MakesType = {
    [makes: string]: string;
};

type ModelsType = {
    [makes: string]: string[];
}

const url = window.location.href; 
const carMakes: MakesType = carMakesJSON as MakesType;
const carModels: ModelsType = carModelsJSON as ModelsType;
console.log('carMakes:', carModels);

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
    const regex = /[0-9.,]+/g;
    const match = priceStr.match(regex)?.[0];
    const price = match ? parseInt(match.trim(), 10) : NaN;
    
    if (isNaN(price)) {
        console.warn('Invalid price found:', priceStr);
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
  }

  return null;
}

function parseListingTitle(title: string[]): dataEntry | null  {
        let models: string[] | null = null;
        let year = 0;
        const data: dataEntry = {
            make: '',
            model: '',
            url: '',
            source: null,
            year: 0,
            price: 0,
        }; 

        for (const rawElement of title) {
            const element = rawElement.toLowerCase();
            const yearMatch = element.match(/\b(?:\d{4}|'?\d{2})\b/) || null;

            if (carMakes[element]) {
                const make = carMakes[element];
                data.make = make;
                models = carModels[make];
                console.log('make:', make);
                continue;
            } 

            if (yearMatch) {
                if (yearMatch[0].length === 3) {
                    year = parseInt(`20${yearMatch[0]}`, 10); // Convert '25 to 2025
                } else {
                    year = parseInt(yearMatch[0], 10);
                }
                data.year = year;
                console.log('year:', year);
                continue;
            }

            const model = element.toLowerCase();
            console.log('model:', model);

            if (models) {
                console.log('models:', models);
            }
        }

        if (data.make === '') {
            return null;
        }
        return data;
}


if (site === 'facebook') {
    function injectButtons() {
        const currencyRegex = /^[$€£¥]\s?[0-9]{1,3}?(?:[,.]?\d{3})*(?:[,.]\d{2})?$/;
        const priceElements = Array.from(document.querySelectorAll('span'))
            .filter((el) => currencyRegex.test(el.innerHTML.trim()));

        priceElements.forEach((priceEl) => {
            // console.log('child span:', priceEl);
            const divs = getNthAncestor(priceEl, 'div', 3)?.querySelectorAll(':scope > div');
            console.log(divs)

            if (!divs || divs.length < 1) {
                console.warn('No parent div found for price element:', priceEl);
                return;
            }

            const buttonSpan = divs[0].querySelector(':scope > span'); // selects price span
            // console.log('button span:', buttonSpan);

            if (!productPage) {
                const titleText = divs[1] ? (divs[1] as HTMLElement).innerText.trim().toLowerCase().split(' ') : '';
                if (!titleText || titleText.length === 0) {
                    return;
                }

                const data = parseListingTitle(titleText);

                if (!data) {
                    return;
                }

                data.source = 'facebook';

                const locationText = divs[2] ? (divs[2] as HTMLElement).innerText.trim().toLowerCase() : '';
                if (divs.length > 3) {
                    const odometerText = divs[3] ? (divs[3] as HTMLElement).innerText.trim().toLowerCase() : '';
                    console.log('odometerText:', odometerText);
                }
                console.log('locationText:', locationText);
            } 

            if (!buttonSpan) {
                console.warn('No parent span found for price element:', priceEl);
                return;
            }

            const price = getPrice(priceEl.innerHTML.trim());
            console.log('price:', price);

            // Avoid injecting multiple buttons
            if (buttonSpan && buttonSpan.querySelector('.fbm-alt-btn')) {
                return;
            }

            // Extracts image and alt text
            const img = findNearestImg(priceEl); 
            console.log('image:',img);
            if (!img) return;

            const alt = img.getAttribute('alt');
            console.log('alt:',alt);
            // Create button

            const btn = document.createElement('button');
            btn.textContent = 'Show Alt';
            btn.className = 'fbm-alt-btn';
            btn.style.marginLeft = '6px';
            btn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                alert(alt || 'No alt text found');
            };

            if (buttonSpan) {
                // console.log('Appending button to parent span:', buttonSpan);
                buttonSpan.appendChild(btn);
            }
        });
    }

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
