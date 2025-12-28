/**
 * content.ts
 * Main entry point for the content script that runs on marketplace pages.
 */

import type { SiteName } from '../shared/types';
import FbView from './view/FbView';
import ClView from './view/ClView';

/**
 * Content class serves as the entry point for the content script.
 * Determines the site and initializes the appropriate view.
 */
class Content {
    url: string;
    view: FbView | ClView | null;

    constructor() {
        this.url = window.location.href;
        this.view = this.createView();
    }

    /**
     * Determines the site based on the current URL.
     *
     * @param url Current site URL
     * @returns Object with site (facebook, craigslist, null) and productPage
     */
    private determineSite(url: string): { site: SiteName; productPage: boolean } {
        if (url.includes('facebook.com/marketplace')) {
            if (url.includes('item')) {
                return { site: 'facebook', productPage: true };
            }
            return { site: 'facebook', productPage: false };
        } else if (url.includes('craigslist.org/search')) {
            if (url.includes('.html')) {
                return { site: 'craigslist', productPage: true };
            }
            return { site: 'craigslist', productPage: false };
        }
        return { site: null, productPage: false };
    }

    /**
     * Creates the appropriate view based on the detected site.
     *
     * @returns FbView, ClView, or null if not a supported site
     */
    private createView(): FbView | ClView | null {
        const { site, productPage } = this.determineSite(this.url);

        if (site === 'facebook') {
            return new FbView(productPage);
        } else if (site === 'craigslist') {
            return new ClView(productPage);
        }

        return null;
    }

    /**
     * Initializes the appropriate view if available.
     */
    init() {
        if (this.view) {
            this.view.init();
        }
    }
}

const injector = new Content();
injector.init();
