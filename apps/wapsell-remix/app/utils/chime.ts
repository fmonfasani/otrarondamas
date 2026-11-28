/**
 * Fase 3 — the sound of a new order. Made with the Web Audio API (no file to load). Browsers only
 * let a page play sound after the person touched it, so the panel unlocks it on the first click,
 * and the choice to hear it or not is remembered in this browser.
 */

const PREFERENCE_KEY = 'wapsell.pedidos.sonido';

let context: AudioContext | null = null;

/** True when the person did not turn the sound off in this browser. */
export function soundWanted(): boolean {
  try {
    return globalThis.localStorage?.getItem(PREFERENCE_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setSoundWanted(wanted: boolean): void {
  try {
    globalThis.localStorage?.setItem(PREFERENCE_KEY, wanted ? '1' : '0');
  } catch {
    // Private window or blocked storage: the choice lasts until the page closes.
  }
}

/** Call from a click: lets the page play sound from now on. */
export function unlockSound(): void {
  try {
    const Ctor = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

/** Whether the browser lets the page play sound now. */
export function soundReady(): boolean {
  return context?.state === 'running';
}

/** Two short rising notes. Does nothing when sound is off or not yet allowed. */
export function playChime(): void {
  if (!context || context.state !== 'running' || !soundWanted()) return;
  const start = context.currentTime;
  [880, 1320].forEach((frequency, index) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    const at = start + index * 0.18;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
    oscillator.connect(gain).connect(context!.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.34);
  });
}
