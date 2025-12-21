export interface TranscriptSegment {
    text: string;
    offset: number;
    duration: number;
}

export class TranscriptService {
    static getVideoId(url: string = window.location.href): string | null {
        try {
            const urlObj = new URL(url);
            const searchParams = new URLSearchParams(urlObj.search);
            return searchParams.get('v');
        } catch (e) {
            console.error('Error parsing URL:', e);
            return null;
        }
    }

    static async fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
        console.log(`[TranscriptService] Fetching via DOM Scraping (RedWriter Strategy) for ${videoId}`);

        try {
            // 1. Check if transcript is already open and available
            let transcriptElements = this.getTranscriptElements();

            if (transcriptElements.length > 0) {
                console.log('[TranscriptService] Transcript already open.');
                return this.parseTranscriptElements(transcriptElements);
            }

            // 2. If not, try to find and click the button
            console.log('[TranscriptService] Transcript not found. Attempting to open panel...');
            const buttonClicked = await this.clickTranscriptButton();

            if (!buttonClicked) {
                throw new Error('Could not find "Show Transcript" button.');
            }

            // 3. Wait for the transcript to load
            await this.waitForTranscriptLoad();

            // 4. Scrape again
            transcriptElements = this.getTranscriptElements();
            if (transcriptElements.length === 0) {
                throw new Error('Transcript panel opened but no segments found.');
            }

            return this.parseTranscriptElements(transcriptElements);

        } catch (error) {
            console.error('[TranscriptService] Error fetching transcript:', error);
            throw error; // Re-throw to be handled by caller
        }
    }

    private static getTranscriptElements(): NodeListOf<Element> {
        const transcriptSegmentSelectors = [
            "ytd-transcript-segment-renderer",
            ".ytd-transcript-segment-renderer",
            "[role='button'] .ytd-transcript-segment-renderer"
        ];

        for (const selector of transcriptSegmentSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) return elements;
        }
        return document.querySelectorAll('nothing-matches'); // Return empty NodeList
    }

    private static async clickTranscriptButton(): Promise<boolean> {
        const transcriptSelectors = [
            "button[aria-label*='transcript']",
            "button[aria-label*='Transcript']",
            "button[aria-label*='transcrição']",
            "button[aria-label*='transcripción']",
            "button[aria-label*='transkription']",
            "button[aria-label*='字幕']",
            "ytd-video-description-transcript-section-renderer button",
            "[aria-label*='Show transcript']",
            "[aria-label*='Mostrar transcrição']",
            "[aria-label*='Mostrar transcripción']"
        ];

        // Sometimes the description needs to be expanded first? 
        // The source repo didn't explicitly expand description, but used specific selectors.
        // Let's try to find the button directly.

        for (const selector of transcriptSelectors) {
            const button = document.querySelector(selector) as HTMLElement;
            if (button) {
                console.log(`[TranscriptService] Found transcript button: ${selector}`);
                button.click();
                return true;
            }
        }

        // Try searching in the menu renderer (sometimes hidden behind "More actions" or similar)
        // For now, sticking to the primary strategy.
        return false;
    }

    private static async waitForTranscriptLoad(maxRetries = 10, interval = 500): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                const elements = this.getTranscriptElements();
                if (elements.length > 0) {
                    resolve();
                } else if (attempts >= maxRetries) {
                    reject(new Error('Timeout waiting for transcript to load.'));
                } else {
                    setTimeout(check, interval);
                }
            };
            check();
        });
    }

    private static parseTranscriptElements(elements: NodeListOf<Element>): TranscriptSegment[] {
        return Array.from(elements).map(segment => {
            const timestampElement = segment.querySelector('[class*="segment-timestamp"]') ||
                segment.querySelector('div.segment-timestamp');
            const textElement = segment.querySelector('[class*="segment-text"]') ||
                segment.querySelector('yt-formatted-string.segment-text');

            const timestamp = timestampElement ? timestampElement.textContent?.trim() || '' : '';
            const text = textElement ? textElement.textContent?.trim() || '' : '';

            // Clean up text (remove zero-width spaces, newlines, etc if needed)
            const cleanText = text.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

            return {
                text: cleanText,
                offset: this.parseTimestamp(timestamp),
                duration: 0
            };
        }).filter(item => item.text.length > 0); // Filter empty segments
    }

    private static parseTimestamp(timeStr: string): number {
        const parts = timeStr.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 3) {
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            seconds = parts[0] * 60 + parts[1];
        } else {
            seconds = parts[0];
        }
        return seconds * 1000;
    }



    static formatForPrompt(transcript: TranscriptSegment[]): string {
        return transcript.map(t => {
            const time = this.formatTime(t.offset);
            return `[${time}] ${t.text}`;
        }).join('\n');
    }

    static formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}
