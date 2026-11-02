import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Platform, Pressable, Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Screen, Tab } from './src/types';
import { colors, makeStyles, space } from './src/theme';
import { useGame } from './src/state/useGame';
import { useProfile } from './src/state/useProfile';
import { normalizeCode, parseInvite } from './src/net/links';
import HomeScreen from './src/screens/HomeScreen';
import JoinScreen from './src/screens/JoinScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import GameScreen from './src/screens/GameScreen';
import ResultScreen from './src/screens/ResultScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RulesScreen from './src/screens/RulesScreen';
import TabBar from './src/components/TabBar';

const TIP_ID = 'home-welcome';
const HOME: Screen = { name: 'tabs', tab: 'home' };
const IS_WEB = Platform.OS === 'web';
const DESKTOP_MIN_WIDTH = 1024;
const CONTENT_MAX = 1280;

// On the web, the invite code comes from the address bar (?code=ABCDE or /join/ABCDE).
function readWebCode(): string | null {
  if (!IS_WEB || typeof window === 'undefined' || !window.location) return null;
  try {
    return parseInvite(window.location.href);
  } catch {
    return null;
  }
}

// Removes the invite code from the address bar so a reload does not jump to Join again.
function clearWebCode(): void {
  if (!IS_WEB || typeof window === 'undefined' || !window.location || !window.history) return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.has('code')) {
      url.searchParams.delete('code');
      changed = true;
    }
    const cleanPath = url.pathname.replace(/\/join\/[^/]*\/?$/i, '/');
    if (cleanPath !== url.pathname) {
      url.pathname = cleanPath;
      changed = true;
    }
    if (changed) window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {
    // ignore: the URL stays as it is
  }
}

function initialScreen(): Screen {
  const code = readWebCode();
  return code ? { name: 'join', code } : HOME;
}

function FadeIn({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [opacity]);
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const scheme = useColorScheme();
  const p = scheme === 'light' ? colors.light : colors.dark;
  const s = useMemo(() => makeStyles(p), [p]);
  const { width: winWidth } = useWindowDimensions();
  const desktop = IS_WEB && winWidth >= DESKTOP_MIN_WIDTH;

  const store = useProfile();
  const { profile } = store;
  const game = useGame(profile);

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [invalid, setInvalid] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [check, setCheck] = useState<{ n: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitted = useRef<string>('');
  const attempts = useRef(0);
  // True from the moment a join is submitted until the first room state arrives.
  const joinGuard = useRef(false);
  // Code to go back to the Join screen if the room had already started.
  const returnToJoin = useRef<string | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const hasState = game.state !== null;
  const hasStateRef = useRef(hasState);
  hasStateRef.current = hasState;

  // Whenever a room appears or disappears, go back to a clean base screen.
  const prevHas = useRef(hasState);
  useEffect(() => {
    if (prevHas.current !== hasState) {
      prevHas.current = hasState;
      if (!hasState && returnToJoin.current) {
        const code = returnToJoin.current;
        returnToJoin.current = null;
        setScreen({ name: 'join', code });
      } else {
        setScreen(HOME);
      }
      setInvalid(false);
    }
  }, [hasState]);

  // After a join, only a lobby may be entered: a room already in play is refused.
  const phase = game.state ? game.state.phase : null;
  useEffect(() => {
    if (!joinGuard.current || phase === null) return;
    joinGuard.current = false;
    if (phase !== 'lobby') {
      returnToJoin.current = submitted.current || null;
      showToast('La partida ya empezó');
      gameRef.current.leave();
    }
  }, [phase, showToast]);

  // Once the invite has been used or cancelled, drop the code from the web URL.
  useEffect(() => {
    const keep = !hasState && screen.name === 'join' && !!screen.code;
    if (!keep) clearWebCode();
  }, [hasState, screen]);

  // Deep links (native). On the web the address bar is read at start-up instead.
  useEffect(() => {
    if (IS_WEB) return;
    const handle = (url: string | null) => {
      const code = parseInvite(url);
      if (!code || hasStateRef.current) return;
      setInvalid(false);
      setScreen({ name: 'join', code });
    };
    let alive = true;
    let remove: (() => void) | null = null;
    try {
      Linking.getInitialURL().then((u) => { if (alive) handle(u); }).catch(() => undefined);
      const sub = Linking.addEventListener('url', (e) => handle(e.url));
      remove = () => { try { sub.remove(); } catch { /* ignore */ } };
    } catch {
      // Linking unavailable: nothing to listen to
    }
    return () => { alive = false; if (remove) remove(); };
  }, []);

  // Expired / unknown code opened from a link.
  useEffect(() => {
    if (!check || game.busy) return;
    if (!game.error) return; // wait until the failure reason is available
    if (game.error === 'not_found' && screen.name === 'join' && screen.code && normalizeCode(submitted.current) === screen.code) {
      setInvalid(true);
    }
    setCheck(null);
  }, [check, game.error, game.busy, screen]);

  const onCreate = useCallback(() => {
    if (profile.name.trim().length < 1) {
      showToast('Escribe tu nombre para crear la partida');
      return;
    }
    void game.createRoom();
  }, [game, profile.name, showToast]);

  const onJoinSubmit = useCallback(async (code: string, name: string) => {
    const clean = normalizeCode(code);
    submitted.current = clean;
    setCheck(null);
    if (name.trim() && name.trim() !== profile.name) store.setName(name.trim());
    joinGuard.current = true;
    const ok = await game.joinRoom(clean, name.trim());
    if (!ok) {
      joinGuard.current = false;
      attempts.current += 1;
      setCheck({ n: attempts.current });
    }
  }, [game, profile.name, store]);

  // Android back button.
  useEffect(() => {
    if (IS_WEB) return;
    let sub: { remove: () => void } | null = null;
    try {
      sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasStateRef.current) {
        const ph = game.state?.phase;
        if (ph === 'lobby') { game.leave(); return true; }
        return true; // block accidental exits from a match
      }
      if (invalid) { setInvalid(false); setScreen(HOME); return true; }
      if (screen.name === 'join') { setScreen(HOME); return true; }
      if (screen.name === 'tabs' && screen.tab !== 'home') { setScreen(HOME); return true; }
      return false;
      });
    } catch {
      sub = null;
    }
    return () => { try { sub?.remove(); } catch { /* ignore */ } };
  }, [game, screen, invalid]);

  const changeTab = useCallback((tab: Tab) => setScreen({ name: 'tabs', tab }), []);

  let key = 'loading';
  let content: React.ReactNode = null;
  let fullScreen = true;

  if (!profile || !store.ready) {
    content = (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={p.accent} accessibilityLabel="Cargando" />
      </View>
    );
  } else if (game.state) {
    const st = game.state;
    if (st.phase === 'lobby') {
      key = 'lobby';
      content = (
        <LobbyScreen
          state={st}
          myColor={game.myColor}
          isHost={game.isHost}
          status={game.status}
          onReady={game.setReady}
          onAddBot={game.addBot}
          onKick={game.kick}
          onStart={game.start}
          onLeave={game.leave}
        />
      );
    } else if (st.phase === 'over') {
      key = 'result' + st.rematchCount;
      content = (
        <ResultScreen state={st} myColor={game.myColor} isHost={game.isHost} onRematch={game.rematch} onExit={game.leave} />
      );
    } else {
      key = 'game' + st.rematchCount;
      content = (
        <GameScreen
          state={st}
          myColor={game.myColor}
          legal={game.legal}
          canRoll={game.canRoll}
          status={game.status}
          settings={profile.settings}
          onRoll={game.roll}
          onMove={(pieceIndex, use) => game.move(pieceIndex, use)}
          onEmote={game.emote}
          onLeave={game.leave}
        />
      );
    }
  } else if (invalid) {
    key = 'invalid';
    content = (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center', gap: space[4] }]}>
        <Text style={[s.title, { textAlign: 'center' }]} accessibilityRole="header">Código no válido</Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>
          Esta sala ya no existe o el enlace ha caducado. Crea una partida nueva y manda tu propio enlace.
        </Text>
        <View style={{ alignSelf: 'stretch', gap: space[2] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Crear partida"
            onPress={() => { setInvalid(false); setScreen(HOME); onCreate(); }}
            style={({ pressed }) => [s.btnPrimary, pressed && s.btnPrimaryPressed]}
          >
            <Text style={s.btnPrimaryLabel} numberOfLines={1}>Crear partida</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio"
            onPress={() => { setInvalid(false); setScreen(HOME); }}
            style={({ pressed }) => [s.btnTertiary, pressed && s.btnTertiaryPressed]}
          >
            <Text style={s.btnTertiaryLabel} numberOfLines={1}>Volver</Text>
          </Pressable>
        </View>
      </View>
    );
  } else if (screen.name === 'join') {
    key = 'join-' + (screen.code ?? '');
    content = (
      <JoinScreen
        initialCode={screen.code}
        defaultName={profile.name}
        busy={game.busy}
        error={game.error}
        onSubmit={(c, n) => { void onJoinSubmit(c, n); }}
        onBack={() => setScreen(HOME)}
      />
    );
  } else {
    const tab: Tab = screen.name === 'tabs' ? screen.tab : 'home';
    key = 'tab-' + tab;
    fullScreen = false;
    const tabBody = (
      <>
          {tab === 'home' && (
            <HomeScreen
              profile={profile}
              busy={game.busy}
              onName={store.setName}
              onCreate={onCreate}
              onJoin={() => setScreen({ name: 'join' })}
              onPractice={() => { void game.startPractice(); }}
              showTip={!profile.seenTips.includes(TIP_ID)}
              onDismissTip={() => store.markTip(TIP_ID)}
            />
          )}
          {tab === 'profile' && <ProfileScreen store={store} />}
          {tab === 'rules' && <RulesScreen />}
      </>
    );
    if (desktop) {
      content = (
        <View style={s.screen}>
          <TabBar tab={tab} onChange={changeTab} />
          <View style={{ flex: 1, width: '100%' }}>{tabBody}</View>
        </View>
      );
    } else {
      content = (
        <View style={s.screen}>
          <View style={{ flex: 1 }}>{tabBody}</View>
          <TabBar tab={tab} onChange={changeTab} />
        </View>
      );
    }
  }

  // Sea screens (lobby, game, result) centre their own content so the sea covers the whole window.
  const wrapped = desktop && fullScreen && !!profile && store.ready && !game.state ? (
    <View style={{ flex: 1, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}>
      {content}
    </View>
  ) : content;

  return (
    <View style={s.screen}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <SafeAreaView
        style={s.screen}
        edges={fullScreen ? ['top', 'bottom', 'left', 'right'] : ['top', 'left', 'right']}
      >
        <FadeIn key={key}>{wrapped}</FadeIn>
      </SafeAreaView>
      {toast ? (
        <View style={s.toast} pointerEvents="none" accessibilityLiveRegion="polite">
          <Text style={s.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}
