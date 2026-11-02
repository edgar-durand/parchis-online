// Room codes and invite links: generate a code, build the link and share text, read an incoming link.
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// No 0/O, 1/I/L: codes are read aloud and typed by hand. Shared by every module that makes codes.
export const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;
const INVITE_SCHEME = 'parchis://join';

type WebLocation = { origin?: string; pathname?: string; href?: string; protocol?: string };

// The browser's current location, or null outside the web (or when there is none).
function webLocation(): WebLocation | null {
  if (Platform.OS !== 'web') return null;
  const loc = (globalThis as { location?: WebLocation }).location;
  return loc ?? null;
}

// The https address of the app itself (origin + base path, without any /join/CODE tail), or null.
function webBase(): string | null {
  const loc = webLocation();
  if (!loc || !loc.origin || !/^https?:$/i.test(loc.protocol || '')) return null;
  const path = (loc.pathname || '/').replace(/\/join\/[A-Za-z0-9]*\/?$/i, '/');
  return `${loc.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

// Looks for an explicit code inside a link or pasted text; returns the raw candidate or null.
function findExplicitCode(text: string): string | null {
  const q = /[?&#]code=([A-Za-z0-9]+)/i.exec(text);
  if (q) return q[1];
  const p = /\/join\/([A-Za-z0-9]+)/i.exec(text);
  if (p) return p[1];
  const w = /c[oó]digo\s*[:=]?\s*([A-Za-z0-9]{5})(?![A-Za-z0-9])/i.exec(text);
  if (w) return w[1];
  return null;
}

export function makeRoomCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return out;
}

function clean(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Accepts a typed code, a full link or a pasted invitation text and returns up to 5 code characters.
export function normalizeCode(input: string): string {
  const text = input || '';
  const explicit = findExplicitCode(text);
  if (explicit) return clean(explicit).slice(0, CODE_LENGTH);

  const stripped = clean(text);
  if (stripped.length <= CODE_LENGTH) return stripped;

  // Longer free text: look for a standalone upper-case word made only of code characters.
  const tokens = text.split(/[^A-Za-z0-9]+/);
  for (const token of tokens) {
    if (
      token.length === CODE_LENGTH &&
      token === token.toUpperCase() &&
      token.split('').every((ch) => ALPHABET.indexOf(ch) >= 0) &&
      /[0-9]/.test(token)
    ) {
      return token;
    }
  }
  for (const token of tokens) {
    if (
      token.length === CODE_LENGTH &&
      token === token.toUpperCase() &&
      token.split('').every((ch) => ALPHABET.indexOf(ch) >= 0)
    ) {
      return token;
    }
  }
  return stripped.slice(0, CODE_LENGTH);
}

export function buildInviteLink(code: string): string {
  const c = normalizeCode(code);
  const base = webBase();
  if (base) return `${base}?code=${c}`;
  return `${INVITE_SCHEME}?code=${c}`;
}

export function inviteMessage(code: string, hostName: string): string {
  const c = normalizeCode(code);
  const host = (hostName || '').trim() || 'Un pirata';
  return `${host} te invita a una partida de Parchís pirata con Luffy, Sanji, Zoro y Jinbe. Entra con el código ${c} o con este enlace: ${buildInviteLink(c)}`;
}

// Returns a valid 5-character room code found in a link, or null.
export function parseInvite(url: string | null): string | null {
  let source = url;
  if (!source) {
    const loc = webLocation();
    if (loc && loc.href) source = loc.href;
  }
  if (!source) return null;
  return parseInviteText(source);
}

function parseInviteText(url: string): string | null {
  let candidate: string | null = null;

  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams ? parsed.queryParams['code'] : undefined;
    const fromQuery = Array.isArray(q) ? q[0] : q;
    if (typeof fromQuery === 'string' && fromQuery) {
      candidate = fromQuery;
    } else if (parsed.path) {
      const m = /(?:^|\/)join\/([A-Za-z0-9]+)/.exec(parsed.path);
      if (m) {
        candidate = m[1];
      } else if (parsed.hostname === 'join') {
        const seg = /^([A-Za-z0-9]+)$/.exec(parsed.path.replace(/^\/+|\/+$/g, ''));
        if (seg) candidate = seg[1];
      }
    }
  } catch {
    candidate = null;
  }

  if (!candidate) candidate = findExplicitCode(url);
  if (!candidate) return null;
  const code = clean(candidate);
  return code.length === CODE_LENGTH ? code : null;
}
