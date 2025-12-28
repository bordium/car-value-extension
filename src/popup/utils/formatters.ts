/**
 * formatters.ts
 * Display formatting functions for DataEntry fields.
 */

import { KBB_BASE_URL, KBB_LOGO_PATH } from '../constants';

/**
 * Formats a price as a currency string.
 *
 * @param price - The price value.
 * @returns Formatted price string (e.g., "$25,000") or "N/A" if invalid.
 */
export function formatPrice(price: number | null | undefined): string {
    if (price == null || price <= 0) {
        return 'N/A';
    }
    return `$${price.toLocaleString()}`;
}

/**
 * Formats mileage for display.
 *
 * @param mileage - The mileage value.
 * @returns Formatted mileage string (e.g., "50.0k mi") or "N/A" if invalid.
 */
export function formatMileage(mileage: number | null | undefined): string {
    if (mileage == null || mileage < 0) {
        return 'N/A';
    }

    if (mileage >= 1000) {
        return `${(mileage / 1000).toFixed(1)}k mi`;
    }

    return `${mileage.toLocaleString()} mi`;
}

/**
 * Formats location for display.
 *
 * @param location - The location string.
 * @returns The location or "Unknown" if empty/null.
 */
export function formatLocation(location: string | null | undefined): string {
    if (!location || location.trim().length === 0) {
        return 'Unknown';
    }
    return location;
}

/**
 * Formats source name for display (capitalized).
 *
 * @param source - The source identifier.
 * @returns Capitalized source name (e.g., "Facebook") or "N/A" if null.
 */
export function formatSource(source: string | null | undefined): string {
    if (!source) {
        return 'N/A';
    }
    return source.charAt(0).toUpperCase() + source.slice(1);
}

/**
 * Builds a Kelley Blue Book URL for a specific vehicle.
 *
 * @param make - The car make.
 * @param model - The car model.
 * @param year - The car year.
 * @returns The KBB URL, or empty string if any parameter is missing.
 */
export function buildKbbUrl(make: string, model: string, year: number): string {
    if (!make || !model || !year) {
        return '';
    }
    return `${KBB_BASE_URL}/${make}/${model}/${year}/`;
}

/**
 * Gets the URL for the KBB logo asset.
 *
 * @returns The full URL to the KBB logo.
 */
export function getKbbLogoUrl(): string {
    try {
        return chrome?.runtime?.getURL(KBB_LOGO_PATH) ?? KBB_LOGO_PATH;
    } catch {
        return KBB_LOGO_PATH;
    }
}
