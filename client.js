/**
 * Client half of dsh-project-shader: colors each project in the workspace
 * sidebar and the session rows under it.
 *
 * - A style-only component in the always-mounted `shell.overlay` layer emits
 *   one CSS rule per workspace row (`data-row-key="workspace:<id>"`) and per
 *   session row (`data-row-key="session:<id>"`): project rows get a vertical
 *   "|" bar plus a left-to-right color wash over the folder-glyph cell and a
 *   tinted glyph; session rows inherit a lighter wash in their project's
 *   color. The rules restate no host layout; if row keys change in a future
 *   version the colors simply vanish.
 * - A `contextMenus` contribution on workspace targets offers a quick color
 *   submenu (palette, shuffle, auto); the full settings surface is the
 *   `dsh-project-shader` main panel with its `sidebar.panellist` entry:
 *   presets, a live preview, global gradient/bar/glyph parameters, neon
 *   controls, session-status markers, advanced palette modes, per-project
 *   colors with an emphasis star, and settings import/export.
 * - Everything persists in localStorage; defaults below are the shipped look.
 *   Sliders double as switches: opacity 0 disables a wash and 100 fills the
 *   whole row with solid color (text is re-contrasted for readability);
 *   bar width 0 hides the bar. Double-clicking a slider restores its default.
 * - A neon mode brightens each project color toward a fluorescent tone in
 *   OKLCH (perceptually uniform, gamut-annealed; grays stay gray) and layers
 *   a soft glow over the bar, wash and tinted glyph. A three-state control
 *   picks where it applies (light theme, dark theme, or both; default dark
 *   only) and the intensity slider's 0 turns it off entirely.
 * - Session status (via the optional `useSessionStatus` slot prop) adds
 *   markers: a breathing halo while running, a warning edge while awaiting
 *   input, a success edge for unread completions — each individually
 *   switchable. A colorblind mode swaps in the Okabe–Ito palette with
 *   doubled bars and textured washes; brand-first mode seeds automatic
 *   colors from the active theme's accent.
 */
window.__ModuleLoader__.load({
  id: 'dsh-project-shader',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-project-shader';
    const PANEL_ID = 'dsh-project-shader';
    const STORAGE_KEY = 'dsh-project-shader:settings:v2';
    const UI_KEY = 'dsh-project-shader:ui:v1';
    const LEGACY_KEY = 'dsh-project-shader:colors:v1';
    /** Rarely touched sections start folded; the user can unfold them once. */
    const DEFAULT_COLLAPSED = { advanced: true, data: true };
    /** Mid-tone accents that stay readable on light and dark themes. */
    const PALETTE = [
      { id: 'red', value: '#e5484d' },
      { id: 'orange', value: '#f76b15' },
      { id: 'amber', value: '#e8930c' },
      { id: 'green', value: '#46a758' },
      { id: 'teal', value: '#12a594' },
      { id: 'blue', value: '#3e8ef7' },
      { id: 'indigo', value: '#5b5bd6' },
      { id: 'purple', value: '#8e4ec6' },
      { id: 'pink', value: '#d6409f' },
      { id: 'gray', value: '#8b8d98' },
    ];
    /** Okabe–Ito: distinguishable under the common color-vision deficiencies. */
    const OKABE_ITO = [
      { id: 'oi-orange', value: '#e69f00' },
      { id: 'oi-skyblue', value: '#56b4e9' },
      { id: 'oi-green', value: '#009e73' },
      { id: 'oi-yellow', value: '#f0e442' },
      { id: 'oi-blue', value: '#0072b2' },
      { id: 'oi-vermillion', value: '#d55e00' },
      { id: 'oi-pink', value: '#cc79a7' },
      { id: 'oi-black', value: '#7a7a7a' },
    ];
    /** Follow-the-theme slot: resolves to the active theme's brand accent. */
    const BRAND_ENTRY = { id: 'brand', value: 'var(--dsw-alias-brand-primary)' };
    /**
     * Palette for swatches and automatic assignment: colorblind mode swaps in
     * Okabe–Ito, brand-first prepends the theme accent. Stored hex choices
     * from the other palette keep working — they are just not offered.
     */
    function activePalette(global) {
      const base = global.colorblind ? OKABE_ITO : PALETTE;
      return global.brandFirst ? [BRAND_ENTRY, ...base] : base;
    }

    /** Shipped look; the settings page quotes these as the reference. */
    const DEFAULTS = {
      projectOpacity: 20,
      projectExtent: 48,
      projectBarWidth: 3,
      projectIconTint: true,
      sessionOpacity: 14,
      sessionExtent: 56,
      colorArchived: false,
      neonMode: 'dark',
      neonIntensity: 60,
      brandFirst: false,
      colorblind: false,
      statusRunning: true,
      statusPending: true,
      statusUnread: true,
      statusPulse: 50,
    };
    /**
     * One-click looks applied on top of the defaults. Each preset only
     * writes the fields it cares about; project colors stay untouched.
     */
    const PRESETS = [
      {
        id: 'soft',
        values: { projectOpacity: 14, projectExtent: 72, projectBarWidth: 2, sessionOpacity: 10, sessionExtent: 80, neonIntensity: 40 },
      },
      {
        id: 'vivid',
        values: { projectOpacity: 34, projectExtent: 56, projectBarWidth: 4, sessionOpacity: 22, sessionExtent: 64, neonIntensity: 75 },
      },
      {
        id: 'minimal',
        values: { projectOpacity: 0, sessionOpacity: 0, projectBarWidth: 3, projectIconTint: false, neonIntensity: 0 },
      },
      {
        id: 'neonParty',
        values: { projectOpacity: 26, sessionOpacity: 18, projectBarWidth: 4, neonMode: 'both', neonIntensity: 90 },
      },
      {
        id: 'bars',
        values: { projectOpacity: 0, sessionOpacity: 0, projectBarWidth: 5, projectIconTint: true, neonIntensity: 0 },
      },
      {
        id: 'fill',
        values: { projectOpacity: 100, sessionOpacity: 24, projectBarWidth: 0, neonIntensity: 0 },
      },
      {
        id: 'whisper',
        values: { projectOpacity: 8, projectExtent: 120, projectBarWidth: 2, sessionOpacity: 6, sessionExtent: 140, neonIntensity: 25 },
      },
      {
        id: 'bold',
        values: { projectOpacity: 45, projectExtent: 64, projectBarWidth: 6, sessionOpacity: 28, sessionExtent: 72, neonIntensity: 50 },
      },
      {
        id: 'nightOwl',
        values: { projectOpacity: 20, sessionOpacity: 14, projectBarWidth: 3, neonMode: 'dark', neonIntensity: 100 },
      },
      {
        id: 'icons',
        values: { projectOpacity: 0, sessionOpacity: 0, projectBarWidth: 0, projectIconTint: true, neonMode: 'both', neonIntensity: 70 },
      },
    ];
    /**
     * Sliders double as switches: an opacity of 0 disables the wash, 100
     * fills the whole row with solid color; a bar width of 0 hides the bar.
     */
    const RANGES = {
      projectOpacity: [0, 100], sessionOpacity: [0, 100],
      projectExtent: [16, 200], sessionExtent: [16, 200],
      projectBarWidth: [0, 12],
      neonIntensity: [0, 100],
      statusPulse: [0, 100],
    };
    const BOOLEAN_KEYS = [
      'projectIconTint', 'colorArchived', 'brandFirst', 'colorblind',
      'statusRunning', 'statusPending', 'statusUnread',
    ];
    /** Where the neon look applies: light theme only, dark only, or both. */
    const NEON_MODES = ['light', 'dark', 'both'];

    /** Flatten the nested dictionaries to the dot-keyed form t() resolves. */
    function flattenDict(node, prefix, out) {
      for (const [key, value] of Object.entries(node)) {
        const path = prefix === '' ? key : `${prefix}.${key}`;
        if (typeof value === 'string') out[path] = value;
        else flattenDict(value, path, out);
      }
      return out;
    }

    /* --- settings store: localStorage-backed, with change notifications --- */

    function isHexColor(value) {
      return typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
    }
    function clampNumber(value, key) {
      const range = RANGES[key];
      if (range === undefined || typeof value !== 'number' || !Number.isFinite(value)) return undefined;
      return Math.min(range[1], Math.max(range[0], Math.round(value)));
    }
    function normalizeGlobal(input) {
      const out = {};
      if (input === null || typeof input !== 'object') return out;
      for (const key of BOOLEAN_KEYS) {
        if (typeof input[key] === 'boolean') out[key] = input[key];
      }
      for (const key of Object.keys(RANGES)) {
        const value = clampNumber(input[key], key);
        if (value !== undefined) out[key] = value;
      }
      if (typeof input.neonMode === 'string' && NEON_MODES.includes(input.neonMode)) {
        out.neonMode = input.neonMode;
      }
      // The live preview's sample color; any stored hex is accepted.
      if (isHexColor(input.previewColor)) out.previewColor = input.previewColor.toLowerCase();
      // Legacy v2.x booleans retire into the slider endpoints: an effect the
      // user had switched off migrates to its control's 0, so the new UI
      // keeps their intent without keeping the old keys.
      if (input.projectGradient === false && out.projectOpacity === undefined) out.projectOpacity = 0;
      if (input.sessionGradient === false && out.sessionOpacity === undefined) out.sessionOpacity = 0;
      if (input.projectBar === false && out.projectBarWidth === undefined) out.projectBarWidth = 0;
      if (input.darkNeon === false && out.neonIntensity === undefined) out.neonIntensity = 0;
      return out;
    }
    function normalizeProjects(input) {
      const out = {};
      if (input === null || typeof input !== 'object') return out;
      for (const [workspaceId, entry] of Object.entries(input)) {
        if (entry === null || typeof entry !== 'object') continue;
        const normalized = {};
        if (isHexColor(entry.color)) normalized.color = entry.color.toLowerCase();
        else if (entry.color === 'none') normalized.color = 'none';
        if (entry.emphasis === true) normalized.emphasis = true;
        if (typeof entry.rank === 'number' && Number.isFinite(entry.rank)) normalized.rank = Math.round(entry.rank);
        if (Object.keys(normalized).length > 0) out[workspaceId] = normalized;
      }
      return out;
    }
    function loadUi() {
      try {
        const raw = window.localStorage.getItem(UI_KEY);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (parsed !== null && typeof parsed === 'object') {
            return {
              collapsed: parsed.collapsed !== null && typeof parsed.collapsed === 'object' ? parsed.collapsed : {},
              previewHidden: parsed.previewHidden === true,
            };
          }
        }
      } catch (_error) { /* corrupted payload falls back to defaults */ }
      return { collapsed: {}, previewHidden: false };
    }
    function loadState() {
      let stored = {};
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw !== null) stored = JSON.parse(raw);
      } catch (_error) { /* corrupted payload falls back to defaults */ }
      const projects = normalizeProjects(stored !== null && typeof stored === 'object' ? stored.projects : undefined);
      // Adopt v1 per-workspace palette colors where v2 has no entry, then
      // retire the legacy key: migration is one-time, otherwise a later
      // "Auto" reset (which deletes the v2 entry) would be undone on reload.
      try {
        const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
        if (legacyRaw !== null) {
          const legacy = JSON.parse(legacyRaw);
          if (legacy !== null && typeof legacy === 'object' && !Array.isArray(legacy)) {
            for (const [workspaceId, color] of Object.entries(legacy)) {
              if (projects[workspaceId] === undefined && isHexColor(color)) {
                projects[workspaceId] = { color: color.toLowerCase() };
              }
            }
          }
          window.localStorage.removeItem(LEGACY_KEY);
        }
      } catch (_error) { /* legacy payload unreadable: skip migration */ }
      return {
        global: normalizeGlobal(stored !== null && typeof stored === 'object' ? stored.global : undefined),
        projects,
        ...loadUi(),
      };
    }

    const listeners = new Set();
    let state = loadState();
    function getState() { return state; }
    function subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }
    function update(mutate) {
      state = mutate(state);
      // Settings and panel-only UI state persist under separate keys; the
      // export file carries only the settings part.
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ global: state.global, projects: state.projects }));
      } catch (_error) { /* quota/denied: keep session-local */ }
      try {
        window.localStorage.setItem(UI_KEY, JSON.stringify({
          collapsed: state.collapsed ?? {},
          previewHidden: state.previewHidden === true,
        }));
      } catch (_error) { /* quota/denied: keep session-local */ }
      for (const listener of listeners) listener();
    }
    function collapsedOf(snapshot) {
      return { ...DEFAULT_COLLAPSED, ...(snapshot.collapsed ?? {}) };
    }
    function toggleSection(id) {
      update((current) => {
        const collapsed = collapsedOf(current);
        return { ...current, collapsed: { ...collapsed, [id]: collapsed[id] !== true } };
      });
    }
    function setPreviewHidden(hidden) {
      update((current) => ({ ...current, previewHidden: hidden === true }));
    }
    function setGlobalField(key, value) {
      update((current) => ({ ...current, global: { ...current.global, [key]: value } }));
    }
    function resetGlobal() {
      update((current) => ({ ...current, global: {} }));
    }
    function setProjectColor(workspaceId, color) {
      update((current) => {
        const projects = { ...current.projects };
        // Resetting to "Auto" clears only the color; a set emphasis stays.
        const entry = { ...projects[workspaceId] };
        if (color === undefined) delete entry.color;
        else entry.color = color;
        if (Object.keys(entry).length > 0) projects[workspaceId] = entry;
        else delete projects[workspaceId];
        return { ...current, projects };
      });
    }
    function setProjectEmphasis(workspaceId, emphasis) {
      update((current) => {
        const projects = { ...current.projects };
        const entry = { ...projects[workspaceId] };
        if (emphasis) entry.emphasis = true;
        else delete entry.emphasis;
        if (Object.keys(entry).length > 0) projects[workspaceId] = entry;
        else delete projects[workspaceId];
        return { ...current, projects };
      });
    }
    /**
     * Pin a project to the top of the sidebar. The rank is the pin order:
     * lower ranks sit higher, so it also acts as the importance ordering.
     */
    function setProjectPin(workspaceId, pinned) {
      update((current) => {
        const projects = { ...current.projects };
        const entry = { ...projects[workspaceId] };
        if (pinned) {
          const max = Object.values(projects).reduce(
            (acc, item) => Math.max(acc, typeof item.rank === 'number' ? item.rank : 0), 0,
          );
          entry.rank = max + 1;
        } else {
          delete entry.rank;
        }
        if (Object.keys(entry).length > 0) projects[workspaceId] = entry;
        else delete projects[workspaceId];
        return { ...current, projects };
      });
    }
    /** Move a pinned project one step within the pinned order. */
    function moveProjectRank(workspaceId, delta) {
      update((current) => {
        const pinned = Object.entries(current.projects)
          .filter(([, entry]) => typeof entry.rank === 'number')
          .map(([id, entry]) => ({ id, rank: entry.rank }))
          .sort((a, b) => a.rank - b.rank);
        const index = pinned.findIndex((item) => item.id === workspaceId);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= pinned.length) return current;
        const projects = { ...current.projects };
        projects[pinned[index].id] = { ...projects[pinned[index].id], rank: pinned[target].rank };
        projects[pinned[target].id] = { ...projects[pinned[target].id], rank: pinned[index].rank };
        return { ...current, projects };
      });
    }
    /** Apply a preset's fields over the current settings in one update. */
    function applyPreset(preset) {
      update((current) => ({ ...current, global: { ...current.global, ...preset.values } }));
    }

    /* --- settings import / export --- */

    function exportSettings() {
      const payload = {
        app: NS, version: 2, exportedAt: new Date().toISOString(),
        global: state.global, projects: state.projects,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'dsh-project-shader-settings.json';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    /**
     * Parse and validate an exported file, then replace all settings.
     * Anything unrecognised is dropped by the normalizers; corrupt files
     * leave the current settings untouched. Calls back with success.
     */
    function importSettings(file, done) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (parsed === null || typeof parsed !== 'object') throw new Error('not an object');
          const global = normalizeGlobal(parsed.global);
          const projects = normalizeProjects(parsed.projects);
          update(() => ({ global, projects }));
          done(true);
        } catch (_error) {
          done(false);
        }
      };
      reader.onerror = () => done(false);
      reader.readAsText(file);
    }
    function resolveGlobal(snapshot) {
      return { ...DEFAULTS, ...snapshot.global };
    }
    function storedColorOf(snapshot, workspaceId) {
      return snapshot.projects[workspaceId]?.color;
    }
    function useStore() {
      return React.useSyncExternalStore(subscribe, getState);
    }

    /* --- automatic color assignment --- */

    /** FNV-1a: a stable automatic palette pick per workspace id. */
    function hashString(text) {
      let hash = 0x811c9dc5;
      for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
      }
      return hash >>> 0;
    }
    /**
     * Effective color per workspace: stored choices win ('none' opts out);
     * automatic picks are hash-based, shifted to the next free palette slot
     * (in workspace-id order) so two projects never share one automatic
     * color while a slot remains. Deterministic for a given workspace set.
     */
    function assignColors(workspaces, projects, palette = PALETTE) {
      const sorted = [...workspaces].sort((a, b) => (a.workspaceId < b.workspaceId ? -1 : 1));
      const taken = new Set();
      const assigned = new Map();
      for (const workspace of sorted) {
        const stored = projects[workspace.workspaceId]?.color;
        if (stored === 'none') assigned.set(workspace.workspaceId, undefined);
        else if (isHexColor(stored)) {
          assigned.set(workspace.workspaceId, stored);
          taken.add(stored);
        }
      }
      for (const workspace of sorted) {
        if (assigned.has(workspace.workspaceId)) continue;
        let index = hashString(workspace.workspaceId) % palette.length;
        for (let guard = 0; taken.has(palette[index].value) && guard < palette.length; guard++) {
          index = (index + 1) % palette.length;
        }
        assigned.set(workspace.workspaceId, palette[index].value);
        taken.add(palette[index].value);
      }
      return assigned;
    }

    /* --- neon color transform (OKLCH, perceptually uniform) --- */

    function hexToRgb(hex) {
      // Strict full-string check: parseInt alone would accept the leading
      // 'a' of "var(--…)" as a hex digit and invent a color.
      if (typeof hex !== 'string' || !/^#[0-9a-fA-F]+$/.test(hex)) return null;
      let digits = hex.slice(1);
      if (digits.length === 3) digits = [...digits].map((char) => char + char).join('');
      if (digits.length !== 6) return null;
      const value = parseInt(digits, 16);
      return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    }
    function srgbToLinear(channel) {
      const c = channel / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }
    function linearToSrgb(value) {
      const c = Math.min(1, Math.max(0, value));
      return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255);
    }
    /** sRGB (0–255) → OKLCH { L, C, H } via the standard LMS matrices. */
    function rgbToOklch(r, g, b) {
      const lr = srgbToLinear(r); const lg = srgbToLinear(g); const lb = srgbToLinear(b);
      const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
      const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
      const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
      const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
      const b2 = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
      let h = (Math.atan2(b2, a) * 180) / Math.PI;
      if (h < 0) h += 360;
      return {
        L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        C: Math.hypot(a, b2),
        H: h,
      };
    }
    /** OKLCH → linear sRGB channels (0–1, possibly out of gamut). */
    function oklchToLinearRgb(L, C, H) {
      const hr = (H * Math.PI) / 180;
      const a = C * Math.cos(hr); const b = C * Math.sin(hr);
      const l3 = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m3 = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s3 = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
      return [
        4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
        -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
        -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
      ];
    }
    function rgbToHex(rgb) {
      return `#${rgb.map((channel) => linearToSrgb(channel).toString(16).padStart(2, '0')).join('')}`;
    }
    /**
     * Fluorescent variant of a color: lightness lifted toward a glow-friendly
     * band and chroma pushed up in OKLCH, so every hue brightens by the same
     * perceived amount (no more HSL "yellow is always brighter" skew). The
     * intensity slider (0–100) scales the lift; at 0 the color is unchanged.
     * Near-neutral colors (C < 0.03) keep their gray hue and only brighten.
     * Out-of-gamut results anneal back into sRGB by shrinking chroma.
     */
    function toNeon(hex, intensity) {
      const rgb = hexToRgb(hex);
      if (rgb === null) return hex;
      const k = Math.min(100, Math.max(0, intensity)) / 100;
      if (k === 0) return hex;
      const oklch = rgbToOklch(rgb[0], rgb[1], rgb[2]);
      const L = Math.min(0.9, Math.max(oklch.L, oklch.L + (0.74 - oklch.L) * k));
      let C = oklch.C < 0.03 ? oklch.C : oklch.C * (1 + 0.8 * k) + 0.015 * k;
      let channels = oklchToLinearRgb(L, C, oklch.H);
      for (let guard = 0; guard < 12 && channels.some((v) => v < -0.001 || v > 1.001); guard++) {
        C *= 0.85;
        channels = oklchToLinearRgb(L, C, oklch.H);
      }
      return rgbToHex(channels);
    }
    /**
     * WCAG relative luminance of a hex color; used to pick readable text
     * over a solid-filled row. Non-hex values (e.g. theme var()) bail out.
     */
    function readableTextColor(hex) {
      const rgb = hexToRgb(hex);
      if (rgb === null) return undefined;
      const luminance = 0.2126 * srgbToLinear(rgb[0]) + 0.7152 * srgbToLinear(rgb[1]) + 0.0722 * srgbToLinear(rgb[2]);
      return luminance > 0.42 ? '#1a1d24' : '#f5f6f8';
    }

    /* --- generated CSS --- */

    /** Escape a value for a double-quoted CSS attribute selector. */
    function cssString(value) {
      return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }
    /** Left-to-right wash that fades to fully transparent at `extent` px. */
    function wash(color, opacity, extent) {
      return `linear-gradient(90deg,color-mix(in srgb,${color} ${opacity}%,transparent),color-mix(in srgb,${color} 0%,transparent) ${extent}px)`;
    }
    /** Wash layer for a slider value: 100 fills the whole row with color. */
    function washLayer(color, opacity, extent) {
      if (opacity >= 100) return `linear-gradient(90deg,${color},${color})`;
      return wash(color, opacity, extent);
    }
    /**
     * Neon applies on the themes its mode names and only while the intensity
     * slider sits above 0 — the slider's left end is the off switch.
     */
    function isNeonActive(global, isDark) {
      if (global.neonIntensity <= 0) return false;
      if (global.neonMode === 'both') return true;
      return global.neonMode === 'dark' ? isDark : !isDark;
    }
    function buildCss(workspaces, archivedSessionIds, global, projects, isDark, statuses) {
      const neon = isNeonActive(global, isDark);
      const shade = (color) => (neon ? toNeon(color, global.neonIntensity) : color);
      const glowOf = (color) => `color-mix(in srgb,${color} ${Math.round(30 + global.neonIntensity * 0.5)}%,transparent)`;
      // Neon lifts gradient strength a notch, but never flips a gradient
      // into the solid-fill endpoint and never weakens a user's solid fill.
      const boost = (opacity) => {
        if (!neon || opacity <= 0 || opacity >= 100) return opacity;
        return Math.min(99, Math.round(opacity * (1 + global.neonIntensity / 250)));
      };
      // Per-project emphasis: stronger wash plus a glow on every theme.
      const emphasize = (opacity, on) => {
        if (!on || opacity <= 0 || opacity >= 100) return opacity;
        return Math.min(99, Math.round(opacity * 1.4));
      };
      const archived = new Set(archivedSessionIds);
      const colors = assignColors(workspaces, projects, activePalette(global));
      // Pinned projects, in pin order; computed up front so the pin marker
      // composes into the same box-shadow declaration as the color bar.
      const pinnedRanked = workspaces
        .filter((workspace) => typeof projects[workspace.workspaceId]?.rank === 'number')
        .sort((a, b) => projects[a.workspaceId].rank - projects[b.workspaceId].rank);
      const pinnedKeys = new Set(pinnedRanked.map((workspace) => workspace.workspaceId));
      const rules = [
        // Bars swap smoothly when settings change; gradients cannot
        // interpolate and simply flip.
        '[data-row-key^="workspace:"],[data-row-key^="session:"]{transition:box-shadow .2s ease}',
      ];
      const statusEnabled = global.statusRunning || global.statusPending || global.statusUnread;
      for (const workspace of workspaces) {
        const baseColor = colors.get(workspace.workspaceId);
        if (baseColor === undefined) continue;
        const emphasis = projects[workspace.workspaceId]?.emphasis === true;
        const pinned = pinnedKeys.has(workspace.workspaceId);
        const glows = neon || emphasis;
        const color = shade(baseColor);
        const row = `[data-row-key="workspace:${cssString(workspace.workspaceId)}"]`;
        // The "|" bar is an inset shadow: no layout shift, and the host sets
        // no box-shadow on these rows to conflict with. The wash layers as
        // background-image so the host's hover/selected background-color
        // stays visible underneath. Neon/emphasis adds a blurred second
        // shadow so the bar carries a soft halo. Width 0 hides the bar.
        // Color-friendly mode doubles the bar and textures the wash. Pinned
        // rows add a fine inset hairline in their color — it hugs the row,
        // unlike an outside outline ring.
        const projectDeclarations = [];
        const shadowParts = [];
        if (global.projectBarWidth > 0) {
          const width = global.projectBarWidth;
          const solid = global.colorblind && width >= 2
            ? `inset ${width}px 0 0 ${color},inset ${width + 2}px 0 0 -1px transparent,inset ${width + 3}px 0 0 ${color}`
            : `inset ${width}px 0 0 ${color}`;
          shadowParts.push(solid);
          if (glows) shadowParts.push(`inset ${width + 10}px 0 16px -8px ${glowOf(color)}`);
        }
        if (pinned) shadowParts.push(`inset 0 0 0 1px color-mix(in srgb,${color} 38%,transparent)`);
        if (shadowParts.length > 0) projectDeclarations.push(`box-shadow:${shadowParts.join(',')}`);
        const projectOpacity = emphasize(boost(global.projectOpacity), emphasis);
        if (projectOpacity > 0) {
          let layer = washLayer(color, projectOpacity, global.projectExtent);
          if (global.colorblind && projectOpacity < 100) {
            layer = `repeating-linear-gradient(45deg,color-mix(in srgb,${color} 10%,transparent) 0 6px,transparent 6px 14px),${layer}`;
          }
          projectDeclarations.push(`background-image:${layer}`);
        }
        if (projectDeclarations.length > 0) rules.push(`${row}{${projectDeclarations.join(';')}}`);
        // Solid fill: keep the row's text readable over the color.
        if (projectOpacity >= 100) {
          const textColor = readableTextColor(color);
          if (textColor !== undefined) rules.push(`${row}{color:${textColor}}`);
        }
        // Folder glyph (first cell) and the hover chevron (second cell);
        // neon/emphasis adds a drop-shadow glow around the tinted glyph.
        if (global.projectIconTint) {
          const glow = glows ? `;filter:drop-shadow(0 0 ${Math.round(2 + global.neonIntensity / 25)}px ${glowOf(color)})` : '';
          rules.push(`${row}>span:first-child,${row}>span:nth-child(2){color:${color}${glow}}`);
        }
        for (const sessionId of workspace.sessionIds ?? []) {
          // Archived rows read as inactive; they stay plain unless opted in.
          if (!global.colorArchived && archived.has(sessionId)) continue;
          // Sessions inherit the project wash, one notch lighter.
          const sessionRow = `[data-row-key="session:${cssString(sessionId)}"]`;
          const sessionOpacity = emphasize(boost(global.sessionOpacity), emphasis);
          if (sessionOpacity > 0) {
            rules.push(`${sessionRow}{background-image:${washLayer(color, sessionOpacity, global.sessionExtent)}}`);
          }
          if (sessionOpacity >= 100) {
            const textColor = readableTextColor(color);
            if (textColor !== undefined) rules.push(`${sessionRow}{color:${textColor}}`);
          }
          // Status markers: pending input outranks running, running outranks
          // unread completion. They share the row's box-shadow slot, so at
          // most one marker is emitted per session.
          if (statusEnabled && statuses instanceof Map) {
            const status = statuses.get(sessionId);
            if (status !== undefined && status !== null) {
              if (global.statusPending && status.pendingInteraction !== undefined && status.pendingInteraction !== null) {
                rules.push(`${sessionRow}{box-shadow:inset 2px 0 0 var(--dsw-alias-state-warn-primary),inset 14px 0 18px -10px color-mix(in srgb,var(--dsw-alias-state-warn-primary) 55%,transparent)}`);
              } else if (global.statusRunning && status.running === true) {
                const pulseSeconds = (3 - 1.6 * (global.statusPulse / 100)).toFixed(2);
                rules.push(`${sessionRow}{--dsh-ps-c:${color};animation:dsh-ps-pulse ${pulseSeconds}s ease-in-out infinite}`);
              } else if (global.statusUnread && status.completionUnread === true) {
                rules.push(`${sessionRow}{box-shadow:inset 2px 0 0 var(--dsw-alias-state-success-primary)}`);
              }
            }
          }
        }
      }
      // The breathing halo reads its color from the row's --dsh-ps-c, so one
      // shared keyframe block serves every running session. The pulse
      // slider scales both the halo's reach and the cycle speed.
      if (global.statusRunning) {
        const k = global.statusPulse / 100;
        const reach = Math.round(6 + 12 * k);
        const blur = Math.round(10 + 16 * k);
        rules.push(`@keyframes dsh-ps-pulse{0%,100%{box-shadow:inset 2px 0 0 var(--dsh-ps-c)}50%{box-shadow:inset 2px 0 0 var(--dsh-ps-c),inset ${reach}px 0 ${blur}px -6px var(--dsh-ps-c)}}`);
      }
      // Pinned ordering needs no switch: any pin turns it on, no pins means
      // nothing moves. The sidebar's group wrapper is a plain block child of
      // the tree, so the tree is promoted to a flex column and pinned groups
      // receive negative order values. Groups without a pin keep DOM order
      // after the pinned block. If the host markup changes, the feature
      // degrades to "nothing moves". Each pinned row also gets a 📌 badge as
      // a flex item at its trailing edge (the fine hairline is composed into
      // the row's box-shadow in the main loop above).
      if (pinnedRanked.length > 0) {
        rules.push('[role="tree"]{display:flex;flex-direction:column}');
        pinnedRanked.forEach((workspace, index) => {
          const key = cssString(workspace.workspaceId);
          rules.push(`[role="tree"]>*:has([data-row-key="workspace:${key}"]){order:${index - pinnedRanked.length}}`);
          rules.push(`[data-row-key="workspace:${key}"]::after{content:"📌";font-size:10px;line-height:1;margin-left:auto;align-self:center;padding-left:6px;opacity:.75;filter:saturate(.9)}`);
        });
      }
      return rules.join('\n');
    }

    /**
     * Emits the per-project rules. Rendered in the frame-wide overlay layer,
     * which stays mounted in every shell state; the style element itself is
     * invisible and the layer is click-through.
     */
    function ShaderStyles(props) {
      const snapshot = useStore();
      const isDark = props.useIsDark();
      const workspaces = props.useWorkspaces((state) => state.items) ?? [];
      const archived = props.useWorkspaces((state) => state.archivedSessionIds) ?? [];
      // Optional hook: older hosts without useSessionStatus simply skip the
      // status markers.
      const statuses = typeof props.useSessionStatus === 'function'
        ? props.useSessionStatus((state) => state)
        : undefined;
      return h('style', { 'data-dsh-project-shader': '' },
        buildCss(workspaces, archived, resolveGlobal(snapshot), snapshot.projects, isDark, statuses));
    }

    /* --- icons --- */

    function makeSwatch(color) {
      return function Swatch() {
        return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true },
          h('circle', { cx: 8, cy: 8, r: 5.5, fill: color }));
      };
    }
    function PaletteIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true }, [
        h('rect', { key: 'a', x: 2, y: 2, width: 5.4, height: 5.4, rx: 1.4, fill: PALETTE[5].value }),
        h('rect', { key: 'b', x: 8.6, y: 2, width: 5.4, height: 5.4, rx: 1.4, fill: PALETTE[2].value }),
        h('rect', { key: 'c', x: 2, y: 8.6, width: 5.4, height: 5.4, rx: 1.4, fill: PALETTE[3].value }),
        h('rect', { key: 'd', x: 8.6, y: 8.6, width: 5.4, height: 5.4, rx: 1.4, fill: PALETTE[8].value }),
      ]);
    }
    function AutoSwatch() {
      return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true },
        h('circle', {
          cx: 8, cy: 8, r: 5.5, fill: 'none', stroke: 'currentColor',
          'stroke-width': 1.5, 'stroke-dasharray': '2.6 2.2',
        }));
    }
    /** Two crossing arrows for the "shuffle a new color" menu item. */
    function ShuffleIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true }, [
        h('path', { key: 'a', d: 'M1.5 4.5h2.6l7.9 7h2.5', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        h('path', { key: 'b', d: 'M12.2 9.3l2.3 2.2-2.3 2.2', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        h('path', { key: 'c', d: 'M1.5 11.5h2.6l2-2M9.4 6.5l2.6-2h2.5', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
        h('path', { key: 'd', d: 'M12.2 2.3l2.3 2.2-2.3 2.2', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      ]);
    }
    function SettingsIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 14, height: 14, 'aria-hidden': true }, [
        h('line', { key: 'a', x1: 2, y1: 5, x2: 14, y2: 5, stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round' }),
        h('circle', { key: 'b', cx: 5.5, cy: 5, r: 2.1, fill: 'currentColor' }),
        h('line', { key: 'c', x1: 2, y1: 11, x2: 14, y2: 11, stroke: 'currentColor', 'stroke-width': 1.5, 'stroke-linecap': 'round' }),
        h('circle', { key: 'd', cx: 10.5, cy: 11, r: 2.1, fill: 'currentColor' }),
      ]);
    }
    /** Monochrome sidebar panel glyph; the button owns the active tint. */
    function PanelIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 20;
      return h('svg', { viewBox: '0 0 16 16', width: size, height: size, 'aria-hidden': true }, [
        h('rect', { key: 'a', x: 2, y: 2, width: 5.4, height: 5.4, rx: 1.4, fill: 'currentColor' }),
        h('rect', { key: 'b', x: 8.6, y: 2, width: 5.4, height: 5.4, rx: 1.4, fill: 'currentColor', opacity: 0.65 }),
        h('rect', { key: 'c', x: 2, y: 8.6, width: 5.4, height: 5.4, rx: 1.4, fill: 'currentColor', opacity: 0.65 }),
        h('rect', { key: 'd', x: 8.6, y: 8.6, width: 5.4, height: 5.4, rx: 1.4, fill: 'currentColor' }),
      ]);
    }

    /* --- settings page --- */

    const PAGE_CSS = `
.dsh-ps-page{height:100%;overflow-y:auto;box-sizing:border-box;padding:24px 28px 48px;color:var(--dsw-alias-label-primary)}
.dsh-ps-container{max-width:720px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
.dsh-ps-title{font-size:18px;font-weight:600;margin:0}
.dsh-ps-desc{font-size:13px;color:var(--dsw-alias-label-secondary);margin:6px 0 0;line-height:1.6}
.dsh-ps-section{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:6px 16px 10px}
.dsh-ps-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0}
.dsh-ps-section-title{font-size:14px;font-weight:600;margin:0}
.dsh-ps-section-toggle{display:flex;align-items:center;gap:8px;flex:1;background:none;border:none;padding:0;font:inherit;color:inherit;cursor:pointer;text-align:left;border-radius:6px}
.dsh-ps-chevron{display:inline-block;font-size:11px;color:var(--dsw-alias-label-secondary);transition:transform .15s}
.dsh-ps-chevron[data-collapsed]{transform:rotate(-90deg)}
.dsh-ps-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 0;border-top:1px solid var(--dsw-alias-border-l1)}
.dsh-ps-label{font-size:13px}
.dsh-ps-hint{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:3px}
.dsh-ps-control{display:flex;align-items:center;gap:10px;flex-shrink:0}
.dsh-ps-value{font-size:12px;color:var(--dsw-alias-label-secondary);min-width:44px;text-align:right;font-variant-numeric:tabular-nums}
.dsh-ps-switch{width:36px;height:20px;border-radius:10px;border:none;padding:2px;cursor:pointer;background:color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent);transition:background .15s}
.dsh-ps-switch[aria-checked="true"]{background:var(--dsw-alias-brand-primary)}
.dsh-ps-knob{display:block;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s}
.dsh-ps-switch[aria-checked="true"] .dsh-ps-knob{transform:translateX(16px)}
.dsh-ps-range{width:150px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer}
.dsh-ps-range:disabled{opacity:.45;cursor:default}
.dsh-ps-value[data-edge]{color:var(--dsw-alias-brand-primary);font-weight:600}
.dsh-ps-segmented{display:inline-flex;gap:2px;padding:2px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
.dsh-ps-segment{font:inherit;font-size:12px;padding:3px 12px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background .15s,color .15s}
.dsh-ps-segment:hover{color:var(--dsw-alias-label-primary)}
.dsh-ps-segment[data-active]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 1px 3px rgb(0 0 0/.18)}
.dsh-ps-button{font:inherit;font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsh-ps-button:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent)}
.dsh-ps-button:disabled{opacity:.45;cursor:default}
.dsh-ps-project{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}
.dsh-ps-project-main{min-width:0;flex:1 1 160px}
.dsh-ps-project-name{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-ps-project-path{font-size:11px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
.dsh-ps-preview{width:14px;height:14px;border-radius:50%;flex-shrink:0;border:1px solid var(--dsw-alias-border-l1)}
.dsh-ps-dots{display:flex;gap:6px;flex-wrap:wrap}
.dsh-ps-dot{width:18px;height:18px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;box-sizing:border-box}
.dsh-ps-dot[aria-pressed="true"]{border-color:var(--dsw-alias-label-primary)}
.dsh-ps-hex{width:88px;font:inherit;font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-ps-hex[data-invalid]{border-color:var(--dsw-alias-state-error-primary)}
.dsh-ps-empty{font-size:12px;color:var(--dsw-alias-label-secondary);padding:12px 0;border-top:1px solid var(--dsw-alias-border-l1)}
.dsh-ps-notice{font-size:12px;color:var(--dsw-alias-label-secondary);margin:8px 0 0;padding:8px 10px;border-radius:8px;line-height:1.6;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent)}
.dsh-ps-header{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsh-ps-sticky{position:sticky;top:0;z-index:5;padding:10px 0;background:var(--dsw-alias-bg-base);box-shadow:0 1px 0 var(--dsw-alias-border-l1)}
.dsh-ps-previewhide{position:absolute;top:12px;right:0;width:22px;height:22px;border:none;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-size:12px;line-height:1;padding:0}
.dsh-ps-previewhide:hover{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-label-primary) 8%,transparent)}
.dsh-ps-previewshow{width:100%;text-align:center}
.dsh-ps-previewbox{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-specific-sidebar-fill);padding:8px;display:flex;flex-direction:column;gap:2px;overflow:hidden}
.dsh-ps-mockrow{position:relative;display:flex;align-items:center;gap:8px;min-height:30px;padding:0 10px;font-size:13px;border-radius:6px}
.dsh-ps-mocksession{margin-left:22px;min-height:26px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dsh-ps-presets{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 0;border-top:1px solid var(--dsw-alias-border-l1)}
.dsh-ps-search{width:100%;box-sizing:border-box;font:inherit;font-size:12px;padding:6px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);margin-top:8px}
.dsh-ps-star{color:var(--dsw-alias-label-secondary)}
.dsh-ps-star[aria-pressed="true"]{color:var(--dsw-alias-brand-primary)}
.dsh-ps-pin[aria-pressed="true"]{border-color:var(--dsw-alias-brand-primary)}
.dsh-ps-rank{font-size:11px;color:var(--dsw-alias-label-secondary);min-width:16px;text-align:center;font-variant-numeric:tabular-nums}
.dsh-ps-previewdots{display:flex;align-items:center;gap:5px;margin-top:8px;flex-wrap:wrap}
.dsh-ps-previewdots-label{font-size:11px;color:var(--dsw-alias-label-secondary);margin-right:2px}
.dsh-ps-minidot{width:12px;height:12px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;box-sizing:border-box}
.dsh-ps-minidot[aria-pressed="true"]{border-color:var(--dsw-alias-label-primary)}
.dsh-ps-miniauto{font:inherit;font-size:11px;padding:2px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsh-ps-miniauto[aria-pressed="true"]{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-primary)}
.dsh-ps-feedback{font-size:12px;color:var(--dsw-alias-state-success-primary);align-self:center}
.dsh-ps-feedback[data-error]{color:var(--dsw-alias-state-error-primary)}
.dsh-ps-switch:focus-visible,.dsh-ps-dot:focus-visible,.dsh-ps-button:focus-visible,.dsh-ps-range:focus-visible,.dsh-ps-hex:focus-visible,.dsh-ps-segment:focus-visible,.dsh-ps-search:focus-visible,.dsh-ps-minidot:focus-visible,.dsh-ps-miniauto:focus-visible,.dsh-ps-section-toggle:focus-visible,.dsh-ps-previewhide:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
`;

    function Toggle(props) {
      return h('button', {
        type: 'button', role: 'switch', 'aria-checked': props.checked,
        'aria-label': props.label, className: 'dsh-ps-switch',
        onClick: () => props.onChange(!props.checked),
      }, h('span', { className: 'dsh-ps-knob' }));
    }
    /**
     * Slider whose two ends are switches: reaching the minimum shows the
     * "off" label, reaching the maximum can show a special label (e.g. the
     * solid-fill endpoint). The numeric badge highlights on either edge.
     * Double-clicking the track restores the shipped default.
     */
    function NumberRange(props) {
      const range = RANGES[props.settingKey];
      const atMin = props.value <= range[0];
      const atMax = props.value >= range[1];
      const edgeLabel = atMin ? props.offLabel : atMax ? props.maxLabel : undefined;
      return h(React.Fragment, null,
        h('input', {
          type: 'range', className: 'dsh-ps-range', 'aria-label': props.label,
          min: range[0], max: range[1], value: props.value,
          disabled: props.disabled === true,
          title: props.resetTitle,
          onChange: (event) => props.onChange(Number(event.target.value)),
          onDoubleClick: () => {
            if (props.defaultValue !== undefined && props.value !== props.defaultValue) {
              props.onChange(props.defaultValue);
            }
          },
        }),
        h('span', {
          className: 'dsh-ps-value',
          ...(edgeLabel !== undefined ? { 'data-edge': '' } : {}),
        }, edgeLabel ?? `${props.value}${props.unit}`),
      );
    }
    /** Three-state pill used by the neon mode: light / dark / both themes. */
    function Segmented(props) {
      return h('div', { className: 'dsh-ps-segmented', role: 'radiogroup', 'aria-label': props.label },
        props.options.map((option) => {
          const active = props.value === option.value;
          return h('button', {
            key: option.value, type: 'button', role: 'radio', 'aria-checked': active,
            className: 'dsh-ps-segment', ...(active ? { 'data-active': '' } : {}),
            onClick: () => props.onChange(option.value),
          }, option.label);
        }),
      );
    }
    function SettingRow(props) {
      return h('div', { className: 'dsh-ps-row' },
        h('div', null,
          h('div', { className: 'dsh-ps-label' }, props.label),
          h('div', { className: 'dsh-ps-hint' }, props.hint),
        ),
        h('div', { className: 'dsh-ps-control' }, props.children),
      );
    }
    /** Collapsible panel section; the fold state persists across reloads. */
    function Section(props) {
      return h('section', { className: 'dsh-ps-section' },
        h('div', { className: 'dsh-ps-section-head' },
          h('button', {
            type: 'button', className: 'dsh-ps-section-toggle',
            'aria-expanded': !props.collapsed, onClick: props.onToggle,
          },
            h('span', {
              className: 'dsh-ps-chevron', 'aria-hidden': true,
              ...(props.collapsed ? { 'data-collapsed': '' } : {}),
            }, '▾'),
            h('h2', { className: 'dsh-ps-section-title' }, props.title),
          ),
        ),
        props.collapsed ? null : props.children,
      );
    }
    function HexInput(props) {
      const [text, setText] = React.useState(props.value ?? '');
      const [invalid, setInvalid] = React.useState(false);
      React.useEffect(() => {
        setText(props.value ?? '');
        setInvalid(false);
      }, [props.value]);
      const commit = () => {
        const trimmed = text.trim();
        if (trimmed === '') {
          setInvalid(false);
          if (props.value !== undefined && props.value !== '') props.onCommit(undefined);
          return;
        }
        const normalized = (trimmed.startsWith('#') ? trimmed : `#${trimmed}`).toLowerCase();
        if (isHexColor(normalized)) {
          setInvalid(false);
          props.onCommit(normalized);
        } else setInvalid(true);
      };
      return h('input', {
        className: 'dsh-ps-hex', value: text, placeholder: '#3e8ef7', spellCheck: false,
        'aria-label': props.label, 'aria-invalid': invalid || undefined,
        ...(invalid ? { 'data-invalid': '' } : {}),
        onChange: (event) => setText(event.target.value),
        onBlur: commit,
        onKeyDown: (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        },
      });
    }
    /**
     * Live mock of the sidebar rendered with the very CSS the sidebar gets:
     * buildCss runs over a fake workspace whose ids are unique to the panel,
     * so the injected rules match only these rows. The mock covers every
     * effect state at once — plain, running (breathing), awaiting input,
     * unread completion, archived — plus the pinned ring when ordering is
     * on. The tree-layout rules (`[role="tree"]`) are filtered out: they
     * target the real sidebar, not the mock.
     */
    const PREVIEW_WORKSPACE = {
      workspaceId: 'dsh-ps-preview',
      sessionIds: ['dsh-ps-preview.s1', 'dsh-ps-preview.s2', 'dsh-ps-preview.s3', 'dsh-ps-preview.s4', 'dsh-ps-preview.s5'],
    };
    const PREVIEW_ARCHIVED = ['dsh-ps-preview.s5'];
    const PREVIEW_STATUSES = new Map([
      ['dsh-ps-preview.s2', { running: true, pendingInteraction: undefined, completionUnread: false }],
      ['dsh-ps-preview.s3', { running: false, pendingInteraction: { key: 'demo', kind: 'demo', sessionId: 'dsh-ps-preview.s3' }, completionUnread: false }],
      ['dsh-ps-preview.s4', { running: false, pendingInteraction: undefined, completionUnread: true }],
    ]);
    function PreviewPane(props) {
      const { global, isDark, t, palette, anyPinned } = props;
      // A chosen sample color overrides the hash assignment for the mock;
      // while any project is pinned the mock also wears the pinned ring.
      const overrideEntry = {
        ...(isHexColor(global.previewColor) ? { color: global.previewColor } : {}),
        ...(anyPinned === true ? { rank: 1 } : {}),
      };
      const override = Object.keys(overrideEntry).length > 0 ? { 'dsh-ps-preview': overrideEntry } : {};
      const css = buildCss([PREVIEW_WORKSPACE], PREVIEW_ARCHIVED, global, override, isDark, PREVIEW_STATUSES)
        .split('\n')
        .filter((line) => !line.startsWith('[role="tree"]'))
        .join('\n');
      const sessionRows = [
        ['s1', null],
        ['s2', t('preview.running')],
        ['s3', t('preview.pending')],
        ['s4', t('preview.unread')],
        ['s5', t('preview.archived')],
      ];
      return h(React.Fragment, null,
        h('style', null, css),
        h('div', { className: 'dsh-ps-previewbox', role: 'img', 'aria-label': t('preview.label') },
          h('div', { className: 'dsh-ps-mockrow', 'data-row-key': 'workspace:dsh-ps-preview' },
            h('span', null, '📁'),
            h('span', null, '›'),
            h('span', null, t('preview.project')),
          ),
          sessionRows.map(([id, caption]) => h('div', {
            key: id,
            className: 'dsh-ps-mockrow dsh-ps-mocksession',
            'data-row-key': `session:dsh-ps-preview.${id}`,
            ...(id === 's5' ? { style: { opacity: 0.55 } } : {}),
          }, caption === null ? t('preview.session') : `${t('preview.session')} · ${caption}`)),
        ),
        h('div', { className: 'dsh-ps-previewdots', role: 'radiogroup', 'aria-label': t('preview.color') },
          h('span', { className: 'dsh-ps-previewdots-label' }, t('preview.color')),
          palette.map((entry) => h('button', {
            key: entry.id, type: 'button', className: 'dsh-ps-minidot', role: 'radio',
            style: { background: entry.value },
            'aria-checked': global.previewColor === entry.value,
            'aria-label': t(`color.${entry.id}`), title: t(`color.${entry.id}`),
            onClick: () => setGlobalField('previewColor', entry.value),
          })),
          h('button', {
            type: 'button', className: 'dsh-ps-miniauto', role: 'radio',
            'aria-checked': !isHexColor(global.previewColor),
            onClick: () => setGlobalField('previewColor', undefined),
          }, t('preview.auto')),
        ),
      );
    }
    function ProjectColorRow(props) {
      const { workspace, snapshot, colors, t, neon, neonIntensity, palette } = props;
      const workspaceId = workspace.workspaceId;
      const stored = storedColorOf(snapshot, workspaceId);
      const emphasis = snapshot.projects[workspaceId]?.emphasis === true;
      const rank = snapshot.projects[workspaceId]?.rank;
      const pinned = typeof rank === 'number';
      const effective = colors.get(workspaceId);
      // The preview dot mirrors the sidebar: with neon live it glows too.
      const display = neon && effective !== undefined ? toNeon(effective, neonIntensity) : effective;
      const title = workspace.title || workspace.path || workspaceId;
      return h('div', { className: 'dsh-ps-project' },
        h('span', {
          className: 'dsh-ps-preview',
          style: {
            background: display ?? 'transparent',
            ...(neon && display !== undefined ? { boxShadow: `0 0 6px ${display}` } : {}),
          },
          title: stored === 'none' ? t('colors.none') : (effective ?? t('colors.auto')),
        }),
        h('div', { className: 'dsh-ps-project-main' },
          h('div', { className: 'dsh-ps-project-name' }, title),
          workspace.path !== undefined && workspace.path !== title
            ? h('div', { className: 'dsh-ps-project-path' }, workspace.path)
            : null,
        ),
        h('div', { className: 'dsh-ps-dots' },
          palette.map((entry) => {
            const selected = stored === entry.value;
            // Auto assignment landing on this swatch: ring it without
            // claiming a stored choice (aria-pressed stays false).
            const autoHit = stored === undefined && effective === entry.value;
            return h('button', {
              key: entry.id, type: 'button', className: 'dsh-ps-dot',
              style: {
                background: entry.value,
                ...(autoHit ? { borderColor: 'var(--dsw-alias-label-secondary)' } : {}),
              },
              'aria-pressed': selected,
              'aria-label': t(`color.${entry.id}`), title: t(`color.${entry.id}`),
              onClick: () => setProjectColor(workspaceId, entry.value),
            });
          }),
        ),
        h(HexInput, {
          label: t('colors.custom'),
          value: isHexColor(stored) ? stored : '',
          onCommit: (hex) => setProjectColor(workspaceId, hex),
        }),
        h('button', {
          type: 'button', className: 'dsh-ps-button dsh-ps-star',
          'aria-pressed': emphasis, 'aria-label': t('colors.emphasis'), title: t('colors.emphasis.hint'),
          onClick: () => setProjectEmphasis(workspaceId, !emphasis),
        }, '★'),
        // Pin controls are always visible; no pins means the feature simply
        // has no effect, so there is no separate switch to hunt for.
        h('button', {
          type: 'button', className: 'dsh-ps-button dsh-ps-pin',
          'aria-pressed': pinned, 'aria-label': t('colors.pin'), title: t('colors.pin.hint'),
          onClick: () => setProjectPin(workspaceId, !pinned),
        }, '📌'),
        pinned
          ? h(React.Fragment, null,
              h('span', { className: 'dsh-ps-rank', title: t('colors.pin.hint') }, rank),
              h('button', {
                type: 'button', className: 'dsh-ps-button',
                'aria-label': t('colors.moveUp'), title: t('colors.moveUp'),
                onClick: () => moveProjectRank(workspaceId, -1),
              }, '↑'),
              h('button', {
                type: 'button', className: 'dsh-ps-button',
                'aria-label': t('colors.moveDown'), title: t('colors.moveDown'),
                onClick: () => moveProjectRank(workspaceId, 1),
              }, '↓'),
            )
          : null,
        h('button', {
          type: 'button', className: 'dsh-ps-button',
          'aria-pressed': stored === 'none',
          onClick: () => setProjectColor(workspaceId, stored === 'none' ? undefined : 'none'),
        }, t('colors.none')),
        h('button', {
          type: 'button', className: 'dsh-ps-button', disabled: stored === undefined,
          onClick: () => setProjectColor(workspaceId, undefined),
        }, t('colors.auto')),
      );
    }
    function SettingsPage(props) {
      props.useLocaleRevision();
      const snapshot = useStore();
      const isDark = props.useIsDark();
      const t = props.t;
      const global = resolveGlobal(snapshot);
      const workspaces = props.useWorkspaces((state) => state.items) ?? [];
      const palette = activePalette(global);
      const colors = assignColors(workspaces, snapshot.projects, palette);
      const neon = isNeonActive(global, isDark);
      const collapsed = collapsedOf(snapshot);
      const anyPinned = Object.values(snapshot.projects).some((entry) => typeof entry.rank === 'number');
      const [query, setQuery] = React.useState('');
      const [feedback, setFeedback] = React.useState(null);
      const fileInputRef = React.useRef(null);
      const needle = query.trim().toLowerCase();
      const visible = needle === '' ? workspaces : workspaces.filter((workspace) =>
        `${workspace.title ?? ''} ${workspace.path ?? ''} ${workspace.workspaceId}`.toLowerCase().includes(needle));
      const row = (label, hint, control) => h(SettingRow, { key: label, label, hint }, control);
      const resetTitle = t('hint.doubleClickReset');
      const range = (label, hint, key, extra) => row(label, hint, h(NumberRange, {
        label, settingKey: key, value: global[key], defaultValue: DEFAULTS[key],
        resetTitle, onChange: (v) => setGlobalField(key, v), ...extra,
      }));
      const section = (id, children) => h(Section, {
        key: id, id, title: t(`section.${id}`),
        collapsed: collapsed[id] === true, onToggle: () => toggleSection(id),
      }, children);
      return h('div', { className: 'dsh-ps-page' },
        h('style', null, PAGE_CSS),
        h('div', { className: 'dsh-ps-container' },
          h('div', null,
            h('div', { className: 'dsh-ps-header' },
              h('h1', { className: 'dsh-ps-title' }, t('page.title')),
              h('button', { type: 'button', className: 'dsh-ps-button', onClick: resetGlobal }, t('action.resetGlobal')),
            ),
            h('p', { className: 'dsh-ps-desc' }, t('page.intro')),
          ),
          h('div', { className: 'dsh-ps-sticky' },
            snapshot.previewHidden === true
              ? h('button', {
                  type: 'button', className: 'dsh-ps-button dsh-ps-previewshow',
                  onClick: () => setPreviewHidden(false),
                }, `▾ ${t('preview.show')}`)
              : h(React.Fragment, null,
                  h(PreviewPane, { global, isDark, t, palette, anyPinned }),
                  h('button', {
                    type: 'button', className: 'dsh-ps-previewhide',
                    'aria-label': t('preview.hide'), title: t('preview.hide'),
                    onClick: () => setPreviewHidden(true),
                  }, '✕'),
                ),
          ),
          section('presets', [
            h('p', { key: 'hint', className: 'dsh-ps-desc' }, t('presets.hint')),
            h('div', { key: 'list', className: 'dsh-ps-presets' },
              PRESETS.map((preset) => h('button', {
                key: preset.id, type: 'button', className: 'dsh-ps-button',
                onClick: () => applyPreset(preset),
              }, t(`preset.${preset.id}`))),
            ),
          ]),
          section('project', [
            range(t('row.opacity'), `${t('row.opacity.hint')} · ${t('hint.defaultPercent', { v: DEFAULTS.projectOpacity })}`, 'projectOpacity',
              { unit: '%', offLabel: t('value.off'), maxLabel: t('value.solid') }),
            range(t('row.extent'), t('hint.defaultPx', { v: DEFAULTS.projectExtent }), 'projectExtent',
              { unit: 'px', disabled: global.projectOpacity <= 0 || global.projectOpacity >= 100 }),
            range(t('row.barWidth'), `${t('row.barWidth.hint')} · ${t('hint.defaultPx', { v: DEFAULTS.projectBarWidth })}`, 'projectBarWidth',
              { unit: 'px', offLabel: t('value.off') }),
            row(t('row.iconTint'), `${t('row.iconTint.hint')} · ${t('hint.defaultOn')}`,
              h(Toggle, { label: t('row.iconTint'), checked: global.projectIconTint, onChange: (v) => setGlobalField('projectIconTint', v) })),
          ]),
          section('session', [
            range(t('row.opacity'), `${t('row.opacity.hint')} · ${t('hint.defaultPercent', { v: DEFAULTS.sessionOpacity })}`, 'sessionOpacity',
              { unit: '%', offLabel: t('value.off'), maxLabel: t('value.solid') }),
            range(t('row.extent'), t('hint.defaultPx', { v: DEFAULTS.sessionExtent }), 'sessionExtent',
              { unit: 'px', disabled: global.sessionOpacity <= 0 || global.sessionOpacity >= 100 }),
            row(t('row.colorArchived'), `${t('row.colorArchived.hint')} · ${t('hint.defaultOff')}`,
              h(Toggle, { label: t('row.colorArchived'), checked: global.colorArchived, onChange: (v) => setGlobalField('colorArchived', v) })),
          ]),
          section('neon', [
            row(t('row.neon'), `${t('row.neon.hint')} · ${t('hint.defaultDark')}${neon ? ` · ${t('hint.activeNow')}` : ''}`,
              h(Segmented, {
                label: t('row.neon'), value: global.neonMode,
                options: NEON_MODES.map((mode) => ({ value: mode, label: t(`neon.${mode}`) })),
                onChange: (v) => setGlobalField('neonMode', v),
              })),
            range(t('row.neonIntensity'), `${t('row.neonIntensity.hint')} · ${t('hint.defaultPercent', { v: DEFAULTS.neonIntensity })}`, 'neonIntensity',
              { unit: '%', offLabel: t('value.off') }),
          ]),
          section('status', [
            row(t('row.statusRunning'), `${t('row.statusRunning.hint')} · ${t('hint.defaultOn')}`,
              h(Toggle, { label: t('row.statusRunning'), checked: global.statusRunning, onChange: (v) => setGlobalField('statusRunning', v) })),
            range(t('row.statusPulse'), `${t('row.statusPulse.hint')} · ${t('hint.defaultPercent', { v: DEFAULTS.statusPulse })}`, 'statusPulse',
              { unit: '%', disabled: !global.statusRunning }),
            row(t('row.statusPending'), `${t('row.statusPending.hint')} · ${t('hint.defaultOn')}`,
              h(Toggle, { label: t('row.statusPending'), checked: global.statusPending, onChange: (v) => setGlobalField('statusPending', v) })),
            row(t('row.statusUnread'), `${t('row.statusUnread.hint')} · ${t('hint.defaultOn')}`,
              h(Toggle, { label: t('row.statusUnread'), checked: global.statusUnread, onChange: (v) => setGlobalField('statusUnread', v) })),
          ]),
          section('advanced', [
            row(t('row.brandFirst'), `${t('row.brandFirst.hint')} · ${t('hint.defaultOff')}`,
              h(Toggle, { label: t('row.brandFirst'), checked: global.brandFirst, onChange: (v) => setGlobalField('brandFirst', v) })),
            row(t('row.colorblind'), `${t('row.colorblind.hint')} · ${t('hint.defaultOff')}`,
              h(Toggle, { label: t('row.colorblind'), checked: global.colorblind, onChange: (v) => setGlobalField('colorblind', v) })),
          ]),
          section('colors', [
            h('p', { key: 'hint', className: 'dsh-ps-desc' }, t('colors.hint')),
            h('p', { key: 'pinhint', className: 'dsh-ps-notice' }, t('colors.pinHint')),
            h('input', {
              key: 'search',
              className: 'dsh-ps-search', value: query, spellCheck: false,
              placeholder: t('colors.searchPlaceholder'), 'aria-label': t('colors.searchPlaceholder'),
              onChange: (event) => setQuery(event.target.value),
            }),
            visible.length === 0
              ? h('div', { key: 'empty', className: 'dsh-ps-empty' }, workspaces.length === 0 ? t('colors.empty') : t('colors.noMatch'))
              : visible.map((workspace) => h(ProjectColorRow, {
                  key: workspace.workspaceId, workspace, snapshot, colors, t,
                  neon, neonIntensity: global.neonIntensity, palette,
                })),
          ]),
          section('data', [
            h('p', { key: 'hint', className: 'dsh-ps-desc' }, t('data.hint')),
            h('div', { key: 'list', className: 'dsh-ps-presets' },
              h('button', { type: 'button', className: 'dsh-ps-button', onClick: exportSettings }, t('action.export')),
              h('button', { type: 'button', className: 'dsh-ps-button', onClick: () => fileInputRef.current?.click() }, t('action.import')),
              h('input', {
                ref: fileInputRef, type: 'file', accept: 'application/json,.json',
                style: { display: 'none' }, 'aria-hidden': true, tabIndex: -1,
                onChange: (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file !== undefined) importSettings(file, (ok) => setFeedback(ok ? 'ok' : 'fail'));
                },
              }),
              feedback !== null
                ? h('span', { className: 'dsh-ps-feedback', ...(feedback === 'fail' ? { 'data-error': '' } : {}) },
                    t(feedback === 'ok' ? 'data.importOk' : 'data.importFail'))
                : null,
            ),
          ]),
        ),
      );
    }

    const dictionaries = {
      en: {
        panel: { title: 'Project shader' },
        menu: { projectColor: 'Project color', openSettings: 'Open shader settings' },
        page: {
          title: 'Project shader',
          intro: 'Tune how projects and their sessions are tinted in the workspace sidebar. The defaults quoted on each row are the shipped look; every change applies to the sidebar immediately.',
        },
        section: {
          presets: 'Presets', project: 'Project rows', session: 'Session rows',
          neon: 'Neon glow', status: 'Session status', advanced: 'Advanced',
          colors: 'Project colors', data: 'Settings data',
        },
        row: {
          opacity: 'Wash intensity',
          'opacity.hint': '0 turns the wash off, 100% fills the whole row',
          extent: 'Gradient reach',
          iconTint: 'Tint folder glyph',
          'iconTint.hint': 'Folder and chevron take the project color',
          barWidth: 'Bar width "|"',
          'barWidth.hint': 'Slide to 0 to hide the bar',
          colorArchived: 'Color archived sessions',
          'colorArchived.hint': 'Off keeps archived rows plain gray',
          neon: 'Glow applies on',
          'neon.hint': 'Pick the themes where the fluorescent glow is active',
          neonIntensity: 'Glow intensity',
          'neonIntensity.hint': 'Slide to 0 to turn the glow off entirely',
          statusRunning: 'Running: breathing halo',
          'statusRunning.hint': 'Running sessions pulse a halo in the project color',
          statusPulse: 'Pulse strength',
          'statusPulse.hint': 'Halo reach and cycle speed',
          statusPending: 'Awaiting input: warn marker',
          'statusPending.hint': 'Sessions waiting for an answer get a warning edge',
          statusUnread: 'Unread completion: success marker',
          'statusUnread.hint': 'Finished sessions with unread results get a green edge',
          brandFirst: 'Follow theme brand color',
          'brandFirst.hint': 'Automatic colors start from the active theme accent',
          colorblind: 'Color-friendly mode',
          'colorblind.hint': 'High-distinction palette, doubled bars and textured washes',
        },
        neon: { light: 'Light', dark: 'Dark', both: 'Both' },
        value: { off: 'Off', solid: 'Solid' },
        hint: {
          defaultOn: 'Default: on', defaultOff: 'Default: off',
          defaultPercent: 'Default {v}%', defaultPx: 'Default {v}px', current: ' (current)',
          defaultDark: 'Default: dark only', activeNow: 'active now',
          doubleClickReset: 'Double-click to restore the default',
        },
        action: { resetGlobal: 'Reset all to defaults', export: 'Export settings', import: 'Import settings' },
        presets: { hint: 'One-click starting points; you can keep tuning every control afterwards.' },
        preset: {
          soft: 'Soft', vivid: 'Vivid', minimal: 'Minimal', neonParty: 'Neon party',
          bars: 'Bars only', fill: 'Full fill', whisper: 'Whisper', bold: 'Bold',
          nightOwl: 'Night owl', icons: 'Icon spark',
        },
        preview: {
          label: 'Live preview of the sidebar look', project: 'Example project', session: 'Session',
          color: 'Sample color', auto: 'Auto',
          running: 'Running', pending: 'Awaiting input', unread: 'Finished, unread', archived: 'Archived',
          hide: 'Hide preview', show: 'Show preview',
        },
        data: {
          hint: 'Export saves every setting and project color to a JSON file; importing replaces the current settings after validation.',
          importOk: 'Imported ✓', importFail: 'Import failed: not a valid settings file',
        },
        colors: {
          auto: 'Auto', none: 'None', custom: 'Custom hex color',
          hint: 'Pick a palette color or enter a custom hex value per project; Auto restores the hash-based assignment, None leaves the project uncolored. Automatic colors are balanced across the current project set, so they can shift when projects are added or removed.',
          pinHint: '📌 Tip: click the 📌 on any project row to pin it (multi-select). Pinned groups move to the top of the sidebar with a 📌 badge at the row’s end and a fine color rim; use ↑ ↓ to set the order — it doubles as the color-importance ranking.',
          empty: 'No projects yet. Add a workspace in the sidebar to assign its color.',
          searchPlaceholder: 'Filter projects by name or path…',
          noMatch: 'No project matches the filter.',
          emphasis: 'Emphasize this project',
          'emphasis.hint': 'Stronger wash and a glow on every theme',
          pin: 'Pin to top',
          'pin.hint': 'Move to the top of the sidebar with a 📌 badge and a fine color rim',
          moveUp: 'Move up', moveDown: 'Move down',
        },
        color: {
          auto: 'Automatic', brand: 'Theme accent', shuffle: 'Shuffle a color',
          red: 'Red', orange: 'Orange', amber: 'Amber', green: 'Green', teal: 'Teal',
          blue: 'Blue', indigo: 'Indigo', purple: 'Purple', pink: 'Pink', gray: 'Gray',
          'oi-orange': 'Orange', 'oi-skyblue': 'Sky blue', 'oi-green': 'Bluish green',
          'oi-yellow': 'Yellow', 'oi-blue': 'Blue', 'oi-vermillion': 'Vermillion',
          'oi-pink': 'Reddish purple', 'oi-black': 'Gray',
        },
      },
      zh: {
        panel: { title: '项目着色' },
        menu: { projectColor: '项目颜色', openSettings: '打开着色设置' },
        page: {
          title: '项目着色',
          intro: '调整左侧工作区中项目及其会话的着色效果。每行标注的默认值即插件出厂外观；所有修改即时生效。',
        },
        section: {
          presets: '预设方案', project: '项目行', session: '会话行',
          neon: '荧光效果', status: '会话状态', advanced: '高级',
          colors: '项目颜色', data: '设置数据',
        },
        row: {
          opacity: '颜色浓度',
          'opacity.hint': '拉到 0 关闭渐变，拉到 100% 整行实色',
          extent: '渐变范围',
          iconTint: '文件夹图标着色',
          'iconTint.hint': '文件夹与展开箭头使用项目色',
          barWidth: '竖线宽度「|」',
          'barWidth.hint': '拉到 0 关闭竖线',
          colorArchived: '归档会话也着色',
          'colorArchived.hint': '关闭时归档行保持朴素灰色',
          neon: '荧光生效主题',
          'neon.hint': '选择荧光效果在哪种主题下生效',
          neonIntensity: '荧光强度',
          'neonIntensity.hint': '拉到 0 完全关闭荧光',
          statusRunning: '运行中：呼吸光环',
          'statusRunning.hint': '正在运行的会话行以项目色呼吸发光',
          statusPulse: '呼吸强度',
          'statusPulse.hint': '呼吸光环的范围与速度',
          statusPending: '等待输入：警告标记',
          'statusPending.hint': '等待你操作的会话行显示警告色边缘',
          statusUnread: '完成未读：成功标记',
          'statusUnread.hint': '已完成且结果未读的会话行显示绿色边缘',
          brandFirst: '跟随主题品牌色',
          'brandFirst.hint': '自动配色优先使用当前主题的强调色',
          colorblind: '色彩友好模式',
          'colorblind.hint': '为色彩辨识提供更多线索：高区分度调色板，竖线变双线、渐变叠细纹',
        },
        neon: { light: '白天', dark: '夜晚', both: '同时' },
        value: { off: '关', solid: '实色' },
        hint: {
          defaultOn: '默认：开', defaultOff: '默认：关',
          defaultPercent: '默认 {v}%', defaultPx: '默认 {v}px', current: '（当前）',
          defaultDark: '默认：仅夜晚', activeNow: '当前生效中',
          doubleClickReset: '双击恢复默认值',
        },
        action: { resetGlobal: '全部恢复默认值', export: '导出设置', import: '导入设置' },
        presets: { hint: '一键套用的起点方案，套用后仍可逐项微调。' },
        preset: {
          soft: '柔和', vivid: '醒目', minimal: '极简', neonParty: '荧光派对',
          bars: '纯竖线', fill: '整行满色', whisper: '轻语', bold: '重彩',
          nightOwl: '夜行者', icons: '图标点睛',
        },
        preview: {
          label: '侧边栏效果实时预览', project: '示例项目', session: '会话',
          color: '示例颜色', auto: '自动',
          running: '运行中', pending: '等待输入', unread: '完成未读', archived: '已归档',
          hide: '收起预览', show: '显示预览',
        },
        data: {
          hint: '导出会把全部设置与项目颜色保存为 JSON 文件；导入时先校验再整体替换当前设置。',
          importOk: '导入成功 ✓', importFail: '导入失败：不是有效的设置文件',
        },
        colors: {
          auto: '自动', none: '不着色', custom: '自定义 hex 颜色',
          hint: '为每个项目选择调色板颜色或输入自定义 hex 值；「自动」恢复哈希分配，「不着色」让项目保持原样。自动色会在当前项目集合内避让分配，新增或删除项目时可能微调。',
          pinHint: '📌 小提示：点任意项目行的 📌 即可置顶（可多选）。置顶组会排到侧边栏最前，行尾带 📌 徽标、行周有彩色细描边；用 ↑ ↓ 调整顺序——顺序即颜色重要程度。',
          empty: '还没有项目。先在侧边栏添加工作区，再来为它指定颜色。',
          searchPlaceholder: '按名称或路径筛选项目…',
          noMatch: '没有匹配的项目。',
          emphasis: '强调此项目',
          'emphasis.hint': '更浓的着色，且在任何主题下都带辉光',
          pin: '置顶此项目',
          'pin.hint': '排到侧边栏最前，带 📌 徽标与彩色细描边',
          moveUp: '上移', moveDown: '下移',
        },
        color: {
          auto: '自动', brand: '主题强调色', shuffle: '随机换色',
          red: '红色', orange: '橙色', amber: '琥珀', green: '绿色', teal: '青色',
          blue: '蓝色', indigo: '靛蓝', purple: '紫色', pink: '粉色', gray: '灰色',
          'oi-orange': '橙色', 'oi-skyblue': '天蓝', 'oi-green': '蓝绿',
          'oi-yellow': '黄色', 'oi-blue': '蓝色', 'oi-vermillion': '朱红',
          'oi-pink': '紫红', 'oi-black': '灰色',
        },
      },
    };

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, dictionaries), 'project-shader: locale');
        // Plugin copy is bilingual; Chinese is the default for every locale
        // that is not explicitly English (the host's own chain ends at en).
        const flat = { zh: flattenDict(dictionaries.zh, '', {}), en: flattenDict(dictionaries.en, '', {}) };
        const t = (key, params) => {
          const snapshot = typeof ctx.locale.getSnapshot === 'function' ? ctx.locale.getSnapshot() : undefined;
          const active = String(snapshot?.active ?? 'zh').toLowerCase();
          const lang = active.startsWith('zh') ? 'zh' : active === 'en' ? 'en' : 'zh';
          const template = flat[lang][key] ?? flat.zh[key] ?? flat.en[key] ?? key;
          if (params === undefined) return template;
          return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
        };
        // Re-render the settings page when the app language switches.
        const useLocaleRevision = () => React.useSyncExternalStore(
          (listener) => ctx.locale.subscribe(listener),
          () => ctx.locale.getSnapshot().revision,
        );

        // Dark-theme sensing for neon mode: the optional theme service owns
        // the active palette; fall back to the light look while it is away.
        let themeService = null;
        let darkActive = false;
        const themeListeners = new Set();
        const refreshDark = () => {
          const next = themeService?.getTheme?.().active?.colorScheme === 'dark';
          if (next === darkActive) return;
          darkActive = next;
          for (const listener of themeListeners) listener();
        };
        ctx.inject(['theme'], (services) => {
          themeService = services.theme;
          services.effect(() => {
            refreshDark();
            const off = services.on('theme/change', refreshDark);
            return () => { off(); themeService = null; refreshDark(); };
          }, 'project-shader: theme capture');
        });
        const useIsDark = () => React.useSyncExternalStore(
          (listener) => {
            themeListeners.add(listener);
            return () => { themeListeners.delete(listener); };
          },
          () => darkActive,
        );

        ctx.slots.inject('shell.overlay', () => ctx.slots.register(
          { name: 'shell.overlay', id: PANEL_ID },
          (props) => h(ShaderStyles, { ...props, useIsDark }),
        ));

        // Sidebar entry plus its main panel: the full customization surface.
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 30, label: () => t('panel.title'), locale: NS },
          PanelIcon,
        ));
        ctx.slots.inject('main', () => ctx.slots.register(
          { name: 'main', key: PANEL_ID, locale: NS },
          (props) => h(SettingsPage, { ...props, t, useLocaleRevision, useIsDark }),
        ));

        ctx.slots.inject('contextMenu.icon', function* icons() {
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'dsh-project-shader.palette' }, PaletteIcon);
          // Swatches for every palette the menu can offer (default,
          // colorblind, and the follow-the-theme brand slot).
          for (const entry of [...PALETTE, ...OKABE_ITO, BRAND_ENTRY]) {
            yield ctx.slots.register(
              { name: 'contextMenu.icon', key: `dsh-project-shader.swatch.${entry.id}` },
              makeSwatch(entry.value),
            );
          }
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'dsh-project-shader.swatch.auto' }, AutoSwatch);
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'dsh-project-shader.shuffle' }, ShuffleIcon);
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'dsh-project-shader.settings' }, SettingsIcon);
        });

        // Optional services degrade independently: the color menu needs only
        // contextMenus; the "open settings" item appears once layout is there.
        let layoutService = null;
        ctx.inject(['layout'], (services) => {
          layoutService = services.layout;
          services.effect(() => () => { layoutService = null; }, 'project-shader: layout capture');
        });
        ctx.inject(['contextMenus'], (services) => {
          services.effect(() => services.contextMenus.register({
            id: 'dsh-project-shader.color',
            target: 'workspace',
            order: 200,
            resolve: ({ workspaceId }) => {
              const snapshot = getState();
              const current = storedColorOf(snapshot, workspaceId);
              const menuPalette = activePalette(resolveGlobal(snapshot));
              const mark = (label, active) => (active ? `${label}${t('hint.current')}` : label);
              const children = menuPalette.map((entry) => ({
                id: entry.id,
                label: mark(t(`color.${entry.id}`), current === entry.value),
                icon: { key: `dsh-project-shader.swatch.${entry.id}` },
                // The active choice is already applied; disable it as the marker.
                disabled: current === entry.value,
                run: () => { setProjectColor(workspaceId, entry.value); },
              }));
              // A custom hex has no swatch row; show it as a disabled caption.
              if (isHexColor(current) && !menuPalette.some((entry) => entry.value === current)) {
                children.unshift({ id: 'current', label: mark(current, true), disabled: true });
              }
              // Shuffle stores a plain palette hex (the brand var() stays an
              // automatic-assignment exclusive so reload keeps the color).
              children.push({
                id: 'shuffle',
                label: t('color.shuffle'),
                icon: { key: 'dsh-project-shader.shuffle' },
                separatorBefore: true,
                run: () => {
                  const pool = menuPalette.filter((entry) => isHexColor(entry.value) && entry.value !== current);
                  const pick = pool[Math.floor(Math.random() * pool.length)];
                  if (pick !== undefined) setProjectColor(workspaceId, pick.value);
                },
              });
              children.push({
                id: 'auto',
                label: mark(t('color.auto'), current === undefined),
                icon: { key: 'dsh-project-shader.swatch.auto' },
                disabled: current === undefined,
                run: () => { setProjectColor(workspaceId, undefined); },
              });
              if (layoutService !== null) {
                children.push({
                  id: 'settings',
                  label: t('menu.openSettings'),
                  icon: { key: 'dsh-project-shader.settings' },
                  separatorBefore: true,
                  run: () => {
                    try { layoutService?.selectPanel(PANEL_ID); } catch (_error) { /* panel key races are harmless */ }
                  },
                });
              }
              return [{
                id: 'color',
                label: t('menu.projectColor'),
                icon: { key: 'dsh-project-shader.palette' },
                children,
              }];
            },
          }), 'project-shader: workspace color menu');
        });
      },
    };
  },
});
