export function createAudioManager() {
  const sounds = {
    shot: new Audio("/sounds/shot.wav"),
    hit: new Audio("/sounds/hit.wav"),
    miss: new Audio("/sounds/miss.wav"),
    countdown: new Audio("/sounds/countdown.wav"),
    complete: new Audio("/sounds/complete.wav")
  };

  Object.values(sounds).forEach((audio) => {
    audio.preload = "auto";
    audio.volume = 0.45;
    audio.addEventListener("error", () => {});
  });

  let muted = false;

  return {
    setMuted(value) {
      muted = value;
    },
    play(name) {
      if (muted || !sounds[name]) return;
      const audio = sounds[name];

      try {
        audio.currentTime = 0;
        const promise = audio.play();
        promise?.catch(() => {});
      } catch {
        // Audio failures are non-fatal.
      }
    },
    dispose() {
      Object.values(sounds).forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    }
  };
}
