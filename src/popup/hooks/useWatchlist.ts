/**
 * useWatchlist.ts
 * Custom hook for managing watchlist data with Chrome storage sync.
 */

import { useEffect, useState, useCallback } from 'react';
import type { DataEntry } from '../../shared/types';
import { checkUrl } from '../../shared/utils';
import { STORAGE_KEY } from '../constants';

interface UseWatchlistResult {
    /** The current watchlist entries */
    entries: DataEntry[];
    /** Whether the initial load is in progress */
    isLoading: boolean;
    /** Remove an entry by URL */
    removeEntry: (url: string) => void;
}

/**
 * Validates and sanitizes a single entry's URLs.
 * Returns the updated entry and whether any changes were made.
 */
async function sanitizeEntry(entry: DataEntry): Promise<{ entry: DataEntry; changed: boolean }> {
    let changed = false;
    const updated = { ...entry };

    // Validate imageUrl
    if (updated.imageUrl && typeof updated.imageUrl === 'string' && updated.imageUrl.trim().length > 0) {
        try {
            const ok = await checkUrl(updated.imageUrl);
            if (!ok) {
                updated.imageUrl = null;
                changed = true;
            }
        } catch {
            updated.imageUrl = null;
            changed = true;
        }
    }

    // Validate url
    if (updated.url && updated.url.trim().length > 0) {
        try {
            const ok = await checkUrl(updated.url);
            if (!ok) {
                updated.url = '';
                changed = true;
            }
        } catch {
            updated.url = '';
            changed = true;
        }
    }

    return { entry: updated, changed };
}

/**
 * Hook for managing watchlist data synchronized with Chrome storage.
 * Handles loading, sanitization, and removal of entries.
 */
export function useWatchlist(): UseWatchlistResult {
    const [entries, setEntries] = useState<DataEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial data from storage
    useEffect(() => {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
            const data = result[STORAGE_KEY];
            setEntries(Array.isArray(data) ? data : []);
            setIsLoading(false);
        });

        // Listen for storage changes
        const onChanged = (
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: string
        ) => {
            if (areaName === 'local' && changes[STORAGE_KEY]) {
                const newValue = changes[STORAGE_KEY].newValue;
                setEntries(Array.isArray(newValue) ? newValue : []);
            }
        };

        chrome.storage.onChanged.addListener(onChanged);
        return () => chrome.storage.onChanged.removeListener(onChanged);
    }, []);

    // Sanitize entries when data changes
    useEffect(() => {
        if (entries.length === 0) return;

        let mounted = true;

        (async () => {
            const results = await Promise.all(entries.map(sanitizeEntry));
            const anyChanged = results.some((r) => r.changed);

            if (mounted && anyChanged) {
                const sanitized = results.map((r) => r.entry);
                setEntries(sanitized);

                try {
                    chrome.storage.local.set({ [STORAGE_KEY]: sanitized });
                } catch {
                    // Ignore if extension context invalid
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, [entries]);

    // Remove an entry by URL
    const removeEntry = useCallback((url: string) => {
        if (!url) return;

        chrome.storage.local.get(STORAGE_KEY, (res) => {
            const arr: DataEntry[] = Array.isArray(res[STORAGE_KEY]) ? res[STORAGE_KEY] : [];
            const filtered = arr.filter((item) => item?.url !== url);
            chrome.storage.local.set({ [STORAGE_KEY]: filtered });
        });
    }, []);

    return { entries, isLoading, removeEntry };
}
