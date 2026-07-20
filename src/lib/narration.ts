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

/**
 * Rough quality score. Modern platforms hide their best voices behind
 * names like "… (Natural)", "Neural", "Premium", "Enhanced"; cloud-served
 * voices also tend to beat the local robotic ones.
 */
export function scoreVoice(v: SpeechSynthesisVoice): number {
  let score = 0;
  if (/natural|neural|premium|enhanced|online/i.test(v.name)) score += 4;
  if (/siri|samantha|aria|jenny|libby|sonia|ava|allison|serena/i.test(v.name)) score += 2;
  if (!v.localService) score += 1;
  if (v.lang.startsWith('en')) score += 1;
  return score;
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

let chainTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Read stanzas one utterance at a time, chained by hand with a breath of
 * silence between them — engines otherwise rush stanza to stanza, which
 * is most of what makes them sound mechanical. Slow rate and slightly
 * lowered pitch warm the delivery further. onStanza fires with the
 * original index as each stanza begins; onDone after the last or on stop.
 */
export function speak(
  stanzas: string[],
  voiceURI: string | null,
  onDone: () => void,
  onStanza?: (index: number) => void
): void {
  if (!('speechSynthesis' in window)) return onDone();
  stopNarration();
  const voice =
    speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI) ?? null;
  active = true;
  const parts = stanzas
    .map((text, index) => ({ text, index }))
    .filter((p) => p.text.trim());

  const next = (i: number): void => {
    if (!active) return;
    if (i >= parts.length) {
      active = false;
      onDone();
      return;
    }
    const u = new SpeechSynthesisUtterance(parts[i].text);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = 0.8;
    u.pitch = 0.92;
    u.onstart = () => onStanza?.(parts[i].index);
    // Pause between stanzas; a shorter one after title/byline (indexes 0-1).
    const gap = parts[i].index < 2 ? 350 : 700;
    u.onend = () => {
      if (active) chainTimer = setTimeout(() => next(i + 1), gap);
    };
    // A stanza an engine refuses shouldn't end the reading.
    u.onerror = () => {
      if (active) chainTimer = setTimeout(() => next(i + 1), 200);
    };
    speechSynthesis.speak(u);
  };
  next(0);
}

export function stopNarration(): void {
  active = false;
  if (chainTimer) clearTimeout(chainTimer);
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
