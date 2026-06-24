# CLAUDE.md — Project: 修仙英语 RPG (English RPG)

> Project-specific context only. All universal engineering rules live in the **global**
> `~/.claude/CLAUDE.md` and are not repeated here. When this file and the global file
> conflict, **this file wins**.

---

## Project Description

A gamified English-learning RPG with a 仙侠 (xianxia / cultivation) theme. Learners
progress by practicing vocabulary, grammar, listening, and writing, framed as a
cultivation journey across a 3D world map of sect buildings. Currently mid-migration
from a legacy Canvas/Three.js game to a Vue 3 SPA, while keeping the Three.js scenes as
a decorative 3D background layer.

---

## Technology Stack

- **Backend:** Laravel (PHP)
- **Frontend:** Vue 3 + TypeScript + Pinia + Element Plus, built with Vite
- **3D / Game:** Three.js (GLB models, Draco-compressed; CSS2DRenderer labels; Bloom post-processing)
- **Two entry points:**
  - `resources/js/main.js` — legacy Canvas game (frozen; do not extend)
  - `resources/js/vue/main.ts` — Vue 3 app (all new work here)
- **DOM layers:** `#game-container` (Canvas render layer) + `#ui-overlay > #vue-app` (Vue layer)

---

## Business Rules

- **Heart Demon system (心魔殿):** wrong answers spawn "inner demons" (`InnerDemon`
  model, `levelup_heart_demons` table); challenges purify them.
  `HeartDemonService.recordWrong()` / `recordCorrect()` / `evaluateDemonTrial()`.
- **Frontend-derived demon attributes:** level 凡/灵/玄/地阶 ← `wrong_count` (1-2 / 3-5 / 6-10 / 10+);
  status sealed/active/purified ← `is_mastered` + `next_review_at`; danger tier ← total
  `wrong_count` (0-20 / 20-50 / 50-100 / 100+).
- **Key API endpoints:** `/review/list` `/review/submit` · `/demons` (`/demons/list`,
  `/demons/report-wrong`, `/demons/review-submit`, `/demons/clear-mastered`, `/demons/pre-exam`) ·
  `/achievements` · `/mall/items` `/mall/buy` · `/leaderboard`.
- **8 sect buildings (`SECT_NODES`):** sectHall 宗门大殿 / swordHall 剑阁 /
  scriptureHall 藏经阁 / alchemyHall 炼丹殿 / innerDemonHall 心魔殿 / beastGarden 灵兽园 /
  farm 灵田 / wanyaoTower 万妖塔. (Former lawHall 执法堂 was deleted — do not reintroduce.)
- **Wanyao Tower (万妖塔):** roguelike-style tower-climb challenge content with
  state-machine UI (lobby → answering → boss → reward/failed). Route `/wanyao-tower`
  → `WanyaoTowerView.vue`; store `towerStore.ts`; components under
  `components/wanyaoTower/`. Currently Phase 1 (no real backend tower API yet —
  `fetchStatus()` may 4xx until backend lands).

---

## Style Rules

- **All new features are built in the Vue 3 layer only.** Never add code to legacy `main.js`.
- The Canvas / Three.js scene is a **read-only decorative background layer**.
- Interact with the legacy game exclusively through `useLegacyBridge` (kept methods:
  `switchToHall`, `switchToPracticeScene`, `openPracticePanel`, `switchToReadingScene`,
  `openReadingAdventure`, `switchToExamScene`, `openExam`, `switchToMijingScene`,
  `openMijing`, `switchToWanyaoTowerScene`, `clearSession`, `closeLegacyPanels`,
  `applySessionFromProfile`, `getGame`, `getApi`, `loadGame`). Migrated-away methods
  (openReview/openDemons/openAchievements/openProfilePanel/openMall/openLeaderboard) are
  now Vue components — do not re-add to the bridge. `switchToWanyaoTowerScene` is a
  no-op for scene (Vue view is fullscreen), only does session sync.

---

## UI Preferences

- Theme: 仙侠 / cultivation aesthetic (灵脉流光, 云气缭绕, void/紫雾 demon themes).
- Per-building accent palettes (e.g. innerDemonHall = 青玉蓝 / 蓝紫灵脉).
- World map is a full-screen overlay (`WorldMapOverlay.vue`), opened from TopHud【地图】
  via `ui.showMapOverlay()`. Default route is `/practice`; `/hall` redirects to `/practice`.
- Camera is locked to an overview pose (~48° tilt); rotation/zoom disabled, pan clamped
  to ±850; clicking a building flies in (`flyToBuilding`).

---

## Special Constraints

- `window.__VUE_MIGRATION_ACTIVE__ = true` is set in Blade to block the legacy game's
  auto-init. Do not remove.
- **GLB models are Draco-encoded** — `GLTFLoader` MUST use
  `DRACOLoader.setDecoderPath('/draco/gltf/')` (decoder is in `public/draco/`).
- **GLB compression workflow:** source models in `image.png/`, output to
  `public/models/{buildingId}.glb` via
  `npx @gltf-transform/cli optimize <in> <out> --compress draco --texture-compress webp --texture-size 1024`
  (~95% size reduction).
- **`ALL_MAP_MODELS` is auto-derived from `SECT_NODES` in `WorldSceneManager.ts`** —
  do NOT re-hardcode building paths. Adding a new SECT_NODE with a `glbPath` puts it
  in preload automatically; only `DECOR_MODELS` (浮岩/树丛/凉亭/灵晶) is hand-listed.
- **`SECT_NODES.unlockRealm` MUST match `MAP_BUILDING_DEFS[*].unlockRealm`** — the 3D
  label renders the lock state from SECT_NODES while the click handler gates from
  MAP_BUILDING_DEFS. Mismatch → "看似锁定但能点进 / 看似可入实被拦" bugs. Treat
  `MAP_BUILDING_DEFS` as the single source of truth and mirror to SECT_NODES.
- Heart Demon **Phase 2 is pending:** 紫雾 shader / 锁链 particles / demon-core animation /
  floating fragments; danger tier should later drive world-map weather + giant-shadow effects.
- See `~/.claude/projects/E--work-english-rpg/memory/` for the live migration-status memory.
