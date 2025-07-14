import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client'

export default function Options() {
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // load existing API key on mount
    useEffect(() => {
        chrome.storage.sync.get(['apiKey']).then((result) => {
        if (result.apiKey) {
            setApiKey(result.apiKey);
        }
        });
    }, []);

    // handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
        setStatus('idle');
    };

    // save API key to chrome.storage
    const handleSave = () => {
        setStatus('saving');
        chrome.storage.sync.set({ apiKey }).then(()=> {
            if (chrome.runtime.lastError) {
                setStatus('error');
            } else {
                setStatus('saved');
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-md">
                <h1 className="text-xl font-bold mb-4">Extension Settings</h1>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                    API Key:
                </label>
                <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={apiKey}
                onChange={handleChange}
                placeholder="Enter your API key"
                />
                <button
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                onClick={handleSave}
                disabled={status === 'saving'}
                >
                {status === 'saving' ? 'Saving...' : 'Save'}
                </button>
                {status === 'saved' && (
                <p className="mt-3 text-green-600">Settings saved successfully!</p>
                )}
                {status === 'error' && (
                <p className="mt-3 text-red-600">Error saving settings.</p>
                )}
            </div>
        </div>
    );
}

if (typeof window !== 'undefined') {
  const container = document.getElementById('root')
  if (container) {
    createRoot(container).render(<Options />)
  }
}