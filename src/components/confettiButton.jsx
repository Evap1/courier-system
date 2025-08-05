import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function ConfettiBurst({ show, duration = 3000, onDone }) {
  useEffect(() => {
    if (!show) return;

    // We'll fire confetti from random positions for the given duration
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 90,
      zIndex: 99999, // Make sure it's on top of all UI
      particleCount: 80,
      origin: { y: 0.7 }
    };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        if (onDone) onDone();
        return;
      }
      confetti({
        ...defaults,
        particleCount: 50,
        origin: {
          x: randomInRange(0.1, 0.9),
          y: Math.random() * 0.6,
        }
      });
    }, 200);

    return () => clearInterval(interval);
  }, [show, duration, onDone]);

  return null; // The confetti renders to a canvas in the document body
}
