import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { entityColumns, entityNames, ONYX_MSG, onyxError } from "../src/application/masters.ts";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/js");

type Fc = { f: string; ro?: boolean; bool?: boolean; map?: Record<string, string> };
type Cfg = {
  entity: string; key: string; keyCols?: string[]; keyLabel: string; panel?: string;
  cols: { c: string }[]; fields: Record<string, Fc>; sets?: Cfg[];
};
type Grid = { label: string; options?: string[] }[];
type Block = { kind: string; title?: string; grid?: Grid };

/** الملفان كما تحمّلهما المتصفح — لا تحليل نصي بالتعابير */
function load(): { MAP: Record<string, Cfg>; SCREENS: Record<string, { blocks: Block[] }> } {
  const sandbox: { window: Record<string, unknown> } = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(WEB, "screen-data.js"), "utf8"), sandbox);
  vm.runInNewContext(fs.readFileSync(path.join(WEB, "masters-ui.js"), "utf8"), sandbox);
  const w = sandbox.window as { StartyxMasters: { MAP: Record<string, Cfg> }; OnyxScreenDefs: { SCREENS: Record<string, { blocks: Block[] }> } };
  return { MAP: w.StartyxMasters.MAP, SCREENS: w.OnyxScreenDefs.SCREENS };
}

/** كل جدول مربوط: الشاشة نفسها أو كل مجموعة من sets */
function bindings(): { ref: string; cfg: Cfg }[] {
  const { MAP } = load();
  return Object.entries(MAP).flatMap(([ref, e]) => (e.sets ?? [e]).map((cfg) => ({ ref, cfg })));
}

const LAYER0 = ["op.1.1.12", "op.1.1.2", "op.1.1.3", "op.1.2.3", "op.1.2.5", "op.1.2.6", "op.4.1.2.9"];
const LAYER1 = [
  "op.3.2", "op.5.1.1.2", "op.5.1.2.1", "op.5.1.2.8", "op.1.2.11", "op.1.2.4", "op.3.4", "op.3.5",
  "op.5.1.2.16", "op.7.1.2.2", "op.6.1.2.1", "op.1.1.13", "op.1.2.1", "op.1.2.9", "op.4.1.2.8",
];

test("masters ui: every screen binds to a known entity", () => {
  const names = entityNames() as string[];
  const all = bindings();
  assert.equal(all.length, 7 + 23, "الطبقة ٠ = 7 جداول · الطبقة ١ = 23 جدولاً على 15 شاشة");
  for (const b of all) assert.ok(names.includes(b.cfg.entity), `${b.ref} → كيان مجهول ${b.cfg.entity}`);
});

test("masters ui: every bound column exists on the server", () => {
  for (const { ref, cfg } of bindings()) {
    const cols = entityColumns(cfg.entity as ReturnType<typeof entityNames>[number]);
    const refs = [cfg.key, ...(cfg.keyCols ?? []), ...cfg.cols.map((c) => c.c), ...Object.values(cfg.fields).map((f) => f.f)];
    for (const r of refs) assert.ok(cols.includes(r), `${ref}: العمود «${r}» غير موجود في ${cfg.entity}`);
  }
});

test("masters ui: layers 0 and 1 are wired — 22 screens", () => {
  const refs = Object.keys(load().MAP).sort();
  assert.deepEqual(refs, [...LAYER0, ...LAYER1].sort());
});

test("masters ui: every bound field label exists on its screen definition (inside its own panel)", () => {
  const { SCREENS } = load();
  for (const { ref, cfg } of bindings()) {
    const def = SCREENS[ref];
    assert.ok(def, `${ref} غير معرّف في screen-data.js`);
    const panels = def.blocks.filter((b) => b.grid);
    const scope = cfg.panel ? panels.filter((p) => p.title === cfg.panel) : panels;
    assert.ok(scope.length, `${ref}: لوحة «${cfg.panel}» غير موجودة`);
    const grid = scope.flatMap((p) => p.grid!);
    for (const [label, fc] of Object.entries(cfg.fields)) {
      const fld = grid.find((g) => g.label === label);
      assert.ok(fld, `${ref}: الحقل «${label}» غير موجود في لوحته`);
      /* القائمة تعرض كل قيم الخريطة — وإلا يُحفظ فراغ بدل القيمة */
      if (fc.map) for (const k of Object.keys(fc.map)) assert.ok(fld!.options?.includes(k), `${ref}: «${label}» بلا خيار «${k}»`);
    }
  }
});

test("masters ui: layer-1 screens carry no sample values", () => {
  const { SCREENS } = load();
  for (const ref of LAYER1) {
    for (const b of SCREENS[ref]!.blocks) {
      for (const g of b.grid ?? []) assert.equal((g as { value?: string }).value, undefined, `${ref}: «${g.label}» فيه قيمة مثال`);
      if (b.kind === "table") assert.equal(((b as { rows?: unknown[] }).rows ?? []).length, 0, `${ref}: جدول بصفوف أمثلة`);
    }
  }
});

test("onyx errors carry the original message text", () => {
  assert.equal(onyxError(2143).message, ONYX_MSG[2143]);
  assert.equal(onyxError(2143).code, "ONYX-2143");
  assert.equal(onyxError(3618, "حركة مالية").message, "لايمكن الحذف وذلك لارتباط السجل بحركة مالية");
});
