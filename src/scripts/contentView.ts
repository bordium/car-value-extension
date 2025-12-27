/**
 * contentView.ts
 * Base class for marketplace listing views with shared functionality.
 */

import type { DataEntry, SiteName } from '../shared/types';

/**
 * Base ContentView class with shared functionality for marketplace listings.
 * Extended by specific marketplace implementations (FbView, ClView).
 */
export default abstract class ContentView {
    site: SiteName;
    productPage: boolean;

    constructor(site: SiteName, productPage: boolean) {
        this.site = site;
        this.productPage = productPage;
    }

    /**
     * Generates a checkmark button that allows users to add a listing into their tracker.
     *
     * @param data DataEntry object for the listing
     * @param storageKey Chrome storage key for persistence
     * @returns HTMLButtonElement configured with click handlers and state management
     */
    protected createCheckmarkButton(data: DataEntry, storageKey: string): HTMLButtonElement {
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
                    arr.push(data);
                    chrome.storage.local.set({ [storageKey]: arr });
                    alreadyClicked = true;
                    showChecked();
                    if (!data.imageUrl || data.imageUrl.startsWith('data:')) {
                        this.startImageUpgrade(data, storageKey);
                    }
                } else {
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

    /**
     * Polling approach to upgrade a placeholder (data URI) Craigslist image.
     * Periodically checks if the image has loaded and updates storage with the real URL.
     *
     * @param data DataEntry object for the listing
     * @param storageKey Chrome storage key for persistence
     */
    protected startImageUpgrade(data: DataEntry, storageKey: string) {
        const MAX_ATTEMPTS = 8;
        const INTERVAL = 500;
        let attempts = 0;

        const timer = setInterval(() => {
            attempts++;
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
                            if (arr[idx] && idx !== -1 && arr[idx].imageUrl !== realSrc) {
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
     * Creates a KBB button for a listing.
     *
     * @param data DataEntry object with car information
     * @param className CSS class name for the button
     * @returns HTMLButtonElement configured to open KBB link
     */
    protected createKbbButton(data: DataEntry, className: string): HTMLButtonElement {
        const kbbLink = `https://www.kbb.com/${data.make}/${data.model}/${data.year}/`;
        const btn = document.createElement('button');
        btn.className = className;
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
        };
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
        return btn;
    }

    /**
     * Abstract method to inject buttons into listings.
     * Must be implemented by subclasses.
     */
    protected abstract injectButtons(): void;

    /**
     * Initializes the view and starts the MutationObserver.
     */
    abstract init(): void;
}
