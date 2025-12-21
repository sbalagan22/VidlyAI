import React from 'react';
import { createRoot } from 'react-dom/client';
import Sidebar from './Sidebar';
import '../index.css';

console.log('%c [YouTube AI] React content script loaded!', 'color: #065fd4; font-weight: bold;');

function inject() {
    if (document.getElementById('ai-chat-root')) return;

    const secondaryInner = document.querySelector('#secondary-inner');
    if (!secondaryInner) return;

    const rootContainer = document.createElement('div');
    rootContainer.id = 'ai-chat-root';
    secondaryInner.prepend(rootContainer);

    const root = createRoot(rootContainer);
    root.render(
        <React.StrictMode>
            <Sidebar />
        </React.StrictMode>
    );

    console.log('AI Chat React root injected');
}

// YouTube SPA handling
let lastUrl = location.href;
const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        if (url.includes('youtube.com/watch')) {
            setTimeout(inject, 1000);
        }
    }
});

observer.observe(document.body, { subtree: true, childList: true });

// Initial injection
if (location.href.includes('youtube.com/watch')) {
    setTimeout(inject, 1000);
}
