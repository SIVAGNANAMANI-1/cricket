import confetti from 'canvas-confetti';

export const triggerConfetti = (type: 'boundary' | 'wicket' | 'win' | 'fifty') => {
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    if (type === 'boundary') {
        // Shotgun from sides
        confetti({
            ...defaults,
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8, x: 0 }
        });
        confetti({
            ...defaults,
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8, x: 1 }
        });
    } else if (type === 'wicket') {
        // Explosion from center
        confetti({
            ...defaults,
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    } else if (type === 'win') {
        // Full screen celebration
        const duration = 3000;
        const animationEnd = Date.now() + duration;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    }
};
