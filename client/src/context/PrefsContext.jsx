import { createContext, useContext, useEffect, useState } from 'react';

const PrefsContext = createContext(null);
const KEY = 'dlm.textSize';
export const TEXT_SIZES = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra large' },
];

function readStored() {
  try {
    return localStorage.getItem(KEY) || 'normal';
  } catch {
    return 'normal';
  }
}

/** Remembers the reader's preferred text size on this device. */
export function PrefsProvider({ children }) {
  const [textSize, setTextSize] = useState(readStored);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
    try {
      localStorage.setItem(KEY, textSize);
    } catch {
      /* private browsing — fine */
    }
  }, [textSize]);

  return <PrefsContext.Provider value={{ textSize, setTextSize }}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);
