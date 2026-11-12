import "server-only";
import path from "node:path";
import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";
import type { ReceiptReader } from "../../domain/ports/receipt-ports";

/** Thermal print reads best at about this width: smaller loses letters, larger only costs time. */
const TARGET_WIDTH = 1200;
/** The low-light pass: denoising blurs letters, so they need more pixels to survive it. */
const LOW_LIGHT_WIDTH = 1600;
/**
 * A clear receipt reads in about a second; a photo of mostly noise can keep the
 * engine busy for most of a minute and still yield nothing. Past this, the pass
 * counts as having read nothing, which keeps two passes inside the request's 60 s.
 */
const PASS_TIMEOUT_MS = 20_000;
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
  /**
   * The second pass is for photos taken in poor light: larger, so small print
   * keeps its shape, and with the grain of a dark photo smoothed away before the
   * contrast is stretched. Tried only when the first read was not enough.
   */
  readonly passes = 2;

  async read(image: Uint8Array, pass = 0): Promise<string | null> {
    let prepared: Buffer;
    try {
      const photo = sharp(image, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();
      prepared = await (pass === 0
        ? photo.resize({ width: TARGET_WIDTH }).grayscale()
        : photo.resize({ width: LOW_LIGHT_WIDTH }).grayscale().median(3)
      )
        .normalize()
        .png()
        .toBuffer();
    } catch {
      return null;
    }

    // One engine reads one image at a time, so concurrent calls wait their turn.
    const run = queue.then(async () => {
      const engine = await startWorker();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timedOut = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), PASS_TIMEOUT_MS);
      });
      const reading = engine.recognize(prepared).then((result) => result.data.text);
      // Once abandoned, its rejection when the engine is stopped must not go unhandled.
      reading.catch(() => undefined);
      const text = await Promise.race([reading, timedOut]);
      clearTimeout(timer);
      if (text !== null) return text;
      // The engine cannot drop one job, so it goes; the next photo starts a fresh one.
      worker = null;
      await engine.terminate().catch(() => undefined);
      return "";
    });
    queue = run.catch(() => undefined);
    return run;
  }
}
