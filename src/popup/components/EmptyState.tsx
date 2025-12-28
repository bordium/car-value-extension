/**
 * EmptyState.tsx
 * Displayed when the watchlist is empty.
 */

export function EmptyState() {
    return (
        <div className="empty-root">
            <div className="empty-title-wrapper">
                <p className="title">Your Watchlist</p>
            </div>
            <p className="empty-message">Nothing is in your watchlist yet.</p>
        </div>
    );
}
