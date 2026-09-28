const HELPERS = new Set([
  "handler", "handler.js", "iframe", "iframe.js", "experiments.js", "links", "links.js",
]);
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
};

/** Same-origin Firebase helpers prevent Safari's cross-site storage blocking. */
async function forward(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.length !== 1 || !HELPERS.has(path[0])) {
    return new Response(null, { status: 404, headers: RESPONSE_HEADERS });
  }
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId || !/^[a-z0-9-]+$/.test(projectId)) {
    return new Response(null, { status: 503, headers: RESPONSE_HEADERS });
  }
  const target = new URL(`https://${projectId}.firebaseapp.com/__/auth/${path[0]}`);
  target.search = new URL(request.url).search;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  try {
    // Never forward application cookies or authorization to the upstream.
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "POST" ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const responseHeaders = new Headers(upstream.headers);
    for (const header of ["content-encoding", "content-length", "transfer-encoding", "connection", "set-cookie"]) {
      responseHeaders.delete(header);
    }
    for (const [name, value] of Object.entries(RESPONSE_HEADERS)) responseHeaders.set(name, value);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return new Response(null, { status: 502, headers: RESPONSE_HEADERS });
  }
}

export { forward as GET, forward as POST, forward as HEAD };
