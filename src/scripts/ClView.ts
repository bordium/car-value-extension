/**
 * ClView.ts
 * View class for Craigslist listings.
 */

import ContentView from './contentView';
import { fillCLData } from './contentData';

/**
 * ClView handles button injection for Craigslist listings.
 */
export default class ClView extends ContentView {
    constructor(productPage: boolean) {
        super('craigslist', productPage);
    }

    /**
     * Injects KBB and checkmark buttons on Craigslist listings.
     */
    protected injectButtons() {
        const cards = Array.from(document.querySelectorAll('.gallery-card'));
        cards.forEach((card) => {
            if (card.querySelector('.cl-btn-container')) {
                return;
            }

            const data = fillCLData(card);
            if (!data) {
                return;
            }

            const btnContainer = document.createElement('div');
            btnContainer.className = 'cl-btn-container';
            btnContainer.style.display = 'flex';
            btnContainer.style.alignItems = 'center';
            btnContainer.style.marginTop = '4px';
            btnContainer.style.marginBottom = '2px';
            btnContainer.style.justifyContent = 'space-between';
            btnContainer.style.width = '100%';
            btnContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });

            const hasModel = (data.model !== '');
            if (hasModel) {
                const kbbBtn = this.createKbbButton(data, 'cl-alt-btn');
                btnContainer.appendChild(kbbBtn);
            }

            const addBtn = this.createCheckmarkButton(data, 'value-craigslist');
            addBtn.className = 'cl-add-btn';
            addBtn.style.marginLeft = 'auto';
            addBtn.style.marginRight = '0';
            btnContainer.appendChild(addBtn);
            card.appendChild(btnContainer);
            chrome.storage.local.get(null, (result) => {
                console.log(Object.keys(result));
                console.log(Object.values(result));
            });
        });
    }

    /**
     * Initializes the Craigslist view and sets up MutationObserver.
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
