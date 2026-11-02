import { AppState, AppStateStatus } from 'react-native';

type Listener = () => void;

const listeners = new Set<Listener>();
let detach: (() => void) | null = null;
let lastFire = 0;
let lastAppState: AppStateStatus | null = null;

const MIN_GAP_MS = 400;

function fire(): void {
  const now = Date.now();
  if (now - lastFire < MIN_GAP_MS) return;
  lastFire = now;
  Array.from(listeners).forEach((cb) => {
    try {
      cb();
    } catch {
      // un suscriptor que falla no debe romper a los demás
    }
  });
}

function attach(): () => void {
  const cleanups: Array<() => void> = [];

  const hasDocument = typeof document !== 'undefined' && typeof document.addEventListener === 'function';
  const hasWindow = typeof window !== 'undefined' && typeof window.addEventListener === 'function';

  if (hasDocument) {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));
  }

  if (hasWindow) {
    const onOnline = () => fire();
    const onFocus = () => fire();
    const onPageShow = () => fire();
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    cleanups.push(() => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
    });
  }

  try {
    lastAppState = AppState.currentState;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const wasInactive = lastAppState !== null && lastAppState !== 'active';
      lastAppState = next;
      if (next === 'active' && wasInactive) fire();
    });
    cleanups.push(() => {
      try {
        sub.remove();
      } catch {
        // ya retirado
      }
    });
  } catch {
    // AppState no disponible: los eventos del navegador bastan
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        // nada que hacer
      }
    });
  };
}

/**
 * Avisa cuando la app vuelve a primer plano o la red se recupera.
 * Devuelve la función para darse de baja.
 */
export function onResume(cb: () => void): () => void {
  listeners.add(cb);
  if (!detach) detach = attach();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && detach) {
      detach();
      detach = null;
    }
  };
}
