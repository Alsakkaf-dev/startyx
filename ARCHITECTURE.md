# startyx — كيف يشتغل تقنياً (منقول من HANDOFF.md 2026-09-22)

## نموذج التشغيل

- بلا build ولا سيرفر ولا dependencies (للواجهة الثابتة؛ `server/` الآن حقيقي ومنفصل — انظر `server/README.md`).
- يعمل من `file://` عبر `تشغيل البرنامج.bat` (يفتح Edge/Chrome بوضع `--app`)، أو بفتح `index.html` مباشرة.
- هذا القيد يحدد التصميم: ملفات `<script>` عادية تكشف globals (`window.Onyx*`, `window.ONYX_*`)، بيانات بصيغة `.js` لا `JSON` (لا `fetch` على `file://`)، وتوجيه بـ`location.hash` لا `pushState`.

## ثلاث صفحات بملكية صارمة

يحكمها `assets/js/nav.js`. بادئة الـref تحدد الصفحة:

| بادئة الـref | المحتوى | الصفحة |
|---|---|---|
| `op.*` | شاشات تشغيلية | `index.html` |
| `cfg.*` | حقول إعدادات | `settings.html` |
| `acc.*` | دليل الحسابات | `reference.html` (جداول مسطّحة) |

روابط عميقة: `index.html#/op.7.5.3.6`.

## ترتيب تحميل السكربتات مهم

راجع أسفل كل ملف HTML (`util → store → icons → nav → data → … → app`).
- `index-data.js` يبني الفهارس (`byRef`, `byPath`, `screens`, zones) من `ONYX_DATA`.
- `store.js` يحفظ تفضيلات الواجهة فقط، تحت مفاتيح `localStorage`: `onyx.v1.*`.

## `assets/js/data.js` مولَّد — لا تُعدَّل يدوياً

- `tools/build-data.js` يستخرج `operationsTree` و`chartOfAccounts` و`activeConfig` من `tree-viewer.html` ملتقط. المسار الافتراضي مضروب على مكتب مستخدم آخر — مرّر المسار كوسيط. الملف غير موجود على هذا الجهاز.
- المولّد يفرض نطاق الشاشات عبر `KEEP_SCREENS` · `KEEP_REQUIRED` · `KEEP_WHOLE` · `ADD_SCREENS` · `DROP_CONFIG`.
- هذا الفلترة هي سبب الفجوات في ترقيم الـref في startyx.
- تبويبات الشاشة معطّلة (`ENABLE_TABS=false`, `VERIFIED_TABS` فاضية) لأن بيانات التبويبات القديمة من أدلة نسخة مختلفة.

## أدوات (Node — تحمّل سكربتات المتصفح داخل `vm` بـ`window`/`localStorage` وهميين)

- `node tools/build-data.js [path/to/tree-viewer.html]` — يعيد توليد `data.js`
- `node tools/validate-spec.js` — فحص اتساق طبقة spec
- `node tools/audit-provenance.js` — يفشل لو تسرّب أي شيء غير مشتق من شجرة بتروسبيشل
- `node tools/build-order.js [--md | --json]` — ترتيب طوبولوجي للبناء؛ `--md > BUILD-ORDER.md` يعيد توليد ذاك الملف
- لا يوجد test suite ولا linter لطبقة الواجهة الثابتة (لـ`server/` اختبارات حقيقية: `npm test` → 14/14).
