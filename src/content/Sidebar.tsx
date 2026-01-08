import React, { useEffect, useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Send, Settings, AlertCircle, MessageSquare, RefreshCcw } from 'lucide-react';

import logo from '../assets/logo.png';
import './Sidebar.css';
import { TranscriptService, TranscriptSegment } from '../services/TranscriptService';
import { VideoController } from '../services/VideoController';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const Sidebar: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [apiKey, setApiKeyStr] = useState('');
    const [provider, setProvider] = useState('gemini');
    const [isVisible, setIsVisible] = useState(true);
    const [playerHeight, setPlayerHeight] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
    const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
    const [videoId, setVideoId] = useState<string | null>(null);

    // Sync visibility and height with YouTube player
    useEffect(() => {
        const sync = () => {
            const flexy = document.querySelector('ytd-watch-flexy');
            const player = document.querySelector('#player-container-inner') as HTMLElement;

            if (flexy) {
                const isTheater = flexy.hasAttribute('theater') || flexy.hasAttribute('fullscreen');
                setIsVisible(!isTheater);
            }

            if (player) {
                setPlayerHeight(player.offsetHeight);
            }
        };

        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['theater', 'fullscreen'] });
        window.addEventListener('resize', sync);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', sync);
        };
    }, []);

    // Load API Key
    useEffect(() => {
        chrome.storage.local.get(['apiKey', 'provider'], (result) => {
            if (result.apiKey && typeof result.apiKey === 'string') {
                setHasApiKey(true);
                setApiKeyStr(result.apiKey);
            } else {
                setHasApiKey(false);
            }
            if (result.provider && typeof result.provider === 'string') {
                setProvider(result.provider);
            }
        });

        // Listen for changes in storage
        const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local' && changes.apiKey) {
                const newKey = changes.apiKey.newValue;
                setHasApiKey(!!newKey);
                setApiKeyStr(typeof newKey === 'string' ? newKey : '');
            }
        };
        chrome.storage.onChanged.addListener(listener);
        return () => chrome.storage.onChanged.removeListener(listener);
    }, []);

    // Transcript Management
    const loadTranscript = async () => {
        const currentVideoId = TranscriptService.getVideoId();
        if (currentVideoId && currentVideoId !== videoId) {
            setVideoId(currentVideoId);
            setIsTranscriptLoading(true);
            try {
                const data = await TranscriptService.fetchTranscript(currentVideoId);
                setTranscript(data);
                console.log(`[VidlyAI] Loaded ${data.length} transcript segments.`);
            } catch (err) {
                console.error('Failed to load transcript:', err);
                setTranscript([]);
            } finally {
                setIsTranscriptLoading(false);
            }
        }
    };

    useEffect(() => {
        // Initial load
        loadTranscript();

        // Robust navigation detection for SPA
        let lastUrl = location.href;

        const checkUrl = () => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                console.log('[VidlyAI] URL changed, resetting and reloading...');

                // Reset state
                setTranscript([]);
                setMessages([]);
                setVideoId(null); // Force re-fetch

                // Small delay to let YouTube update DOM
                setTimeout(loadTranscript, 1000);
            }
        };

        const observer = new MutationObserver(checkUrl);
        observer.observe(document.body, { subtree: true, childList: true });

        return () => {
            observer.disconnect();
        };
    }, []); // Run once on mount

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        requestAnimationFrame(scrollToBottom);
    }, [messages, isLoading]);

    const handleOpenOptions = () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || !hasApiKey || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const rawContext = transcript.length > 0 ? TranscriptService.formatForPrompt(transcript) : '';
        const context = TranscriptService.truncateTranscript(rawContext);
        console.log(`[VidlyAI] Sending request with context length: ${context.length} characters.`);

        try {
            chrome.runtime.sendMessage({
                action: 'GENERATE_CONTENT',
                apiKey,
                provider,
                prompt: userMessage.content,
                context // Send transcript context
            }, (response) => {
                const assistantMsgId = Date.now().toString();
                if (chrome.runtime.lastError) {
                    setMessages(prev => [...prev, {
                        id: assistantMsgId,
                        role: 'system',
                        content: 'Error: Could not connect to extension background script.'
                    }]);
                } else if (response && response.success) {
                    setMessages(prev => [...prev, {
                        id: assistantMsgId,
                        role: 'assistant',
                        content: response.text
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        id: assistantMsgId,
                        role: 'system',
                        content: response?.error || 'Failed to get response.'
                    }]);
                }
                setIsLoading(false);
            });
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                content: 'Unexpected error.'
            }]);
            setIsLoading(false);
        }
    };

    // Helper to render message with clickable timestamps
    const renderMessageContent = (text: string) => {
        // Match [MM:SS] or [H:MM:SS]
        const timestampRegex = /(\[\d{1,2}:\d{2}(?::\d{2})?\])/g;
        const parts = text.split(timestampRegex);

        return parts.map((part, index) => {
            if (part.match(timestampRegex)) {
                // Remove brackets
                const timeStr = part.replace(/[\[\]]/g, '');
                return (
                    <span
                        key={index}
                        className="vidly-timestamp"
                        onClick={() => VideoController.seekTo(timeStr)}
                        title={`Jump to ${timeStr}`}
                    >
                        {part}
                    </span>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    if (!isVisible) return null;

    return (
        <div
            className="vidly-sidebar"
            style={{ height: playerHeight > 0 ? `${playerHeight}px` : '500px' }}
        >
            {/* Navigation / Header */}
            <nav className="vidly-header">
                <div className="vidly-header-content">
                    <img src={logo} alt="VidlyAI" className="vidly-header-logo" />
                    <span className="vidly-title">VidlyAI</span>
                    {videoId && (
                        <span
                            className={`vidly-video-badge ${transcript.length ? 'success' : 'error'}`}
                            title={transcript.length ? "Transcript loaded" : "No transcript available"}
                        >
                            {isTranscriptLoading ? "Loading..." : (transcript.length ? "Context Active" : "No Context")}
                        </span>
                    )}
                </div>
                <div className="flex gap-1">
                    {/* Settings and Reload buttons removed as requested */}
                </div>
            </nav>

            {/* Content Area */}
            <div className="vidly-content">
                {!hasApiKey ? (
                    <div className="vidly-centered-card">
                        <Card className="vidly-card-inner">
                            <AlertCircle className="w-16 h-16 text-accent mx-auto mb-6 opacity-80" />
                            <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
                            <p className="text-lg text-muted-foreground mb-6">
                                Please configure your AI provider API key to start chatting.
                            </p>
                            <Button onClick={handleOpenOptions} className="w-full text-xl py-6 h-auto" size="lg">
                                Configure API
                            </Button>
                        </Card>
                    </div>
                ) : (
                    <>
                        <div className="vidly-messages-list" ref={messagesEndRef}>
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-20 h-20 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                                        <MessageSquare className="w-10 h-10 text-accent" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-3 text-white">Start a Conversation</h2>
                                    <p className="text-lg text-muted-foreground max-w-[350px]">
                                        Ask questions or get summaries about this video.
                                    </p>
                                    {transcript.length > 0 && <p className="text-sm text-green-500 mt-2">✓ Transcript loaded</p>}
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div key={message.id} className={`vidly-message-wrapper ${message.role}`}>
                                        <div
                                            className={`vidly-message-bubble ${message.role}`}
                                        >
                                            <p className="whitespace-pre-wrap">
                                                {renderMessageContent(message.content)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}

                            {isLoading && (
                                <div className="vidly-loading-wrapper">
                                    <div className="vidly-loading-bubble">
                                        <div className="vidly-dot" style={{ animationDelay: "0s" }} />
                                        <div className="vidly-dot" style={{ animationDelay: "0.15s" }} />
                                        <div className="vidly-dot" style={{ animationDelay: "0.3s" }} />
                                    </div>
                                </div>
                            )}
                            {/* Scroll spacer removed, using container scroll */}
                        </div>

                        {/* Input Area */}
                        <div className="vidly-input-area">
                            <form onSubmit={handleSendMessage} className="vidly-input-form">
                                <Input
                                    type="text"
                                    placeholder={transcript.length ? "Ask about the video..." : "Ask..."}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={isLoading}
                                    className="vidly-input-field"
                                />
                                <Button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    size="icon"
                                    className={`vidly-send-btn ${input.trim() ? 'active' : ''}`}
                                    variant="ghost"
                                >
                                    <Send className="w-6 h-6" />
                                </Button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
