// Shared contract for the Parchis Pirata app. Do not redeclare these types elsewhere.
import type { ReactNode } from 'react';

export type Color = 'red' | 'yellow' | 'green' | 'blue';
export const COLORS: Color[] = ['red', 'yellow', 'green', 'blue'];
export type Emblem = 'hat' | 'swords' | 'boot' | 'wave';
export interface Character { id: 'luffy' | 'sanji' | 'zoro' | 'jinbe'; name: string; color: Color; title: string; emblem: Emblem }
export const CHARACTERS: Record<Color, Character> = {
  red: { id: 'luffy', name: 'Luffy', color: 'red', title: 'Capitan Sombrero de Paja', emblem: 'hat' },
  yellow: { id: 'sanji', name: 'Sanji', color: 'yellow', title: 'Cocinero Pie Negro', emblem: 'boot' },
  green: { id: 'zoro', name: 'Zoro', color: 'green', title: 'Cazador de Piratas', emblem: 'swords' },
  blue: { id: 'jinbe', name: 'Jinbe', color: 'blue', title: 'Caballero del Mar', emblem: 'wave' },
};
export const START_SQUARE: Record<Color, number> = { yellow: 5, blue: 22, red: 39, green: 56 };
export const SAFE_SQUARES: number[] = [5, 12, 17, 22, 29, 34, 39, 46, 51, 56, 63, 68];
export const CIRCUIT = 68;
export const LANE_START = 65;
export const GOAL = 72;
export const EXIT_ROLL = 5;
export const CAPTURE_BONUS = 20;
export const GOAL_BONUS = 10;
export const OFFLINE_BOT_AFTER_MS = 60000;
export const POLL_MS = 2000;

export type Point = { x: number; y: number };
export type Square = { kind: 'nest' } | { kind: 'circuit'; abs: number } | { kind: 'lane'; index: number } | { kind: 'goal' };

export interface Seat { color: Color; playerId: string | null; name: string; isBot: boolean; ready: boolean; connected: boolean; lastSeen: number }
export type Phase = 'lobby' | 'rolling' | 'moving' | 'over';
export interface LogEntry { id: number; color: Color; text: string; kind: 'roll' | 'move' | 'capture' | 'goal' | 'exit' | 'skip' | 'penalty' | 'info' }
export interface EmoteEvent { id: number; color: Color; emote: EmoteId; at: number }
export type EmoteId = 'gomu' | 'laugh' | 'cry' | 'nakama' | 'king' | 'gg';
// which die (or both) a move spends: 'a' = first die, 'b' = second die, 'sum' = both added
export type DieUse = 'a' | 'b' | 'sum';
export interface LegalMove { pieceIndex: number; from: number; to: number; captures?: { color: Color; index: number }; reachesGoal: boolean; use: DieUse }
export interface GameState {
  roomCode: string;
  seats: Seat[];
  pieces: Record<Color, number[]>;
  turn: Color;
  phase: Phase;
  dice: number | null;
  dice2: number | null;
  // dice still available this turn (a spent die becomes null)
  diceLeft: { a: number | null; b: number | null };
  sixesInRow: number;
  doublesInRow: number;
  pendingBonus: number;
  lastMoved: { color: Color; index: number } | null;
  winner: Color | null;
  captures: Record<Color, number>;
  log: LogEntry[];
  emotes: EmoteEvent[];
  version: number;
  startedAt: number;
  rematchCount: number;
}

export type Action =
  | { type: 'join'; playerId: string; name: string }
  | { type: 'leave'; playerId: string }
  | { type: 'ready'; playerId: string; ready: boolean }
  | { type: 'addBot'; color: Color }
  | { type: 'kick'; color: Color }
  | { type: 'start' }
  | { type: 'roll'; playerId: string; value: number; value2: number }
  | { type: 'move'; playerId: string; pieceIndex: number; use?: DieUse }
  | { type: 'emote'; playerId: string; emote: EmoteId }
  | { type: 'heartbeat'; playerId: string }
  | { type: 'rematch' };

export type ConnectionStatus = 'online' | 'reconnecting' | 'offline';
export type JoinError = 'not_found' | 'full' | 'started' | 'network';
export interface PlayerInfo { playerId: string; name: string }
export interface RoomTransport {
  create(host: PlayerInfo): Promise<GameState>;
  join(code: string, player: PlayerInfo): Promise<{ state?: GameState; error?: JoinError }>;
  send(code: string, action: Action): Promise<void>;
  publish(code: string, state: GameState): Promise<void>;
  // isHost: only the host reads the players' outboxes (each guest writes its own, never a shared box)
  subscribe(code: string, onState: (s: GameState) => void, onActions: (a: Action[]) => void, onStatus: (c: ConnectionStatus) => void, isHost?: () => boolean): () => void;
  close(code: string): Promise<void>;
}

export interface Settings { haptics: boolean; fixedBoard: boolean; sound: boolean }
export interface Profile { playerId: string; name: string; favorite: Color; settings: Settings; seenTips: string[] }
export interface MatchRecord { id: string; date: number; roomCode: string; myColor: Color; winner: Color; captures: number; piecesHome: number; durationSec: number }
export interface Stats { played: number; wins: number; captures: number }
export interface ProfileStore {
  ready: boolean;
  profile: Profile;
  history: MatchRecord[];
  stats: Stats;
  setName(name: string): void;
  setFavorite(c: Color): void;
  setSettings(s: Partial<Settings>): void;
  markTip(id: string): void;
  addMatch(m: MatchRecord): void;
  clearHistory(): void;
}

export interface GameStore {
  state: GameState | null;
  myColor: Color | null;
  isHost: boolean;
  status: ConnectionStatus;
  legal: LegalMove[];
  canRoll: boolean;
  busy: boolean;
  error: JoinError | null;
  createRoom(): Promise<void>;
  joinRoom(code: string, name: string): Promise<boolean>;
  startPractice(): Promise<void>;
  setReady(ready: boolean): void;
  addBot(color: Color): void;
  kick(color: Color): void;
  start(): void;
  roll(): void;
  move(pieceIndex: number, use?: DieUse): void;
  emote(e: EmoteId): void;
  rematch(): void;
  leave(): void;
}

export type Screen =
  | { name: 'tabs'; tab: Tab }
  | { name: 'join'; code?: string }
  | { name: 'lobby' }
  | { name: 'game' }
  | { name: 'result' };
export type Tab = 'home' | 'profile' | 'rules';

export interface HomeScreenProps { profile: Profile; busy: boolean; onName(n: string): void; onCreate(): void; onJoin(): void; onPractice(): void; showTip: boolean; onDismissTip(): void }
export interface JoinScreenProps { initialCode?: string; defaultName: string; busy: boolean; error: JoinError | null; onSubmit(code: string, name: string): void; onBack(): void }
export interface LobbyScreenProps { state: GameState; myColor: Color | null; isHost: boolean; status: ConnectionStatus; onReady(r: boolean): void; onAddBot(c: Color): void; onKick(c: Color): void; onStart(): void; onLeave(): void }
export interface GameScreenProps { state: GameState; myColor: Color | null; legal: LegalMove[]; canRoll: boolean; status: ConnectionStatus; settings: Settings; onRoll(): void; onMove(pieceIndex: number, use?: DieUse): void; onEmote(e: EmoteId): void; onLeave(): void }
export interface ResultScreenProps { state: GameState; myColor: Color | null; isHost: boolean; onRematch(): void; onExit(): void }
export interface ProfileScreenProps { store: ProfileStore }
export interface TabBarProps { tab: Tab; onChange(t: Tab): void }
export interface BoardProps { state: GameState; myColor: Color | null; legal: LegalMove[]; fixedView: boolean; onPiece(pieceIndex: number, use?: DieUse): void; size: number }
export interface PawnProps { color: Color; x: number; y: number; size: number; movable: boolean; dimmed: boolean; stacked?: boolean; onPress?: () => void }
export interface DiceProps { value: number | null; value2: number | null; enabled: boolean; rolling: boolean; color: Color; onRoll(): void }
export interface EmblemProps { color: Color; size: number; variant: 'portrait' | 'badge' }
export interface PlayerCardProps { seat: Seat; state: GameState; isMe: boolean; isTurn: boolean; compact?: boolean; piecesHome: number; emote?: EmoteId | null; onKick?: () => void }
export interface SeatChipProps { seat: Seat; isMe: boolean; isTurn: boolean; piecesHome: number; emote?: EmoteId | null }
export interface EmoteBarProps { onEmote(e: EmoteId): void; disabled: boolean }
export interface ShareSheetProps { code: string; hostName: string }
export interface ButtonProps { label: string; onPress(): void; variant?: 'primary' | 'secondary' | 'tertiary' | 'danger'; disabled?: boolean; icon?: string; loading?: boolean }
export interface IconButtonProps { icon: string; label: string; onPress(): void; variant?: 'primary' | 'secondary' | 'tertiary' | 'danger'; disabled?: boolean }
export interface InputProps { value: string; onChange(v: string): void; placeholder?: string; error?: string | null; maxLength?: number; autoCapitalize?: 'none' | 'characters' | 'words'; label?: string }
export interface ChipProps { label: string; selected?: boolean; onPress?: () => void; color?: string }
export interface EmptyProps { icon: string; title: string; line: string; actionLabel?: string; onAction?: () => void }
export type ThemeBundle = { p: import('./theme').Palette; s: ReturnType<typeof import('./theme').makeStyles> };
export type _Children = ReactNode;
