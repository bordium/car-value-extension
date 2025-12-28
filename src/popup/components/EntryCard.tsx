/**
 * EntryCard.tsx
 * Displays a single watchlist entry.
 */

import type { DataEntry } from '../../shared/types';
import {
    formatPrice,
    formatMileage,
    formatLocation,
    formatSource,
    buildKbbUrl,
    getKbbLogoUrl
} from '../utils/formatters';

interface EntryCardProps {
    entry: DataEntry;
    onRemove: () => void;
}

/**
 * Renders a single watchlist entry card with image, details, and actions.
 */
export function EntryCard({ entry, onRemove }: EntryCardProps) {
    const kbbUrl = buildKbbUrl(entry.make, entry.model, entry.year);
    const kbbLogo = getKbbLogoUrl();

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onRemove();
    };

    const handleKbbClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (kbbUrl) {
            window.open(kbbUrl, '_blank');
        }
    };

    return (
        <div className="entry-card">
            <button
                type="button"
                className="entry-remove-btn"
                aria-label="Remove from watchlist"
                onClick={handleRemove}
            >
                X
            </button>

            <div className="entry-image-container">
                {entry.imageUrl && (
                    <img
                        src={entry.imageUrl}
                        alt={entry.title}
                        className="entry-image"
                    />
                )}
            </div>

            <div className="entry-content">
                <div className="entry-header">
                    <div className="entry-title" title={entry.title}>
                        {entry.title}
                    </div>
                </div>

                <div className="entry-details">
                    <div><strong>Location:</strong> {formatLocation(entry.location)}</div>
                    <div><strong>Mileage:</strong> {formatMileage(entry.mileage)}</div>
                    <div><strong>Price:</strong> {formatPrice(entry.price)}</div>
                    <div><strong>Source:</strong> {formatSource(entry.source)}</div>

                    {kbbUrl && (
                        <button className="kbb-btn" onClick={handleKbbClick}>
                            <img src={kbbLogo} alt="Check on KBB" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
