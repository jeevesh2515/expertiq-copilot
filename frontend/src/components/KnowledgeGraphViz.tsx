"use client";

import { memo, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Network, Maximize2, Minimize2, RotateCw } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { GraphData, GraphNode, GraphEdge } from "@/lib/api";

interface KnowledgeGraphVizProps {
  data: GraphData;
  selectedId?: string | null;
  hideHeader?: boolean;
}

const NODE_COLORS: Record<string, string> = {
  expert: "#EF4444",
  company: "#F59E0B",
  industry: "#A78BFA",
  topic: "#34D399",
};

const NODE_LABELS: Record<string, string> = {
  expert: "Experts",
  company: "Companies",
  industry: "Industries",
  topic: "Topics",
};

const NODE_ORDER = ["expert", "company", "industry", "topic"] as const;

interface ForceNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pinned: boolean;
  degree: number;
}

interface ForceLink {
  source: string;
  target: string;
  sourceNode: ForceNode;
  targetNode: ForceNode;
}

const ALPHA_DECAY = 0.003;
const ALPHA_MIN = 0.001;
const VELOCITY_DECAY = 0.46;
const REPULSION_STRENGTH = 2600;
const REPULSION_DISTANCE_MAX = 390;
const SPRING_LENGTH = 104;
const SPRING_STRENGTH = 0.095;
const CENTER_GRAVITY = 0.032;
const TYPE_GRAVITY = 0.026;
const COLLISION_PADDING = 9;
const BOUNDARY_PADDING = 44;
const MIN_CANVAS_WIDTH = 120;
const MIN_CANVAS_HEIGHT = 120;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const TYPE_PULL_OFFSETS: Record<string, { x: number; y: number }> = {
  expert: { x: 0, y: -0.02 },
  company: { x: -0.24, y: 0.08 },
  industry: { x: 0.22, y: 0.12 },
  topic: { x: 0, y: -0.24 },
};

function getSafeCanvasSize(width: number, height: number) {
  return {
    width: Number.isFinite(width) && width >= MIN_CANVAS_WIDTH ? width : 380,
    height: Number.isFinite(height) && height >= MIN_CANVAS_HEIGHT ? height : 240,
  };
}

function getNodeRadius(type: string, degree: number) {
  const base = type === "expert" ? 11 : type === "company" ? 8.5 : type === "industry" ? 7 : 5.5;
  return base + Math.min(4.5, degree * 0.6);
}

function getTypeAnchor(type: string, width: number, height: number) {
  const offset = TYPE_PULL_OFFSETS[type] || { x: 0, y: 0 };
  const spread = Math.min(width, height) * 0.62;
  return {
    x: width / 2 + offset.x * spread,
    y: height / 2 + offset.y * spread,
  };
}

function stepForceSimulation(nodes: ForceNode[], links: ForceLink[], width: number, height: number, alpha: number) {
  for (const n of nodes) {
    if (n.pinned) continue;
    let fx = 0;
    let fy = 0;

    for (const other of nodes) {
      if (other.id === n.id) continue;
      const dx = n.x - other.x;
      const dy = n.y - other.y;
      const distSq = Math.max(dx * dx + dy * dy, 24);
      const dist = Math.sqrt(distSq) || 1;
      const minDist = n.radius + other.radius + COLLISION_PADDING;

      if (dist < REPULSION_DISTANCE_MAX) {
        const strength = (REPULSION_STRENGTH * alpha) / distSq;
        fx += (dx / dist) * strength;
        fy += (dy / dist) * strength;
      }

      if (dist < minDist) {
        const overlap = (minDist - dist) * 0.09 * alpha;
        fx += (dx / dist) * overlap;
        fy += (dy / dist) * overlap;
      }
    }

    for (const link of links) {
      let other: ForceNode | null = null;
      if (link.sourceNode.id === n.id) other = link.targetNode;
      else if (link.targetNode.id === n.id) other = link.sourceNode;

      if (other) {
        const dx = other.x - n.x;
        const dy = other.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const desiredLength = SPRING_LENGTH + (n.type === other.type ? -10 : 8);
        const displacement = dist - desiredLength;
        const strength = SPRING_STRENGTH * displacement * alpha;
        fx += (dx / dist) * strength;
        fy += (dy / dist) * strength;
      }
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const anchor = getTypeAnchor(n.type, width, height);

    fx += (centerX - n.x) * CENTER_GRAVITY * alpha;
    fy += (centerY - n.y) * CENTER_GRAVITY * alpha;
    fx += (anchor.x - n.x) * TYPE_GRAVITY * alpha;
    fy += (anchor.y - n.y) * TYPE_GRAVITY * alpha;

    n.vx = (n.vx + fx) * VELOCITY_DECAY;
    n.vy = (n.vy + fy) * VELOCITY_DECAY;
    n.x += n.vx;
    n.y += n.vy;

    const padding = BOUNDARY_PADDING + n.radius;
    if (n.x < padding) { n.x = padding; n.vx *= -0.35; }
    if (n.x > width - padding) { n.x = width - padding; n.vx *= -0.35; }
    if (n.y < padding) { n.y = padding; n.vy *= -0.35; }
    if (n.y > height - padding) { n.y = height - padding; n.vy *= -0.35; }
  }
}

function computeForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  centerId?: string | null,
): { nodes: ForceNode[]; links: ForceLink[]; nodeMap: Map<string, ForceNode> } {
  const nodeMap = new Map<string, ForceNode>();
  const cx = width / 2;
  const cy = height / 2;
  const degreeMap = new Map<string, number>();

  for (const node of nodes) {
    degreeMap.set(node.id, 0);
  }

  for (const edge of edges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
  }

  const forceNodes: ForceNode[] = nodes.map((n, i) => {
    const angle = i * GOLDEN_ANGLE;
    const spread = Math.min(width, height) * 0.36;
    const ring = Math.sqrt((i + 1) / Math.max(1, nodes.length)) * spread;
    const isCenter = !!(centerId && n.id === centerId);
    const anchor = getTypeAnchor(n.type, width, height);
    const anchorPull = isCenter ? 0 : 0.32;
    const deg = degreeMap.get(n.id) || 0;
    return {
      ...n,
      x: isCenter ? cx : cx + Math.cos(angle) * ring + (anchor.x - cx) * anchorPull,
      y: isCenter ? cy : cy + Math.sin(angle) * ring + (anchor.y - cy) * anchorPull,
      vx: 0,
      vy: 0,
      radius: getNodeRadius(n.type, deg),
      pinned: isCenter,
      degree: deg,
    };
  });

  forceNodes.forEach((n) => nodeMap.set(n.id, n));

  const forceLinks: ForceLink[] = [];
  for (const e of edges) {
    const sn = nodeMap.get(e.source);
    const tn = nodeMap.get(e.target);
    if (sn && tn) forceLinks.push({ source: e.source, target: e.target, sourceNode: sn, targetNode: tn });
  }

  return { nodes: forceNodes, links: forceLinks, nodeMap };
}

function KnowledgeGraphViz({ data, selectedId, hideHeader }: KnowledgeGraphVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const alphaRef = useRef(1);
  const [dimensions, setDimensions] = useState({ width: 380, height: 240 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettled, setIsSettled] = useState(true);
  const hoveredRef = useRef<string | null>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingCanvas = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ nodeId: string | null }>({ nodeId: null });
  const [tooltipNode, setTooltipNode] = useState<ForceNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const frameCountRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = isFullscreen ? window.innerHeight - 80 : entry.contentRect.height;
        setDimensions(getSafeCanvasSize(w, h));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const filteredNodes = useMemo(() => {
    if (!data || !data.nodes) return [];
    const nodes = data.nodes || [];
    const edges = data.edges || [];
    return selectedId
      ? nodes.filter(
          (n) =>
            n.id === selectedId ||
            edges.some(
              (e) =>
                (e.source === selectedId && e.target === n.id) ||
                (e.target === selectedId && e.source === n.id),
            ),
        )
      : nodes;
  }, [data, selectedId]);

  const filteredEdges = useMemo(() => {
    if (!data || !data.nodes || !data.edges) return [];
    const edges = data.edges || [];
    const ids = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [filteredNodes, data]);

  const typeCounts = useMemo(
    () =>
      NODE_ORDER.map((type) => ({
        type,
        color: NODE_COLORS[type],
        label: NODE_LABELS[type],
        count: filteredNodes.filter((node) => node.type === type).length,
      })).filter((item) => item.count > 0),
    [filteredNodes],
  );

  const simRef = useRef<{ nodes: ForceNode[]; links: ForceLink[]; nodeMap: Map<string, ForceNode> }>({
    nodes: [],
    links: [],
    nodeMap: new Map(),
  });

  // Obsidian-style canvas render
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { nodes, links } = simRef.current;
    const { x: tx, y: ty, scale } = transformRef.current;
    const hoveredId = hoveredRef.current;
    const { width, height } = getSafeCanvasSize(dimensions.width, dimensions.height);
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, width, height);

    // Deep dark background with subtle gradient — Obsidian style
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#0a0c10");
    bg.addColorStop(0.5, "#080a0e");
    bg.addColorStop(1, "#0c0a0e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Soft radial glow at center
    const centerGlow = ctx.createRadialGradient(
      width * 0.48, height * 0.45, 0,
      width * 0.48, height * 0.45, Math.max(width, height) * 0.55
    );
    centerGlow.addColorStop(0, "rgba(239, 68, 68, 0.06)");
    centerGlow.addColorStop(0.35, "rgba(167, 139, 250, 0.03)");
    centerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, width, height);

    // Subtle dot grid — Obsidian style
    ctx.save();
    ctx.fillStyle = "rgba(148, 163, 184, 0.04)";
    const gridSpacing = 28;
    for (let gx = gridSpacing; gx < width; gx += gridSpacing) {
      for (let gy = gridSpacing; gy < height; gy += gridSpacing) {
        ctx.fillRect(gx, gy, 1, 1);
      }
    }
    ctx.restore();

    // Transform for pan/zoom
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    // ─── Draw edges with animated flow ───
    frameCountRef.current++;
    const flowPhase = (frameCountRef.current % 120) / 120;

    for (const link of links) {
      const sx = link.sourceNode.x;
      const sy = link.sourceNode.y;
      const ex = link.targetNode.x;
      const ey = link.targetNode.y;

      const isActiveLink = hoveredId
        ? link.sourceNode.id === hoveredId || link.targetNode.id === hoveredId
        : selectedId
          ? link.sourceNode.id === selectedId || link.targetNode.id === selectedId
          : false;

      const dx = ex - sx;
      const dy = ey - sy;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const curve = Math.min(16, distance * 0.07);
      const cx2 = (sx + ex) / 2 - (dy / distance) * curve;
      const cy2 = (sy + ey) / 2 + (dx / distance) * curve;

      // Edge line with gradient
      const edgeGrad = ctx.createLinearGradient(sx, sy, ex, ey);
      if (isActiveLink) {
        edgeGrad.addColorStop(0, "rgba(248, 113, 113, 0.6)");
        edgeGrad.addColorStop(1, "rgba(248, 113, 113, 0.35)");
      } else {
        edgeGrad.addColorStop(0, "rgba(148, 163, 184, 0.12)");
        edgeGrad.addColorStop(1, "rgba(148, 163, 184, 0.08)");
      }

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx2, cy2, ex, ey);
      ctx.strokeStyle = edgeGrad;
      ctx.lineWidth = isActiveLink ? 1.6 : 0.7;
      ctx.stroke();

      // Animated flow dot along edge
      if (isActiveLink) {
        const t = flowPhase;
        const fx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx2 + t * t * ex;
        const fy = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy2 + t * t * ey;
        ctx.beginPath();
        ctx.arc(fx, fy, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(248, 113, 113, 0.85)";
        ctx.fill();
      }

      // Midpoint dot
      ctx.beginPath();
      ctx.arc(cx2, cy2, isActiveLink ? 1.5 : 0.8, 0, Math.PI * 2);
      ctx.fillStyle = isActiveLink ? "rgba(248, 113, 113, 0.6)" : "rgba(148, 163, 184, 0.18)";
      ctx.fill();
    }

    // ─── Draw nodes — Obsidian style with soft glow halos ───
    for (const node of nodes) {
      const color = NODE_COLORS[node.type] || "#71717A";
      const isSelected = node.id === selectedId;
      const isHovered = node.id === hoveredId;
      const isFocused = isSelected || isHovered;
      const r = node.radius * (isFocused ? 1.25 : 1);
      const isDimmed = !!(hoveredId || selectedId) && !isSelected && !isHovered;
      const connectedToFocus = !!(hoveredId || selectedId) && links.some((link) => {
        const focusId = hoveredId || selectedId;
        return (
          (link.sourceNode.id === focusId && link.targetNode.id === node.id) ||
          (link.targetNode.id === focusId && link.sourceNode.id === node.id)
        );
      });

      ctx.save();

      // Outer glow halo — Obsidian's signature look
      const haloSize = r * (isFocused ? 3 : 2.2);
      const halo = ctx.createRadialGradient(node.x, node.y, r * 0.4, node.x, node.y, haloSize);
      halo.addColorStop(0, color + (isFocused ? "40" : "18"));
      halo.addColorStop(0.6, color + "08");
      halo.addColorStop(1, color + "00");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(node.x, node.y, haloSize, 0, Math.PI * 2);
      ctx.fill();

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

      if (isSelected) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (isHovered) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = color + "90";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        const opacity = isDimmed && !connectedToFocus ? "50" : "DD";
        ctx.fillStyle = color + opacity;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      ctx.restore();

      // ─── Labels ───
      const denseGraph = nodes.length > 22;
      const shouldShowLabel =
        isSelected ||
        isHovered ||
        node.type === "expert" ||
        (!denseGraph && node.type === "company") ||
        (scale > 1.35 && (node.type === "company" || node.type === "industry"));

      if (!shouldShowLabel) continue;

      ctx.save();
      const labelY = node.y + r + 11;
      const fontSize = isFocused ? 11 : 9.5;
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";

      const maxLength = isFocused ? 24 : 16;
      const labelText = node.label.length > maxLength ? node.label.slice(0, maxLength - 1) + "…" : node.label;
      const textWidth = ctx.measureText(labelText).width;

      // Obsidian-style pill label background
      const px = node.x - textWidth / 2 - 6;
      const py = labelY - 8;
      const pw = textWidth + 12;
      const ph = 14;
      const pr = 4;

      ctx.fillStyle = "rgba(8, 10, 14, 0.92)";
      ctx.strokeStyle = color + (isFocused ? "70" : "30");
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(px + pr, py);
      ctx.lineTo(px + pw - pr, py);
      ctx.quadraticCurveTo(px + pw, py, px + pw, py + pr);
      ctx.lineTo(px + pw, py + ph - pr);
      ctx.quadraticCurveTo(px + pw, py + ph, px + pw - pr, py + ph);
      ctx.lineTo(px + pr, py + ph);
      ctx.quadraticCurveTo(px, py + ph, px, py + ph - pr);
      ctx.lineTo(px, py + pr);
      ctx.quadraticCurveTo(px, py, px + pr, py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isFocused ? "#F8FAFC" : "#A1A1AA";
      ctx.fillText(labelText, node.x, labelY + 2.5);
      ctx.restore();

      // Dashed orbit ring for selected
      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = color + "30";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }, [dimensions, selectedId]);

  const settledRef = useRef(true);

  // Main simulation
  useEffect(() => {
    simRef.current = computeForceLayout(filteredNodes, filteredEdges, dimensions.width, dimensions.height, selectedId);

    if (selectedId && simRef.current.nodeMap.has(selectedId)) {
      const center = simRef.current.nodeMap.get(selectedId)!;
      center.x = dimensions.width / 2;
      center.y = dimensions.height / 2;
      center.pinned = true;
    }

    alphaRef.current = 1;
    settledRef.current = false;

    const iterate = () => {
      if (!settledRef.current) setIsSettled(false);
      const { nodes, links } = simRef.current;
      const alpha = alphaRef.current;

      if (alpha < ALPHA_MIN) {
        if (!settledRef.current) {
          settledRef.current = true;
          setIsSettled(true);
        }
        renderCanvas();
        return;
      }

      stepForceSimulation(nodes, links, dimensions.width, dimensions.height, alpha);

      alphaRef.current = alpha * (1 - ALPHA_DECAY);
      renderCanvas();
      animRef.current = requestAnimationFrame(iterate);
    };

    animRef.current = requestAnimationFrame(iterate);
    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [filteredNodes, filteredEdges, dimensions, selectedId, renderCanvas]);

  // Idle animation for flow dots
  useEffect(() => {
    if (!settledRef.current) return;
    let running = true;
    const animateFlow = () => {
      if (!running) return;
      renderCanvas();
      animRef.current = requestAnimationFrame(animateFlow);
    };
    animRef.current = requestAnimationFrame(animateFlow);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [isSettled, renderCanvas]);

  const getNodeAt = useCallback(
    (x: number, y: number): ForceNode | null => {
      const { nodes } = simRef.current;
      const { x: tx, y: ty, scale } = transformRef.current;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const sx = n.x * scale + tx;
        const sy = n.y * scale + ty;
        const sr = n.radius * scale * 1.4; // Bigger hit target
        if (Math.abs(x - sx) < sr && Math.abs(y - sy) < sr) return n;
      }
      return null;
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const node = getNodeAt(mx, my);
      if (node) {
        dragRef.current = { nodeId: node.id };
      } else {
        isDraggingCanvas.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [getNodeAt],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const node = getNodeAt(mx, my);
      const newHoveredId = node?.id || null;

      if (hoveredRef.current !== newHoveredId) {
        hoveredRef.current = newHoveredId;
        if (node) {
          setTooltipNode(node);
          setTooltipPos({ x: mx, y: my });
        } else {
          setTooltipNode(null);
        }
        renderCanvas();
      }

      // Update tooltip position while hovering
      if (node && hoveredRef.current === node.id) {
        setTooltipPos({ x: mx, y: my });
      }

      if (dragRef.current.nodeId) {
        const { x: tx, y: ty, scale } = transformRef.current;
        const dragged = simRef.current.nodeMap.get(dragRef.current.nodeId);
        if (dragged) {
          dragged.x = (mx - tx) / scale;
          dragged.y = (my - ty) / scale;
          dragged.pinned = true;
          dragged.vx = 0;
          dragged.vy = 0;
          alphaRef.current = Math.max(alphaRef.current, 0.15);
          if (settledRef.current) {
            settledRef.current = false;
            setIsSettled(false);
            const reheat = () => {
              if (alphaRef.current < ALPHA_MIN) {
                settledRef.current = true;
                setIsSettled(true);
                renderCanvas();
                return;
              }
              const { nodes: ns, links: lk } = simRef.current;
              const a = alphaRef.current;
              stepForceSimulation(ns, lk, dimensions.width, dimensions.height, a);
              alphaRef.current = a * (1 - ALPHA_DECAY);
              renderCanvas();
              animRef.current = requestAnimationFrame(reheat);
            };
            animRef.current = requestAnimationFrame(reheat);
          }
        }
        return;
      }

      if (isDraggingCanvas.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        transformRef.current.x += dx;
        transformRef.current.y += dy;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        renderCanvas();
      }
    },
    [getNodeAt, dimensions, renderCanvas],
  );

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.nodeId) {
      const node = simRef.current.nodeMap.get(dragRef.current.nodeId);
      if (node) node.pinned = true;
    }
    dragRef.current = { nodeId: null };
    isDraggingCanvas.current = false;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const node = getNodeAt(mx, my);
      if (node) {
        transformRef.current = {
          x: dimensions.width / 2 - node.x * 1.5,
          y: dimensions.height / 2 - node.y * 1.5,
          scale: 1.5,
        };
      } else {
        transformRef.current = { x: 0, y: 0, scale: 1 };
      }
      renderCanvas();
    },
    [getNodeAt, dimensions, renderCanvas],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.min(5, Math.max(0.15, transformRef.current.scale * factor));

      transformRef.current.x = mx - (mx - transformRef.current.x) * (newScale / transformRef.current.scale);
      transformRef.current.y = my - (my - transformRef.current.y) * (newScale / transformRef.current.scale);
      transformRef.current.scale = newScale;
      renderCanvas();
    };

    canvas.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheelNative);
  }, [renderCanvas]);

  const handleResetView = useCallback(() => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
    renderCanvas();
  }, [renderCanvas]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((v) => !v);
  }, []);

  if (!data || !data.nodes || !data.nodes.length) return null;

  // Get connected node names for tooltip
  const getConnectedNames = (nodeId: string) => {
    const { links, nodeMap } = simRef.current;
    const connected: string[] = [];
    for (const link of links) {
      if (link.sourceNode.id === nodeId) {
        const n = nodeMap.get(link.targetNode.id);
        if (n) connected.push(n.label);
      } else if (link.targetNode.id === nodeId) {
        const n = nodeMap.get(link.sourceNode.id);
        if (n) connected.push(n.label);
      }
    }
    return connected.slice(0, 5);
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-500",
        isFullscreen ? "fixed inset-4 z-50 bg-zinc-900 border border-zinc-800 rounded-xl" : "",
        !isFullscreen && !hideHeader ? "rounded-xl border border-zinc-800 bg-zinc-900/80 glass-card h-full" : "",
        !isFullscreen && hideHeader ? "bg-transparent border-0 w-full h-full" : "",
      )}
      id="knowledge-graph"
    >
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0 bg-zinc-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Network className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">Knowledge Graph</div>
              <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                {data.nodes.length} nodes · {data.edges.length} edges
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleResetView}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
              title="Reset view"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        Interactive expert network graph containing {data.nodes.length} nodes and {data.edges.length} edges.
        {selectedId ? `Currently highlighting connections for expert ${selectedId}.` : "Displaying entire query discovery graph."}
      </div>

      <div
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        ref={containerRef}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { handleMouseUp(); setTooltipNode(null); hoveredRef.current = null; renderCanvas(); }}
          onDoubleClick={handleDoubleClick}
        />

        {/* Obsidian-style hover tooltip */}
        {tooltipNode && (
          <div
            className="absolute z-30 pointer-events-none animate-fade-in"
            style={{
              left: Math.min(tooltipPos.x + 14, dimensions.width - 200),
              top: Math.max(tooltipPos.y - 10, 8),
            }}
          >
            <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 backdrop-blur-md px-3 py-2 shadow-2xl shadow-black/40 max-w-[200px]">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                  style={{ backgroundColor: NODE_COLORS[tooltipNode.type] || "#71717A", color: NODE_COLORS[tooltipNode.type] || "#71717A" }}
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{tooltipNode.type}</span>
              </div>
              <div className="text-xs font-bold text-zinc-100 truncate">{tooltipNode.label}</div>
              {tooltipNode.degree > 0 && (
                <div className="text-[10px] text-zinc-500 mt-1">{tooltipNode.degree} connections</div>
              )}
              {tooltipNode.degree > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-zinc-800 flex flex-wrap gap-1">
                  {getConnectedNames(tooltipNode.id).map((name) => (
                    <span key={name} className="text-[9px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 truncate max-w-[90px]">{name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls hint */}
        <div className="absolute right-2 top-2 rounded-md border border-zinc-800/50 bg-zinc-950/60 px-2 py-0.5 text-[8px] font-semibold text-zinc-600 backdrop-blur-md select-none">
          Drag · Scroll
        </div>
      </div>

      {/* Legend bar */}
      <div className="shrink-0 border-t border-zinc-800/70 bg-zinc-950/95 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
            {typeCounts.map((item) => (
              <div key={item.type} className="flex min-w-0 items-center gap-1 rounded-md border border-zinc-800/80 bg-zinc-900/60 px-1.5 py-0.5">
                <span className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: item.color, color: item.color }} />
                <span className="truncate text-[8px] font-bold uppercase text-zinc-400">{item.label}</span>
                <span className="text-[8px] font-black text-zinc-200">{item.count}</span>
              </div>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[8px] font-bold uppercase text-zinc-500">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isSettled ? "bg-emerald-400" : "bg-amber-400 animate-pulse",
              )}
            />
            {isSettled ? "Ready" : "Sim"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(KnowledgeGraphViz);
