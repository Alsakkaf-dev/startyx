import fs from "node:fs";
import path from "node:path";
import { openDb, serverRoot } from "../src/infrastructure/db.ts";
import { applySchema } from "../src/infrastructure/postgres.ts";
import { LAYER2 } from "../src/application/masters-layer2.ts";
import { LAYER2B } from "../src/application/masters-layer2b.ts";
import { entityDef } from "../src/application/masters.ts";
import {
  ITEM_FEATURE_COLS, ITEM_UNIT_FEATURE_COLS, SALESMAN_COLS, SALESMAN_FEATURE_COLS, WAREHOUSE_FEATURE_COLS, syncLayer2,
} from "../src/application/masters-sync-layer2.ts";
import {
  ACCOUNT_LIMIT_COLS, BRANCH_COLS, BRANCH_FEATURE_COLS, BRANCH_LOB, CUSTOMER_ACCNT_COLS, CUSTOMER_COLS, CUSTOMER_CURR_COLS, CUSTOMER_DELETED, CUSTOMER_DRIVER_COLS,
  CUSTOMER_FEATURE_COLS, CUSTOMER_LOB, CUSTOMER_SALES_CAP_COLS, CUSTOMER_SECRET, CUSTOMER_USER_COLS, secretHash, syncLayer2b,
  type ColSpec,
} from "../src/application/masters-sync-layer2b.ts";
import {
  VENDOR_ACCNT_COLS, VENDOR_BANK_COLS, VENDOR_COLS, VENDOR_FEATURE_COLS, VENDOR_SECRET, VENDOR_USER_COLS, syncVendors,
} from "../src/application/masters-sync-vendors.ts";
import {
  EMPLOYEE_COLS, EMPLOYEE_FEATURE_COLS, EMPLOYEE_SECRET, syncEmployees,
} from "../src/application/masters-sync-employees.ts";
import { s } from "../src/application/master-kit.ts";

/**
 * الطبقة ٢ على كل سجل أونيكس — نفس عقد `verify-layer1-records.ts` + فحوص الاكتمال:
 * ١) كل سجل حقيقي يمر على قواعد شاشته كما هو (تعديل بلا تغيير) — قاعدة ترفضه أشد من أونيكس.
 * ٢) لا عمود أونيكس ضاع: تقسيم أعمدة الجدول المصدر (أساسي/ميزات/محذوف بقرار/محفوظ/تدقيق) يغطيها كلها مرة واحدة.
 * ٣) كل قيمة ميزة غير فارغة في أونيكس محفوظة في `features` بنفس قيمتها.
 * يعمل داخل معاملة تُلغى. شغّله والخادم متوقف (PGlite لا يقبل عمليتين).
 */
const EXTRACT = path.resolve(serverRoot(), "../../_onyx-extract/db");
function header(table: string): string[] {
  return fs.readFileSync(path.join(EXTRACT, table, "rows.tsv"), "utf8").split(/\r?\n/)[0]!.split("\t");
}
function tsv(table: string): Record<string, string>[] {
  const lines = fs.readFileSync(path.join(EXTRACT, table, "rows.tsv"), "utf8").split(/\r?\n/).filter((l) => l.length);
  const h = lines[0]!.split("\t");
  return lines.slice(1).map((l) => {
    const c = l.split("\t");
    return Object.fromEntries(h.map((k, i) => [k, c[i] ?? ""]));
  });
}

let bad = 0;
const line = (ok: boolean, text: string): void => {
  if (!ok) bad++;
  process.stdout.write((ok ? "PASS " : "FAIL ") + text + "\n");
};

/* ═══ ٢ · تقسيم الأعمدة (GO/05-warehouse.md §op.5.1.2.10 «٧. تدقيق المطابقة») ═══ */
const ITEM_BASIC = ("I_CODE I_NAME I_E_NAME G_CODE I_IMG SHRT_ITM_L_NM SHRT_ITM_F_NM I_DESC I_F_DESC INIT_PRIMARY_COST " +
  "PRIMARY_COST I_CWTAVG INCOME_DATE ITEM_STORE INACTIVE INACTIVE_RES INACTIVE_DATE INACTIVE_U_ID BLOCKED NO_SALE " +
  "SERVICE_ITM CASH_SALE NO_RETURN_SALE RETURN_PERIOD KIT_ITM USED_IN_KIT_ITM USE_QTY_FRACTION ICODE_QTY_FRC VAT_TYPE " +
  "VAT_PER CLSFCTN_CODE GTIN_CODE USE_EMP_FLG IMP_XLS DOC_TYPE_REF DOC_NO_REF DOC_SER_REF").split(" ");
/* IV-D19 — المطاعم (13) والصحي (26): حُذفت بقرار المستخدم، وكلها 0/فارغة في أونيكس (يُفحص أدناه) */
const ITEM_DELETED = ("REST_ITM RMS_ITM_TYP REST_ITM_COMBO CHK_AVL_QTY_IN_RES FOOD_GRP_NO SUB_FOOD_GRP_NO " +
  "USE_AUTO_PST_RMS_DATA_TO_INV FILL_ITM_CMPNNT_IN_RMS_INVC INSRNC_FLG FEED_ITM_FLG HIDE_ITM_CHF_SCR_FLG " +
  "RMS_SHW_NOTE_MNDTRY_FLG RMS_HID_FRM_CSTMR_ORDR_APP HPS_ITM PRCDR_TYP SMPL_TYP RNT_SRVC PST_WITH_ADMT PST_WITH_RNT " +
  "BRTH_SRVC EQPMNT_SRVC SRGRY_CLSS CSSD_FLG LNDRY_FLG FOOD_FLG ALLRGY_FLG HPS_ITM_GNDR_TYP USE_IN_SCNTFC_OFFICE " +
  "USE_FDA_FLG LAB_FARMS_TST RAY_HAS_NO_RPRT RAY_PLC_NO RAY_RPRT_TYP SRVC_APRV_REQRD HPS_USE_MORT_FLG CNTRLLD_ITM " +
  "EXEC_TAT EXEC_TAT_UNT SPCLZTION").split(" ");
const ITEM_KEPT = ["ITEM_SIZE", "CLC_AVG_FCTR_FOR_NUM_QTY"];
const AUDIT8 = ["AD_U_ID", "AD_DATE", "UP_U_ID", "UP_DATE", "UP_CNT", "PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"];

function partition(table: string, groups: Record<string, readonly string[]>, want: number): void {
  const h = header(table);
  const seen = new Map<string, number>();
  for (const cols of Object.values(groups)) for (const c of cols) seen.set(c, (seen.get(c) ?? 0) + 1);
  const missing = h.filter((c) => !seen.has(c));
  const extra = [...seen.keys()].filter((c) => !h.includes(c));
  const dup = [...seen.entries()].filter(([, k]) => k > 1).map(([c]) => c);
  const sizes = Object.entries(groups).map(([g, c]) => g + " " + c.length).join(" + ");
  line(
    h.length === want && !missing.length && !extra.length && !dup.length,
    `${table.padEnd(16)} ${h.length} عموداً = ${sizes}` +
      (missing.length ? " · ناقص: " + missing.join(",") : "") + (extra.length ? " · زائد: " + extra.join(",") : "") +
      (dup.length ? " · مكرر: " + dup.join(",") : ""),
  );
}
partition("IAS_ITM_MST", { basic: ITEM_BASIC, features: ITEM_FEATURE_COLS, deleted: ITEM_DELETED, kept: ITEM_KEPT, audit: AUDIT8 }, 231);
partition("IAS_ITM_DTL", {
  visible: ["I_CODE", "ITM_UNT", "P_SIZE", "LVL_UNIT", "MAIN_UNIT", "SALE_UNIT", "PUR_UNIT", "STOCK_UNIT", "TRNS_UNIT",
    "NO_SALE", "INACTIVE", "INACTIVE_RES", "INACTIVE_U_ID", "INACTIVE_DATE", "BARCODE", "ITM_UNT_L_DSC", "ITM_UNT_F_DSC"],
  features: ITEM_UNIT_FEATURE_COLS,
  audit: ["AD_U_ID", "AD_DATE", "UP_U_ID", "UP_DATE", "UP_CNT"],
}, 32);

const mst = tsv("IAS_ITM_MST");
/* المحذوف لا يحمل بيانات: كل قيمه 0/فارغ أو القيمة الافتراضية في تعريف أونيكس نفسه (ALTER … DEFAULT) */
const ddl = fs.readFileSync(path.join(EXTRACT, "IAS_ITM_MST", "ddl.txt"), "utf8");
const dflt = (c: string): string => {
  const tag = `MODIFY ("${c}" DEFAULT `;
  const at = ddl.indexOf(tag);
  return at < 0 ? "" : ddl.slice(at + tag.length, ddl.indexOf(")", at + tag.length)).trim().replace(/'/g, "");
};
const deletedFilled = ITEM_DELETED.filter((c) => mst.some((r) => r[c] !== "" && r[c] !== "0" && r[c] !== dflt(c)));
const byDefault = ITEM_DELETED.filter((c) => dflt(c) && mst.some((r) => r[c] === dflt(c) && r[c] !== "0"));
line(!deletedFilled.length, `IV-D19 المحذوف (39) بلا بيانات: 0/فارغ` + (byDefault.length ? ` أو افتراضي أونيكس (${byDefault.map((c) => c + "=" + dflt(c)).join(" · ")})` : "") + (deletedFilled.length ? " · فيه قيم: " + deletedFilled.join(",") : ""));

/* المخازن — GO/05-warehouse.md §op.5.1.2.9 «٧»: 69 = 29 ظاهر + 26 ميزة + 3 محفوظ + 3 محذوف (رصد IV-D16) + 8 تدقيق */
const WH_VISIBLE = ("W_CODE WHG_CODE W_NAME W_E_NAME WH_KEEPER TEL_NO LOCATION CONN_BRN_NO INACTIVE NO_SALE W_SER " +
  "MAIN_WCODE TR_A_CODE AC_CODE_DTL AC_DTL_TYP CC_CODE PRICE_LVL WH_CST_LMT USE_DMG_ITM_FLG SRVC_FLG " +
  "CNTRY_NO PROV_NO CITY_NO R_CODE GLN_CODE LONGITUDE LATITUDE W_L_ADDRS W_F_ADDRS").split(" ");
const WH_KEPT = ["W_TYPE", "GPS", "DB_LINK_NAME"];
const WH_DELETED = ["USE_SFDA_FLG", "SFDA_AC_TYPE", "SYNC_SFDA_BY_BATCH_FLG"];
partition("WAREHOUSE_DETAILS", { visible: WH_VISIBLE, features: WAREHOUSE_FEATURE_COLS, kept: WH_KEPT, deleted: WH_DELETED, audit: AUDIT8 }, 69);
const whRows = tsv("WAREHOUSE_DETAILS");
const whDeletedFilled = WH_DELETED.filter((c) => whRows.some((r) => r[c] !== "" && r[c] !== "0"));
line(!whDeletedFilled.length, `IV-D16 رصد المحذوف (3) فارغ/0 في الـ${whRows.length} مخزناً` + (whDeletedFilled.length ? " · فيه قيم: " + whDeletedFilled.join(",") : ""));

/* الصناديق والبنوك — GO/04-general-ledger.md «٧»: كل عمود له عمود بنفس المعنى في erp (محذوف: 0) */
const AUDIT5 = ["AD_U_ID", "AD_DATE", "UP_U_ID", "UP_DATE", "UP_CNT"];
partition("CASH_IN_HAND", {
  mapped: ("CASH_NO CASH_NAME CASH_E_NAME A_CODE CASH_SR RCPT_SRL_TYP CASH_TYPE USE_CASH_INCOME MEDIATOR POS_SYS " +
    "PYMNT_TYP_NO_DFLT RCVD_TYP_NO_DFLT GROUP_NO CONN_BRN_NO CONF_LAST_DATE INACTIVE FAV_AC INACTIVE_DATE INACTIVE_RES").split(" "),
  audit: AUDIT8,
}, 27);
partition("IAS_CASH_IN_HAND_DTL", {
  mapped: ("CASH_NO A_CODE A_CY OPEN_BAL_L OPEN_BAL_F CURR_BAL_L CURR_BAL_F DFLT INACTIVE MIN_LMT_AMT MAX_LMT_AMT " +
    "MAX_LMT_TRNS_AMT MIN_LMT_TRNS_AMT PASS_LMT INACTIVE_DATE").split(" "),
  audit: AUDIT5,
}, 20);
partition("CASH_AT_BANK", {
  mapped: ("BANK_NO A_CODE BANK_NAME BANK_E_NAME BANK_SR RCPT_SRL_TYP PYMNT_TYP_NO_DFLT RCVD_TYP_NO_DFLT GROUP_NO BANK_ACC " +
    "BANK_DSC CONN_BRN_NO B_TEL B_FAX B_BOX B_ADDRESS B_E_MAIL B_WEB_SITE CNTRY_NO CITY_NO MEDIATOR BNK_NTWRK_CODE INACTIVE " +
    "INACTIVE_U_ID INACTIVE_DATE INACTIVE_RES BANK_IMG REC_LETTER PAY_LETTER CHQ_PAY_INTRM_AC PAY_LETTER_DTL REC_LETTER_DTL " +
    "CHQ_PAY_INTRM_AC_DTL CHQ_PAY_INTRM_AC_DTL_TYP PAY_LETTER_DTL_TYP REC_LETTER_DTL_TYP CRD_CARD_AMT_PST_TYP COMM_TAX_FRC " +
    "REP_SMPLE BNK_CLSS_TYP FAV_AC CONF_LAST_DATE OCHK_AUTO_SER BANK_CODE").split(" "),
  audit: AUDIT8,
}, 52);
partition("IAS_CASH_AT_BANK_DTL", {
  mapped: ("BANK_NO A_CODE A_CY OPEN_BAL_L OPEN_BAL_F CURR_BAL_L CURR_BAL_F DFLT INACTIVE INACTIVE_DATE MIN_LMT_AMT " +
    "MAX_LMT_AMT MAX_LMT_TRNS_AMT MIN_LMT_TRNS_AMT PASS_LMT BNK_AC").split(" "),
  audit: AUDIT5,
}, 21);

/* التسعيرة — GO/05-warehouse.md §op.5.1.2.14 «٧»: 24 = 9 ظاهر + 1 معلومة + 5 ميزة + 1 محذوف (IV-D22) + 8 تدقيق */
partition("IAS_ITEM_PRICE", {
  visible: ["LEV_NO", "I_CODE", "ITM_UNT", "P_SIZE", "I_PRICE", "MIN_ITM_PRICE", "MAX_ITM_PRICE", "BRN_NO", "NOTE"],
  info: ["IMP_XLS"],
  features: ["W_CODE", "FROM_QTY", "TO_QTY", "EXPIRE_DATE", "BATCH_NO"],
  deleted: ["DCTR_PRICE"],
  audit: AUDIT8,
}, 24);
partition("IAS_ITEM_PRICE_HISTORY", {
  mapped: ("AUD_NO AUD_TYPE LEV_NO I_CODE ITM_UNT P_SIZE W_CODE EXPIRE_DATE BATCH_NO FROM_QTY TO_QTY I_PRICE PREV_I_PRICE " +
    "MIN_ITM_PRICE MAX_ITM_PRICE PREV_MAX_ITM_PRICE PREV_MIN_ITM_PRICE INPT_MTHD AUD_U_ID AUD_DATE DOC_NO DOC_DATE BRN_NO").split(" "),
  audit: AUDIT8,
}, 31);
{
  const pr = tsv("IAS_ITEM_PRICE");
  const dctr = pr.filter((r) => r.DCTR_PRICE !== "").length;
  const featFilled = pr.filter((r) => r.W_CODE !== "" || r.FROM_QTY !== "" || r.TO_QTY !== "" ||
    !(r.EXPIRE_DATE ?? "").startsWith("1900-01-01") || !["", "0"].includes(r.BATCH_NO ?? "")).length;
  line(dctr === 0 && featFilled === 0, `IV-D22/IV-D21: سعر الطبيب فارغ (${dctr}) · مفاتيح الميزات فارغة أو «لا شيء» (${featFilled}) في ${pr.length} سعراً`);
}

/* 33 · op.7.1.2.4 — المندوب 119 = 87 عموداً + 27 ميزة + 5 تدقيق (أعمدة الطرفية وPR_REP ضمن الميزات) */
partition("SALES_MAN", { mapped: SALESMAN_COLS.map(([o]) => o), features: SALESMAN_FEATURE_COLS, audit: AUDIT5 }, 119);
partition("IAS_CST_SMAN", {
  mapped: ("C_CODE REP_CODE FLD_DAY1 FLD_DAY2 FLD_DAY3 FLD_DAY4 FLD_DAY5 FLD_DAY6 FLD_DAY7 DFLT_FLG INACTIVE INACTIVE_DATE " +
    "INACTIVE_U_ID INACTIVE_RES").split(" "),
  audit: AUDIT8,
}, 22);
partition("IAS_PRIV_SMAN", { mapped: ["U_ID", "REP_CODE", "ADD_FLAG", "VIEW_FLAG"], audit: ["AD_DATE", "AD_U_ID", "UP_DATE", "UP_U_ID"] }, 8);
partition("ARS_LOCTN_GEO_SMAN", { mapped: ["LOC_TYP", "CODE_NO", "REP_CODE"], audit: AUDIT8 }, 11);
const smRows = tsv("SALES_MAN");

const db = await openDb();
await applySchema(db);
/* نفس ما يفعله الإقلاع: يملأ الناقص فقط من المستخرج (لا يدوس تعديلاً) */
await syncLayer2(db);
await syncLayer2b(db);

/** كل قيمة غير فارغة في أعمدة أونيكس محفوظة في عمود jsonb بنفس القيمة */
async function preserved(title: string, rowsOnyx: Record<string, string>[], keyCol: string, sql: string, cols: readonly string[]): Promise<void> {
  const r = await db.query(sql);
  const byKey = new Map(r.rows.map((x) => [s(x.k), (x.j ?? {}) as Record<string, string>]));
  let lost = 0;
  let values = 0;
  const samples: string[] = [];
  for (const row of rowsOnyx) {
    const f = byKey.get(row[keyCol]!) ?? {};
    for (const c of cols) {
      if (row[c] === "") continue;
      values++;
      if (s(f[c]) !== row[c]) {
        lost++;
        if (samples.length < 3) samples.push(row[keyCol] + "." + c + " أونيكس=" + row[c] + " محفوظ=" + s(f[c]));
      }
    }
  }
  line(lost === 0, `${title}: ${values - lost}/${values} قيمة محفوظة` + (samples.length ? " · " + samples.join(" · ") : ""));
}
await preserved("ميزات المخازن (26)", whRows, "W_CODE", `SELECT code k, features j FROM erp.warehouse`, WAREHOUSE_FEATURE_COLS);
await preserved("المحفوظ بلا واجهة للمخازن (3)", whRows, "W_CODE", `SELECT code k, legacy j FROM erp.warehouse`, WH_KEPT);

await preserved("ميزات المندوبين (27)", smRows, "REPRS_CODE", `SELECT code k, features j FROM erp.salesman`, SALESMAN_FEATURE_COLS);
await preserved("ربط العملاء — PR_REP والطرفيات", tsv("IAS_CST_SMAN").map((r) => ({ ...r, K: r.REP_CODE + "|" + r.C_CODE })), "K",
  `SELECT rep_code || '|' || customer_code k, features j FROM erp.salesman_customer`, ["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"]);

/* المندوب: كل خانة من الأعمدة الـ87 = قيمة أونيكس (منطقي 0/1 · رقم بلا أصفار زائدة · تاريخ يوماً · طابع زمني بالثانية) */
{
  const sel = SALESMAN_COLS.map(([, e, k]) =>
    k === "bool" ? `CASE WHEN ${e} THEN '1' ELSE '0' END ${e}`
      : k === "num" ? `trim_scale(${e})::text ${e}`
        : k === "date" ? `to_char(${e},'YYYY-MM-DD') ${e}`
          : k === "ts" ? `to_char(${e},'YYYY-MM-DD HH24:MI:SS') ${e}` : `${e}::text ${e}`).join(", ");
  const r = await db.query(`SELECT ${sel} FROM erp.salesman`);
  const byCode = new Map(r.rows.map((x) => [s(x.code), x]));
  let cells = 0;
  let diff = 0;
  const samples: string[] = [];
  for (const o of smRows) {
    const row = byCode.get(o.REPRS_CODE!);
    for (const [oc, e, k] of SALESMAN_COLS) {
      cells++;
      const raw = o[oc] ?? "";
      const want = k === "bool" ? (raw === "1" ? "1" : "0")
        : oc === "CONN_SP_SMAN" || oc === "CHEQ_TYPE" ? String(Number(raw || "0"))
          : k === "num" || k === "int" ? (raw === "" ? "" : String(Number(raw)))
            : k === "date" ? raw.slice(0, 10) : raw;
      const got = row ? s(row[e]) : "∅";
      if (got !== want) {
        diff++;
        if (samples.length < 4) samples.push(o.REPRS_CODE + "." + oc + " أونيكس=" + want + " محفوظ=" + got);
      }
    }
  }
  line(diff === 0 && byCode.size === smRows.length,
    `المندوبون: ${cells - diff}/${cells} خانة = أونيكس (${byCode.size}/${smRows.length} مندوباً)` + (samples.length ? " · " + samples.join(" · ") : ""));
}

/**
 * كل خانة من أعمدة المواصفة = قيمة أونيكس (منطقي 0/1 · رقم بلا أصفار زائدة · تاريخ يوماً · طابع زمني بالثانية).
 * `keyOf` يبني مفتاح الصف من خانات أونيكس، و`sqlKey` نفس المفتاح من أعمدة erp.
 */
async function cells(title: string, rowsOnyx: Record<string, string>[], keyOf: (r: Record<string, string>) => string,
  sqlKey: string, table: string, specs: ColSpec[], where = ""): Promise<void> {
  const sel = specs.map(([, e, k]) =>
    k === "bool" ? `CASE WHEN ${e} THEN '1' ELSE '0' END ${e}`
      : k === "num" ? `trim_scale(${e})::text ${e}`
        : k === "date" ? `to_char(${e},'YYYY-MM-DD') ${e}`
          : k === "ts" ? `to_char(${e},'YYYY-MM-DD HH24:MI:SS') ${e}` : `${e}::text ${e}`).join(", ");
  const r = await db.query(`SELECT ${sqlKey} k__, ${sel} FROM ${table} ${where}`);
  const byKey = new Map(r.rows.map((x) => [s(x.k__), x]));
  let total = 0;
  let diff = 0;
  const samples: string[] = [];
  for (const o of rowsOnyx) {
    const row = byKey.get(keyOf(o));
    for (const [oc, e, k] of specs) {
      total++;
      const raw = o[oc] ?? "";
      const want = k === "bool" ? (raw === "1" ? "1" : "0")
        : k === "num" || k === "int" ? (raw === "" ? "" : String(Number(raw)))
          : k === "date" ? raw.slice(0, 10) : raw;
      /* بلا قصّ: المسافات جزء من قيمة أونيكس (أسماء وعناوين بمسافة زائدة) ويجب أن تُحفظ كما هي */
      const got = row ? (row[e] == null ? "" : String(row[e])) : "∅";
      if (got !== want) {
        diff++;
        if (samples.length < 4) samples.push(keyOf(o) + "." + oc + " أونيكس=" + want + " محفوظ=" + got);
      }
    }
  }
  line(diff === 0 && byKey.size === rowsOnyx.length,
    `${title}: ${total - diff}/${total} خانة = أونيكس (${byKey.size}/${rowsOnyx.length} صفاً)` + (samples.length ? " · " + samples.join(" · ") : ""));
}

/* ═══ op.1.1.12 — الفروع: S_BRN 92 = 19 ظاهر + 64 ميزة + صورة الترويسة (LOB) + 8 تدقيق — صار مقروءاً (SY-Q4) ═══ */
partition("S_BRN", { mapped: BRANCH_COLS.map(([o]) => o), features: BRANCH_FEATURE_COLS, lob: BRANCH_LOB, audit: AUDIT8 }, 92);
const brRows = tsv("S_BRN");
line(!brRows.some((r) => r.RPRT_HDR_IMG !== ""), `الفروع: صورة الترويسة (LOB) فارغة في ${brRows.length} فروع`);
{
  /* الفرع المعدَّل في startyx (update_count > created) يُستثنى من المطابقة الحرفية ويُعلَن باسمه — ولا يُخفى */
  const edited = (await db.query(`SELECT no::text k, name_ar FROM erp.branch WHERE updated_by IS NOT NULL AND updated_at > '2026-09-15'`)).rows;
  const skip = new Set(edited.map((r) => s(r.k)));
  await cells("الفروع (غير المعدَّلة في startyx)", brRows.filter((r) => !skip.has(r.BRN_NO!)), (r) => r.BRN_NO!, "no::text",
    "erp.branch", BRANCH_COLS, skip.size ? `WHERE no::text NOT IN (${[...skip].map((k) => "'" + k + "'").join(",")})` : "");
  if (skip.size) {
    const r = await db.query(`SELECT no::text k, company_id, name_ar, vat_no, einvoice_enabled, seq_no FROM erp.branch WHERE no::text IN (${[...skip].map((k) => "'" + k + "'").join(",")})`);
    for (const x of r.rows) {
      const o = brRows.find((q) => q.BRN_NO === s(x.k))!;
      const same = s(x.company_id) === o.CMP_NO && s(x.vat_no) === o.BRN_TAX_CODE && String(x.einvoice_enabled) === String(o.USE_E_INVOICE === "1") && s(x.seq_no) === o.BRN_SRL;
      line(same, `الفرع ${s(x.k)} معدَّل في startyx: الاسم «${s(x.name_ar)}» (أونيكس «${o.BRN_LNAME}») — الشركة/الضريبي/الفاتورة/التسلسل = أونيكس`);
    }
  }
}
await preserved("ميزات الفروع (" + BRANCH_FEATURE_COLS.length + ")", brRows, "BRN_NO", `SELECT no::text k, features j FROM erp.branch`, BRANCH_FEATURE_COLS);

/* ═══ 35 · op.6.1.2.2 — الموردون: V_DETAILS 89 = 44 ظاهر + كلمتا سر (بصمة) + 35 ميزة + 8 تدقيق ═══ */
await syncVendors(db);
partition("V_DETAILS", { mapped: VENDOR_COLS.map(([o]) => o), secret: VENDOR_SECRET, features: VENDOR_FEATURE_COLS, audit: AUDIT8 }, 89);
partition("IAS_VENDOR_BANK", { mapped: VENDOR_BANK_COLS.map(([o]) => o), audit: AUDIT5 }, 16);
partition("IAS_VNDR_ACCNT", { mapped: VENDOR_ACCNT_COLS.map(([o]) => o), audit: AUDIT8 }, 16);
partition("IAS_PRIV_VENDOR", { mapped: VENDOR_USER_COLS.map(([o]) => o), audit: ["AD_DATE", "AD_U_ID", "UP_DATE", "UP_U_ID"] }, 9);
const vdRows = tsv("V_DETAILS");
await cells("الموردون", vdRows, (r) => r.V_CODE!, "code", "erp.vendor", VENDOR_COLS);
await preserved("ميزات الموردين (" + VENDOR_FEATURE_COLS.length + ")", vdRows, "V_CODE", `SELECT code k, features j FROM erp.vendor`, VENDOR_FEATURE_COLS);
await preserved("الموردون — PR_REP والطرفيات", vdRows, "V_CODE", `SELECT code k, legacy j FROM erp.vendor`, ["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"]);
line(!vdRows.some((r) => r.PASSWRD || r.SECRET_KEY), `الموردون: كلمتا السر فارغتان في أونيكس (${vdRows.length} مورداً) — تُحفظان بصمةً إن أُدخلتا`);
{
  /* لا مفتاح طبيعي للحسابات البنكية ⇒ المطابقة بالترتيب داخل المورد (رقم السطر بترتيب التحميل) */
  const vb = tsv("IAS_VENDOR_BANK");
  const seen = new Map<string, number>();
  const keyed = vb.map((r) => { const i = (seen.get(r.V_CODE!) ?? 0) + 1; seen.set(r.V_CODE!, i); return { ...r, K: r.V_CODE + "#" + i }; });
  await cells("الحسابات البنكية للموردين", keyed, (r) => r.K!,
    "vendor_code || '#' || row_number() OVER (PARTITION BY vendor_code ORDER BY line_no)", "erp.vendor_bank", VENDOR_BANK_COLS);
}
await cells("صلاحيات الموردين", tsv("IAS_PRIV_VENDOR"), (r) => r.V_CODE + "|" + r.U_ID + "|" + r.A_CY,
  "vendor_code || '|' || user_id || '|' || currency", "erp.vendor_user", VENDOR_USER_COLS);

/* ═══ 36 · op.1.2.8 — الموظفون: S_EMP 240 = 83 ظاهر + كلمة سر (بصمة) + 148 ميزة (رواتب/موارد بشرية) + 8 تدقيق ═══ */
await syncEmployees(db);
partition("S_EMP", { mapped: EMPLOYEE_COLS.map(([o]) => o), secret: EMPLOYEE_SECRET, features: EMPLOYEE_FEATURE_COLS, audit: AUDIT8 }, 240);
const emRows = tsv("S_EMP");
await cells("الموظفون", emRows, (r) => r.EMP_NO!, "code", "erp.employee", EMPLOYEE_COLS);
await preserved("ميزات الموظفين (" + EMPLOYEE_FEATURE_COLS.length + ")", emRows, "EMP_NO", `SELECT code k, features j FROM erp.employee`, EMPLOYEE_FEATURE_COLS);
await preserved("الموظفون — PR_REP والطرفيات", emRows, "EMP_NO", `SELECT code k, legacy j FROM erp.employee`, ["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"]);
{
  /* SY-R48 — الاسم الكامل = الأجزاء الأربعة بمسافة واحدة في كل صفوف أونيكس (القاعدة تعيد إنتاجه لا تخترعه) */
  const off = emRows.filter((r) => [r.FRST_L_NM, r.SCND_L_NM, r.THRD_L_NM, r.LST_L_NM].join(" ") !== r.EMP_L_NM);
  line(off.length === 0, `الموظفون: الاسم الكامل = الأول + الثاني + الثالث + الأخير في ${emRows.length - off.length}/${emRows.length}` +
    (off.length ? " · " + off.slice(0, 3).map((r) => r.EMP_NO + "=" + r.EMP_L_NM).join(" · ") : ""));
  const r = await db.query(`SELECT code, self_service_secret_hash h FROM erp.employee`);
  const byCode = new Map(r.rows.map((x) => [s(x.code), s(x.h)]));
  const want = emRows.filter((o) => o.EMP_PSWRD);
  const ok = want.filter((o) => byCode.get(o.EMP_NO!) === secretHash(o.EMP_PSWRD!)).length;
  const leak = await db.query(`SELECT count(*) c FROM erp.employee e, jsonb_each_text(COALESCE(e.features,'{}'::jsonb)) f WHERE f.key = 'EMP_PSWRD'`);
  line(ok === want.length && Number(leak.rows[0]?.c ?? 0) === 0, `الموظفون: كلمة سر الخدمة الذاتية محفوظة بصمةً ${ok}/${want.length} · نصها غير مخزَّن`);
  /* كل موظف على قيد تحليلي (7) أو رصيد افتتاحي موجود في البطاقات */
  const codes = new Set(emRows.map((o) => o.EMP_NO!));
  const posted = [...new Set([...tsv("IAS_POST_DTL"), ...tsv("OPEN_BAL")].filter((o) => o.AC_DTL_TYP === "7").map((o) => o.AC_CODE_DTL!))];
  const orphan = posted.filter((c) => !codes.has(c));
  line(orphan.length === 0, `الموظفون: ${posted.length} موظفاً على قيود/أرصدة التحليلي 7 كلهم في البطاقات` + (orphan.length ? " · يتيم: " + orphan.join(",") : ""));
}

/* ═══ 34 · op.7.1.2.8 — العملاء: CUSTOMER 277 = الظاهر + كلمة السر (بصمة) + ميزات + محذوف (تأمين/صحي) + صورة (LOB) + تدقيق ═══ */
partition("CUSTOMER", {
  mapped: CUSTOMER_COLS.map(([o]) => o), secret: CUSTOMER_SECRET, features: CUSTOMER_FEATURE_COLS,
  deleted: CUSTOMER_DELETED, lob: CUSTOMER_LOB, audit: AUDIT8,
}, 277);
partition("CUSTOMER_CURR", { mapped: CUSTOMER_CURR_COLS.map(([o]) => o), audit: AUDIT5 }, 22);
partition("IAS_AC_CC_LMT", { mapped: ACCOUNT_LIMIT_COLS.map(([o]) => o), audit: AUDIT8 }, 35);
partition("IAS_CST_ACCNT", { mapped: CUSTOMER_ACCNT_COLS.map(([o]) => o), audit: AUDIT8 }, 16);
partition("IAS_CST_LMT_SAL", { mapped: CUSTOMER_SALES_CAP_COLS.map(([o]) => o), audit: AUDIT8 }, 15);
partition("IAS_CST_DRVR", { mapped: CUSTOMER_DRIVER_COLS.map(([o]) => o), audit: AUDIT8 }, 15);
partition("IAS_PRIV_CUSTOMER", { mapped: CUSTOMER_USER_COLS.map(([o]) => o), audit: ["AD_DATE", "AD_U_ID", "UP_DATE", "UP_U_ID"] }, 9);
const cuRows = tsv("CUSTOMER");
{
  const filled = CUSTOMER_DELETED.filter((c) => cuRows.some((r) => r[c] !== "" && r[c] !== "0"));
  const lob = CUSTOMER_LOB.filter((c) => cuRows.some((r) => r[c] !== ""));
  line(!filled.length && !lob.length,
    `العملاء: المحذوف بقرار (تأمين/صحي ${CUSTOMER_DELETED.length}) 0/فارغ والصورة (LOB) فارغة في ${cuRows.length} عميلاً` +
      (filled.length ? " · فيه قيم: " + filled.join(",") : "") + (lob.length ? " · صورة: " + lob.join(",") : ""));
}
await cells("العملاء", cuRows, (r) => r.C_CODE!, "code", "erp.customer", CUSTOMER_COLS);
await preserved("ميزات العملاء (" + CUSTOMER_FEATURE_COLS.length + ")", cuRows, "C_CODE", `SELECT code k, features j FROM erp.customer`, CUSTOMER_FEATURE_COLS);
await preserved("العملاء — PR_REP والطرفيات", cuRows, "C_CODE", `SELECT code k, legacy j FROM erp.customer`, ["PR_REP", "AD_TRMNL_NM", "UP_TRMNL_NM"]);
{
  /* #10 كلمة السر: بصمة كل قيمة أونيكس = المحفوظ، ولا نص كلمة سر في أي عمود */
  const r = await db.query(`SELECT code, portal_secret_hash h FROM erp.customer`);
  const byCode = new Map(r.rows.map((x) => [s(x.code), s(x.h)]));
  let ok = 0;
  let want = 0;
  for (const o of cuRows) {
    if (!o.SECRET_KEY) continue;
    want++;
    if (byCode.get(o.C_CODE!) === secretHash(o.SECRET_KEY)) ok++;
  }
  const leak = await db.query(`SELECT count(*) c FROM erp.customer c, jsonb_each_text(COALESCE(c.features,'{}'::jsonb)) f WHERE f.key = 'SECRET_KEY'`);
  line(ok === want && Number(leak.rows[0]?.c ?? 0) === 0, `العملاء: كلمة السر محفوظة بصمةً ${ok}/${want} · نصها غير مخزَّن`);
}
await cells("عملات العملاء", tsv("CUSTOMER_CURR"), (r) => r.C_CODE + "|" + r.A_CY, "customer_code || '|' || currency",
  "erp.customer_currency", CUSTOMER_CURR_COLS);
await cells("حدود الحسابات (حد دين العميل)", tsv("IAS_AC_CC_LMT"), (r) => r.RCRD_SQ!, "rcrd_sq::text", "erp.account_limit", ACCOUNT_LIMIT_COLS);
await cells("صلاحيات العملاء", tsv("IAS_PRIV_CUSTOMER"), (r) => r.C_CODE + "|" + r.U_ID + "|" + r.A_CY,
  "customer_code || '|' || user_id || '|' || currency", "erp.customer_user", CUSTOMER_USER_COLS);

/* ═══ ٣ · قيم الميزات محفوظة كما هي ═══ */
{
  const r = await db.query(`SELECT code, features FROM erp.item`);
  const byCode = new Map(r.rows.map((x) => [s(x.code), (x.features ?? {}) as Record<string, string>]));
  let lost = 0;
  let values = 0;
  const samples: string[] = [];
  for (const row of mst) {
    const f = byCode.get(row.I_CODE!) ?? {};
    for (const c of ITEM_FEATURE_COLS) {
      if (row[c] === "") continue;
      values++;
      if (s(f[c]) !== row[c]) {
        lost++;
        if (samples.length < 3) samples.push(row.I_CODE + "." + c + " أونيكس=" + row[c] + " محفوظ=" + s(f[c]));
      }
    }
  }
  line(lost === 0, `قيم الميزات F1–F12: ${values - lost}/${values} قيمة محفوظة` + (samples.length ? " · " + samples.join(" · ") : ""));
}

/* ═══ ١ · كل سجل يمر على قواعد شاشته ═══ */
await db.exec("BEGIN");
let total = 0;
try {
  for (const [name, def] of Object.entries({ branch: entityDef("branch"), ...LAYER2, ...LAYER2B })) {
    /* سجل الرقابة للإضافة فقط (IV-R109) — لا مسار تعديل يُفحص */
    if (name === "item_price_audit") continue;
    /* العمليات عرض استعلام من فواتير أونيكس (IAS_V_SM_MOVE) — لا حفظ عليه */
    if (name === "salesman_operation") continue;
    /* تبويبات العميل الاستعلامية (١٦–١٨) — عروض من القيود والفواتير لا حفظ عليها */
    if (name === "customer_ledger" || name === "customer_sales_doc" || name === "customer_stats") continue;
    if (name === "vendor_ledger" || name === "vendor_stats") continue;
    if (name === "employee_ledger" || name === "employee_stats") continue;
    /* كل الصفوف بلا حد القراءة (صلاحيات العملاء 49,152) — نفس قائمة الشاشة ونطاقها */
    const scope = Object.entries(def.scope ?? {}).map(([c, val]) => `${c} = ${typeof val === "number" ? val : "'" + val + "'"}`);
    const { rows } = await db.query(`${def.listSql}${scope.length ? " WHERE " + scope.join(" AND ") : ""}`);
    let fail = 0;
    const samples: string[] = [];
    for (const row of rows) {
      total++;
      try {
        for (const [fname, f] of Object.entries(def.fields)) {
          if (!f.required || f.inheritedWhen) continue;
          if (s(row[fname]) === "") throw new Error("ONYX-4048 حقل إجباري فارغ: " + fname);
        }
        await def.validate(db, "edit", { ...row }, row, "verify");
      } catch (e) {
        fail++;
        if (samples.length < 3) {
          const key = (def.keyCols ?? [Object.keys(def.fields).find((k) => def.fields[k]!.key) ?? ""]).map((k) => s(row[k])).join("|");
          samples.push(key + " ⇒ " + ((e as { code?: string }).code ?? "") + " " + (e as Error).message);
        }
      }
    }
    line(fail === 0, `${name.padEnd(16)} ${String(rows.length - fail).padStart(5)}/${rows.length} سجل أونيكس يمر على قواعده` +
      (samples.length ? "\n       " + samples.join("\n       ") : ""));
  }
} finally {
  await db.exec("ROLLBACK");
  await db.close();
}
process.stdout.write((bad ? "FAILURES " : "ALL PASS ") + total + " سجل · " + bad + " إخفاق\n");
if (bad) process.exit(1);
