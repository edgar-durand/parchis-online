import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

type ShareData = { text?: string; title?: string };

interface WebNavigator {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText?: (text: string) => Promise<void> };
}

interface WebElement {
  value: string;
  style: Record<string, string>;
  setAttribute: (name: string, value: string) => void;
  focus: () => void;
  select: () => void;
  setSelectionRange: (start: number, end: number) => void;
  remove: () => void;
}

interface WebDocument {
  body?: { appendChild: (el: WebElement) => void };
  createElement: (tag: string) => WebElement;
  execCommand?: (command: string) => boolean;
}

interface WebGlobal {
  navigator?: WebNavigator;
  document?: WebDocument;
  isSecureContext?: boolean;
}

function webGlobal(): WebGlobal {
  return globalThis as unknown as WebGlobal;
}

function isAbort(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError';
}

function copyWithTextarea(text: string): boolean {
  try {
    const doc = webGlobal().document;
    if (!doc || !doc.body || typeof doc.execCommand !== 'function') return false;
    const area = doc.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.setAttribute('aria-hidden', 'true');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    area.style.pointerEvents = 'none';
    doc.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = doc.execCommand('copy');
    } finally {
      area.remove();
    }
    return ok;
  } catch {
    return false;
  }
}

/** Copies text to the clipboard. Works on iOS, Android and the web (with a fallback when the Clipboard API is missing). */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  if (Platform.OS === 'web') {
    const g = webGlobal();
    const write = g.navigator?.clipboard?.writeText;
    if (typeof write === 'function' && g.isSecureContext !== false) {
      try {
        await g.navigator!.clipboard!.writeText!(text);
        return true;
      } catch {
        // fall through to the textarea fallback
      }
    }
    return copyWithTextarea(text);
  }
  try {
    return await Clipboard.setStringAsync(text);
  } catch {
    return false;
  }
}

/**
 * Shares a message: the native share sheet on iOS/Android, navigator.share on the web when it exists,
 * otherwise the message is copied to the clipboard ('copied').
 */
export async function shareText(message: string): Promise<'shared' | 'copied' | 'failed'> {
  if (!message) return 'failed';

  if (Platform.OS === 'web') {
    const nav = webGlobal().navigator;
    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share({ text: message });
        return 'shared';
      } catch (error) {
        // The person closed the share sheet: nothing to report and nothing to copy.
        if (isAbort(error)) return 'shared';
        // Any other failure (blocked, unsupported data): fall back to copying.
      }
    }
    return (await copyText(message)) ? 'copied' : 'failed';
  }

  try {
    await Share.share({ message });
    return 'shared';
  } catch {
    return (await copyText(message)) ? 'copied' : 'failed';
  }
}
