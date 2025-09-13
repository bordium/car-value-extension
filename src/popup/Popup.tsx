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

    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!data || data.length === 0) return;

            const checks = await Promise.all(
                data.map(async (entry) => {
                    let changed = false;
                    const updated: DataEntry = { ...entry };

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

        return () => { mounted = false };
    }, [data]);
    if (!data || data.length === 0) {
        return (
            <div id="root-div">
                <div id="title-div">
                    <p id="title-text"> Your Watchlist </p>
                </div>
                <p id="empty-message">Nothing is in your watchlist yet.</p>
            </div>
        );
    }

    return (
    <div className="root-div">
        {data.map((entry, index) => (
            <div key={index} className="entry-div">
                <span className="entry-span">
                    <h3>{entry.title}</h3>
                    {entry.imageUrl ? (
                        <img src={entry.imageUrl} alt={entry.title} className="entry-image" />
                    ) : (
                        <img src="/assets/no-image.jpg" alt="No image available" className="entry-image" />
                    )}
                    <p>Price: ${entry.price}</p>
                    {entry.url ? (
                        <a href={entry.url} target="_blank" rel="noopener noreferrer">View Listing</a>
                    ) : (
                        <span style={{ color: '#666' }}>Link unavailable</span>
                    )}
                </span>
            </div>
        ))}
        </div>
    );
}

const container = document.getElementById('root')
if (container) {
    createRoot(container).render(<Popup />)
}
