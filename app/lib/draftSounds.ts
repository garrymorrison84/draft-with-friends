const draftSoundStorageKey = "dwf:draft-sounds-enabled";

const draftSounds = {
  countdownTick: "/sounds/countdown-tick.mp3",
  draftGoodResult: "/sounds/draft-good-result.mp3",
  pickSuccess: "/sounds/pick-success.mp3",
  pauseResumeWhistle: "/sounds/pause-resume-whistle.mp3",
};

const audioCache = new Map<string, HTMLAudioElement>();
let activeCountdownTick: HTMLAudioElement | null = null;
let lastPickSoundKey = "";
let lastPickSoundAt = 0;

export function isDraftSoundEnabled() {
  if (typeof window === "undefined") return true;

  return window.localStorage.getItem(draftSoundStorageKey) !== "false";
}

export function setDraftSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(draftSoundStorageKey, enabled ? "true" : "false");
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

function playSingleSound(src: string, volume = 0.72) {
  const audio = getAudio(src);
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
}

export function preloadDraftSounds() {
  Object.values(draftSounds).forEach((src) => {
    getAudio(src);
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

export function playPickMadeSound(pickKey = "") {
  const playedAt = Date.now();
  if (
    playedAt - lastPickSoundAt < 1000 &&
    (!pickKey || pickKey === lastPickSoundKey)
  ) {
    return;
  }

  lastPickSoundKey = pickKey;
  lastPickSoundAt = playedAt;
  stopCountdownTickSound();
  playSingleSound(draftSounds.pickSuccess, 0.58);
}
