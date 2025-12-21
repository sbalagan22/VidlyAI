import { useState, useEffect } from "react"
import { Button } from "../components/ui/button"
// import { Input } from "../components/ui/input" 
import { Label } from "../components/ui/label"
import { Card } from "../components/ui/card"
import { Check, Settings, Eye, EyeOff } from "lucide-react"
import logo from "../assets/logo.png"
import "./Options.css"

const API_PROVIDERS = [
    { id: "openai", name: "OpenAI", description: "GPT-4 and GPT-4 mini" },
    { id: "gemini", name: "Google Gemini", description: "Gemini Pro and Ultra" },
    { id: "openrouter", name: "OpenRouter", description: "Access to multiple models" },
    { id: "claude", name: "Claude", description: "Claude 3 Opus, Sonnet, Haiku" },
]

export interface StorageResult {
    apiKey?: string;
    provider?: string;
}

export default function Options() {
    const [selectedProvider, setSelectedProvider] = useState<string>("")
    const [apiKey, setApiKey] = useState("")
    const [showForm, setShowForm] = useState(false)
    const [savedProvider, setSavedProvider] = useState<string>("")
    const [isSaved, setIsSaved] = useState(false)
    const [showApiKey, setShowApiKey] = useState(false)

    // Load saved settings on mount
    useEffect(() => {
        chrome.storage.local.get(['apiKey', 'provider'], (result: StorageResult) => {
            if (result.apiKey) setApiKey(result.apiKey);
            if (result.provider) {
                setSavedProvider(result.provider);
                setSelectedProvider(result.provider);
            }
        });
    }, []);

    const handleSaveApiKey = () => {
        if (!selectedProvider || !apiKey.trim()) {
            return
        }

        chrome.storage.local.set({
            apiKey: apiKey,
            provider: selectedProvider
        }, () => {
            setSavedProvider(selectedProvider)
            setIsSaved(true)
            setTimeout(() => setIsSaved(false), 2000)
            setShowForm(false)
        });
    }

    const savedProviderName = API_PROVIDERS.find((p) => p.id === savedProvider)?.name

    return (
        <main className="vidly-options-container">
            {/* Hero Section */}
            <section className="vidly-hero-section">
                <div className="vidly-hero-content">
                    <div className="vidly-brand-wrapper">
                        <div className="vidly-title-container">
                            <h1 className="vidly-hero-title">
                                VidlyAI
                            </h1>
                            <div className="vidly-hero-logo-box">
                                <img src={logo} alt="VidlyAI Logo" className="vidly-logo-img" />
                            </div>
                        </div>
                        <p className="vidly-hero-subtitle">
                            AI companion for youtube
                        </p>
                    </div>

                    {/* Quick Config Card */}
                    <div className="vidly-config-wrapper">
                        {savedProvider ? (
                            <Card className="vidly-config-card configured">
                                <div className="vidly-config-status">
                                    <div className="vidly-status-icon-box">
                                        <Check className="w-6 h-6 text-accent" />
                                    </div>
                                    <div className="vidly-status-text">
                                        <p className="vidly-status-label">API Configured</p>
                                        <p className="vidly-status-value">{savedProviderName}</p>
                                    </div>
                                </div>
                                <Button onClick={() => setShowForm(true)} variant="outline" className="w-full text-white border-white/20 hover:bg-white/10 hover:text-white">
                                    Change API Key
                                </Button>
                            </Card>
                        ) : (
                            <Card className="vidly-config-card empty">
                                <div className="space-y-4">
                                    <div className="vidly-empty-state">
                                        <Settings className="vidly-empty-icon" />
                                        <p className="text-muted-foreground mb-2">No API key configured yet</p>
                                        <p className="text-sm text-muted-foreground">Choose a provider to get started</p>
                                    </div>
                                    <Button onClick={() => setShowForm(true)} className="w-full text-white bg-primary hover:bg-primary/90">
                                        Configure API Key
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </section>

            {/* Modal */}
            {showForm && (
                <div className="vidly-modal-overlay">
                    <Card className="vidly-modal-content">
                        <div>
                            <h2 className="text-2xl font-bold">Configure API Key</h2>
                            <p className="text-muted-foreground text-sm mt-2">Choose your AI provider and add your API key</p>
                        </div>

                        <div className="space-y-3">
                            <Label>Select Provider</Label>
                            <div className="vidly-provider-grid">
                                {API_PROVIDERS.map((provider) => (
                                    <button
                                        key={provider.id}
                                        onClick={() => setSelectedProvider(provider.id)}
                                        className={`vidly-provider-btn ${selectedProvider === provider.id ? "selected" : "unselected"}`}
                                    >
                                        {provider.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="api-key">API Key</Label>
                            <div className="relative">
                                <input
                                    id="api-key"
                                    type={showApiKey ? "text" : "password"}
                                    placeholder="Enter your API key"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-white/20 px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-50 pr-10 box-border"
                                    style={{
                                        color: 'white',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        caretColor: 'white',
                                        width: '100%' // Ensure it stays within parent
                                    }}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors flex items-center justify-center p-1 rounded-md"
                                    style={{
                                        color: 'rgba(255, 255, 255, 0.7)', // Icon color
                                        backgroundColor: 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = 'white';
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                    onClick={() => setShowApiKey(!showApiKey)}
                                >
                                    {showApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Your API key is stored securely in your browser and never sent to our servers.
                            </p>
                        </div>

                        <div className="vidly-modal-actions">
                            <Button
                                variant="outline"
                                className="flex-1 bg-transparent border-white/20 hover:bg-white/10"
                                style={{ color: 'white' }}
                                onClick={() => {
                                    setShowForm(false)
                                    setSelectedProvider("")
                                    setApiKey("")
                                    // Optionally revert to saved setting if cancelled, or keep empty
                                }}
                            >
                                Cancel
                            </Button>
                            <Button className="flex-1" onClick={handleSaveApiKey} disabled={!selectedProvider || !apiKey.trim()}>
                                {isSaved ? "Saved!" : "Save & Continue"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </main>
    )
}
