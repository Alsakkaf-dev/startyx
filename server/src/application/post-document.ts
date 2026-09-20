import { postDocument, type EngineDependencies, type PostDocumentRequest, type PostingStore } from "../engines/posting.ts";

/** منسّق الحفظ: يفتح المعاملة في البنية التحتية ثم يستدعي المحرّك فقط. */
export function postInTransaction(
  req: PostDocumentRequest,
  deps: EngineDependencies,
  store: PostingStore,
  tx: { begin(): void; commit(): void; rollback(): void },
) {
  tx.begin();
  try {
    const result = postDocument(req, deps, store);
    tx.commit();
    return result;
  } catch (e) {
    tx.rollback();
    throw e;
  }
}
