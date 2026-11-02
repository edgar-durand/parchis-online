import React, { useState } from 'react';
import { Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { COLORS, CHARACTERS } from '../types';
import type { HomeScreenProps } from '../types';
import { colors, fonts, space } from '../theme';
import { Button, Card, Input, useTheme } from '../components/ui';
import SeaBackdrop from '../components/SeaBackdrop';
import CharacterEmblem from '../components/CharacterEmblem';

const NAME_MAX = 14;
const DESKTOP_MIN_WIDTH = 1024;
const CONTENT_MAX = 1120;
// Text drawn straight on the night sea always uses the sea (dark) palette so it stays readable.
const sea = colors.dark;

export default function HomeScreen(props: HomeScreenProps): JSX.Element {
  const { profile, busy, onName, onCreate, onJoin, onPractice, showTip, onDismissTip } = props;
  const { p, s } = useTheme();
  const { width } = useWindowDimensions();
  const [error, setError] = useState<string | null>(null);

  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;

  const titleSize = isDesktop
    ? Math.max(44, Math.min(56, Math.round(width * 0.04)))
    : Math.max(28, Math.min(44, Math.round(width * 0.11)));
  const badge = isDesktop
    ? 88
    : Math.max(48, Math.min(72, Math.floor((width - space[4] * 2 - space[3] * 3) / 4)));

  const requireName = (): boolean => {
    if (profile.name.trim().length === 0) {
      setError('Escribe tu nombre para que tus amigos te reconozcan');
      return false;
    }
    setError(null);
    return true;
  };

  const handleCreate = () => {
    if (busy) return;
    if (requireName()) onCreate();
  };
  const handlePractice = () => {
    if (busy) return;
    if (requireName()) onPractice();
  };
  const handleJoin = () => {
    if (busy) return;
    onJoin();
  };

  const favorite = CHARACTERS[profile.favorite];

  const heading = (
    <View style={{ gap: space[2] }}>
      <Text style={[s.caption, { color: sea.accent, letterSpacing: 2, fontWeight: '800' }]}>PARCHÍS PIRATA · 4 JUGADORES</Text>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fonts.display, fontWeight: '900', color: sea.ink, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.15) }}
      >
        Zarpa con tu tripulación
      </Text>
      <Text style={[s.muted, { color: sea.inkMuted }]}>Crea una sala, manda el enlace y juega desde cada móvil. Sin cuentas.</Text>
    </View>
  );

  const characters = (
    <View
      style={
        isDesktop
          ? { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] }
          : { flexDirection: 'row', justifyContent: 'space-between' }
      }
    >
      {COLORS.map((c) => (
        <View key={c} style={{ alignItems: 'center', gap: space[1], width: badge }}>
          <CharacterEmblem color={c} size={badge} variant="badge" />
          <Text style={[s.caption, { color: sea.ink, fontWeight: '700' }]}>{CHARACTERS[c].name}</Text>
        </View>
      ))}
    </View>
  );

  const actions = (
    <Card>
      <View style={{ gap: space[4] }}>
        <Input
          label="Tu nombre de pirata"
          value={profile.name}
          onChange={(v) => {
            if (error) setError(null);
            onName(v);
          }}
          placeholder="Ej. Marina"
          maxLength={NAME_MAX}
          autoCapitalize="words"
          error={error}
        />
        <Text style={s.muted}>
          Personaje favorito: {favorite.name}. Se asigna según el asiento al entrar en la sala.
        </Text>
        <View style={{ gap: space[3] }}>
          <Button label="Crear partida" icon="add-circle-outline" variant="primary" onPress={handleCreate} loading={busy} disabled={busy} />
          <Button label="Unirme con código" icon="link-outline" variant="secondary" onPress={handleJoin} disabled={busy} />
          <Button label="Jugar contra bots" icon="hardware-chip-outline" variant="tertiary" onPress={handlePractice} disabled={busy} />
        </View>
      </View>
    </Card>
  );

  const tip = showTip ? (
    <Card>
      <View style={{ gap: space[3] }}>
        <Text style={s.heading}>Cómo se gana</Text>
        <Text style={s.muted}>
          Saca ficha con un 5, captura rivales para avanzar 20 casillas extra y lleva tus cuatro fichas a la meta antes que nadie.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Button label="Entendido" variant="tertiary" onPress={onDismissTip} />
        </View>
      </View>
    </Card>
  ) : null;

  if (isDesktop) {
    return (
      <SeaBackdrop>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: space[6], paddingVertical: space[6] }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              width: '100%',
              maxWidth: CONTENT_MAX,
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[6],
            }}
          >
            <View style={{ flex: 1, gap: space[5] }}>
              {heading}
              {characters}
            </View>
            <View style={{ flex: 1, maxWidth: 480, gap: space[4] }}>
              {actions}
              {tip}
            </View>
          </View>
        </ScrollView>
      </SeaBackdrop>
    );
  }

  return (
    <SeaBackdrop>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingTop: space[6], paddingBottom: space[6], gap: space[5] }}
        keyboardShouldPersistTaps="handled"
      >
        {heading}
        {characters}
        {actions}
        {tip}
      </ScrollView>
    </SeaBackdrop>
  );
}
