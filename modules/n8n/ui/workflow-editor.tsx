"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { LocalizedLink } from "@/components/localized-link";
import { pick, type Locale } from "@/lib/locale";
import type { WorkflowDemo, WorkflowNode, WorkflowStatus } from "@/modules/n8n/lib/demo-workflow";
import { AppointmentStudio } from "@/modules/n8n/ui/appointment-studio";
import s from "./automation-studio.module.css";

const W = 1440;
const H = 680;
const NW = 230;
const NH = 148;
const statusLabels: Record<WorkflowStatus, { es: string; en: string }> = {
  live: { es: "Listo", en: "Ready" },
  conditional: { es: "Decisión", en: "Decision" },
  mock: { es: "Demo", en: "Demo" },
};
const kindLabels: Record<WorkflowNode["kind"], { es: string; en: string }> = {
  trigger: { es: "Disparador", en: "Trigger" },
  agent: { es: "Agente", en: "Agent" },
  decision: { es: "Decisión", en: "Decision" },
  action: { es: "Acción", en: "Action" },
};

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
  const edges = useMemo(() => workflow.edges.filter((edge) => workflow.nodes.some((node) => node.id === edge.from) && workflow.nodes.some((node) => node.id === edge.to)), [workflow]);
  const copy = (es: string, en: string) => pick(locale, { es, en });
  const label = (node: WorkflowNode) => pick(locale, { es: node.labelEs ?? node.label, en: node.label });
  const subtitle = (node: WorkflowNode) => pick(locale, { es: node.subtitleEs ?? node.subtitle, en: node.subtitle });
  const zoomBy = (value: number) => setZoom((current) => Math.min(1.2, Math.max(0.2, current + value)));
  const changeView = (view: typeof workspaceView) => { setWorkspaceView(view); setRunning(false); };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSimulationStep((current) => (current + 1) % workflow.nodes.length);
    }, 850);
    return () => window.clearInterval(timer);
  }, [running, workflow.nodes.length]);

  const activeNodeId = running && simulationStep >= 0 ? workflow.nodes[simulationStep]?.id : undefined;
  const inspected = workflow.nodes.find((node) => node.id === activeNodeId) ?? selected;

  useEffect(() => {
    const viewport = canvasRef.current;
    if (!viewport) return;
    const updateFit = () => {
      const next = Math.min(1, Math.max(0.2, (viewport.clientWidth - 32) / W));
      setFitZoom(next);
      // On small screens keep nodes readable and allow canvas scrolling.
      setZoom(Math.max(0.8, next));
    };
    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [inspector, workspaceView]);

  return <div className={s.studio} id="studio-top">
    <a href="#studio-content" className={s.skipLink}>{copy("Saltar al contenido", "Skip to content")}</a>
    <header className={s.header}>
      <div className={`${s.container} ${s.headerInner}`}>
        <LocalizedLink href="/" aria-label={copy("CIRIX · Inicio", "CIRIX · Home")}><Image src="/brand/logo-white.svg" alt="CIRIX" width={116} height={42} className={s.logo} priority /></LocalizedLink>
        <span className={s.headerLabel}>CIRIX ECOSYSTEM <span>/</span> AUTOMATION</span>
        <div className={s.headerActions}>
          <nav className={s.languages} aria-label={copy("Idioma", "Language")}>{(["es", "en"] as const).map((lang) => <a key={lang} href={`/${lang}/n8n`} hrefLang={lang} aria-current={locale === lang ? "page" : undefined}>{lang.toUpperCase()}</a>)}</nav>
          <LocalizedLink href="/" className={s.backLink}>{copy("Ecosistema", "Ecosystem")} <span aria-hidden="true">↗</span></LocalizedLink>
        </div>
      </div>
    </header>

    <main id="studio-content">
      <section className={s.hero} aria-labelledby="studio-title">
        <div className={`${s.container} ${s.heroInner}`}>
          <div>
            <p className={s.eyebrow}><span className={s.brandDot} />03 / {copy("CONECTA. AUTOMATIZA. AVANZA.", "CONNECT. AUTOMATE. MOVE FORWARD.")}</p>
            <h1 id="studio-title">n8n Automation<span>Studio.</span></h1>
            <p className={s.heroDescription}>{copy("Menos tareas. Más oportunidades. Conecta cada contacto con su próximo paso: de la primera conversación a una cita en tu agenda.", "Fewer tasks. More opportunities. Connect every contact with their next step: from the first conversation to a meeting on your calendar.")}</p>
          </div>
          <div className={s.overview}>
            <div className={s.overviewHeading}><span className={s.eyebrow}>{copy("TU OPERACIÓN, CONECTADA", "YOUR OPERATION, CONNECTED")}</span><span aria-hidden="true">↗</span></div>
            <div className={s.journey}><span>{copy("Contacto", "Contact")}</span><b aria-hidden="true">→</b><span>{copy("Validación", "Validation")}</span><b aria-hidden="true">→</b><span>{copy("Cita", "Meeting")}</span></div>
            <div className={s.metrics}><div><strong>{String(workflow.nodes.length).padStart(2, "0")}</strong><span>{copy("nodos", "nodes")}</span></div><div><strong>{String(edges.length).padStart(2, "0")}</strong><span>{copy("conexiones", "connections")}</span></div><div><strong>{String(workflow.automations.length).padStart(2, "0")}</strong><span>{copy("automatizaciones", "automations")}</span></div></div>
            <p className={s.demoNote}><span className={s.brandDot} />{copy("Demo interactiva · explora el recorrido", "Interactive demo · explore the journey")}</p>
          </div>
        </div>
      </section>

      <div className={s.container}>
        <div className={s.workspaceNav}>
          <nav className={s.tabs} aria-label={copy("Secciones del módulo", "Module sections")}>
            <button type="button" aria-pressed={workspaceView === "workflow"} onClick={() => changeView("workflow")}><span>01</span>{copy("Flujo de automatización", "Automation workflow")}</button>
            <button type="button" aria-pressed={workspaceView === "appointments"} onClick={() => changeView("appointments")}><span>02</span>{copy("Agenda y citas", "Schedule & appointments")}</button>
          </nav>
          <span className={s.workspaceNote}>{copy("EXPLORA LAS POSIBILIDADES", "EXPLORE THE POSSIBILITIES")}</span>
        </div>

        {workspaceView === "appointments" ? <AppointmentStudio locale={locale} /> : <>
          <div className={s.sectionHeading}><div><p className={s.eyebrow}>{copy("DEL CONTACTO A LA CONVERSIÓN", "FROM CONTACT TO CONVERSION")}</p><h2>{copy("Cada paso, conectado.", "Every step, connected.")}</h2></div><p>{copy("Selecciona un nodo para explorar su función o simula el recorrido visual.", "Select a node to explore its role or simulate the visual journey.")}</p></div>
          <section className={s.editor} aria-label={copy("Explorador del flujo", "Workflow explorer")}>
            <div className={s.toolbar}>
              <div className={s.canvasTitle}><span className={s.brandDot} />{copy("Mapa del flujo", "Workflow map")}<span className={s.demoBadge}>DEMO</span></div>
              <div className={s.zoomControls}><button type="button" className={s.iconButton} onClick={() => zoomBy(-0.1)} disabled={zoom <= 0.2} aria-label={copy("Alejar", "Zoom out")}>−</button><output aria-label="Zoom">{Math.round(zoom * 100)}%</output><button type="button" className={s.iconButton} onClick={() => zoomBy(0.1)} disabled={zoom >= 1.2} aria-label={copy("Acercar", "Zoom in")}>+</button><button type="button" className={s.button} onClick={() => setZoom(fitZoom)}>{copy("Ajustar", "Fit")}</button></div>
              <div className={s.toolbarActions}><button type="button" className={s.button} aria-pressed={inspector} onClick={() => setInspector((value) => !value)}>{copy("Inspector", "Inspector")}</button><button type="button" className={s.primaryButton} aria-pressed={running} onClick={() => { setRunning((value) => !value); setSimulationStep(-1); }}><span aria-hidden="true">{running ? "■" : "▷"}</span>{running ? copy("Detener", "Stop") : copy("Simular flujo", "Simulate workflow")}</button></div>
            </div>
            <div className={s.editorBody}>
              <aside className={s.nodeList} aria-label={copy("Nodos del flujo", "Workflow nodes")}><p className={s.eyebrow}>{copy("NODOS", "NODES")}<span>{workflow.nodes.length}</span></p>{workflow.nodes.map((node, index) => <button key={node.id} type="button" aria-pressed={inspected?.id === node.id} onClick={() => { setSelectedId(node.id); setRunning(false); }}><span className={s.listIndex}>{String(index + 1).padStart(2, "0")}</span><span className={s.listLabel}>{label(node)}</span><span className={s.statusDot} data-status={node.status} /></button>)}</aside>
              <div ref={canvasRef} className={s.canvas} tabIndex={0} role="region" aria-label={copy("Canvas desplazable. Usa la lista de nodos para explorar cada paso.", "Scrollable canvas. Use the node list to explore each step.")} style={{ height: Math.max(420, H * zoom + 32) }}>
                <div className={s.canvasSize} style={{ width: W * zoom, height: H * zoom }}><div className={s.canvasWorld} style={{ width: W, height: H, transform: `scale(${zoom})` }}>
                  <div className={s.lane} style={{ top: 12 }}><span>01</span>{copy("Entrada de suscriptores", "Subscriber intake")}</div><div className={s.lane} style={{ top: 310 }}><span>02</span>{copy("Entrada de llamadas", "Inbound call intake")}</div>
                  <svg className={s.connections} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true"><defs><marker id="workflow-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="context-stroke" /></marker></defs>{edges.map((edge) => {
                    const source = workflow.nodes.find((node) => node.id === edge.from)!;
                    const target = workflow.nodes.find((node) => node.id === edge.to)!;
                    const sx = source.x + NW; const sy = source.y + NH / 2; const ex = target.x; const ey = target.y + NH / 2; const mx = sx + (ex - sx) / 2;
                    const related = edge.from === inspected?.id || edge.to === inspected?.id;
                    return <g key={edge.id} data-related={related}><path d={`M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`} markerEnd="url(#workflow-arrow)" />{edge.label ? <text x={edge.labelX ?? mx} y={edge.labelY ?? Math.min(sy, ey) - 18} textAnchor="middle">{pick(locale, { es: edge.labelEs ?? edge.label, en: edge.label })}</text> : null}</g>;
                  })}</svg>
                  {workflow.nodes.map((node, index) => <button key={node.id} type="button" onClick={() => { setSelectedId(node.id); setRunning(false); }} aria-pressed={inspected?.id === node.id} className={s.node} data-kind={node.kind} data-running={activeNodeId === node.id} style={{ left: node.x, top: node.y }}><span className={s.nodeTop}><span className={s.nodeGlyph}>{node.glyph}</span><span className={s.nodeStatus}><span className={s.statusDot} data-status={node.status} />{pick(locale, statusLabels[node.status])}</span></span><span className={s.nodeLabel}>{label(node)}</span><span className={s.nodeSubtitle}>{subtitle(node)}</span><span className={s.nodeNumber}>{String(index + 1).padStart(2, "0")}</span></button>)}
                </div></div>
              </div>
              {inspector && inspected ? <aside className={s.inspector} aria-label={copy("Inspector de nodo", "Node inspector")}>
                <div className={s.inspectorHeading}><p className={s.eyebrow}>{copy("DETALLE DEL NODO", "NODE DETAILS")}</p><button type="button" className={s.iconButton} onClick={() => setInspector(false)} aria-label={copy("Cerrar inspector", "Close inspector")}>×</button></div>
                <span className={s.inspectorGlyph}>{inspected.glyph}</span><h3>{label(inspected)}</h3><p className={s.inspectorDescription}>{subtitle(inspected)}</p>
                <dl className={s.properties}><div><dt>{copy("Tipo", "Type")}</dt><dd>{pick(locale, kindLabels[inspected.kind])}</dd></div><div><dt>{copy("Estado", "Status")}</dt><dd><span className={s.statusDot} data-status={inspected.status} />{pick(locale, statusLabels[inspected.status])}</dd></div><div><dt>{copy("Entrada", "Input")}</dt><dd>{inspected.kind === "trigger" ? "event.webhook" : "previous.node"}</dd></div><div><dt>{copy("Salida", "Output")}</dt><dd>{inspected.kind === "decision" ? "branch.true / false" : "next.node"}</dd></div></dl>
                {inspected.id === "schedule-appointment" ? <button type="button" className={s.primaryButton} onClick={() => changeView("appointments")}>{copy("Abrir agenda", "Open schedule")} <span aria-hidden="true">↗</span></button> : null}
                <p className={s.inspectorFoot}>{copy("Vista de demostración. Las conexiones representan un recorrido posible.", "Demo view. Connections represent a possible journey.")}</p>
              </aside> : null}
            </div>
            <div className={s.canvasFooter}><span><span className={s.statusDot} data-status={running ? "live" : "mock"} />{running ? copy("Simulación visual en curso", "Visual simulation running") : copy("Selecciona un nodo para ver sus detalles", "Select a node to see its details")}</span><span>{copy("Desplaza para explorar · ajusta para ver todo", "Scroll to explore · fit to see everything")}</span></div>
          </section>

          <section className={s.supporting} aria-label={copy("Automatizaciones y lógica", "Automations and logic")}>
            <div className={s.recipes}><p className={s.eyebrow}>01 / {copy("AUTOMATIZACIONES", "AUTOMATIONS")}</p><h2>{copy("Menos tareas. Más continuidad.", "Fewer tasks. More continuity.")}</h2>{workflow.automations.map((automation, index) => <article key={automation.title}><span className={s.recipeIndex}>0{index + 1}</span><div><h3>{pick(locale, { es: automation.titleEs ?? automation.title, en: automation.title })}</h3><p>{pick(locale, { es: automation.detailEs ?? automation.detail, en: automation.detail })}</p></div><span className={s.statusDot} data-status={automation.status} /></article>)}</div>
            <div className={s.logic}><p className={s.eyebrow}>02 / {copy("LÓGICA DEL FLUJO", "WORKFLOW LOGIC")}</p><h2>{copy("Cada decisión cuenta.", "Every decision matters.")}</h2><ol>{[
              copy("Los suscriptores reciben un email y pasan al formulario de leads.", "Subscribers receive an email and move to the lead form."),
              copy("Los leads se validan por teléfono, ubicación y condado de Florida.", "Leads are validated by Florida phone, location, and county."),
              copy("Las llamadas entrantes se enrutan según tengan email o no.", "Inbound calls route according to whether an email is available."),
            ].map((text, index) => <li key={text}><span>0{index + 1}</span><p>{text}</p></li>)}</ol></div>
          </section>
        </>}
        <footer className={s.footer}><span>CIRIX <span>/</span> n8n Automation Studio</span><p>{copy("De la primera conversación al próximo paso.", "From the first conversation to the next step.")}</p><a href="#studio-top">{copy("Volver arriba", "Back to top")} ↑</a></footer>
      </div>
    </main>
  </div>;
}
