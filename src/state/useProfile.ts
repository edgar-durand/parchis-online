import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../types';
import type { Color, MatchRecord, Profile, ProfileStore, Settings, Stats } from '../types';

const PROFILE_KEY = 'parchis.profile.v1';
const DATA_KEY = 'parchis.history.v1';
const HISTORY_LIMIT = 20;
const NAME_LIMIT = 20;

interface Data { history: MatchRecord[]; stats: Stats }

function newPlayerId(): string {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function defaultProfile(): Profile {
  return {
    playerId: newPlayerId(),
    name: '',
    favorite: 'red',
    settings: { haptics: true, fixedBoard: false, sound: true },
    seenTips: [],
  };
}

const emptyData: Data = { history: [], stats: { played: 0, wins: 0, captures: 0 } };

function isColor(v: unknown): v is Color {
  return typeof v === 'string' && (COLORS as string[]).includes(v);
}

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0;
}

function parseProfile(raw: string | null): Profile {
  const base = defaultProfile();
  if (!raw) return base;
  try {
    const o = JSON.parse(raw) as Partial<Profile> & { settings?: Partial<Settings> };
    return {
      playerId: typeof o.playerId === 'string' && o.playerId ? o.playerId : base.playerId,
      name: typeof o.name === 'string' ? o.name.slice(0, NAME_LIMIT) : '',
      favorite: isColor(o.favorite) ? o.favorite : base.favorite,
      settings: {
        haptics: typeof o.settings?.haptics === 'boolean' ? o.settings.haptics : base.settings.haptics,
        fixedBoard: typeof o.settings?.fixedBoard === 'boolean' ? o.settings.fixedBoard : base.settings.fixedBoard,
        sound: typeof o.settings?.sound === 'boolean' ? o.settings.sound : base.settings.sound,
      },
      seenTips: Array.isArray(o.seenTips) ? o.seenTips.filter((t): t is string => typeof t === 'string') : [],
    };
  } catch {
    return base;
  }
}

function parseData(raw: string | null): Data {
  if (!raw) return emptyData;
  try {
    const o = JSON.parse(raw) as { history?: unknown; stats?: Partial<Stats> };
    const history: MatchRecord[] = Array.isArray(o.history)
      ? (o.history as MatchRecord[])
          .filter(
            (m) =>
              m && typeof m.id === 'string' && isColor(m.myColor) && isColor(m.winner) && typeof m.date === 'number',
          )
          .map((m) => ({
            id: m.id,
            date: m.date,
            roomCode: typeof m.roomCode === 'string' ? m.roomCode : '',
            myColor: m.myColor,
            winner: m.winner,
            captures: num(m.captures),
            piecesHome: num(m.piecesHome),
            durationSec: num(m.durationSec),
          }))
          .slice(0, HISTORY_LIMIT)
      : [];
    return {
      history,
      stats: { played: num(o.stats?.played), wins: num(o.stats?.wins), captures: num(o.stats?.captures) },
    };
  } catch {
    return emptyData;
  }
}

export function useProfile(): ProfileStore {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [data, setData] = useState<Data>(emptyData);

  useEffect(() => {
    let alive = true;
    (async () => {
      let p: Profile | null = null;
      let d: Data = emptyData;
      try {
        const [rawP, rawD] = await Promise.all([AsyncStorage.getItem(PROFILE_KEY), AsyncStorage.getItem(DATA_KEY)]);
        p = parseProfile(rawP);
        d = parseData(rawD);
      } catch {
        p = null;
      }
      if (!alive) return;
      if (p) setProfile(p);
      setData(d);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Persist after the first load only, so defaults never overwrite saved data.
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)).catch(() => undefined);
  }, [ready, profile]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(DATA_KEY, JSON.stringify(data)).catch(() => undefined);
  }, [ready, data]);

  const setName = useCallback((name: string) => {
    setProfile((p) => ({ ...p, name: name.slice(0, NAME_LIMIT) }));
  }, []);

  const setFavorite = useCallback((c: Color) => {
    setProfile((p) => (p.favorite === c ? p : { ...p, favorite: c }));
  }, []);

  const setSettings = useCallback((s: Partial<Settings>) => {
    setProfile((p) => ({ ...p, settings: { ...p.settings, ...s } }));
  }, []);

  const markTip = useCallback((id: string) => {
    setProfile((p) => (p.seenTips.includes(id) ? p : { ...p, seenTips: [...p.seenTips, id] }));
  }, []);

  const addMatch = useCallback((m: MatchRecord) => {
    setData((d) => {
      if (d.history.some((h) => h.id === m.id)) return d; // the same match is never counted twice
      return {
        history: [m, ...d.history].slice(0, HISTORY_LIMIT),
        stats: {
          played: d.stats.played + 1,
          wins: d.stats.wins + (m.winner === m.myColor ? 1 : 0),
          captures: d.stats.captures + m.captures,
        },
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setData(emptyData);
  }, []);

  return useMemo<ProfileStore>(
    () => ({
      ready,
      profile,
      history: data.history,
      stats: data.stats,
      setName,
      setFavorite,
      setSettings,
      markTip,
      addMatch,
      clearHistory,
    }),
    [ready, profile, data, setName, setFavorite, setSettings, markTip, addMatch, clearHistory],
  );
}
