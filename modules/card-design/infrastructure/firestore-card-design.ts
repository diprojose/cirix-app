import type { Firestore } from "firebase-admin/firestore";
import { DEFAULT_CARD_DESIGN, parseCardDesign, type CardDesign, type CardImageKind } from "../domain/card-design";
import type { CardDesignRepository, CardImage, CardImageStore } from "../domain/ports";

const businessRef = (firestore: Firestore, businessId: string) => firestore.collection("businesses").doc(businessId);

/** businesses/{businessId}/settings/card_design */
export class FirestoreCardDesignRepository implements CardDesignRepository {
  constructor(private readonly firestore: Firestore) {}

  private ref(businessId: string) {
    return businessRef(this.firestore, businessId).collection("settings").doc("card_design");
  }

  async get(businessId: string): Promise<CardDesign> {
    const stored = parseCardDesign((await this.ref(businessId).get()).data());
    // Anything unreadable on disk shows the default card rather than breaking every customer's page.
    return stored.ok ? stored.value : DEFAULT_CARD_DESIGN;
  }

  async save(businessId: string, design: CardDesign): Promise<void> {
    await this.ref(businessId).set({ ...design, updatedAt: new Date().toISOString() });
  }
}

/** businesses/{businessId}/card_images/{imageId}, the picture's bytes in the document itself. */
export class FirestoreCardImageStore implements CardImageStore {
  constructor(private readonly firestore: Firestore) {}

  private collection(businessId: string) {
    return businessRef(this.firestore, businessId).collection("card_images");
  }

  async save(businessId: string, image: CardImage): Promise<void> {
    await this.collection(businessId).doc(image.id).set({
      kind: image.kind,
      mime: image.mime,
      data: Buffer.from(image.data),
      createdAt: new Date().toISOString(),
    });
  }

  async get(businessId: string, id: string): Promise<CardImage | null> {
    const data = (await this.collection(businessId).doc(id).get()).data() as { kind?: CardImageKind; data?: Uint8Array } | undefined;
    if (!data?.kind || !data.data) return null;
    return { id, kind: data.kind, mime: "image/webp", data: new Uint8Array(data.data) };
  }

  async kinds(businessId: string, ids: readonly string[]): Promise<Map<string, CardImageKind>> {
    const found = new Map<string, CardImageKind>();
    if (ids.length === 0) return found;
    const snapshots = await this.firestore.getAll(...ids.map((id) => this.collection(businessId).doc(id)), { fieldMask: ["kind"] });
    for (const snapshot of snapshots) {
      const kind = snapshot.get("kind") as CardImageKind | undefined;
      if (snapshot.exists && kind) found.set(snapshot.id, kind);
    }
    return found;
  }

  async count(businessId: string): Promise<number> {
    return (await this.collection(businessId).count().get()).data().count;
  }

  async keepOnly(businessId: string, ids: readonly string[]): Promise<void> {
    const keep = new Set(ids);
    const all = await this.collection(businessId).select().get();
    const batch = this.firestore.batch();
    all.docs.filter((doc) => !keep.has(doc.id)).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
