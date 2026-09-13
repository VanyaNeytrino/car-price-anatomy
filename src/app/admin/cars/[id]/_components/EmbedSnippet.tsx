'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function EmbedSnippet({ origin, carId, layerCount }: { origin: string; carId: string; layerCount: number }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [copied, setCopied] = useState(false);

  const src = `${origin}/embed/${carId}${theme === 'light' ? '?theme=light' : ''}`;
  // Высота зависит от числа слоёв: легенда растёт, и при 9 слоях фиксированные
  // 620px обрезали итоговую сумму.
  const height = Math.max(620, 300 + layerCount * 52);
  const snippet = `<iframe src="${src}" width="100%" height="${height}" frameborder="0" style="border:0"></iframe>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="bg-zinc-900 p-5 sm:p-6 rounded-xl border border-white/10">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-500">Код для сайта</h3>
        <div className="flex gap-1 bg-black rounded-lg p-1 border border-white/5">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${theme === t ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t === 'dark' ? 'Тёмная' : 'Светлая'}
            </button>
          ))}
        </div>
      </div>

      <pre className="block bg-black p-4 rounded border border-white/5 text-xs text-zinc-400 font-mono break-all select-all whitespace-pre-wrap">
        {snippet}
      </pre>

      <button
        type="button"
        onClick={copy}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-sm py-2 rounded-lg transition-colors"
      >
        {copied ? <><Check size={14} /> Скопировано</> : <><Copy size={14} /> Скопировать</>}
      </button>
      <p className="mt-2 text-[11px] text-zinc-600">
        Светлая тема — для сайтов со светлым фоном. Высота {height}px рассчитана
        на {layerCount} {layerCount === 1 ? 'слой' : layerCount < 5 ? 'слоя' : 'слоёв'}.
      </p>
    </div>
  );
}
