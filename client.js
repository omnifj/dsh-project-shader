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
 *   submenu; the full settings surface is the `dsh-project-shader` main panel
 *   with its `sidebar.panellist` entry: global gradient/bar/glyph parameters
 *   and per-project palette, custom-hex, auto, or uncolored choices.
 * - Everything persists in localStorage; defaults below are the shipped look.
 */
window.__ModuleLoader__.load({
  id: 'dsh-project-shader',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-project-shader';
    const PANEL_ID = 'dsh-project-shader';
    const STORAGE_KEY = 'dsh-project-shader:settings:v2';
    const LEGACY_KEY = 'dsh-project-shader:colors:v1';
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

    /** Shipped look; the settings page quotes these as the reference. */
    const DEFAULTS = {
      projectGradient: true,
      projectOpacity: 20,
      projectExtent: 48,
      projectBar: true,
      projectBarWidth: 3,
      projectIconTint: true,
      sessionGradient: true,
      sessionOpacity: 14,
      sessionExtent: 56,
      colorArchived: false,
    };
    const RANGES = {
      projectOpacity: [0, 60], sessionOpacity: [0, 60],
      projectExtent: [16, 200], sessionExtent: [16, 200],
      projectBarWidth: [1, 12],
    };
    const BOOLEAN_KEYS = ['projectGradient', 'projectBar', 'projectIconTint', 'sessionGradient', 'colorArchived'];

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
      return out;
    }
    function normalizeProjects(input) {
      const out = {};
      if (input === null || typeof input !== 'object') return out;
      for (const [workspaceId, entry] of Object.entries(input)) {
        if (entry === null || typeof entry !== 'object') continue;
        if (isHexColor(entry.color)) out[workspaceId] = { color: entry.color.toLowerCase() };
        else if (entry.color === 'none') out[workspaceId] = { color: 'none' };
      }
      return out;
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
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_error) { /* quota/denied: keep session-local */ }
      for (const listener of listeners) listener();
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
        if (color === undefined) delete projects[workspaceId];
        else projects[workspaceId] = { color };
        return { ...current, projects };
      });
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
    function assignColors(workspaces, projects) {
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
        let index = hashString(workspace.workspaceId) % PALETTE.length;
        for (let guard = 0; taken.has(PALETTE[index].value) && guard < PALETTE.length; guard++) {
          index = (index + 1) % PALETTE.length;
        }
        assigned.set(workspace.workspaceId, PALETTE[index].value);
        taken.add(PALETTE[index].value);
      }
      return assigned;
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
    function buildCss(workspaces, archivedSessionIds, global, projects) {
      const archived = new Set(archivedSessionIds);
      const colors = assignColors(workspaces, projects);
      const rules = [];
      for (const workspace of workspaces) {
        const color = colors.get(workspace.workspaceId);
        if (color === undefined) continue;
        const row = `[data-row-key="workspace:${cssString(workspace.workspaceId)}"]`;
        // The "|" bar is an inset shadow: no layout shift, and the host sets
        // no box-shadow on these rows to conflict with. The wash layers as
        // background-image so the host's hover/selected background-color
        // stays visible underneath.
        const projectDeclarations = [];
        if (global.projectBar) projectDeclarations.push(`box-shadow:inset ${global.projectBarWidth}px 0 0 ${color}`);
        if (global.projectGradient) projectDeclarations.push(`background-image:${wash(color, global.projectOpacity, global.projectExtent)}`);
        if (projectDeclarations.length > 0) rules.push(`${row}{${projectDeclarations.join(';')}}`);
        // Folder glyph (first cell) and the hover chevron (second cell).
        if (global.projectIconTint) {
          rules.push(`${row}>span:first-child,${row}>span:nth-child(2){color:${color}}`);
        }
        for (const sessionId of workspace.sessionIds ?? []) {
          // Archived rows read as inactive; they stay plain unless opted in.
          if (!global.colorArchived && archived.has(sessionId)) continue;
          // Sessions inherit the project wash, one notch lighter.
          if (global.sessionGradient) {
            rules.push(`[data-row-key="session:${cssString(sessionId)}"]{background-image:${wash(color, global.sessionOpacity, global.sessionExtent)}}`);
          }
        }
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
      const workspaces = props.useWorkspaces((state) => state.items) ?? [];
      const archived = props.useWorkspaces((state) => state.archivedSessionIds) ?? [];
      return h('style', { 'data-dsh-project-shader': '' },
        buildCss(workspaces, archived, resolveGlobal(snapshot), snapshot.projects));
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
.dsh-ps-header{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsh-ps-switch:focus-visible,.dsh-ps-dot:focus-visible,.dsh-ps-button:focus-visible,.dsh-ps-range:focus-visible,.dsh-ps-hex:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
`;

    function Toggle(props) {
      return h('button', {
        type: 'button', role: 'switch', 'aria-checked': props.checked,
        'aria-label': props.label, className: 'dsh-ps-switch',
        onClick: () => props.onChange(!props.checked),
      }, h('span', { className: 'dsh-ps-knob' }));
    }
    function NumberRange(props) {
      const range = RANGES[props.settingKey];
      return h(React.Fragment, null,
        h('input', {
          type: 'range', className: 'dsh-ps-range', 'aria-label': props.label,
          min: range[0], max: range[1], value: props.value,
          onChange: (event) => props.onChange(Number(event.target.value)),
        }),
        h('span', { className: 'dsh-ps-value' }, `${props.value}${props.unit}`),
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
    function ProjectColorRow(props) {
      const { workspace, snapshot, colors, t } = props;
      const workspaceId = workspace.workspaceId;
      const stored = storedColorOf(snapshot, workspaceId);
      const effective = colors.get(workspaceId);
      const title = workspace.title || workspace.path || workspaceId;
      return h('div', { className: 'dsh-ps-project' },
        h('span', {
          className: 'dsh-ps-preview',
          style: { background: effective ?? 'transparent' },
          title: stored === 'none' ? t('colors.none') : (effective ?? t('colors.auto')),
        }),
        h('div', { className: 'dsh-ps-project-main' },
          h('div', { className: 'dsh-ps-project-name' }, title),
          workspace.path !== undefined && workspace.path !== title
            ? h('div', { className: 'dsh-ps-project-path' }, workspace.path)
            : null,
        ),
        h('div', { className: 'dsh-ps-dots' },
          PALETTE.map((entry) => {
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
      const t = props.t;
      const global = resolveGlobal(snapshot);
      const workspaces = props.useWorkspaces((state) => state.items) ?? [];
      const colors = assignColors(workspaces, snapshot.projects);
      const row = (label, hint, control) => h(SettingRow, { key: label, label, hint }, control);
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
          h('section', { className: 'dsh-ps-section' },
            h('div', { className: 'dsh-ps-section-head' },
              h('h2', { className: 'dsh-ps-section-title' }, t('section.project')),
            ),
            row(t('row.gradient'), `${t('row.gradient.hint')} · ${t('hint.defaultOn')}`,
              h(Toggle, { label: t('row.gradient'), checked: global.projectGradient, onChange: (v) => setGlobalField('projectGradient', v) })),
            row(t('row.opacity'), t('hint.defaultPercent', { v: DEFAULTS.projectOpacity }),
              h(NumberRange, { label: t('row.opacity'), settingKey: 'projectOpacity', value: global.projectOpacity, unit: '%', onChange: (v) => setGlobalField('projectOpacity', v) })),
            row(t('row.extent'), t('hint.defaultPx', { v: DEFAULTS.projectExtent }),
              h(NumberRange, { label: t('row.extent'), settingKey: 'projectExtent', value: global.projectExtent, unit: 'px', onChange: (v) => setGlobalField('projectExtent', v) })),
            row(t('row.bar'), `${t('row.bar.hint')} · ${t('hint.defaultOn')}`,
              h(Toggle, { label: t('row.bar'), checked: global.projectBar, onChange: (v) => setGlobalField('projectBar', v) })),
            row(t('row.barWidth'), t('hint.defaultPx', { v: DEFAULTS.projectBarWidth }),
              h(NumberRange, { label: t('row.barWidth'), settingKey: 'projectBarWidth', value: global.projectBarWidth, unit: 'px', onChange: (v) => setGlobalField('projectBarWidth', v) })),
            row(t('row.iconTint'), `${t('row.iconTint.hint')} · ${t('hint.defaultOn')}`,
              h(Toggle, { label: t('row.iconTint'), checked: global.projectIconTint, onChange: (v) => setGlobalField('projectIconTint', v) })),
          ),
          h('section', { className: 'dsh-ps-section' },
            h('div', { className: 'dsh-ps-section-head' },
              h('h2', { className: 'dsh-ps-section-title' }, t('section.session')),
            ),
            row(t('row.gradient'), `${t('row.gradient.hint')} · ${t('hint.defaultOn')}`,
              h(Toggle, { label: t('row.gradient'), checked: global.sessionGradient, onChange: (v) => setGlobalField('sessionGradient', v) })),
            row(t('row.opacity'), t('hint.defaultPercent', { v: DEFAULTS.sessionOpacity }),
              h(NumberRange, { label: t('row.opacity'), settingKey: 'sessionOpacity', value: global.sessionOpacity, unit: '%', onChange: (v) => setGlobalField('sessionOpacity', v) })),
            row(t('row.extent'), t('hint.defaultPx', { v: DEFAULTS.sessionExtent }),
              h(NumberRange, { label: t('row.extent'), settingKey: 'sessionExtent', value: global.sessionExtent, unit: 'px', onChange: (v) => setGlobalField('sessionExtent', v) })),
            row(t('row.colorArchived'), `${t('row.colorArchived.hint')} · ${t('hint.defaultOff')}`,
              h(Toggle, { label: t('row.colorArchived'), checked: global.colorArchived, onChange: (v) => setGlobalField('colorArchived', v) })),
          ),
          h('section', { className: 'dsh-ps-section' },
            h('div', { className: 'dsh-ps-section-head' },
              h('h2', { className: 'dsh-ps-section-title' }, t('section.colors')),
            ),
            h('p', { className: 'dsh-ps-desc' }, t('colors.hint')),
            workspaces.length === 0
              ? h('div', { className: 'dsh-ps-empty' }, t('colors.empty'))
              : workspaces.map((workspace) => h(ProjectColorRow, {
                  key: workspace.workspaceId, workspace, snapshot, colors, t,
                })),
          ),
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
        section: { project: 'Project rows', session: 'Session rows', colors: 'Project colors' },
        row: {
          gradient: 'Gradient wash',
          'gradient.hint': 'Left-to-right color wash over the row',
          opacity: 'Gradient intensity',
          extent: 'Gradient reach',
          iconTint: 'Tint folder glyph',
          'iconTint.hint': 'Folder and chevron take the project color',
          bar: 'Project bar "|"',
          'bar.hint': 'Vertical bar on the project row in its color',
          barWidth: 'Bar width',
          colorArchived: 'Color archived sessions',
          'colorArchived.hint': 'Off keeps archived rows plain gray',
        },
        hint: {
          defaultOn: 'Default: on', defaultOff: 'Default: off',
          defaultPercent: 'Default {v}%', defaultPx: 'Default {v}px', current: ' (current)',
        },
        action: { resetGlobal: 'Reset all to defaults' },
        colors: {
          auto: 'Auto', none: 'None', custom: 'Custom hex color',
          hint: 'Pick a palette color or enter a custom hex value per project; Auto restores the hash-based assignment, None leaves the project uncolored. Automatic colors are balanced across the current project set, so they can shift when projects are added or removed.',
          empty: 'No projects yet. Add a workspace in the sidebar to assign its color.',
        },
        color: {
          auto: 'Automatic',
          red: 'Red', orange: 'Orange', amber: 'Amber', green: 'Green', teal: 'Teal',
          blue: 'Blue', indigo: 'Indigo', purple: 'Purple', pink: 'Pink', gray: 'Gray',
        },
      },
      zh: {
        panel: { title: '项目着色' },
        menu: { projectColor: '项目颜色', openSettings: '打开着色设置' },
        page: {
          title: '项目着色',
          intro: '调整左侧工作区中项目及其会话的着色效果。每行标注的默认值即插件出厂外观；所有修改即时生效。',
        },
        section: { project: '项目行', session: '会话行', colors: '项目颜色' },
        row: {
          gradient: '颜色渐变',
          'gradient.hint': '从左到右铺在行上的颜色渐变',
          opacity: '渐变浓度',
          extent: '渐变范围',
          iconTint: '文件夹图标着色',
          'iconTint.hint': '文件夹与展开箭头使用项目色',
          bar: '项目竖线「|」',
          'bar.hint': '项目行左侧的竖向色条',
          barWidth: '竖线宽度',
          colorArchived: '归档会话也着色',
          'colorArchived.hint': '关闭时归档行保持朴素灰色',
        },
        hint: {
          defaultOn: '默认：开', defaultOff: '默认：关',
          defaultPercent: '默认 {v}%', defaultPx: '默认 {v}px', current: '（当前）',
        },
        action: { resetGlobal: '全部恢复默认值' },
        colors: {
          auto: '自动', none: '不着色', custom: '自定义 hex 颜色',
          hint: '为每个项目选择调色板颜色或输入自定义 hex 值；「自动」恢复哈希分配，「不着色」让项目保持原样。自动色会在当前项目集合内避让分配，新增或删除项目时可能微调。',
          empty: '还没有项目。先在侧边栏添加工作区，再来为它指定颜色。',
        },
        color: {
          auto: '自动',
          red: '红色', orange: '橙色', amber: '琥珀', green: '绿色', teal: '青色',
          blue: '蓝色', indigo: '靛蓝', purple: '紫色', pink: '粉色', gray: '灰色',
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

        ctx.slots.inject('shell.overlay', () => ctx.slots.register(
          { name: 'shell.overlay', id: PANEL_ID },
          ShaderStyles,
        ));

        // Sidebar entry plus its main panel: the full customization surface.
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL_ID, order: 30, label: () => t('panel.title'), locale: NS },
          PanelIcon,
        ));
        ctx.slots.inject('main', () => ctx.slots.register(
          { name: 'main', key: PANEL_ID, locale: NS },
          (props) => h(SettingsPage, { ...props, t, useLocaleRevision }),
        ));

        ctx.slots.inject('contextMenu.icon', function* icons() {
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'dsh-project-shader.palette' }, PaletteIcon);
          for (const entry of PALETTE) {
            yield ctx.slots.register(
              { name: 'contextMenu.icon', key: `dsh-project-shader.swatch.${entry.id}` },
              makeSwatch(entry.value),
            );
          }
          yield ctx.slots.register({ name: 'contextMenu.icon', key: 'dsh-project-shader.swatch.auto' }, AutoSwatch);
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
              const current = storedColorOf(getState(), workspaceId);
              const mark = (label, active) => (active ? `${label}${t('hint.current')}` : label);
              const children = PALETTE.map((entry) => ({
                id: entry.id,
                label: mark(t(`color.${entry.id}`), current === entry.value),
                icon: { key: `dsh-project-shader.swatch.${entry.id}` },
                // The active choice is already applied; disable it as the marker.
                disabled: current === entry.value,
                run: () => { setProjectColor(workspaceId, entry.value); },
              }));
              // A custom hex has no swatch row; show it as a disabled caption.
              if (isHexColor(current) && !PALETTE.some((entry) => entry.value === current)) {
                children.unshift({ id: 'current', label: mark(current, true), disabled: true });
              }
              children.push({
                id: 'auto',
                label: mark(t('color.auto'), current === undefined),
                icon: { key: 'dsh-project-shader.swatch.auto' },
                separatorBefore: true,
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
