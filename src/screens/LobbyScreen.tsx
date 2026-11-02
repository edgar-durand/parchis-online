import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import type { Color, LobbyScreenProps, Seat } from '../types';
import { CHARACTERS } from '../types';
import { colors, playerColors, radius, space } from '../theme';
import { Button, Card, ConnectionBanner, IconButton, useTheme } from '../components/ui';
import PlayerCard from '../components/PlayerCard';
import ShareSheet from '../components/ShareSheet';
import SeaBackdrop from '../components/SeaBackdrop';

type Confirm = { kind: 'kick'; color: Color } | { kind: 'leave' } | null;

export default function LobbyScreen(props: LobbyScreenProps): JSX.Element {
  const { state, myColor, isHost, status, onReady, onAddBot, onKick, onStart, onLeave } = props;
  const { p, s } = useTheme();
  const { width } = useWindowDimensions();
  const [confirm, setConfirm] = useState<Confirm>(null);

  const seats = state.seats;
  const mySeat: Seat | undefined = seats.find((x) => x.color === myColor);
  const hostSeat = seats.find((x) => x.playerId && !x.isBot);
  const hostName = hostSeat?.name || 'Un pirata';
  const isHostSeat = (seat: Seat) => !!hostSeat && hostSeat.color === seat.color;

  // The host counts as ready on their own: pressing "Empezar" is their confirmation.
  const hostNeedsReady = isHost && !!mySeat && !mySeat.ready;
  useEffect(() => {
    if (hostNeedsReady) onReady(true);
  }, [hostNeedsReady, onReady]);

  const summary = useMemo(() => {
    const empty = seats.filter((x) => !x.playerId && !x.isBot).length;
    const waiting = seats.filter((x) => (x.playerId || x.isBot) && !x.isBot && !x.ready && !isHostSeat(x)).length;
    const humans = seats.filter((x) => x.playerId && !x.isBot).length;
    return { empty, waiting, humans, ok: empty === 0 && waiting === 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seats]);

  const occupied = seats.filter((x) => x.playerId || x.isBot).length;
  const desktop = Platform.OS === 'web' && width >= 1024;
  const contentWidth = desktop ? Math.min(width - space[4] * 2, 1100) : Math.min(width, 560);

  const helper = summary.empty > 0
    ? `Faltan ${summary.empty} ${summary.empty === 1 ? 'asiento' : 'asientos'}: invita a tus amigos o añade bots.`
    : summary.waiting > 0
      ? `Esperando a ${summary.waiting} ${summary.waiting === 1 ? 'jugador' : 'jugadores'} para empezar.`
      : 'Todos listos. ¡A zarpar!';


  const requestKick = (seat: Seat) => {
    if (seat.isBot) onKick(seat.color);
    else setConfirm({ kind: 'kick', color: seat.color });
  };

  const requestLeave = () => {
    if (isHost && summary.humans > 1) setConfirm({ kind: 'leave' });
    else onLeave();
  };

  const confirmName = confirm && confirm.kind === 'kick' ? CHARACTERS[confirm.color].name : '';

  return (
    <SeaBackdrop>
      <View style={styles.fill}>
        {status !== 'online' ? <ConnectionBanner status={status} /> : null}
        <View style={[styles.header, { width: contentWidth, paddingHorizontal: space[4] }]}>
          <View style={styles.headerText}>
            <Text style={[s.title, { color: colors.dark.ink }]} accessibilityRole="header">Sala</Text>
            <Text style={[s.muted, { color: colors.dark.inkMuted }]}>{occupied}/4 en la tripulación</Text>
          </View>
          <IconButton icon="log-out-outline" label="Salir de la sala" variant="secondary" onPress={requestLeave} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { width: contentWidth }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={desktop ? styles.colsDesktop : styles.colsMobile}>
          <View style={desktop ? styles.leftDesktop : styles.colMobile}>
            <ShareSheet code={state.roomCode} hostName={hostName} />
          </View>
          <View style={desktop ? styles.rightDesktop : styles.colMobile}>
          <View style={styles.seats}>
            {seats.map((seat) => {
              const ch = CHARACTERS[seat.color];
              const taken = !!seat.playerId || seat.isBot;
              if (!taken) {
                return (
                  <View key={seat.color} style={[s.card, styles.emptySeat]}>
                    <View style={[styles.dot, { backgroundColor: playerColors[seat.color] }]} />
                    <View style={styles.emptyText}>
                      <Text style={s.body}>{ch.name}</Text>
                      <Text style={s.muted}>Asiento libre</Text>
                    </View>
                    {isHost ? (
                      <Button
                        label="Añadir bot"
                        icon="hardware-chip-outline"
                        variant="secondary"
                        onPress={() => onAddBot(seat.color)}
                      />
                    ) : (
                      <Text style={s.caption}>Esperando…</Text>
                    )}
                  </View>
                );
              }
              const canKick = isHost && seat.color !== myColor;
              return (
                <View key={seat.color} style={styles.seatWrap}>
                  <PlayerCard
                    seat={seat}
                    state={state}
                    isMe={seat.color === myColor}
                    isTurn={false}
                    piecesHome={0}
                    onKick={canKick ? () => requestKick(seat) : undefined}
                  />
                </View>
              );
            })}
          </View>

          {confirm ? (
            <Card>
              <Text style={s.body}>
                {confirm.kind === 'kick'
                  ? `¿Expulsar a ${confirmName} de la sala?`
                  : 'Si sales, la sala pasa al siguiente jugador como anfitrión.'}
              </Text>
              <View style={styles.confirmRow}>
                <View style={styles.flex}>
                  <Button label="Cancelar" variant="secondary" onPress={() => setConfirm(null)} />
                </View>
                <View style={styles.flex}>
                  <Button
                    label={confirm.kind === 'kick' ? 'Expulsar' : 'Salir'}
                    variant="danger"
                    onPress={() => {
                      const c = confirm;
                      setConfirm(null);
                      if (c.kind === 'kick') onKick(c.color);
                      else onLeave();
                    }}
                  />
                </View>
              </View>
            </Card>
          ) : null}
          </View>
          </View>
        </ScrollView>

        <View style={[styles.bottom, { backgroundColor: p.surface, borderTopColor: p.line }]}>
          <View style={{ width: desktop ? Math.min(contentWidth - space[4] * 2, 480) : contentWidth - space[4] * 2, gap: space[2] }}>
            {isHost ? (
              <>
                <Text style={s.muted} accessibilityLiveRegion="polite">{helper}</Text>
                <Button label="Empezar" icon="play" disabled={!summary.ok} onPress={onStart} />
              </>
            ) : mySeat?.ready ? (
              <>
                <Text style={s.muted} accessibilityLiveRegion="polite">
                  Estás listo. Esperando a que el anfitrión empiece.
                </Text>
                <Button label="Quitar listo" variant="secondary" onPress={() => onReady(false)} />
              </>
            ) : (
              <>
                <Text style={s.muted}>Pulsa Listo cuando quieras jugar.</Text>
                <Button label="Listo" icon="checkmark" disabled={!mySeat} onPress={() => onReady(true)} />
              </>
            )}
          </View>
        </View>
      </View>
    </SeaBackdrop>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center' },
  scrollView: { flex: 1, width: '100%' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space[4],
    paddingBottom: space[3],
    gap: space[3],
  },
  headerText: { flex: 1 },
  scroll: {
    alignSelf: 'center',
    paddingHorizontal: space[4],
    paddingBottom: space[5],
    gap: space[4],
  },
  codeBlock: { alignItems: 'center', gap: space[1], paddingBottom: space[3] },
  colsMobile: { flexDirection: 'column', gap: space[4], width: '100%' },
  colsDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: space[5], width: '100%' },
  colMobile: { gap: space[4], width: '100%' },
  leftDesktop: { width: 420, gap: space[4] },
  rightDesktop: { flex: 1, gap: space[4], minWidth: 0 },
  seats: { gap: space[3] },
  seatWrap: { gap: space[2] },
  emptySeat: { flexDirection: 'row', alignItems: 'center', gap: space[3], flexWrap: 'wrap' },
  emptyText: { flex: 1, minWidth: 96 },
  dot: { width: 24, height: 24, borderRadius: radius.pawn, opacity: 0.55 },
  confirmRow: { flexDirection: 'row', gap: space[3], marginTop: space[3] },
  bottom: {
    width: '100%',
    alignItems: 'center',
    paddingTop: space[3],
    paddingBottom: space[5],
    borderTopWidth: 1,
  },
});
