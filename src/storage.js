import { useState, useEffect } from 'react';
export function useSavedState(key, initial, validate = Array.isArray) {
  const [value, setValue] = useState(() => {
    try { const parsed = JSON.parse(localStorage.getItem('morrow-v1-' + key)); return validate(parsed) ? parsed : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem('morrow-v1-' + key, JSON.stringify(value)); } catch { /* Private browsing may limit persistence; state remains usable. */ } }, [key, value]);
  return [value, setValue];
}
export function downloadText(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
