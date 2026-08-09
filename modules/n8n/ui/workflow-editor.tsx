"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { pick } from "@/lib/locale";
import type { Locale } from "@/lib/locale";
import type { WorkflowDemo, WorkflowNode, WorkflowStatus } from "@/modules/n8n/lib/demo-workflow";
import { AppointmentStudio } from "@/modules/n8n/ui/appointment-studio";

const WorkflowThreeScene = dynamic(() => import("@/modules/n8n/ui/workflow-three-scene").then((module) => module.WorkflowThreeScene), { ssr: false });

const W = 1440;
const H = 650;
const NW = 230;
const NH = 124;
const button = "inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted transition hover:border-cirix-cyan/40 hover:bg-cirix-cyan/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-400";
const statusLabels: Record<WorkflowStatus, { es: string; en: string }> = { live: { es: "LISTO", en: "READY" }, conditional: { es: "DECISIÓN", en: "DECISION" }, mock: { es: "DEMO", en: "DEMO" } };
const dots: Record<WorkflowStatus, string> = { live: "bg-[#37d98a]", conditional: "bg-[#ffb547]", mock: "bg-[#a0a1a8]" };
const kindLabels: Record<WorkflowNode["kind"], { es: string; en: string }> = { trigger: { es: "Disparador", en: "Trigger" }, agent: { es: "Agente", en: "Agent" }, decision: { es: "Decisión", en: "Decision" }, action: { es: "Acción", en: "Action" } };
const nodeClass: Record<WorkflowNode["kind"], string> = { trigger: "border-cirix-cyan/45 bg-[#08294b]", agent: "border-[#a76cff]/45 bg-[#151943]", decision: "border-[#ffb547]/50 bg-[#2c2742]", action: "border-brand-300/35 bg-[#0b3158]" };
const iconClass: Record<WorkflowNode["kind"], string> = { trigger: "border-cirix-cyan/40 bg-cirix-cyan/10 text-cirix-cyan", agent: "border-[#a76cff]/35 bg-[#a76cff]/10 text-[#c6a1ff]", decision: "border-[#ffb547]/35 bg-[#ffb547]/10 text-[#ffcb78]", action: "border-brand-300/35 bg-brand-500/20 text-brand-100" };

type Props = { locale: Locale; workflow: WorkflowDemo };

export function WorkflowEditor({ locale, workflow }: Props) {
  const [selectedId, setSelectedId] = useState(workflow.nodes[0]?.id ?? "");
  const [zoom, setZoom] = useState(0.72);
  const [fitZoom, setFitZoom] = useState(0.72);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [inspector, setInspector] = useState(true);
  const [running, setRunning] = useState(false);
  const [simulationStep, setSimulationStep] = useState(-1);
  const [workspaceView, setWorkspaceView] = useState<"workflow" | "appointments">("workflow");
  const selected = workflow.nodes.find((node) => node.id === selectedId) ?? workflow.nodes[0];
  const connected = useMemo(() => new Set(workflow.edges.flatMap((edge) => edge.from === selected?.id || edge.to === selected?.id ? [edge.from, edge.to] : [])), [selected?.id, workflow.edges]);
  const zoomBy = (value: number) => setZoom((current) => Math.min(1.2, Math.max(0.55, current + value)));
  const copy = (es: string, en: string) => pick(locale, { es, en });


  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSimulationStep((current) => {
        const next = (current + 1) % workflow.nodes.length;
        setSelectedId(workflow.nodes[next]?.id ?? "");
        return next;
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [running, workflow.nodes]);
  useEffect(() => {
    const viewport = canvasRef.current;
    if (!viewport) return;
    const updateFit = () => {
      const next = Math.min(1, Math.max(0.55, (viewport.clientWidth - 28) / W));
      setFitZoom(next);
      setZoom(next);
    };
    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [inspector]);

  return <main className="min-h-dvh bg-[#020b18] text-text"><div className="mx-auto flex w-full max-w-[1600px] flex-col px-3 py-3 sm:px-5 lg:px-7 lg:py-5">
    <header className="mb-4 rounded-2xl border border-brand-300/20 bg-[#071b32]/95 shadow-[0_20px_70px_-36px_rgb(0_0_0_/_0.8)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cirix-cyan/35 bg-cirix-cyan/10 font-mono text-sm font-bold text-cirix-cyan">n8n</div><div className="min-w-0"><div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted"><span>Cirix</span><span className="text-brand-300/60">/</span><span>Automation</span></div><h1 className="truncate font-heading text-lg font-semibold tracking-[-0.03em] text-white sm:text-xl">{workflow.title}</h1></div></div><div className="flex items-center gap-2 text-xs"><span className="hidden rounded-full border border-brand-300/20 bg-brand-900/50 px-3 py-1.5 text-text-muted sm:inline-flex">{copy("Última edición hace 8 min", "Last edited 8 min ago")}</span><span className="inline-flex items-center gap-2 rounded-full border border-[#37d98a]/25 bg-[#37d98a]/10 px-3 py-1.5 font-semibold text-[#7ff0b2]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#37d98a]" />{copy("Activo", "Active")}</span></div></div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"><p className="max-w-2xl text-sm leading-6 text-text-muted">{workflow.summary}</p><div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.15em] text-text-muted"><span><strong className="mr-1 text-white">{workflow.nodes.length}</strong>{copy("nodos", "nodes")}</span><span><strong className="mr-1 text-white">{workflow.edges.length}</strong>{copy("conexiones", "connections")}</span><span><strong className="mr-1 text-[#37d98a]">99.8%</strong>uptime</span></div></div>
    </header>

    <nav className="mb-4 flex w-fit gap-1 rounded-xl border border-border bg-surface p-1" aria-label={copy("Secciones del módulo", "Module sections")}>
      <button type="button" onClick={() => setWorkspaceView("workflow")} className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-400 ${workspaceView === "workflow" ? "bg-accent-soft text-accent-strong" : "text-text-muted hover:text-text"}`}>{copy("Flujo", "Workflow")}</button>
      <button type="button" onClick={() => setWorkspaceView("appointments")} className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-400 ${workspaceView === "appointments" ? "bg-accent-soft text-accent-strong" : "text-text-muted hover:text-text"}`}>{copy("Agenda y citas", "Schedule & appointments")}</button>
    </nav>

    {workspaceView === "workflow" && selected?.id === "schedule-appointment" ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft p-3"><p className="text-sm text-text-muted">{copy("Configura una cita directa o envía opciones disponibles al cliente.", "Set a direct appointment or send available options to the customer.")}</p><button type="button" onClick={() => setWorkspaceView("appointments")} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-action-fill px-4 text-sm font-semibold text-on-action transition hover:bg-action-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-300">{copy("Abrir agenda", "Open schedule")}</button></div> : null}

    {workspaceView === "appointments" ? <AppointmentStudio locale={locale} /> : <>

    <section className="overflow-hidden rounded-2xl border border-brand-300/20 bg-[#06172b] shadow-[0_26px_80px_-42px_rgb(0_0_0_/_0.9)]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#081e38] px-3 py-2.5 sm:px-4"><div className="flex items-center gap-1.5"><button type="button" className={button}>＋ <span className="hidden sm:inline">{copy("Añadir nodo", "Add node")}</span></button><button type="button" className={button} aria-label={copy("Deshacer", "Undo")}>↶</button><button type="button" className={button} aria-label={copy("Rehacer", "Redo")}>↷</button></div><div className="order-first flex items-center gap-1.5 sm:order-none"><span className="mr-2 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted md:inline">{copy("Vista del canvas", "Canvas view")}</span><button type="button" className={button} onClick={() => zoomBy(-0.1)} aria-label={copy("Alejar", "Zoom out")}>−</button><span className="min-w-12 text-center font-mono text-xs text-white">{Math.round(zoom * 100)}%</span><button type="button" className={button} onClick={() => zoomBy(0.1)} aria-label={copy("Acercar", "Zoom in")}>＋</button><button type="button" className={`${button} ml-1`} onClick={() => setZoom(fitZoom)}>{copy("Ajustar", "Fit")}</button></div><div className="flex items-center gap-1.5"><button type="button" className={button} onClick={() => setInspector((value) => !value)}>{copy("Inspector", "Inspector")}</button><button type="button" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-cirix-cyan/35 bg-cirix-cyan/10 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-cirix-cyan transition hover:bg-cirix-cyan/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-400" onClick={() => { setRunning((value) => !value); setSimulationStep(-1); }}><span>{running ? "■" : "▶"}</span>{running ? copy("Detener", "Stop") : copy("Simular", "Simulate")}</button></div></div>

      <div className="flex min-h-0 flex-col xl:flex-row"><aside className="hidden w-52 shrink-0 border-r border-white/10 bg-[#051326] p-3 xl:block"><div className="mb-3 flex items-center justify-between px-1"><span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">{copy("Nodos", "Nodes")}</span><span className="rounded bg-brand-500/20 px-1.5 py-0.5 font-mono text-[10px] text-brand-100">{workflow.nodes.length}</span></div><div className="space-y-1.5">{workflow.nodes.map((node) => <button key={node.id} type="button" onClick={() => setSelectedId(node.id)} className={`flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-400 ${selectedId === node.id ? "border-cirix-cyan/40 bg-cirix-cyan/10" : "border-transparent hover:border-white/10 hover:bg-white/5"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border font-mono text-[11px] font-bold ${iconClass[node.kind]}`}>{node.glyph}</span><span className="min-w-0 truncate text-xs text-text-muted">{pick(locale, { es: node.labelEs ?? node.label, en: node.label })}</span></button>)}</div></aside>

        <div ref={canvasRef} className="min-w-0 flex-1 overflow-auto bg-[#041225]" style={{ minHeight: 440, height: Math.max(440, H * zoom) }}><div className="relative mx-auto" style={{ width: W * zoom, height: H * zoom }}>
          <div className="absolute left-0 top-0 origin-top-left transition-transform duration-200" style={{ width: W, height: H, transform: `scale(${zoom})` }}><WorkflowThreeScene workflow={workflow} selectedId={selected?.id} running={running} /><Lane top="20px" color="cyan" label={copy("Entrada de suscriptores", "Subscriber intake")} /><Lane top="328px" color="amber" label={copy("Entrada de llamadas", "Inbound call intake")} /><svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true"><defs><marker id="workflow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="rgb(8 185 228 / 0.72)" /></marker></defs>{workflow.edges.map((edge) => { const source = workflow.nodes.find((node) => node.id === edge.from); const target = workflow.nodes.find((node) => node.id === edge.to); if (!source || !target) return null; const sx = source.x + NW; const sy = source.y + NH / 2; const ex = target.x; const ey = target.y + NH / 2; const mx = sx + (ex - sx) / 2; const path = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`; const related = connected.has(edge.from) && connected.has(edge.to); const label = edge.label ? pick(locale, { es: edge.labelEs ?? edge.label, en: edge.label }) : ""; return <g key={edge.id} className={`transition-opacity ${selected && !related ? "opacity-35" : "opacity-100"}`}><path d={path} stroke="rgb(8 185 228 / 0.68)" strokeWidth="2" strokeLinecap="round" markerEnd="url(#workflow-arrow)" />{label ? <text x={edge.labelX ?? mx} y={edge.labelY ?? Math.min(sy, ey) - 18} textAnchor="middle" fill="rgb(255 255 255 / 0.78)" fontSize="10" fontWeight="600" fontFamily="ui-monospace, monospace">{label}</text> : null}</g>; })}</svg>{workflow.nodes.map((node) => { const chosen = selected?.id === node.id; const related = connected.has(node.id); return <button key={node.id} type="button" onClick={() => setSelectedId(node.id)} className={`absolute flex h-[124px] w-[230px] flex-col rounded-xl border px-4 py-4 text-left shadow-[0_15px_35px_-20px_rgb(0_0_0_/_0.9)] transition-all focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-400 ${nodeClass[node.kind]} ${chosen ? "z-10 scale-[1.025] border-cirix-cyan shadow-[0_0_0_2px_rgb(8_185_228_/_0.3),0_18px_35px_-18px_rgb(8_185_228_/_0.7)]" : related ? "z-[1]" : "opacity-90"} ${running && simulationStep === workflow.nodes.indexOf(node) ? "animate-pulse" : ""}`} style={{ left: node.x, top: node.y }}><span className="absolute left-5 right-5 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cirix-cyan/65 to-transparent opacity-75" /><span className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border font-mono text-sm font-bold ${iconClass[node.kind]}`}>{node.glyph}</span><span className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-[#041225]/80 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted"><span className={`h-1.5 w-1.5 rounded-full ${dots[node.status]}`} />{pick(locale, statusLabels[node.status])}</span></span><span className="mt-3 min-w-0"><span className="block line-clamp-2 text-[0.88rem] font-semibold leading-5 tracking-[-0.02em] text-white">{pick(locale, { es: node.labelEs ?? node.label, en: node.label })}</span><span className="mt-1 block line-clamp-2 text-[0.72rem] leading-4 text-text-muted">{pick(locale, { es: node.subtitleEs ?? node.subtitle, en: node.subtitle })}</span></span></button>; })}</div></div></div>

        {inspector ? <aside className="w-full shrink-0 border-t border-white/10 bg-[#071a31] p-4 xl:w-72 xl:border-l xl:border-t-0">{selected ? <><div className="mb-5 flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cirix-cyan">{copy("Inspector de nodo", "Node inspector")}</p><h2 className="mt-2 text-base font-semibold text-white">{pick(locale, { es: selected.labelEs ?? selected.label, en: selected.label })}</h2></div><button type="button" className={button} onClick={() => setInspector(false)} aria-label={copy("Cerrar inspector", "Close inspector")}>×</button></div><div className="mb-5 flex items-center gap-2 rounded-lg border border-white/10 bg-[#041225] px-3 py-2"><span className={`grid h-8 w-8 place-items-center rounded-md border font-mono text-xs font-bold ${iconClass[selected.kind]}`}>{selected.glyph}</span><span><span className="block text-xs font-medium text-white">{pick(locale, kindLabels[selected.kind])}</span><span className="block font-mono text-[10px] text-text-muted">node.{selected.id}</span></span></div><Row label={copy("Estado", "Status")} value={pick(locale, statusLabels[selected.status])} tone={selected.status} /><Row label={copy("Entrada", "Input")} value={selected.kind === "trigger" ? "event.webhook" : "previous.node"} /><Row label={copy("Salida", "Output")} value={selected.kind === "decision" ? "branch.true / branch.false" : "next.node"} /><div className="mt-5 border-t border-white/10 pt-4"><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">{copy("Descripción", "Description")}</p><p className="text-xs leading-5 text-text-muted">{pick(locale, { es: selected.subtitleEs ?? selected.subtitle, en: selected.subtitle })}</p></div></> : null}</aside> : null}</div>
    </section>

    <section className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-2xl border border-brand-300/20 bg-[#071b32] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cirix-cyan">{copy("Recetas activas", "Active recipes")}</p><h2 className="mt-1 text-base font-semibold text-white">{copy("Automatizaciones", "Automations")}</h2></div><span className="rounded border border-[#37d98a]/20 bg-[#37d98a]/10 px-2 py-1 font-mono text-[10px] text-[#7ff0b2]">{workflow.automations.length} {copy("flujos", "flows")}</span></div><div className="grid gap-2">{workflow.automations.map((automation) => <article key={automation.title} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#041225]/55 px-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className={`h-2 w-2 shrink-0 rounded-full ${dots[automation.status]}`} /><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{pick(locale, { es: automation.titleEs ?? automation.title, en: automation.title })}</p><p className="mt-1 line-clamp-1 text-xs text-text-muted">{pick(locale, { es: automation.detailEs ?? automation.detail, en: automation.detail })}</p></div></div><span className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted sm:inline">{pick(locale, statusLabels[automation.status])}</span></article>)}</div></div><div className="rounded-2xl border border-brand-300/20 bg-[#071b32] p-4 sm:p-5"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffcb78]">{copy("Lógica del flujo", "Workflow logic")}</p><h2 className="mt-1 text-base font-semibold text-white">{copy("Ramas y validaciones", "Branches and validations")}</h2><div className="mt-4 space-y-3 text-xs leading-5 text-text-muted"><p><strong className="text-white">01</strong> · {copy("Suscriptores reciben email y pasan al formulario de leads.", "Subscribers receive email and move into the lead form.")}</p><p><strong className="text-white">02</strong> · {copy("Los leads se validan por teléfono, ubicación y condado de Florida.", "Leads are validated by Florida phone, location, and county.")}</p><p><strong className="text-white">03</strong> · {copy("Las llamadas entrantes se enrutan según tengan email o no.", "Inbound calls route according to whether an email is available.")}</p></div></div></section>
    </>}
  </div></main>;
}

function Lane({ top, color, label }: { top: string; color: "cyan" | "amber"; label: string }) { const amber = color === "amber"; return <div style={{ top }} className={`absolute left-5 flex items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] ${amber ? "border-[#ffb547]/25 bg-[#201b2f]/90 text-[#ffcb78]" : "border-cirix-cyan/20 bg-[#071d35]/90 text-cirix-cyan"}`}><span className={`h-1.5 w-1.5 rounded-full ${amber ? "bg-[#ffb547]" : "bg-cirix-cyan"}`} />{label}</div>; }
function Row({ label, value, tone }: { label: string; value: string; tone?: WorkflowStatus }) { return <div className="flex items-center justify-between gap-3 border-b border-white/10 py-2.5 text-xs"><span className="text-text-muted">{label}</span><span className={tone === "live" ? "font-mono text-[#7ff0b2]" : "max-w-[155px] truncate text-right font-mono text-[10px] text-white"}>{value}</span></div>; }







