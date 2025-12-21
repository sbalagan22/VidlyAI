export class VideoController {
    static getPlayer(): HTMLVideoElement | null {
        return document.querySelector('video.html5-main-video');
    }

    static seekTo(timeStr: string) {
        // timeStr format "MM:SS" or "HH:MM:SS"
        const parts = timeStr.split(':').map(Number);
        let seconds = 0;
        if (parts.length === 2) {
            seconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        const video = this.getPlayer();
        if (video) {
            video.currentTime = seconds;
            video.play().catch(e => console.error("Error playing video:", e));
        } else {
            console.warn("YouTube video player not found.");
        }
    }
}
