const draftSoundStorageKey = "dwf:draft-sounds-enabled";

// The completion clip is 3.504 seconds long. Keep the destination visible until
// the full clip has played, with a small buffer for browser audio startup.
export const draftCompleteSoundDurationMs = 3_700;
export const pickMadeSoundDurationMs = 3_500;

const draftSounds = {
  countdownTick: "/sounds/countdown-tick.mp3",
  draftGoodResult: "/sounds/draft-good-result.mp3",
  pickSuccess: "/sounds/pick-success.mp3",
  pauseResumeWhistle: "/sounds/pause-resume-whistle.mp3",
};

const audioCache = new Map<string, HTMLAudioElement>();
let activeCountdownTick: HTMLAudioElement | null = null;
let lastPickSoundKey = "";
let pickSoundQueue: string[] = [];
let pickSoundPlaying = false;
let activePickSoundCleanup: (() => void) | null = null;
let anonymousPickSoundSequence = 0;

export function isDraftSoundEnabled() {
  if (typeof window === "undefined") return true;

  return window.localStorage.getItem(draftSoundStorageKey) !== "false";
}

export function setDraftSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(draftSoundStorageKey, enabled ? "true" : "false");
  if (!enabled) {
    pickSoundQueue = [];
    activePickSoundCleanup?.();
  }
}

function getAudio(src: string) {
  if (typeof window === "undefined" || !isDraftSoundEnabled()) return null;

  const cachedAudio = audioCache.get(src);
  if (cachedAudio) return cachedAudio;

  const audio = new Audio(src);
  audio.preload = "auto";
  audioCache.set(src, audio);

  return audio;
}

function playSound(src: string, volume = 0.72) {
  const audio = getAudio(src);
  if (!audio) return;

  const player = audio.paused ? audio : (audio.cloneNode(true) as HTMLAudioElement);
  player.currentTime = 0;
  player.volume = volume;
  player.play().catch(() => {});
}

export function preloadDraftSounds() {
  Object.values(draftSounds).forEach((src) => {
    getAudio(src);
  });
}

export function unlockDraftSounds() {
  const audio = getAudio(draftSounds.pickSuccess);
  if (!audio) return;

  const wasMuted = audio.muted;
  audio.muted = true;
  audio
    .play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = wasMuted;
    })
    .catch(() => {
      audio.muted = wasMuted;
    });
}

export function playDraftStartSound() {
  playSound(draftSounds.draftGoodResult, 0.42);
}

export function playDraftCompleteSound() {
  playSound(draftSounds.draftGoodResult, 0.42);
}

export function playCountdownTickSound() {
  const audio = getAudio(draftSounds.countdownTick);
  if (!audio) return;

  if (activeCountdownTick && !activeCountdownTick.paused) return;

  activeCountdownTick = audio;
  audio.currentTime = 0;
  audio.volume = 0.62;
  audio.play().catch(() => {});
}

export function stopCountdownTickSound() {
  activeCountdownTick?.pause();

  if (activeCountdownTick) {
    activeCountdownTick.currentTime = 0;
  }
}

export function playPauseResumeWhistleSound() {
  playSound(draftSounds.pauseResumeWhistle, 0.85);
}

function playNextPickSound() {
  if (pickSoundPlaying) return;
  if (!isDraftSoundEnabled()) {
    pickSoundQueue = [];
    return;
  }

  const pickKey = pickSoundQueue.shift();
  if (!pickKey) return;
  const audio = getAudio(draftSounds.pickSuccess);
  if (!audio) return;

  pickSoundPlaying = true;
  lastPickSoundKey = pickKey;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.58;

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(fallbackTimer);
    audio.removeEventListener("ended", finish);
    activePickSoundCleanup = null;
    pickSoundPlaying = false;
    playNextPickSound();
  };
  const fallbackTimer = window.setTimeout(finish, pickMadeSoundDurationMs + 300);
  activePickSoundCleanup = () => {
    audio.pause();
    audio.currentTime = 0;
    finish();
  };
  audio.addEventListener("ended", finish, { once: true });
  audio.play().catch(finish);
}

export function playPickMadeSound(pickKey = "") {
  if (!isDraftSoundEnabled()) return false;
  const queuedKey = pickKey || `anonymous-pick-${++anonymousPickSoundSequence}`;
  if (queuedKey === lastPickSoundKey || pickSoundQueue.includes(queuedKey)) {
    return false;
  }

  stopCountdownTickSound();
  pickSoundQueue.push(queuedKey);
  playNextPickSound();
  return true;
}
