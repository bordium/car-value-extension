import { useEffect, useState } from 'react'
import type { DataEntry } from '../shared/types.ts'
import { checkUrl } from '../shared/utils.ts'
import { createRoot } from 'react-dom/client'
import './popup.css'

export default function Popup() {
    const [data, setData] = useState<DataEntry[] | null>(null);

    useEffect(() => {
        chrome.storage.local.get('value-craigslist', (result) => {
            setData(Array.isArray(result['value-craigslist']) ? result['value-craigslist'] : []);
        });

        const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local' && changes['value-craigslist']) {
                const newValue = changes['value-craigslist'].newValue;
                setData(Array.isArray(newValue) ? newValue : []);
            }
        };
        chrome.storage.onChanged.addListener(onChanged);
        return () => chrome.storage.onChanged.removeListener(onChanged);
    }, []);

    // Sanitize entries by validating imageUrl and url on popup open and whenever data changes
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!data || data.length === 0) return;

            const checks = await Promise.all(
                data.map(async (entry) => {
                    let changed = false;
                    const updated: DataEntry = { ...entry };

                    // Validate imageUrl
                    if (entry.imageUrl && typeof entry.imageUrl === 'string' && entry.imageUrl.trim().length > 0) {
                        try {
                            const ok = await checkUrl(entry.imageUrl);
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
                    if (entry.url && entry.url.trim().length > 0) {
                        try {
                            const ok = await checkUrl(entry.url);
                            if (!ok) {
                                updated.url = '';
                                changed = true;
                            }
                        } catch {
                            updated.url = '';
                            changed = true;
                        }
                    }

                    return { updated, changed };
                })
            );

            const anyChanged = checks.some((c) => c.changed);
            if (mounted && anyChanged) {
                const sanitized = checks.map((c) => c.updated);
                setData(sanitized);
                try {
                    chrome.storage.local.set({ 'value-craigslist': sanitized });
                } catch {
                    // ignore if extension context invalid
                }
            }
        })();

        return () => { 
            mounted = false
        };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="empty-root">
                <div className="empty-title-wrapper">
                    <p className="title">Your Watchlist</p>
                </div>
                <p className="empty-message">Nothing is in your watchlist yet.</p>
            </div>
        );
    }

    const rootClass = data.length > 5 ? 'popup-root scrollable' : 'popup-root';

    return (
        <div className={rootClass}>
            <div className="title-wrapper">
                <p className="title">Your Watchlist</p>
            </div>
            {data.map((entry, index) => {
                const kbbLink = entry.make && entry.model && entry.year
                    ? `https://www.kbb.com/${entry.make}/${entry.model}/${entry.year}/`
                    : '';
                const priceStr = entry.price && entry.price > 0 ? `$${entry.price.toLocaleString()}` : 'N/A';
                let mileageStr = '';
                if (entry.mileage && entry.mileage >= 0) {
                    if (entry.mileage >= 1000) {
                        mileageStr = `${(entry.mileage / 1000).toFixed(1)} mi`;
                    } else {
                        mileageStr = `${entry.mileage.toLocaleString()}k mi`;
                    } 
                } else {
                    mileageStr = 'N/A';
                } 
                const locationStr = entry.location && entry.location.trim().length > 0 ? entry.location : 'Unknown';
                const sourceStr = entry.source ? entry.source.charAt(0).toUpperCase() + entry.source.slice(1) : 'N/A';

                let kbbLogo = 'assets/kbb-logo.png';

                try {
                    kbbLogo = chrome?.runtime?.getURL('assets/kbb-logo.png') ?? 'assets/kbb-logo.png';
                } catch {
                    // ignore
                }

                const handleRemove = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!entry.url) return;
                    chrome.storage.local.get('value-craigslist', (res) => {
                        const arr: DataEntry[] = Array.isArray(res['value-craigslist']) ? res['value-craigslist'] : [];
                        const filtered = arr.filter(item => item && item.url !== entry.url);
                        chrome.storage.local.set({ 'value-craigslist': filtered });
                    });
                };

                return (
                    <div key={index} className="entry-card">
                        <button
                            type="button"
                            className="entry-remove-btn"
                            aria-label="Remove from watchlist"
                            onClick={handleRemove}
                        >
                            X
                        </button>
                        <div className="entry-image-container">
                            {entry.imageUrl ? (
                                <img src={entry.imageUrl} alt={entry.title} className="entry-image" />
                            ) : null}
                        </div>

                        <div className="entry-content">
                            <div className="entry-header">
                                <div className="entry-title" title={entry.title}>
                                    {entry.title}
                                </div>

                            </div>

                            <div className="entry-details">
                                <div><strong>Location:</strong> {locationStr}</div>
                                <div><strong>Mileage:</strong> {mileageStr}</div>
                                <div><strong>Price:</strong> {priceStr}</div>
                                <div><strong>Source:</strong> {sourceStr}</div>
                                {kbbLink ? (
                                    <button
                                        className="kbb-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            if (kbbLink) window.open(kbbLink, '_blank');
                                        }}
                                    >
                                        <img src={kbbLogo} alt={entry.title} />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(<Popup />);
}
