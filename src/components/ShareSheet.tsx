import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Share, Text, View, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import type { ShareSheetProps } from '../types';
import { colors, radius, space } from '../theme';
import { buildInviteLink, inviteMessage } from '../net/links';
import { Button, Card, useTheme } from './ui';

const COPY_LABEL = 'Copiar enlace';
const COPIED_NOTICE = 'Enlace copiado';
const COPY_FAILED_NOTICE = 'No se pudo copiar. Selecciona el enlace y cópialo a mano.';
const QR_SIZE = 168;

interface WebNavigator {
  share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  canShare?: (data: { title?: string; text?: string; url?: string }) => boolean;
  clipboard?: { writeText?: (text: string) => Promise<void> };
}

interface WebDocument {
  createElement: (tag: string) => {
    value: string;
    style: Record<string, string>;
    setAttribute: (name: string, value: string) => void;
    focus: () => void;
    select: () => void;
    setSelectionRange: (start: number, end: number) => void;
  };
  body: { appendChild: (node: unknown) => void; removeChild: (node: unknown) => void };
  execCommand?: (command: string) => boolean;
}

function webNavigator(): WebNavigator | null {
  if (Platform.OS !== 'web') return null;
  const nav = (globalThis as { navigator?: WebNavigator }).navigator;
  return nav ?? null;
}

/** Copies text with the best option available; returns true when it worked. */
async function copyText(text: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const nav = webNavigator();
    try {
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to the next option
    }
    try {
      const doc = (globalThis as { document?: WebDocument }).document;
      if (doc && typeof doc.execCommand === 'function') {
        const area = doc.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.top = '0';
        area.style.left = '0';
        area.style.opacity = '0';
        doc.body.appendChild(area);
        area.focus();
        area.select();
        area.setSelectionRange(0, text.length);
        let ok = false;
        try {
          ok = doc.execCommand('copy');
        } finally {
          doc.body.removeChild(area);
        }
        if (ok) return true;
      }
    } catch {
      // fall through
    }
  }
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

export default function ShareSheet({ code, hostName }: ShareSheetProps): JSX.Element {
  const { p, s } = useTheme();
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sharing = useRef(false);
  const link = buildInviteLink(code);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const flash = useCallback((text: string, ok: boolean) => {
    setNotice({ text, ok });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const copy = useCallback(async () => {
    const ok = await copyText(link);
    if (ok) flash(COPIED_NOTICE, true);
    else flash(COPY_FAILED_NOTICE, false);
  }, [link, flash]);

  const invite = useCallback(async () => {
    if (sharing.current) return;
    sharing.current = true;
    try {
      const base = inviteMessage(code, hostName);
      const message = base.includes(link) ? base : `${base}\n${link}`;
      const nav = webNavigator();

      if (Platform.OS === 'web') {
        if (nav?.share) {
          const text = base.split(link).join('').trim();
          const data = { title: 'Invitación a la partida', text, url: link };
          let allowed = true;
          try {
            if (nav.canShare) allowed = nav.canShare(data);
          } catch {
            allowed = true;
          }
          if (allowed) {
            try {
              await nav.share(data);
              return;
            } catch (err) {
              const name = (err as { name?: string } | null)?.name;
              if (name === 'AbortError') return; // the person closed the sheet
              // otherwise fall back to copying the message
            }
          }
        }
        const ok = await copyText(message);
        if (ok) flash(COPIED_NOTICE, true);
        else flash(COPY_FAILED_NOTICE, false);
        return;
      }

      try {
        await Share.share({ message });
      } catch {
        const ok = await copyText(link);
        if (ok) flash(COPIED_NOTICE, true);
        else flash('No se pudo compartir. Copia el código a mano.', false);
      }
    } finally {
      sharing.current = false;
    }
  }, [code, hostName, link, flash]);

  return (
    <Card>
      <View style={local.block}>
        <View style={local.center}>
          <Text style={s.caption} accessibilityRole="text">
            CÓDIGO DE SALA
          </Text>
          <Text
            style={s.code}
            accessibilityLabel={`Código de sala ${code.split('').join(' ')}`}
            selectable
          >
            {code}
          </Text>
        </View>

        <Text style={s.muted} selectable accessibilityLabel={`Enlace de invitación ${link}`}>
          {link}
        </Text>

        <View style={local.buttons}>
          <View style={local.grow}>
            <Button label="Invitar" icon="share-social" variant="primary" onPress={invite} />
          </View>
          <View style={local.grow}>
            <Button label={COPY_LABEL} icon="copy" variant="secondary" onPress={copy} />
          </View>
        </View>

        <View style={local.noticeSlot} accessibilityLiveRegion="polite">
          {notice ? (
            <Text
              style={[
                s.muted,
                { color: notice.ok ? p.success : p.danger, fontWeight: '700', textAlign: 'center' },
              ]}
            >
              {notice.text}
            </Text>
          ) : null}
        </View>

        <View style={local.center}>
          <View
            style={[local.qrFrame, { backgroundColor: colors.light.surface }]}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Código QR para unirse a la sala ${code}`}
          >
            <QRCode
              value={link}
              size={QR_SIZE}
              color={colors.light.ink}
              backgroundColor={colors.light.surface}
            />
          </View>
          <Text style={s.caption}>Escanéalo con otro móvil para entrar</Text>
        </View>
      </View>
    </Card>
  );
}

const local = StyleSheet.create({
  block: { gap: space[4] },
  center: { alignItems: 'center', gap: space[2] },
  buttons: { flexDirection: 'row', gap: space[3] },
  grow: { flex: 1 },
  noticeSlot: { minHeight: 20, alignItems: 'center', justifyContent: 'center' },
  qrFrame: { padding: space[3], borderRadius: radius.card },
});
