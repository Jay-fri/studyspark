import { useRef, useCallback } from "react";

export function useChessSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }

  function tone(
    freq: number,
    dur: number,
    vol = 0.25,
    type: OscillatorType = "sine",
    freqEnd?: number,
    delay = 0,
  ) {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime + delay);
      if (freqEnd !== undefined) {
        osc.frequency.linearRampToValueAtTime(freqEnd, c.currentTime + delay + dur);
      }
      gain.gain.setValueAtTime(vol, c.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
      osc.start(c.currentTime + delay);
      osc.stop(c.currentTime + delay + dur + 0.01);
    } catch {
      // audio errors are non-critical
    }
  }

  const playMove = useCallback(() => {
    tone(520, 0.07, 0.2, "square");
  }, []);

  const playCapture = useCallback(() => {
    tone(320, 0.05, 0.3, "square");
    tone(200, 0.1, 0.2, "sawtooth", 140, 0.04);
  }, []);

  const playCheck = useCallback(() => {
    tone(880, 0.07, 0.28, "sine");
    tone(880, 0.07, 0.22, "sine", undefined, 0.13);
  }, []);

  const playWin = useCallback(() => {
    // Ascending arpeggio: C4 E4 G4 C5
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.32, 0.28, "sine", undefined, i * 0.14),
    );
  }, []);

  const playLoss = useCallback(() => {
    // Descending: G4 F4 Eb4 C4
    [392, 349, 311, 262].forEach((f, i) =>
      tone(f, 0.32, 0.22, "sine", undefined, i * 0.19),
    );
  }, []);

  const playDraw = useCallback(() => {
    tone(440, 0.18, 0.2, "sine");
    tone(392, 0.18, 0.2, "sine", undefined, 0.2);
  }, []);

  const playTimerLow = useCallback(() => {
    tone(660, 0.055, 0.12, "square");
  }, []);

  return { playMove, playCapture, playCheck, playWin, playLoss, playDraw, playTimerLow };
}
