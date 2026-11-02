// VISUAL DIRECTION: pirate treasure map over a night sea. Parchment ink on deep navy, ONE gold accent.
// Player hues (red/yellow/green/blue) are for pieces and seats only. Platform fonts: bold serif for
// titles and dice numbers, system sans for text. Comfortable density, soft radius (14-16), pills for chips.
// Dark = the sea (default); light = parchment. Never invent colours, sizes or button styles outside this file.
import { Platform, StyleSheet } from 'react-native';

const dark = {
  bg: '#0B1E33', surface: '#12304F', surfaceHi: '#1A3E63', ink: '#F6EBD0', inkMuted: '#A9B8C6', line: '#24476B',
  accent: '#F2B33D', accentInk: '#1A1205', accentSoft: 'rgba(242,179,61,0.16)',
  success: '#3DBE8B', warning: '#F08A3C', danger: '#E5484D', overlay: 'rgba(5,12,22,0.72)',
};
const light = {
  bg: '#F6EBD0', surface: '#FFF8E6', surfaceHi: '#F0E2BC', ink: '#10263F', inkMuted: '#5B6B7C', line: '#DCCBA3',
  accent: '#B8780A', accentInk: '#FFFFFF', accentSoft: 'rgba(184,120,10,0.14)',
  success: '#1E8F66', warning: '#C9631A', danger: '#C93035', overlay: 'rgba(16,38,63,0.55)',
};
export type Palette = typeof dark;
export const colors = { light, dark };
export const playerColors = { red: '#D7322F', yellow: '#F2C230', green: '#2FA35B', blue: '#2F7FD1' } as const;
export const playerColorsDark = { red: '#8E1D1B', yellow: '#B8901A', green: '#1C6B3A', blue: '#1B4F8C' } as const;

export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
};
export const type = {
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  sm: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  md: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  lg: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const },
  xl: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  display: { fontSize: 40, lineHeight: 44, fontWeight: '900' as const },
};
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;
export const radius = { card: 16, button: 14, input: 12, chip: 999, pawn: 999, sheet: 24 } as const;
export const elevation = { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 };
export const motion = { fast: 120, base: 240, slow: 480, dice: 900 } as const;
export const HIT = 44;
export const BUTTON_HEIGHT = 52;

export function makeStyles(p: Palette) {
  const btn = { height: BUTTON_HEIGHT, minWidth: HIT, paddingHorizontal: space[5], borderRadius: radius.button, alignItems: 'center' as const, justifyContent: 'center' as const, flexDirection: 'row' as const, gap: space[2] };
  const label = { fontSize: 16, fontWeight: '700' as const, fontFamily: fonts.body };
  const icon = { width: HIT, height: HIT, borderRadius: radius.button, alignItems: 'center' as const, justifyContent: 'center' as const };
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: p.bg },
    container: { flex: 1, paddingHorizontal: space[4], paddingTop: space[4] },
    title: { ...type.xl, color: p.ink, fontFamily: fonts.display },
    heading: { ...type.lg, color: p.ink, fontFamily: fonts.display },
    body: { ...type.md, color: p.ink, fontFamily: fonts.body },
    muted: { ...type.sm, color: p.inkMuted, fontFamily: fonts.body },
    caption: { ...type.xs, color: p.inkMuted, fontFamily: fonts.body },
    code: { ...type.display, color: p.accent, fontFamily: fonts.display, letterSpacing: 6 },
    // buttons
    btnPrimary: { ...btn, backgroundColor: p.accent }, btnPrimaryPressed: { backgroundColor: p.accent, opacity: 0.85, transform: [{ scale: 0.98 }] }, btnPrimaryDisabled: { opacity: 0.4 }, btnPrimaryLabel: { ...label, color: p.accentInk },
    btnSecondary: { ...btn, backgroundColor: p.surfaceHi, borderWidth: 1, borderColor: p.line }, btnSecondaryPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] }, btnSecondaryDisabled: { opacity: 0.4 }, btnSecondaryLabel: { ...label, color: p.ink },
    btnTertiary: { ...btn, backgroundColor: 'transparent' }, btnTertiaryPressed: { backgroundColor: p.accentSoft }, btnTertiaryDisabled: { opacity: 0.4 }, btnTertiaryLabel: { ...label, color: p.accent },
    btnDanger: { ...btn, backgroundColor: p.danger }, btnDangerPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] }, btnDangerDisabled: { opacity: 0.4 }, btnDangerLabel: { ...label, color: '#FFFFFF' },
    iconBtn: { ...icon, backgroundColor: p.surfaceHi }, iconBtnPressed: { opacity: 0.8 }, iconBtnDisabled: { opacity: 0.4 },
    // surfaces
    card: { backgroundColor: p.surface, borderRadius: radius.card, padding: space[4], borderWidth: 1, borderColor: p.line, ...elevation },
    listRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2], paddingHorizontal: space[4], borderBottomWidth: 1, borderBottomColor: p.line },
    listRowPressed: { backgroundColor: p.accentSoft },
    input: { height: BUTTON_HEIGHT, borderRadius: radius.input, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, color: p.ink, paddingHorizontal: space[4], fontSize: 16, fontFamily: fonts.body },
    inputError: { borderColor: p.danger }, inputErrorText: { ...type.xs, color: p.danger, marginTop: space[1] },
    chip: { height: 36, paddingHorizontal: space[3], borderRadius: radius.chip, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space[1] },
    chipSelected: { backgroundColor: p.accentSoft, borderColor: p.accent }, chipPressed: { opacity: 0.8 }, chipLabel: { ...type.sm, color: p.ink, fontWeight: '600' },
    tabbar: { flexDirection: 'row', backgroundColor: p.surface, borderTopWidth: 1, borderTopColor: p.line },
    tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2 }, tabPressed: { backgroundColor: p.accentSoft },
    tabLabel: { ...type.xs, color: p.inkMuted }, tabActiveLabel: { ...type.xs, color: p.accent, fontWeight: '800' },
    empty: { alignItems: 'center', padding: space[6], gap: space[3] },
    emptyCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: p.accentSoft, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { ...type.lg, color: p.ink, fontFamily: fonts.display, textAlign: 'center' }, emptyLine: { ...type.sm, color: p.inkMuted, textAlign: 'center' },
    skeleton: { backgroundColor: p.surfaceHi, borderRadius: radius.card, opacity: 0.6 },
    toast: { position: 'absolute', left: space[4], right: space[4], bottom: space[7], backgroundColor: p.ink, borderRadius: radius.button, padding: space[3], alignItems: 'center', ...elevation },
    toastText: { ...type.sm, color: p.bg, fontWeight: '700' },
    banner: { backgroundColor: p.warning, paddingVertical: space[2], alignItems: 'center' }, bannerText: { ...type.xs, color: '#1A1205', fontWeight: '800' },
    row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
    hit: { minWidth: HIT, minHeight: HIT },
  });
}
