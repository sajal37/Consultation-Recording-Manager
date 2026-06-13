import { useEffect, useState } from 'react';
import { ConsultationDetail } from './pages/ConsultationDetail';
import { ConsultationsList } from './pages/ConsultationsList';

/**
 * Minimal hash-based routing — keeps the app dependency-light while still
 * giving shareable/back-button-friendly URLs:
 *   #/                  -> list
 *   #/consultation/:id  -> detail
 */
function parseHash(): { view: 'list' | 'detail'; id?: string } {
  const hash = window.location.hash.replace(/^#/, '');
  const match = hash.match(/^\/consultation\/(.+)$/);
  if (match) return { view: 'detail', id: match[1] };
  return { view: 'list' };
}

export default function App() {
  const [route, setRoute] = useState(parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const go = (hash: string) => {
    window.location.hash = hash;
  };

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <button
            onClick={() => go('/')}
            className="flex items-center gap-2 font-semibold text-slate-900"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white">
              ◉
            </span>
            Consultation Recording Manager
          </button>
        </div>
      </header>

      <main>
        {route.view === 'detail' && route.id ? (
          <ConsultationDetail id={route.id} onBack={() => go('/')} />
        ) : (
          <ConsultationsList onOpen={(id) => go(`/consultation/${id}`)} />
        )}
      </main>
    </div>
  );
}
