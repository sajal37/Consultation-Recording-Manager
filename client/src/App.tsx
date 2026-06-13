import { useEffect, useState } from 'react';
import { ConsultationDetail } from './pages/ConsultationDetail';
import { ConsultationsList } from './pages/ConsultationsList';

// Two views, so a real router would be overkill. The hash is the route:
//   #/                  -> the list
//   #/consultation/:id  -> one consultation
function parseHash(): { view: 'list' | 'detail'; id?: string } {
  const match = window.location.hash.replace(/^#/, '').match(/^\/consultation\/(.+)$/);
  return match ? { view: 'detail', id: match[1] } : { view: 'list' };
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
      <header className="border-b border-line bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <button onClick={() => go('/')} className="group flex items-center gap-3 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-md border border-clay-200 bg-clay-50 font-display text-lg text-clay-600">
              C
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[17px] font-semibold tracking-tight text-ink">
                Casebook
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                consultation recordings
              </span>
            </span>
          </button>
          <span className="hidden font-mono text-[11px] text-ink-faint sm:block">
            record · transcribe · keep
          </span>
        </div>
      </header>

      <main className="pb-20">
        {route.view === 'detail' && route.id ? (
          <ConsultationDetail id={route.id} onBack={() => go('/')} />
        ) : (
          <ConsultationsList onOpen={(id) => go(`/consultation/${id}`)} />
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-4xl px-5 py-5 font-mono text-[11px] text-ink-faint">
          Casebook — a take-home build. Audio stays on this machine.
        </div>
      </footer>
    </div>
  );
}

