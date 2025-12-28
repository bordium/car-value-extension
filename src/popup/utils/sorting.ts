/**
 * sorting.ts
 * Sorting types and utilities for DataEntry arrays.
 * Ready for use when implementing sort UI.
 */

import type { DataEntry } from '../../shared/types';

/** Fields that can be sorted */
export type SortField = 'price' | 'mileage' | 'year' | 'make' | 'location';

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Configuration for sorting */
export interface SortConfig {
    field: SortField;
    direction: SortDirection;
}

/**
 * Compares two values for sorting, handling null/undefined.
 * Null values are sorted to the end regardless of direction.
 */
function compareValues<T>(a: T | null | undefined, b: T | null | undefined, direction: SortDirection): number {
    // Handle null/undefined - always push to end
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    let result: number;

    if (typeof a === 'string' && typeof b === 'string') {
        result = a.localeCompare(b);
    } else if (typeof a === 'number' && typeof b === 'number') {
        result = a - b;
    } else {
        result = 0;
    }

    return direction === 'asc' ? result : -result;
}

/**
 * Sorts an array of DataEntry objects by the specified field and direction.
 * Returns a new sorted array (does not mutate the original).
 *
 * @param entries - The entries to sort.
 * @param config - The sort configuration (field and direction).
 * @returns A new sorted array.
 */
export function sortEntries(entries: DataEntry[], config: SortConfig): DataEntry[] {
    const { field, direction } = config;

    return [...entries].sort((a, b) => {
        const aValue = a[field];
        const bValue = b[field];

        return compareValues(aValue, bValue, direction);
    });
}

/**
 * Toggles sort direction, or returns 'asc' if switching to a new field.
 *
 * @param currentConfig - The current sort configuration, or null if none.
 * @param newField - The field to sort by.
 * @returns The new sort configuration.
 */
export function toggleSort(currentConfig: SortConfig | null, newField: SortField): SortConfig {
    if (currentConfig?.field === newField) {
        return {
            field: newField,
            direction: currentConfig.direction === 'asc' ? 'desc' : 'asc'
        };
    }

    return {
        field: newField,
        direction: 'asc'
    };
}
