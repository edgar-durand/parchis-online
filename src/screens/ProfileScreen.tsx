import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { CHARACTERS, COLORS } from '../types';
import type { Color, MatchRecord, ProfileScreenProps } from '../types';
import { fonts, radius, space, type } from '../theme';
import { Button, Card, EmptyState, Input, Toast, useTheme } from '../components/ui';
import CharacterEmblem from '../components/CharacterEmblem';

const DESKTOP_MIN = 1024;

function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
}

function formatWhen(ts: number): string {
  const days = Math.round((ts - Date.now()) / 86400000);
  try {
    if (Math.abs(days) < 7) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(days, 'day');
    }
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

function formatDuration(sec: number): string {
  const m = Math.max(1, Math.round(sec / 60));
  return `${formatNumber(m)} min`;
}

export default function ProfileScreen({ store }: ProfileScreenProps): JSX.Element {
  const { p, s } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= DESKTOP_MIN;
  const { profile, history, stats } = store;

  const [name, setNameLocal] = useState(profile.name);
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (profile.name.trim() !== name.trim() && profile.name.trim() !== '') setNameLocal(profile.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.name]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const onName = (v: string) => {
    setNameLocal(v);
    setTouched(true);
    if (v.trim().length > 0) store.setName(v.trim());
  };

  const nameError = touched && name.trim().length === 0 ? 'Escribe un nombre para que tus amigos te reconozcan' : null;

  const onFavorite = (c: Color) => {
    if (c === profile.favorite) return;
    store.setFavorite(c);
    showToast(`${CHARACTERS[c].name} es tu personaje favorito`);
  };

  const onClear = () => {
    store.clearHistory();
    setConfirming(false);
    showToast('Historial borrado');
  };

  const recent: MatchRecord[] = history.slice(0, 20);
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

  const nameBlock = (
    <Card>
      <Input
        label="Tu nombre de pirata"
        value={name}
        onChange={onName}
        placeholder="Ej. Nami"
        maxLength={14}
        autoCapitalize="words"
        error={nameError}
      />
    </Card>
  );

  const favBlock = (
    <View style={styles.section}>
      <Text style={s.heading} accessibilityRole="header">
        Personaje favorito
      </Text>
      <View style={styles.favGrid}>
        {COLORS.map((c) => {
          const ch = CHARACTERS[c];
          const selected = profile.favorite === c;
          return (
            <Pressable
              key={c}
              onPress={() => onFavorite(c)}
              accessibilityRole="radio"
              accessibilityLabel={`${ch.name}, ${ch.title}`}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.fav,
                { backgroundColor: p.surface, borderColor: selected ? p.accent : p.line },
                selected && { backgroundColor: p.accentSoft },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <CharacterEmblem color={c} size={48} variant="badge" />
              <Text style={[s.body, styles.favName, selected && { color: p.accent, fontWeight: '800' }]}>{ch.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const statsBlock = (
    <View style={styles.section}>
      <Text style={s.heading} accessibilityRole="header">
        Tus números
      </Text>
      <Card>
        <View style={styles.statsRow}>
          <Stat label="Partidas" value={formatNumber(stats.played)} />
          <Stat label="Victorias" value={formatNumber(stats.wins)} />
          <Stat label="Capturas" value={formatNumber(stats.captures)} />
        </View>
        {stats.played > 0 ? (
          <Text style={[s.muted, styles.rate]}>{`${formatNumber(winRate)} % de victorias`}</Text>
        ) : null}
      </Card>
    </View>
  );

  const historyBlock = (
    <View style={styles.section}>
      <Text style={s.heading} accessibilityRole="header">
        Últimas partidas
      </Text>
      {recent.length === 0 ? (
        <Card>
          <EmptyState
            icon="trophy-outline"
            title="Aún sin travesías"
            line="Cuando termines una partida aparecerá aquí con su resultado."
          />
        </Card>
      ) : (
        <Card>
          {recent.map((m, i) => {
            const won = m.winner === m.myColor;
            const winnerName = CHARACTERS[m.winner].name;
            return (
              <View
                key={m.id}
                style={[
                  styles.histRow,
                  i < recent.length - 1 && { borderBottomWidth: 1, borderBottomColor: p.line },
                ]}
                accessible
                accessibilityLabel={`${won ? 'Victoria' : 'Derrota'}, ${CHARACTERS[m.myColor].name}, ${m.piecesHome} de 4 fichas en meta`}
              >
                <CharacterEmblem color={m.myColor} size={40} variant="badge" />
                <View style={styles.histText}>
                  <Text style={[s.body, { fontWeight: '700' }]}>
                    {won ? 'Victoria' : `Ganó ${winnerName}`}
                  </Text>
                  <Text style={s.muted}>
                    {`${formatWhen(m.date)} · ${m.roomCode} · ${formatNumber(m.captures)} capt. · ${formatDuration(m.durationSec)}`}
                  </Text>
                </View>
                <Text style={[s.body, styles.histValue, { color: won ? p.success : p.ink }]}>{`${m.piecesHome}/4`}</Text>
              </View>
            );
          })}
        </Card>
      )}
      {recent.length > 0 ? (
        confirming ? (
          <Card>
            <Text style={s.body}>¿Borrar las {formatNumber(history.length)} partidas guardadas y las estadísticas?</Text>
            <View style={styles.confirmRow}>
              <View style={styles.flex}>
                <Button label="Cancelar" variant="secondary" onPress={() => setConfirming(false)} />
              </View>
              <View style={styles.flex}>
                <Button label="Borrar" variant="danger" icon="trash-outline" onPress={onClear} />
              </View>
            </View>
          </Card>
        ) : (
          <Button label="Borrar historial" variant="tertiary" icon="trash-outline" onPress={() => setConfirming(true)} />
        )
      ) : null}
    </View>
  );

  const settingsBlock = (
    <View style={styles.section}>
      <Text style={s.heading} accessibilityRole="header">
        Ajustes
      </Text>
      <Card>
        <SettingRow
          title="Vibración"
          line="En el dado, las capturas y los emotes"
          value={profile.settings.haptics}
          onChange={(v) => store.setSettings({ haptics: v })}
        />
        <View style={[styles.hairline, { backgroundColor: p.line }]} />
        <SettingRow
          title="Sonido"
          line="Pasos, dados, capturas, emotes y tu turno"
          value={profile.settings.sound !== false}
          onChange={(v) => store.setSettings({ sound: v })}
        />
        <View style={[styles.hairline, { backgroundColor: p.line }]} />
        <SettingRow
          title="Tablero fijo"
          line="Sin girar la vista para dejar tu color abajo"
          value={profile.settings.fixedBoard}
          onChange={(v) => store.setSettings({ fixedBoard: v })}
        />
      </Card>
    </View>
  );

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, desktop && styles.contentDesktop]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.inner, desktop && styles.innerDesktop]}>
          <Text style={s.title} accessibilityRole="header">
            Perfil
          </Text>

          {desktop ? (
            <View style={styles.columns}>
              <View style={styles.column}>
                {nameBlock}
                {favBlock}
                {settingsBlock}
              </View>
              <View style={styles.column}>
                {statsBlock}
                {historyBlock}
              </View>
            </View>
          ) : (
            <>
              {nameBlock}
              {favBlock}
              {statsBlock}
              {historyBlock}
              {settingsBlock}
            </>
          )}
        </View>
      </ScrollView>
      <Toast message={toast} />
    </View>
  );

  function Stat({ label, value }: { label: string; value: string }) {
    return (
      <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
        <Text style={[styles.statValue, { color: p.accent }]}>{value}</Text>
        <Text style={s.caption}>{label}</Text>
      </View>
    );
  }

  function SettingRow(props: { title: string; line: string; value: boolean; onChange(v: boolean): void }) {
    return (
      <View style={styles.settingRow}>
        <View style={styles.histText}>
          <Text style={[s.body, { fontWeight: '600' }]}>{props.title}</Text>
          <Text style={s.muted}>{props.line}</Text>
        </View>
        <Switch
          value={props.value}
          onValueChange={props.onChange}
          accessibilityLabel={props.title}
          trackColor={{ false: p.line, true: p.accent }}
          thumbColor={p.ink}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  content: { padding: space[4], paddingBottom: space[7] },
  contentDesktop: { padding: space[5], paddingBottom: space[7], alignItems: 'center' },
  inner: { gap: space[5], width: '100%' },
  innerDesktop: { maxWidth: 1100 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space[5] },
  column: { flex: 1, minWidth: 0, gap: space[5] },
  section: { gap: space[3] },
  favGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  fav: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    borderRadius: radius.card,
    borderWidth: 2,
  },
  favName: { flexShrink: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  stat: { flex: 1, alignItems: 'center', gap: space[1] },
  statValue: {
    ...type.xl,
    fontFamily: fonts.display,
    fontVariant: ['tabular-nums'],
  },
  rate: { textAlign: 'center', marginTop: space[3] },
  histRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  histText: { flex: 1, gap: 2 },
  histValue: { fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'right', minWidth: 40 },
  confirmRow: { flexDirection: 'row', gap: space[3], marginTop: space[3] },
  flex: { flex: 1 },
  settingRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] },
  hairline: { height: 1 },
});
