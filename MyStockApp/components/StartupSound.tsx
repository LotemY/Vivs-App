// components/StartupSound.tsx
//
// Plays a short pop once when the app launches. Mount it once in the root
// layout (app/_layout.tsx). Because the root layout stays mounted while the
// app is open, switching to another app and coming back does NOT replay it --
// only a fresh launch does.
//
// Needs the `expo-audio` package (native module): run
// `npx expo install expo-audio` once, then rebuild with `eas build`.
import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

export function StartupSound() {
  const player = useAudioPlayer(require('../assets/pop.mp3'));
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;
    played.current = true;
    try {
      player.play();
    } catch (err) {
      // A missing/blocked sound should never affect the app itself.
      console.warn('Startup sound failed:', err);
    }
  }, [player]);

  return null;
}
