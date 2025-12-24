export const speakEvent = (text: string) => {
    if ('speechSynthesis' in window) {
        // Cancel any current speaking
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = 1;
        utterance.rate = 1.1;
        utterance.pitch = 1;

        // Try to find a good English voice
        const voices = window.speechSynthesis.getVoices();
        const cricketVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en-AU')) || voices.find(v => v.lang.includes('en-US'));
        if (cricketVoice) utterance.voice = cricketVoice;

        window.speechSynthesis.speak(utterance);
    }
};

export const announceScore = (runs: number, wicket: boolean = false) => {
    if (wicket) {
        speakEvent("Wicket! That is Out!");
    } else if (runs === 4) {
        speakEvent("Four Runs! Beautiful shot.");
    } else if (runs === 6) {
        speakEvent("Six Runs! That is huge.");
    }
};
