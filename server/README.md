# خادم startyx — ز + ح + ي

محرّكات محاسبية نقية (`decimal`) + API محلي. **لا حساب في الواجهة.**

## مطابقة أرصدة 2026 (مرحلة ي)

بلا Node. من `_onyx-extract/db/OPEN_BAL`:

```
startyx\server\تشغيل المطابقة.bat
```

الفرق **136,647.87** يُنقل كما هو (`GL-D4`) ولا يُصفَّر. الناتج: `migration/out/recon-2026.json` (خارج git).

`GET /api/migration/recon` يعرض النتيجة على شاشات الافتتاح إذا الخادم شغال.

## جرد مستندات 2026 (مرحلة ي)

بلا Node. من `IAS_POST_MST` مقابل أرقام GO:

```
startyx\server\تشغيل جرد المستندات.bat
```

الناتج: `migration/out/census-2026.json`. الفواتير/المردود/سطور القيد تُستخرج لاحقاً من الـdump إن نقصت. `GET /api/migration/census` إن الخادم شغال.

## قبول الدورات السبع (مرحلة ك)

بلا Node. معادلات + جرد + توازن قيود 2026 + افتتاح/مخزون:

```
startyx\server\تشغيل قبول الدورات.bat
```

الناتج: `migration/out/accept-2026.json`. هيئة: جاهزية فقط بلا onboarding. `GET /api/migration/accept`

## تشغيل API

يلزم **Node 22+**. PostgreSQL اختياري.

```bat
cd startyx\server
node --experimental-strip-types --test tests/engines.test.ts
node --experimental-strip-types src/presentation/http-server.ts
```

أو: `تشغيل الخادم.bat`

| | |
|---|---|
| صحة | `GET /api/health` |
| ترحيل | `POST /api/documents/post` |
| دفتر | `GET /api/documents` |
| مطابقة افتتاح | `GET /api/migration/recon` |
| جرد مستندات | `GET /api/migration/census` |
| قبول دورات | `GET /api/migration/accept` |
| ضريبة / متوسط | `POST /api/engines/tax` · `/costing` |

## المحرّكات

| ملف | ماذا |
|---|---|
| `engines/numbering.ts` | رقم بلا فجوة داخل المعاملة |
| `engines/period-and-lock.ts` | فترة مفتوحة + تسلسل إقفال |
| `engines/currency.ts` | تحويل وحدود سعر |
| `engines/tax.ts` | سطر/إجمالي/مشتريات + لقطة نسبة |
| `engines/pricing.ts` | حدود سعر تنبيه، ائتمان |
| `engines/costing.ts` | متوسط مرجّح حسب الصنف |
| `engines/posting.ts` | قيد لحظي — معلّق إن لم يتوازن |

## تشغيل الشركة (ي / ك / ل)

يلزم Node 22 (محمول في `.runtime/node` إن لم يكن على PATH).

```
تشغيل كل شيء.bat
```

أو: `تشغيل الخادم.bat` ثم الواجهة `http://localhost:8777/`

الفروقات تُنقل كما هي ولا تُصفَّر: **136,647.87** · **0.23** · **2,099.90**.

| | |
|---|---|
| زرع 2026 | `تشغيل التحميل.bat` |
| قبول حفظ API | `تشغيل قبول API.bat` |
| نسخ | `تشغيل النسخ.bat` |
| حقائق النقل | `GET /api/migration/facts` |
| أعداد الأساسيات | `GET /api/masters/counts` |

القاعدة: PGlite ملف `.pgdata/pglite` (PostgreSQL) إن لم يوجد خادم TCP على 5432. البيانات التاريخية في مخطط `extract` مجمّدة. القيود الجديدة في `erp`.