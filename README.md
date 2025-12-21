# VidlyAI

**VidlyAI** is your intelligent companion for YouTube. It automatically fetches video transcripts and allows you to chat with any video using state-of-the-art AI models. Ask questions, get summaries, and navigate directly to the most relevant parts of the video.

![VidlyAI Logo](src/assets/logo.png)

## Features

-   **🤖 Multi-Provider AI Support**:
    -   **Google Gemini** (Gemini 2.5 Flash Lite)
    -   **OpenAI** (GPT-4o Mini)
    -   **OpenRouter** (DeepSeek, Llama, etc.)
    -   **Anthropic Claude** (Haiku)
-   **📝 Automatic Transcripts**: Fetches transcripts automatically for the current video.
-   **⚡️ Smart Context**: The AI answers questions *strictly* based on the video context.
-   **📍 Timestamp Navigation**: Clickable timestamps in the chat to jump directly to that moment in the video.
-   **🔐 Secure & Private**: Your API keys are stored locally in your browser (Chrome Storage) and never sent to our servers.
-   **🎨 Sleek UI**: A modern, dark-mode interface that fits right into YouTube.

## Installation (Developer Mode)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/VidlyAI.git
    cd VidlyAI
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build the extension**:
    ```bash
    npm run build
    ```

4.  **Load into Chrome**:
    -   Open `chrome://extensions/`
    -   Enable **Developer mode** (top right).
    -   Click **Load unpacked**.
    -   Select the `dist` folder generated in this project.

## Usage

1.  **Configure API Key**:
    -   Click the extension icon or open the **Options Page**.
    -   Select your preferred AI provider (e.g., Gemini, OpenAI).
    -   Enter your API Key.
    -   Click **Save**.

2.  **Chat with a Video**:
    -   Open any YouTube video.
    -   The VidlyAI sidebar will appear.
    -   Wait for the "Context Active" badge.
    -   Ask anything! (e.g., "Summarize this video", "What did they say about X?").

## Tech Stack

-   **Frontend**: React, TypeScript, Tailwind CSS
-   **Build Tool**: Vite
-   **Bundling**: Custom Vite config for Chrome Extensions (Content Scripts, Background, Options)
-   **Icons**: Lucide React

## License

MIT
