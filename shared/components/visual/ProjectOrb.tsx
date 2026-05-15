"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrbItem = {
  label: string;
  bg: string;
  border: string;
  text: string;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const ITEMS: OrbItem[] = [
  { label: "AI Minutes",   bg: "#2563EB", border: "rgba(255,255,255,0.25)", text: "#ffffff" },
  { label: "Live Record",  bg: "#EFF6FF", border: "#BFDBFE",                text: "#1D4ED8" },
  { label: "Transcribe",   bg: "#2563EB", border: "rgba(255,255,255,0.25)", text: "#ffffff" },
  { label: "Speaker ID",   bg: "#EFF6FF", border: "#BFDBFE",                text: "#1D4ED8" },
  { label: "Action Items", bg: "#1D4ED8", border: "rgba(255,255,255,0.25)", text: "#ffffff" },
  { label: "Draft Review", bg: "#DBEAFE", border: "#BFDBFE",                text: "#1E40AF" },
  { label: "Participants", bg: "#EFF6FF", border: "#BFDBFE",                text: "#1D4ED8" },
  { label: "Timestamps",   bg: "#DBEAFE", border: "#BFDBFE",                text: "#1E40AF" },
  { label: "Export PDF",   bg: "#2563EB", border: "rgba(255,255,255,0.25)", text: "#ffffff" },
  { label: "Meeting Hub",  bg: "#EFF6FF", border: "#BFDBFE",                text: "#1D4ED8" },
  { label: "Summaries",    bg: "#1D4ED8", border: "rgba(255,255,255,0.25)", text: "#ffffff" },
  { label: "Share Notes",  bg: "#DBEAFE", border: "#BFDBFE",                text: "#1E40AF" },
  { label: "Smart Tags",   bg: "#EFF6FF", border: "#BFDBFE",                text: "#1D4ED8" },
  { label: "Vote & Sign",  bg: "#2563EB", border: "rgba(255,255,255,0.25)", text: "#ffffff" },
  { label: "Follow-ups",   bg: "#DBEAFE", border: "#BFDBFE",                text: "#1E40AF" },
  { label: "Highlights",   bg: "#EFF6FF", border: "#BFDBFE",                text: "#1D4ED8" },
  { label: "Audio Upload", bg: "#1D4ED8", border: "rgba(255,255,255,0.25)", text: "#ffffff" },
  { label: "Workspace",    bg: "#DBEAFE", border: "#BFDBFE",                text: "#1E40AF" },
  { label: "Agenda AI",    bg: "#2563EB", border: "rgba(255,255,255,0.25)", text: "#ffffff" },
  { label: "Secure Vault", bg: "#F1F5F9", border: "#CBD5E1",                text: "#475569" },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_SIZE = 62;           // diameter of each circular node (px)
const RADIUS   = 148;           // projection radius (px)
const GOLDEN   = Math.PI * (3 - Math.sqrt(5));
const PERSP    = 2.5;           // perspective depth
const AUTO_SPEED   = 0.003;     // auto-rotate speed (rad/frame)
const DRAG_SPEED   = 0.002;     // drag sensitivity
const HOVER_SPEED  = 0.008;     // hover-tilt sensitivity
const SCALE_MIN    = 0.42;
const SCALE_MAX    = 1.30;

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectOrb() {
  const [t,       setT]       = useState(0);
  const [rotX,    setRotX]    = useState(0);
  const [rotY,    setRotY]    = useState(0);
  const [dragging, setDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const last         = useRef({ x: 0, y: 0 });
  const raf          = useRef<number | null>(null);
  const N            = ITEMS.length;

  // Auto-rotation loop
  useEffect(() => {
    const tick = () => {
      setT((prev) => prev + AUTO_SPEED);
      raf.current = window.requestAnimationFrame(tick);
    };
    raf.current = window.requestAnimationFrame(tick);
    return () => {
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
  }, []);

  // Hover-tilt: nudge rotation toward cursor position without clicking
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) return;
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
      const dy = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);
      setRotY((r) => r + dx * HOVER_SPEED);
      setRotX((r) => r + dy * HOVER_SPEED);
    };

    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [dragging]);

  // ── Pointer handlers (click-drag) ─────────────────────────────────────────

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setRotY((r) => r + (e.clientX - last.current.x) * DRAG_SPEED);
    setRotX((r) => r + (e.clientY - last.current.y) * DRAG_SPEED);
    last.current = { x: e.clientX, y: e.clientY };
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex items-center justify-center">
      <div
        ref={containerRef}
        className="relative select-none rounded-full cursor-grab active:cursor-grabbing"
        style={{
          width:      420,
          height:     420,
          background: "#F8FAFF",
          border:     "0.5px solid #DBEAFE",
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setDragging(false)}
        onPointerMove={onPointerMove}
        role="img"
        aria-label="Draftmin features orb"
      >
        {/* Inner decorative ring */}
        <div
          className="absolute inset-10 rounded-full"
          style={{
            border:     "0.5px solid #EFF6FF",
            background: "rgba(255,255,255,0.4)",
          }}
        />

        {/* Nodes */}
        {ITEMS.map((item, i) => {
          // Fibonacci sphere position
          const y0    = 1 - (i / (N - 1)) * 2;
          const r     = Math.sqrt(1 - y0 * y0);
          const theta = GOLDEN * i;
          const x0    = Math.cos(theta) * r;
          const z0    = Math.sin(theta) * r;

          // Rotate around Y axis (auto-spin + drag)
          const ay = t + rotY;
          const x1 =  x0 * Math.cos(ay) - z0 * Math.sin(ay);
          const z1 =  x0 * Math.sin(ay) + z0 * Math.cos(ay);

          // Rotate around X axis (drag + hover-tilt)
          const y2 = y0 * Math.cos(rotX) - z1 * Math.sin(rotX);
          const z2 = y0 * Math.sin(rotX) + z1 * Math.cos(rotX);

          // Perspective projection → scale & opacity
          let scale = PERSP / (PERSP - z2);
          scale = Math.max(SCALE_MIN, Math.min(scale, SCALE_MAX));

          const screenX = x1 * RADIUS;
          const screenY = y2 * RADIUS;
          const opacity = 0.18 + scale * 0.62;
          const zIndex  = Math.round(z2 * 100 + 100);

          return (
            <div
              key={`${item.label}-${i}`}
              style={{
                // Shape
                position:     "absolute",
                width:        NODE_SIZE,
                height:       NODE_SIZE,
                borderRadius: "50%",
                // Colors
                background:   item.bg,
                border:       `1.5px solid ${item.border}`,
                color:        item.text,
                // Typography
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                textAlign:      "center",
                fontSize:       10,
                fontWeight:     500,
                lineHeight:     1.25,
                padding:        6,
                boxSizing:      "border-box",
                // Position — centred, then translated
                left:       "50%",
                top:        "50%",
                marginLeft: -(NODE_SIZE / 2),
                marginTop:  -(NODE_SIZE / 2),
                // 3-D projection
                transform:      `translate(${screenX}px, ${screenY}px) scale(${scale})`,
                opacity,
                zIndex,
                pointerEvents: "none",
              }}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}