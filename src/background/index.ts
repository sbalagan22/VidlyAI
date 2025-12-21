import { GoogleGenAI } from "@google/genai";

chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_TRANSCRIPT') {
        (async () => {
            try {
                const { videoId } = request;
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                console.log('[Background] Fetching video page:', videoUrl);

                // 1. Fetch Video Page
                const response = await fetch(videoUrl);
                const html = await response.text();

                // 2. Extract ytInitialPlayerResponse
                const playerResponse = extractJson(html, 'ytInitialPlayerResponse');

                if (!playerResponse) {
                    throw new Error('Could not extract ytInitialPlayerResponse. The video might be age-restricted or require login.');
                }

                const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer;

                if (!captions) {
                    throw new Error('Captions are disabled for this video.');
                }

                const tracks = captions.captionTracks;
                if (!tracks || tracks.length === 0) {
                    throw new Error('No caption tracks found.');
                }

                // 3. Find English Track (or first available if no English)
                // Priority: English -> First available
                const track = tracks.find((t: any) => t.languageCode === 'en') || tracks[0];

                if (!track) {
                    throw new Error('No compatible caption track found.');
                }

                console.log('[Background] Found track:', track);

                // 4. Fetch Transcript XML
                const transcriptUrl = track.baseUrl;
                if (!transcriptUrl) {
                    throw new Error('Track has no baseUrl');
                }

                console.log('[Background] Fetching transcript from:', transcriptUrl);

                const transcriptResponse = await fetch(transcriptUrl);
                console.log('[Background] Transcript fetch status:', transcriptResponse.status);

                const transcriptXml = await transcriptResponse.text();
                console.log('[Background] Transcript XML length:', transcriptXml.length);

                if (!transcriptResponse.ok) {
                    console.error('[Background] Transcript fetch error body:', transcriptXml);
                    throw new Error(`Transcript fetch failed: ${transcriptResponse.status}`);
                }

                if (!transcriptXml) {
                    console.error('[Background] Transcript XML is empty!');
                    throw new Error('Fetched transcript XML is empty.');
                }

                sendResponse({ success: true, transcriptXml });

            } catch (error: any) {
                console.error('[Background] Transcript fetch failed:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }

    if (request.action === 'GENERATE_CONTENT') {
        (async () => {
            try {
                const { apiKey, provider, prompt, context } = request;
                let finalPrompt = prompt;
                if (context) {
                    finalPrompt = `You are a helpful YouTube Assistant.

Context (Video Transcript):
${context}

User Question: ${prompt}

Instructions:
1. Answer the user's question STRICTLY based on the transcript provided above.
2. If the answer contains timestamps, format them as [MM:SS] (e.g., [05:23]).
3. Do NOT use markdown formatting (no bold **, no italics *, no headers #). Use plain text only.
4. Be concise and helpful.`;
                } else {
                    finalPrompt = `User Question: ${prompt}

Instructions:
The user is asking about a specific video, but NO TRANSCRIPT was provided.
You MUST reply with exactly: "I can't help you with the video as no transcript is provided."
Do not try to guess or hallucinate.`;
                }

                let text = '';

                if (!provider || provider === 'gemini') {
                    const ai = new GoogleGenAI({ apiKey });
                    const response = await ai.models.generateContent({
                        model: "gemini-2.5-flash-lite",
                        contents: {
                            role: 'user',
                            parts: [{ text: finalPrompt }]
                        },
                    });
                    text = response.text || (response as any).response?.candidates?.[0]?.content?.parts?.[0]?.text;
                } else if (provider === 'openai') {
                    const response = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [{ role: "user", content: finalPrompt }]
                        })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error?.message || 'OpenAI API Error');
                    text = data.choices?.[0]?.message?.content;
                } else if (provider === 'openrouter') {
                    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'HTTP-Referer': 'https://github.com/Nik-Dev21/youtube_ex',
                        },
                        body: JSON.stringify({
                            model: "google/gemini-2.0-flash-lite-preview-02-05:free",
                            messages: [{ role: "user", content: finalPrompt }]
                        })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error?.message || 'OpenRouter API Error');
                    text = data.choices?.[0]?.message?.content;
                } else if (provider === 'claude') {
                    const response = await fetch('https://api.anthropic.com/v1/messages', {
                        method: 'POST',
                        headers: {
                            'x-api-key': apiKey,
                            'anthropic-version': '2023-06-01',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: "claude-3-haiku-20240307",
                            max_tokens: 1024,
                            messages: [{ role: "user", content: finalPrompt }]
                        })
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error?.message || 'Claude API Error');
                    text = data.content?.[0]?.text;
                } else {
                    throw new Error('Invalid provider');
                }

                sendResponse({ success: true, text });

            } catch (error: any) {
                console.error('Background API Error:', error);
                sendResponse({ success: false, error: error.message || String(error) });
            }
        })();

        return true; // Keep the message channel open for async response
    }

    if (request.action === 'GET_INNERTUBE_CONTEXT') {
        (async () => {
            // ... legacy code kept for safety, but effectively unused by new impl
            sendResponse({ success: false, error: 'Deprecated' });
        })();
        return true;
    }

    if (request.action === 'FETCH_IN_PAGE' || request.action === 'FETCH_INNER_TUBE') {
        // ... legacy code kept for safety
        (async () => {
            try {
                const { url, body, headers, responseType } = request;
                const tabId = sender.tab?.id;
                if (!tabId) throw new Error('No tab ID found.');

                const safeHeaders = headers || {};
                const safeResponseType = responseType || 'text';

                const [result] = await chrome.scripting.executeScript({
                    target: { tabId },
                    world: 'MAIN',
                    args: [url, body, safeHeaders, safeResponseType],
                    func: async (targetUrl: string, requestBody?: any, requestHeaders?: any, responseType?: 'json' | 'text') => {
                        console.log('[Background] Fetching in page:', targetUrl);
                        const options: RequestInit = {
                            method: requestBody ? 'POST' : 'GET',
                            credentials: 'include',
                            headers: requestHeaders || {}
                        };

                        // Add Content-Type if JSON body exists
                        if (requestBody) {
                            options.body = JSON.stringify(requestBody);
                            if (!(options.headers as any)['Content-Type']) {
                                (options.headers as any)['Content-Type'] = 'application/json';
                            }
                        }

                        const res = await fetch(targetUrl, options);
                        console.log('[Background] Fetch status:', res.status, res.statusText);

                        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

                        if (responseType === 'json' || requestBody) {
                            return await res.json();
                        } else {
                            return await res.text();
                        }
                    }
                });

                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    sendResponse({ success: true, data: result.result });
                }
            } catch (err: any) {
                console.error('[Background] Fetch failed:', err);
                sendResponse({ success: false, error: err.message });
            }
        })();
        return true;
    }
});

function extractJson(html: string, variableName: string): any {
    const startIdx = html.indexOf(variableName);
    if (startIdx === -1) return null;

    // Find the start of the object
    const objectStart = html.indexOf('{', startIdx);
    if (objectStart === -1) return null;

    let braceCount = 0;
    let inString = false;
    let escaped = false;

    for (let i = objectStart; i < html.length; i++) {
        const char = html[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            continue;
        }

        if (char === '"' && !escaped) {
            inString = !inString;
            continue;
        }

        if (!inString) {
            if (char === '{') {
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    // Found the end
                    try {
                        const jsonStr = html.substring(objectStart, i + 1);
                        return JSON.parse(jsonStr);
                    } catch (e) {
                        return null;
                    }
                }
            }
        }
    }
    return null;
}
