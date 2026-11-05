import { useEffect, useState } from 'react';
import { Volume2, Square } from 'lucide-react';
import { TEXT_SIZES, usePrefs } from '../context/PrefsContext.jsx';

/** Text-size switch and "Read this page aloud" — shown on every page. */
export function AccessibilityBar() {
  const { textSize, setTextSize } = usePrefs();
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => () => canSpeak && window.speechSynthesis.cancel(), [canSpeak]);

  const toggleSpeech = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = document.getElementById('main')?.innerText || '';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = 'en-IN';
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Text size" className="flex items-center rounded-xl border-2 border-line bg-white p-1">
        <span className="px-2 text-base font-bold text-muted" aria-hidden>Text</span>
        {TEXT_SIZES.map((s, i) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setTextSize(s.value)}
            aria-pressed={textSize === s.value}
            aria-label={`${s.label} text`}
            title={`${s.label} text`}
            className={`min-h-10 min-w-10 rounded-lg px-2 font-bold cursor-pointer ${
              textSize === s.value ? 'bg-brand text-white' : 'text-ink hover:bg-black/5'
            }`}
            style={{ fontSize: `${1 + i * 0.2}rem` }}
          >
            A
          </button>
        ))}
      </div>
      {canSpeak && (
        <button
          type="button"
          onClick={toggleSpeech}
          className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-line bg-white px-3 text-base font-bold hover:border-brand cursor-pointer"
        >
          {speaking ? <Square className="size-5" aria-hidden /> : <Volume2 className="size-5" aria-hidden />}
          {speaking ? 'Stop reading' : 'Read aloud'}
        </button>
      )}
    </div>
  );
}
