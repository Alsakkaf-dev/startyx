import { openDb } from "../src/infrastructure/db.ts";
import { applySchema } from "../src/infrastructure/postgres.ts";
import { listMasters } from "../src/application/masters.ts";
import { LAYER1 } from "../src/application/masters-layer1.ts";
import { s } from "../src/application/master-kit.ts";

/**
 * كل سجل أونيكس حقيقي في الطبقة ١ يجب أن يمر على قواعد شاشته كما هو (تعديل بلا تغيير).
 * قاعدة ترفض سجلاً حقيقياً = قاعدة أشد من أونيكس نفسه ⇒ تمنع المستخدم من تعديل بياناته.
 * يعمل داخل معاملة تُلغى في النهاية (بعض القواعد تكتب: الافتراضي الواحد · تحديث التدفق).
 * شغّله والخادم متوقف (PGlite لا يقبل عمليتين).
 */
const db = await openDb();
await applySchema(db);
await db.exec("BEGIN");
let bad = 0;
let total = 0;
try {
  for (const [name, def] of Object.entries(LAYER1)) {
    const { rows } = await listMasters(db, name, { limit: 5000 });
    let fail = 0;
    const samples: string[] = [];
    for (const row of rows) {
      total++;
      try {
        for (const [fname, f] of Object.entries(def.fields)) {
          if (!f.required || f.inheritedWhen) continue;
          if (s(row[fname]) === "") throw new Error("ONYX-4048 حقل إجباري فارغ: " + fname);
        }
        await def.validate(db, "edit", { ...row }, row);
      } catch (e) {
        fail++;
        if (samples.length < 3) {
          const key = (def.keyCols ?? [Object.keys(def.fields).find((k) => def.fields[k].key) ?? ""]).map((k) => s(row[k])).join("|");
          samples.push(key + " ⇒ " + ((e as { code?: string }).code ?? "") + " " + (e as Error).message);
        }
      }
    }
    bad += fail;
    process.stdout.write(
      (fail ? "FAIL " : "PASS ") + name.padEnd(24) + String(rows.length - fail).padStart(5) + "/" + rows.length +
        (samples.length ? "\n       " + samples.join("\n       ") : "") + "\n",
    );
  }
} finally {
  await db.exec("ROLLBACK");
  await db.close();
}
process.stdout.write((bad ? "FAILURES " : "ALL PASS ") + (total - bad) + "/" + total + " سجل أونيكس\n");
if (bad) process.exit(1);
