// import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client'

export default function Options() {
    return (
        <div>
        </div>
    );
}

if (typeof window !== 'undefined') {
    const container = document.getElementById('root')
    if (container) {
        createRoot(container).render(<Options />)
    }
}