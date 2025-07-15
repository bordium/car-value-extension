const url = window.location.href;
let site: 'facebook' | 'craigslist' | null = null;

if (url.includes('facebook.com/marketplace')) {
    site = 'facebook';
} else if (url.includes('craigslist.org/search')) {
    site = 'craigslist';
}

if (site === 'facebook') {
    function injectButtons() {
        const currencyRegex = /[$€£¥]\s?\d+[,.]?\d*/;
        const priceElements = Array.from(document.querySelectorAll('span'))
            .filter((el) => currencyRegex.test(el.textContent || ''));

        priceElements.forEach(priceEl => {
            const parentSpan = priceEl.parentElement;

            // Avoid injecting multiple buttons
            if ((priceEl.nextSibling as HTMLElement).classList.contains('fbm-alt-btn')) {
                return;
            }

            // Find the closest img[alt] in the same listing card
            const card = priceEl.closest('[role="article"], [data-testid="marketplace_feed_item"]');
            if (!card) return;
            const img = card.querySelector('img[alt]');
            if (!img) return;
            const alt = img.getAttribute('alt');

            // Create button
            const btn = document.createElement('button');
            btn.textContent = 'Show Alt';
            btn.className = 'fbm-alt-btn';
            btn.style.marginLeft = '6px';
            btn.onclick = (e) => {
                e.stopPropagation();
                alert(alt || 'No alt text found');
            };

            if (priceEl.parentNode) {
                priceEl.parentNode.insertBefore(btn, priceEl.nextSibling);
            }
        });
    }

    // Initial injection
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
} else {
    console.log('Not on a supported marketplace page.');
}

