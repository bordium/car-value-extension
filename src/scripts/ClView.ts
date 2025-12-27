/**
 * ClView.ts
 * View class for Craigslist listings.
 */

import ContentView from './contentView';
import { fillCLData } from './contentData';
import type { DataEntry } from '@/shared/types';

/**
 * ClView handles button injection for Craigslist listings.
 */
export default class ClView extends ContentView {
    constructor(productPage: boolean) {
        super('craigslist', productPage);
    }

    private createButtonContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'cl-btn-container';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginTop = '4px';
        container.style.marginBottom = '2px';
        container.style.justifyContent = 'space-between';
        container.style.width = '100%';
        container.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
        });
        return container;
    }

    private getCardData(card: HTMLElement): DataEntry | null {
        if (card.querySelector('.cl-btn-container')) {
            return null;
        }

        const data = fillCLData(card);
        if (!data) {
            return null;
        }

        return data;
    }

    private injectButton(card: HTMLElement, data: DataEntry): void {
        const btnContainer = this.createButtonContainer();

        const hasModel = (data.model !== '');
        if (hasModel) {
            const kbbBtn = this.createKbbButton(data, 'cl-alt-btn');
            btnContainer.appendChild(kbbBtn);
        }

        // Add the checkmark button
        const addBtn = this.createCheckmarkButton(data, 'value-craigslist');
        addBtn.className = 'cl-add-btn';
        addBtn.style.marginLeft = 'auto';
        addBtn.style.marginRight = '0';
        btnContainer.appendChild(addBtn);

        // Append the button container to the card
        card.appendChild(btnContainer);
        chrome.storage.local.get(null, (result) => {
            console.log(Object.keys(result));
            console.log(Object.values(result));
        });
    }

    /**
     * Injects KBB and checkmark buttons on Craigslist listings.
     */
    protected injectButtons() {
        const cards = Array.from(document.querySelectorAll('.gallery-card'));
        cards.forEach((card) => {
            const cardEl = card as HTMLElement;
            const data = this.getCardData(cardEl);
            if (data) {
                this.injectButton(cardEl, data);
            }
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
