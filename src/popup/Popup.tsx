import type { DataEntry } from '../shared/types.ts'

export default function Popup() {
    let data: DataEntry[] = [];
    chrome.storage.local.get('value-craigslist', (result) => {
        data = result['value-craigslist'] || [];
    });
    if (!data || data.length === 0) {
        return (
            <div>
                <p>Nothing is in your watchlist yet.</p>
            </div>
        )
    }
    return (
        <div>
            {data.map((entry, index) => (
                <div key={index} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                    <h3>{entry.title}</h3>
                    <p>Price: ${entry.price}</p>
                    <a href={entry.url} target="_blank" rel="noopener noreferrer">View Listing</a>
                </div>
            ))}
        </div>
    )
}