const url = window.location.href;
let site: 'facebook' | 'craigslist' | null = null;

if (url.includes('facebook.com/marketplace')) {
    site = 'facebook';
} else if (url.includes('craigslist.org/search')) {
    site = 'craigslist';
}

/**
 * Gets the integer price from a price string.
 * 
 * @param priceEl 
 * @returns price as an integer or undefined if invalid.
 */
function getPrice(priceStr: string): number | null {
    console.log('priceStr:', priceStr);
    const regex = /[0-9.,]+/g;
    const match = priceStr.match(regex)?.[0];
    const price = match ? parseInt(match.trim(), 10) : NaN;
    
    if (isNaN(price)) {
        console.warn('Invalid price found:', priceStr);
        return null;
    }

    return price;
}

/**
 * Start with el and traverse up the DOM tree to
 * find the nearest <img> element. If no <img> is found,
 * keep looking in parent elements.
 * @param el 
 * @returns HTMLImageElement or null if not found. 
 */
function findNearestImg(el: Element): HTMLImageElement | null {
  let ancestor = el.parentElement;
  while (ancestor) {
    // look for any <img> inside this ancestor
    const img = ancestor.querySelector<HTMLImageElement>('img');
    if (img) return img;

    ancestor = ancestor.parentElement;
  }
  return null;
}

if (site === 'facebook') {
    function injectButtons() {
        const currencyRegex = /^[$€£¥]\s?\d{1,3}(?:[,.]\d{3})*(?:[,.]\d{2})?$/;
        const priceElements = Array.from(document.querySelectorAll('span'))
            .filter((el) => currencyRegex.test(el.innerHTML.trim()));

        priceElements.forEach((priceEl) => {
            const targetSpan = priceEl.closest("div")?.querySelector(':scope > span'); // Accounts for discount span
            console.log('child span:', priceEl);
            // console.log('parent span:', targetSpan);

            if (!targetSpan) {
                console.warn('No parent span found for price element:', priceEl);
                return;
            }

            const price = getPrice(priceEl.innerHTML.trim());
            console.log('price:', price);

            // Avoid injecting multiple buttons
            if (targetSpan && targetSpan.querySelector('.fbm-alt-btn')) {
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

            if (targetSpan) {
                console.log('Appending button to parent span:', targetSpan);
                targetSpan.appendChild(btn);
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
} else {
    console.log('Not on a supported marketplace page.');
}

