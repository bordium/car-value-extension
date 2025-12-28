/**
 * Popup.tsx
 * Main popup component for the watchlist.
 */

import { useWatchlist } from './hooks/useWatchlist';
import { EmptyState } from './components/EmptyState';
import { EntryCard } from './components/EntryCard';

/**
 * Main popup component that displays the user's watchlist.
 */
export function Popup() {
    const { entries, isLoading, removeEntry } = useWatchlist();

    if (isLoading) {
        return null;
    }

    if (entries.length === 0) {
        return <EmptyState />;
    }

    const rootClass = entries.length > 5 ? 'popup-root scrollable' : 'popup-root';

    return (
        <div className={rootClass}>
            <div className="title-wrapper">
                <p className="title">Your Watchlist</p>
            </div>

            {entries.map((entry, index) => (
                <EntryCard
                    key={entry.url || index}
                    entry={entry}
                    onRemove={() => removeEntry(entry.url)}
                />
            ))}
        </div>
    );
}
