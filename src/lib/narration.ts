/**
 * Poem narration via the browser's built-in speechSynthesis voices.
 * The API doesn't expose voice gender, so grouping is a best-effort
 * heuristic on well-known platform voice names.
 */

const FEMALE =
  /female|samantha|victoria|karen|moira|tessa|fiona|zira|susan|hazel|serena|allison|ava|joana|luciana|amélie|amelie|anna|ellen|kate|nicky|aria|jenny|libby|sonia|natasha|salli|joanna|kimberly|ivy|kendra|emma|olivia|martha|catherine|shelley|sandy|flo|kathy/i;
const MALE =
  /\bmale|daniel|alex\b|fred|aaron|arthur|gordon|oliver|thomas|david|mark\b|james|guy\b|ryan|william|matthew|brian|russell|kevin|justin|joey|george|eddy|reed|rocko|grandpa/i;

export type VoiceGroup = 'female' | 'male' | 'other';

export function classify(v: SpeechSynthesisVoice): VoiceGroup {
  if (FEMALE.test(v.name)) return 'female';
  if (MALE.test(v.name)) return 'male';
  return 'other';
}

/** Voices load asynchronously on some platforms; resolves when available. */
export function voicesReady(cb: (voices: SpeechSynthesisVoice[]) => void): void {
  if (!('speechSynthesis' in window)) return cb([]);
  const got = speechSynthesis.getVoices();
  if (got.length) return cb(got);
  speechSynthesis.addEventListener(
    'voiceschanged',
    () => cb(speechSynthesis.getVoices()),
    { once: true }
  );
}

let active = false;

export function narrating(): boolean {
  return active;
}

/**
 * Read stanzas one utterance at a time (long single utterances get cut off
 * on some engines). onDone fires after the last stanza or on cancel.
 */
export function speak(
  stanzas: string[],
  voiceURI: string | null,
  onDone: () => void
): void {
  if (!('speechSynthesis' in window)) return onDone();
  stopNarration();
  const voice =
    speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI) ?? null;
  active = true;
  const parts = stanzas.filter((s) => s.trim());
  parts.forEach((text, i) => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = 0.88;
    if (i === parts.length - 1) {
      u.onend = () => {
        active = false;
        onDone();
      };
    }
    speechSynthesis.speak(u);
  });
  if (!parts.length) {
    active = false;
    onDone();
  }
}

export function stopNarration(): void {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  active = false;
}
