import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import type { JoinError, JoinScreenProps } from '../types';
import { space } from '../theme';
import { Button, IconButton, Input, Card, Skeleton, useTheme } from '../components/ui';
import { normalizeCode } from '../net/links';

const CODE_LENGTH = 5;
const PASTE_MAX_LENGTH = 300;
const CODE_TOKEN = /^[A-HJ-KM-NP-Z2-9]{5}$/;

function extractCode(raw: string): string {
  const text = raw.trim();
  if (text.length <= CODE_LENGTH) return normalizeCode(text);
  const patterns: RegExp[] = [
    /[?&#](?:code|c|room|sala)=([A-Za-z0-9]{5})(?![A-Za-z0-9])/i,
    /\/(?:join|unirse|unirme|sala|room)\/([A-Za-z0-9]{5})(?![A-Za-z0-9])/i,
    /c[óo]digo\s*:?\s*([A-Za-z0-9]{5})(?![A-Za-z0-9])/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const c = normalizeCode(m[1]);
      if (c.length === CODE_LENGTH) return c;
    }
  }
  const tokens = text.split(/[^A-Za-z0-9]+/).filter((t) => t.length === CODE_LENGTH);
  const upper = tokens.find((t) => CODE_TOKEN.test(t));
  if (upper) return upper;
  const any = tokens.find((t) => CODE_TOKEN.test(t.toUpperCase()));
  if (any) return any.toUpperCase();
  return normalizeCode(text);
}

const SERVER_MESSAGES: Record<JoinError, string> = {
  not_found: 'Sala no encontrada',
  full: 'Sala llena',
  started: 'La partida ya empezó',
  network: 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
};

const SERVER_HELP: Record<JoinError, string> = {
  not_found: 'Revisa el código con quien creó la partida: puede que haya caducado.',
  full: 'Los cuatro asientos ya están ocupados. Pide al anfitrión una nueva sala.',
  started: 'Esta partida ya está en marcha. Crea una nueva o espera la revancha.',
  network: 'Se reintentará al pulsar de nuevo el botón.',
};

export default function JoinScreen(props: JoinScreenProps): JSX.Element {
  const { initialCode, defaultName, busy, error, onSubmit, onBack } = props;
  const { p, s } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= 1024;

  const [code, setCode] = useState<string>(extractCode(initialCode ?? ''));
  const [name, setName] = useState<string>(defaultName);
  const [codeTouched, setCodeTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    if (initialCode) {
      setCode(extractCode(initialCode));
      setEdited(true);
    }
  }, [initialCode]);

  const cleanName = name.trim();
  const codeLocalError =
    code.length === CODE_LENGTH ? null : code.length === 0 ? 'Escribe el código de la sala' : 'El código tiene 5 caracteres';
  const nameLocalError = cleanName.length > 0 ? null : 'Escribe tu nombre para entrar';

  const serverError = error && !edited ? error : null;
  const codeError =
    (codeTouched ? codeLocalError : null) ??
    (serverError && serverError !== 'network' ? SERVER_MESSAGES[serverError] : null);
  const nameError = nameTouched ? nameLocalError : null;

  const submit = () => {
    if (busy) return;
    setCodeTouched(true);
    setNameTouched(true);
    if (codeLocalError || nameLocalError) return;
    setEdited(false);
    onSubmit(code, cleanName);
  };

  const fromLink = !!initialCode && extractCode(initialCode) === code;

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, styles.centered, isDesktop && styles.desktop]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.row}>
          <IconButton icon="arrow-back" label="Volver" onPress={onBack} variant="tertiary" />
          <Text style={[s.heading, styles.grow]} accessibilityRole="header">
            Unirme a una partida
          </Text>
        </View>

        <Text style={s.muted}>
          {fromLink
            ? 'Has abierto un enlace de invitación. Solo falta tu nombre.'
            : 'Pide el código o el enlace a quien creó la sala. No hace falta cuenta.'}
        </Text>

        <Card>
          <View style={styles.fields}>
            <Input
              label="Código de sala"
              value={code}
              onChange={(v) => {
                setCode(extractCode(v));
                setEdited(true);
              }}
              placeholder="K7P2X"
              maxLength={PASTE_MAX_LENGTH}
              autoCapitalize="characters"
              error={codeError}
            />
            <Input
              label="Tu nombre de pirata"
              value={name}
              onChange={(v) => {
                setName(v);
                setNameTouched(true);
              }}
              placeholder="Ej. Nami"
              maxLength={14}
              autoCapitalize="words"
              error={nameError}
            />
          </View>
        </Card>

        {serverError && !busy ? (
          <View
            style={[styles.alert, { borderColor: p.danger, backgroundColor: p.surface }]}
            accessibilityRole="alert"
          >
            <Text style={[s.body, { color: p.danger, fontWeight: '700' }]}>
              {SERVER_MESSAGES[serverError]}
            </Text>
            <Text style={s.muted}>{SERVER_HELP[serverError]}</Text>
          </View>
        ) : null}

        {busy ? (
          <View style={styles.fields} accessibilityLabel="Buscando la sala">
            <Skeleton height={56} />
            <Text style={s.caption}>Buscando la sala…</Text>
          </View>
        ) : null}

        <Button
          label={serverError === 'network' ? 'Reintentar' : 'Entrar a la sala'}
          icon="enter-outline"
          onPress={submit}
          loading={busy}
          disabled={busy}
        />
        <Text style={[s.caption, styles.center]}>
          Te asignaremos un personaje de One Piece según el asiento libre.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[6],
    gap: space[4],
  },
  centered: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  desktop: {
    paddingTop: space[6],
    paddingBottom: space[6],
    gap: space[4],
  },
  grow: { flex: 1 },
  fields: { gap: space[4] },
  alert: {
    borderWidth: 1,
    borderRadius: 14,
    padding: space[4],
    gap: space[1],
  },
  center: { textAlign: 'center' },
});
