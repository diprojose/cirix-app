import { getCurrentLocale, pick } from "@/lib/i18n";
import { N8N_DEMO_WORKFLOW, type WorkflowNode, type WorkflowStatus } from "@/modules/n8n/lib/demo-workflow";

const CANVAS_WIDTH = 1440;
const CANVAS_HEIGHT = 650;
const NODE_WIDTH = 230;
const NODE_HEIGHT = 124;

const STATUS_LABELS: Record<WorkflowStatus, { es: string; en: string }> = {
  live: { es: "LISTO", en: "READY" },
  conditional: { es: "DECISION", en: "DECISION" },
  mock: { es: "DEMO", en: "DEMO" },
};

const NODE_STYLES: Record<WorkflowNode["kind"], string> = {
  trigger: "border-[var(--color-action-fill)]/35 bg-surface/96",
  agent: "border-accent/18 bg-surface/96",
  decision: "border-action/22 bg-surface/96",
  action: "border-border bg-surface/96",
};

const ICON_STYLES: Record<WorkflowNode["kind"], string> = {
  trigger: "bg-[var(--color-action-soft)] text-[var(--color-action-strong)]",
  agent: "bg-accent-soft text-accent-strong",
  decision: "bg-action-soft text-action-strong",
  action: "bg-[var(--color-action-soft)] text-[var(--color-action-strong)]",
};

const TONE_STYLES: Record<NonNullable<WorkflowNode["tone"]>, string> = {
  brand: "border-[var(--color-action-fill)]/18 bg-[var(--color-action-soft)] text-[var(--color-action-strong)]",
  accent: "border-accent/15 bg-accent-soft text-accent-strong",
  action: "border-action/15 bg-action-soft text-action-strong",
};

export async function WorkflowDemoPage() {
  const locale = await getCurrentLocale();
  const workflow = N8N_DEMO_WORKFLOW;

  return (
    <main
      className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgb(229_0_43_/_0.16),transparent_34%),radial-gradient(circle_at_85%_18%,rgb(28_90_174_/_0.32),transparent_28%),linear-gradient(180deg,#030e1d,#051934)] text-text"
    >
      <section className="mx-auto flex w-full max-w-[90rem] flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-surface shadow-card">
          <div className="border-b border-border px-5 py-4 md:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">
                  {pick(locale, { es: "Flujo principal", en: "Main workflow" })}
                </p>
                <p className="text-xs text-text-muted">
                  {pick(locale, {
                    es: "Canvas visual con nodos principales y ramificacion de decisiones.",
                    en: "Visual canvas with core nodes and decision branching.",
                  })}
                </p>
              </div>
              <div className="rounded-full border border-[var(--color-action-fill)] bg-[var(--color-action-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-action-strong)]">
                {pick(locale, { es: "demo estatico", en: "static demo" })}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div
              className="relative"
              style={{
                width: `${CANVAS_WIDTH}px`,
                minWidth: "100%",
                height: `${CANVAS_HEIGHT}px`,
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgb(229 0 43 / 0.24) 1px, transparent 0)",
                backgroundSize: "25px 25px",
              }}
            >
              <div className="absolute left-6 top-5 rounded-full border border-[var(--color-action-fill)]/16 bg-[var(--color-action-soft)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-action-strong)]">
                {pick(locale, { es: "Carril email > lead", en: "Email > lead lane" })}
              </div>
              <div className="absolute left-6 top-[328px] rounded-full border border-action/16 bg-action-soft px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-action-strong">
                {pick(locale, { es: "Carril llamadas", en: "Inbound call lane" })}
              </div>
              <div className="absolute left-5 top-[48px] h-[246px] w-[1400px] rounded-[1.5rem] border border-[var(--color-action-fill)]/7 bg-[linear-gradient(180deg,rgb(28 90 174 / 0.10),rgb(5 25 52 / 0.35))]" />
              <div className="absolute left-5 top-[356px] h-[270px] w-[1400px] rounded-[1.5rem] border border-action/8 bg-[linear-gradient(180deg,rgb(28 90 174 / 0.08),rgba(255,255,255,0.18))]" />

              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
                fill="none"
              >
                {workflow.edges.map((edge) => {
                  const source = workflow.nodes.find((node) => node.id === edge.from);
                  const target = workflow.nodes.find((node) => node.id === edge.to);
                  if (!source || !target) return null;

                  const startX = source.x + NODE_WIDTH;
                  const startY = source.y + NODE_HEIGHT / 2;
                  const endX = target.x;
                  const endY = target.y + NODE_HEIGHT / 2;
                  const midX = startX + (endX - startX) / 2;
                  const isReturnEdge = edge.id === "e9";
                  const isQualifiedEdge = edge.id === "e4";
                  const isSubscriberBranch = edge.id === "e7";
                  const isNoEmailBranch = edge.id === "e8";
                  const path = isReturnEdge
                    ? [
                        `M ${source.x + NODE_WIDTH / 2} ${source.y}`,
                        `L ${source.x + NODE_WIDTH / 2} ${target.y + NODE_HEIGHT + 24}`,
                        `C ${source.x + NODE_WIDTH / 2} ${target.y + NODE_HEIGHT + 8}, ${target.x + NODE_WIDTH / 2} ${target.y + NODE_HEIGHT + 8}, ${target.x + NODE_WIDTH / 2} ${target.y + NODE_HEIGHT}`,
                      ].join(" ")
                    : isQualifiedEdge
                      ? [
                          `M ${startX} ${startY}`,
                          `C ${startX + 54} ${startY}, ${endX - 66} ${endY}, ${endX} ${endY}`,
                        ].join(" ")
                      : isSubscriberBranch
                        ? [
                            `M ${source.x + NODE_WIDTH / 2} ${source.y + NODE_HEIGHT}`,
                            `L ${target.x + NODE_WIDTH / 2} ${target.y}`,
                          ].join(" ")
                        : isNoEmailBranch
                          ? [
                              `M ${startX} ${startY}`,
                              `L ${endX - 18} ${startY}`,
                              `L ${endX - 18} ${endY}`,
                              `L ${endX} ${endY}`,
                            ].join(" ")
                      : `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

                  const edgeLabel = edge.label
                    ? pick(locale, { es: edge.labelEs ?? edge.label, en: edge.label })
                    : "";
                  const labelWidth = edgeLabel ? Math.max(72, edgeLabel.length * 7 + 24) : 0;
                  const labelX = edge.labelX ?? midX;
                  const labelY = edge.labelY ?? Math.min(startY, endY) - 18;

                  return (
                    <g key={edge.id}>
                      <path
                        d={path}
                        stroke="rgb(8 185 228 / 0.52)"
                        strokeWidth="3"
                        strokeDasharray="7 11"
                        strokeLinecap="round"
                      />
                      {edgeLabel ? (
                        <g>
                          <rect
                            x={labelX - labelWidth / 2}
                            y={labelY - 12}
                            width={labelWidth}
                            height="24"
                            rx="12"
                            fill="rgb(10 36 74 / 0.95)"
                            stroke="rgb(28 90 174 / 0.8)"
                          />
                          <text
                            x={labelX}
                            y={labelY}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="rgb(255 255 255 / 0.86)"
                            fontSize="10"
                            fontWeight="600"
                            fontFamily="var(--font-sans), ui-sans-serif, system-ui, sans-serif"
                          >
                            {edgeLabel}
                          </text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              {workflow.nodes.map((node) => (
                <article
                  key={node.id}
                  className={`absolute flex h-[124px] w-[230px] flex-col rounded-[1.55rem] border px-4 py-4 shadow-[0_8px_24px_-12px_rgb(3 14 29 / 0.35)] backdrop-blur-[2px] ${NODE_STYLES[node.kind]}`}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[1.15rem] border text-[1rem] font-semibold ${
                        node.tone ? TONE_STYLES[node.tone] : ICON_STYLES[node.kind]
                      }`}
                    >
                      <NodeGlyph node={node} />
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-bg px-3.5 py-2 text-[0.67rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {pick(locale, STATUS_LABELS[node.status])}
                    </span>
                  </div>

                  <div className="mt-3 min-w-0 space-y-1">
                    <p className="line-clamp-2 text-[0.92rem] font-semibold leading-5 tracking-[-0.03em] text-text">
                      {pick(locale, { es: node.labelEs ?? node.label, en: node.label })}
                    </p>
                    <p className="line-clamp-2 text-[0.78rem] leading-4 text-text-muted">
                      {pick(locale, { es: node.subtitleEs ?? node.subtitle, en: node.subtitle })}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-action-strong)]">
              {pick(locale, { es: "Automatizaciones", en: "Automations" })}
            </h2>
            <div className="text-xs text-text-muted">
              {pick(locale, { es: "alcance inicial", en: "initial scope" })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="grid gap-4">
              {workflow.automations.map((automation) => (
                <article
                  key={automation.title}
                  className="rounded-[1.35rem] border border-border bg-surface px-5 py-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text">
                        {pick(locale, { es: automation.titleEs ?? automation.title, en: automation.title })}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-text-muted">
                        {pick(locale, { es: automation.detailEs ?? automation.detail, en: automation.detail })}
                      </p>
                    </div>
                    <span className="rounded-full border border-border bg-bg px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
                      {pick(locale, STATUS_LABELS[automation.status])}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <article className="rounded-[1.35rem] border border-border bg-surface px-5 py-4 shadow-xs">
              <p className="text-sm font-semibold text-text">
                {pick(locale, { es: "Ramas visibles en el canvas", en: "Branches visible in the canvas" })}
              </p>
              <div className="mt-3 space-y-3 text-sm text-text-muted">
                <p>
                  {pick(locale, {
                    es: "1. Subscribers reciben email y pasan al formulario de leads.",
                    en: "1. Subscribers receive email and move into the lead form.",
                  })}
                </p>
                <p>
                  {pick(locale, {
                    es: "2. Leads se validan por numero Florida, locacion Florida y condado.",
                    en: "2. Leads are validated by Florida phone, Florida location, and county.",
                  })}
                </p>
                <p>
                  {pick(locale, {
                    es: "3. Llamadas entrantes abren una rama: con email se crea subscriber; sin email se empuja al formulario.",
                    en: "3. Inbound calls branch: with email create subscriber; without email send to form.",
                  })}
                </p>
              </div>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}

function NodeGlyph({ node }: { node: WorkflowNode }) {
  return node.glyph;
}
