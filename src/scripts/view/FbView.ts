/**
 * FbView.ts
 * View class for Facebook Marketplace listings.
 */

import ContentView from './contentView';
import { fillFBData } from '../util/dataParse';
import { getPrice, findNearestImg, getNthAncestor } from '../util/helpers';

/**
 * FbView handles button injection for Facebook Marketplace listings.
 */
export default class FbView extends ContentView {
    constructor(productPage: boolean) {
        super('facebook', productPage);
    }

    /**
     * Injects KBB and checkmark buttons on Facebook Marketplace listings.
     */
    protected injectButtons() {
        if (this.productPage) {
            return;
        }

        const currencyRegex = /^[$€£¥₹₽₩₪₫฿₴₦]\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?$/;
        const priceElements = Array.from(document.querySelectorAll('span'))
            .filter((el) => currencyRegex.test(el.innerHTML.trim()));

        priceElements.forEach((priceEl) => {
            const divs = getNthAncestor(priceEl, 'div', 3)?.querySelectorAll(':scope > div');
            if (!divs || divs.length < 1) {
                return;
            }

            const buttonSpan = divs[0] ? divs[0].querySelector(':scope > span') : null;
            if (!buttonSpan || buttonSpan.querySelector('.fbm-alt-btn')) {
                return;
            }

            const price = getPrice(priceEl.innerHTML.trim());
            if (price < 500) {
                return;
            }

            const data = fillFBData(divs, price, findNearestImg(priceEl) as HTMLImageElement);
            if (!data) {
                return;
            }

            const hasModel: boolean = (data.model !== '');

            if (hasModel) {
                const kbbBtn = this.createKbbButton(data, 'fbm-alt-btn');
                kbbBtn.onclick = (e) => {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    const kbbLink = `https://www.kbb.com/${data.make}/${data.model}/${data.year}/`;
                    window.open(kbbLink, '_blank');
                };

                const imgEl = kbbBtn.querySelector('img');
                if (imgEl) {
                    imgEl.src = chrome.runtime.getURL('assets/kbb-logo.png');
                    imgEl.alt = (divs[1] && (divs[1] as HTMLElement).innerText)
                        ? (divs[1] as HTMLElement).innerText.trim()
                        : '';
                }

                buttonSpan.appendChild(kbbBtn);
            }
        });
    }

    /**
     * Initializes the Facebook Marketplace view and sets up MutationObserver.
     */
    init() {
        this.injectButtons();

        let debounceTimeout: number | undefined;
        const observer = new MutationObserver(() => {
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
            debounceTimeout = window.setTimeout(() => {
                this.injectButtons();
            }, 500);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}
