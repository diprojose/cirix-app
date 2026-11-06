import "server-only";
import path from "node:path";
import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";
import type { ReceiptReader } from "../../domain/ports/receipt-ports";

/** Thermal print reads best at about this width: smaller loses letters, larger only costs time. */
const TARGET_WIDTH = 1200;
/** Refuses image bombs before decoding them. A phone photo is well under this. */
const MAX_INPUT_PIXELS = 50_000_000;

let worker: Promise<Worker> | null = null;
let queue: Promise<unknown> = Promise.resolve();

/**
 * The language data ships with the app instead of being downloaded at run time,
 * so reading a receipt depends on no outside service. `outputFileTracingIncludes`
 * in next.config.ts is what puts these files on the server.
 */
function startWorker(): Promise<Worker> {
  worker ??= createWorker("eng", 1, {
    langPath: path.join(process.cwd(), "node_modules/@tesseract.js-data/eng/4.0.0_best_int"),
    cacheMethod: "none",
    gzip: true,
    // Without a handler the engine rethrows its failures outside any promise, which kills the server process.
    errorHandler: () => undefined,
  }).catch((error: unknown) => {
    worker = null;
    throw error;
  });
  return worker;
}

/**
 * Free OCR with Tesseract, on our own server. Photos are straightened by their
 * EXIF rotation, sized and evened out first, which is most of the accuracy on
 * faded thermal paper. Nothing is stored: the photo lives only for this call.
 */
export class TesseractReceiptReader implements ReceiptReader {
  async read(image: Uint8Array): Promise<string | null> {
    let prepared: Buffer;
    try {
      prepared = await sharp(image, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width: TARGET_WIDTH })
        .grayscale()
        .normalize()
        .png()
        .toBuffer();
    } catch {
      return null;
    }

    // One engine reads one image at a time, so concurrent calls wait their turn.
    const run = queue.then(async () => {
      const engine = await startWorker();
      return (await engine.recognize(prepared)).data.text;
    });
    queue = run.catch(() => undefined);
    return run;
  }
}
