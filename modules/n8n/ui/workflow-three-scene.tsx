"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { WorkflowDemo, WorkflowNode } from "@/modules/n8n/lib/demo-workflow";

const WIDTH = 1440;
const HEIGHT = 650;
const CYAN = 0x08b9e4;
const AMBER = 0xffb547;

type Props = {
  workflow: WorkflowDemo;
  selectedId?: string;
  running?: boolean;
};

export function WorkflowThreeScene({ workflow, selectedId, running = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, WIDTH, 0, HEIGHT, -100, 100);
    camera.position.set(0, 0, 10);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {

      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(WIDTH, HEIGHT, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.display = "block";
    renderer.domElement.style.pointerEvents = "none";
    host.appendChild(renderer.domElement);

    const world = new THREE.Group();


    scene.add(world);

    const grid = new THREE.GridHelper(WIDTH, 56, 0x1c5aae, 0x1c5aae);
    grid.rotation.x = Math.PI / 2;
    grid.scale.set(1, HEIGHT / WIDTH, 1);
    grid.position.set(WIDTH / 2, HEIGHT / 2, -8);
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.16;
    });


    const lanes = new THREE.Group();
    lanes.add(createLane(20, CYAN), createLane(328, AMBER));


    const edgeGroup = new THREE.Group();
    workflow.edges.forEach((edge) => {
      const source = workflow.nodes.find((node) => node.id === edge.from);
      const target = workflow.nodes.find((node) => node.id === edge.to);
      if (!source || !target) return;
      const related = selectedId === undefined || edge.from === selectedId || edge.to === selectedId;
      const color = CYAN;
      edgeGroup.add(createEdge(source, target, color, related));
    });


    const nodeGlowGroup = new THREE.Group();
    workflow.nodes.forEach((node) => {
      const selected = node.id === selectedId;
      nodeGlowGroup.add(createNodeGlow(node, selected));
    });


    const particles = createParticles();
    world.add(particles);

    let frame = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      particles.rotation.z = running ? elapsed * 0.025 : elapsed * 0.008;
      particles.position.y = Math.sin(elapsed * 0.45) * 2;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.domElement.remove();
    };
  }, [workflow, selectedId, running]);

  return null;
}

function createLane(top: number, color: number) {
  const geometry = new THREE.PlaneGeometry(WIDTH - 40, 246);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.035, side: THREE.DoubleSide });
  const lane = new THREE.Mesh(geometry, material);
  lane.position.set(WIDTH / 2, HEIGHT - top - 170, -5);
  return lane;
}

function createEdge(source: WorkflowNode, target: WorkflowNode, color: number, related: boolean) {
  const start = new THREE.Vector3(source.x + 230, HEIGHT - source.y - 62, 0);
  const end = new THREE.Vector3(target.x, HEIGHT - target.y - 62, 0);
  const middleX = start.x + (end.x - start.x) / 2;
  const curve = new THREE.CatmullRomCurve3([
    start,
    new THREE.Vector3(middleX, start.y, 0),
    new THREE.Vector3(middleX, end.y, 0),
    end,
  ]);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(18));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: related ? 0.62 : 0.16, linewidth: 1 });
  return new THREE.Line(geometry, material);
}

function createNodeGlow(node: WorkflowNode, selected: boolean) {
  const geometry = new THREE.PlaneGeometry(244, 138);
  const color = node.kind === "decision" ? AMBER : node.kind === "agent" ? 0xa76cff : CYAN;
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: selected ? 0.14 : 0.045, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(geometry, material);
  glow.position.set(node.x + 115, HEIGHT - node.y - 62, -2);
  return glow;
}

function createParticles() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(54 * 3);
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] = Math.random() * WIDTH;
    positions[index + 1] = Math.random() * HEIGHT;
    positions[index + 2] = -6;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: CYAN, size: 2.2, transparent: true, opacity: 0.36, sizeAttenuation: false });
  return new THREE.Points(geometry, material);
}

