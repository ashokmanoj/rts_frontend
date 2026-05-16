import { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { resolveFileUrl } from "../../utils/security";

/**
 * Full-screen image gallery with:
 *   - Prev / next navigation + keyboard ← →
 *   - Mouse-wheel zoom centred on cursor
 *   - Click-and-drag pan
 *   - Double-click to toggle 200% / reset
 *   - Pinch-to-zoom on touch
 *   - Rotate 90° (button or R key)
 *   - Reset button (amber, appears when transformed)
 *   - ESC to close
 *
 * Props:
 *   urls        string[]          — image URLs
 *   fileNames   string[]          — display names (parallel to urls)
 *   startIndex  number            — which image to open first (default 0)
 *   onClose     () => void
 */
export default function GalleryLightbox({ urls, fileNames, startIndex = 0, onClose }) {
  const [idx,      setIdx]      = useState(startIndex);
  const [scale,    setScale]    = useState(1);
  const [offset,   setOffset]   = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Refs that shadow state so non-React handlers always read current values
  const containerRef         = useRef(null);
  const scaleRef             = useRef(1);
  const offsetRef            = useRef({ x: 0, y: 0 });
  const isDraggingRef        = useRef(false);
  const dragStartRef         = useRef({ x: 0, y: 0 });
  const offsetAtDragStartRef = useRef({ x: 0, y: 0 });
  const touchRef             = useRef({ dist: null, midX: 0, midY: 0, scale: 1, offset: { x: 0, y: 0 } });

  scaleRef.current  = scale;
  offsetRef.current = offset;

  const src      = urls[idx];
  const fileName = fileNames?.[idx] || `Image ${idx + 1}`;
  const total    = urls.length;

  const clamp = (s) => Math.min(5, Math.max(0.1, s));

  const reset = useCallback(() => {
    setScale(1); setOffset({ x: 0, y: 0 }); setRotation(0);
  }, []);

  useEffect(() => { reset(); }, [idx, reset]);

  // Cursor-centred zoom
  const applyZoom = useCallback((delta, cx = 0, cy = 0) => {
    setScale(prev => {
      const next = clamp(parseFloat((prev + delta).toFixed(3)));
      if (next === prev) return prev;
      const ratio = next / prev;
      setOffset(off => ({
        x: cx + (off.x - cx) * ratio,
        y: cy + (off.y - cy) * ratio,
      }));
      return next;
    });
  }, []);

  // Keyboard
  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowLeft")          setIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight")         setIdx(i => Math.min(total - 1, i + 1));
      if (e.key === "Escape")             onClose();
      if (e.key === "+" || e.key === "=") applyZoom(0.25);
      if (e.key === "-")                  applyZoom(-0.25);
      if (e.key === "r" || e.key === "R") setRotation(r => (r + 90) % 360);
      if (e.key === "0")                  reset();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [total, onClose, applyZoom, reset]);

  // Mouse wheel — cursor-centred zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = (e) => {
      e.preventDefault();
      const r    = el.getBoundingClientRect();
      const cx   = e.clientX - r.left  - r.width  / 2;
      const cy   = e.clientY - r.top   - r.height / 2;
      const step = Math.abs(e.deltaY) < 50 ? 0.08 : 0.2;
      applyZoom(e.deltaY < 0 ? step : -step, cx, cy);
    };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, [applyZoom]);

  // Global mouse listeners for smooth drag (stays active even if cursor leaves container)
  useEffect(() => {
    const onMove = (e) => {
      if (!isDraggingRef.current) return;
      setOffset({
        x: offsetAtDragStartRef.current.x + (e.clientX - dragStartRef.current.x),
        y: offsetAtDragStartRef.current.y + (e.clientY - dragStartRef.current.y),
      });
    };
    const onUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  const onContainerMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDraggingRef.current        = true;
    setDragging(true);
    dragStartRef.current         = { x: e.clientX, y: e.clientY };
    offsetAtDragStartRef.current = { ...offsetRef.current };
  };

  // Double-click: zoom 2× at cursor, or reset if already transformed
  const onDblClick = (e) => {
    e.stopPropagation();
    if (scaleRef.current !== 1 || offsetRef.current.x !== 0 || offsetRef.current.y !== 0) {
      reset();
    } else {
      const r = containerRef.current?.getBoundingClientRect();
      applyZoom(1, r ? e.clientX - r.left - r.width / 2 : 0, r ? e.clientY - r.top - r.height / 2 : 0);
    }
  };

  // Touch: pinch-to-zoom + single-finger pan
  const touchDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const r = containerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };
      touchRef.current = {
        dist:   touchDist(e.touches),
        midX:   (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left - r.width  / 2,
        midY:   (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top  - r.height / 2,
        scale:  scaleRef.current,
        offset: { ...offsetRef.current },
      };
    } else if (e.touches.length === 1) {
      isDraggingRef.current        = true;
      dragStartRef.current         = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      offsetAtDragStartRef.current = { ...offsetRef.current };
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 2 && touchRef.current.dist) {
      e.preventDefault();
      const ratio    = touchDist(e.touches) / touchRef.current.dist;
      const newScale = clamp(touchRef.current.scale * ratio);
      const sr       = newScale / touchRef.current.scale;
      const { midX, midY, offset: o } = touchRef.current;
      setScale(newScale);
      setOffset({ x: midX + (o.x - midX) * sr, y: midY + (o.y - midY) * sr });
    } else if (e.touches.length === 1 && isDraggingRef.current) {
      setOffset({
        x: offsetAtDragStartRef.current.x + (e.touches[0].clientX - dragStartRef.current.x),
        y: offsetAtDragStartRef.current.y + (e.touches[0].clientY - dragStartRef.current.y),
      });
    }
  };

  const onTouchEnd = () => { isDraggingRef.current = false; touchRef.current.dist = null; };

  const isTransformed = scale !== 1 || offset.x !== 0 || offset.y !== 0;
  const cursor = dragging ? "grabbing" : isTransformed ? "grab" : "zoom-in";

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col select-none">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 z-10">
        <span className="text-white text-sm font-bold truncate max-w-[35%]">{fileName}</span>
        <div className="flex items-center gap-1.5">
          {total > 1 && (
            <span className="text-white/50 text-xs font-bold bg-white/10 px-2 py-0.5 rounded-full mr-1">
              {idx + 1} / {total}
            </span>
          )}
          <button onClick={() => applyZoom(-0.25)} disabled={scale <= 0.1}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-30" title="Zoom out (−)">
            <ZoomOut size={15} />
          </button>
          <span className="text-white/70 text-[11px] font-black w-10 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={() => applyZoom(0.25)} disabled={scale >= 5}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors disabled:opacity-30" title="Zoom in (+)">
            <ZoomIn size={15} />
          </button>
          <button onClick={() => setRotation(r => (r + 90) % 360)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" title="Rotate 90° (R)">
            <RotateCw size={15} />
          </button>
          {isTransformed && (
            <button onClick={reset}
              className="p-2 bg-amber-500/80 hover:bg-amber-500 rounded-full text-white transition-colors" title="Reset view (0)">
              <Maximize2 size={15} />
            </button>
          )}
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500 rounded-full text-white transition-colors ml-1">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Image area ── */}
      <div
        ref={containerRef}
        className="flex-1 relative min-h-0 overflow-hidden"
        style={{ cursor }}
        onMouseDown={onContainerMouseDown}
        onDoubleClick={onDblClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={!isTransformed && !dragging ? onClose : undefined}
      >
        {/* Centred image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src={resolveFileUrl(src)}
            alt={fileName}
            draggable={false}
            className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
            style={{
              transform:  `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: dragging ? "none" : "transform 0.12s ease-out",
              userSelect: "none",
            }}
          />
        </div>

        {/* Prev arrow */}
        {idx > 0 && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white transition-all z-10 active:scale-90"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Next arrow */}
        {idx < total - 1 && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white transition-all z-10 active:scale-90"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {total > 1 && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-4 py-3 overflow-x-auto justify-center"
          onMouseDown={e => e.stopPropagation()}
        >
          {urls.map((url, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === idx ? "border-white scale-110 opacity-100" : "border-transparent opacity-40 hover:opacity-70"
              }`}
            >
              <img src={resolveFileUrl(url)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <p className="text-center text-white/20 text-[10px] pb-2 flex-shrink-0">
        {total > 1
          ? "← → navigate · scroll to zoom · drag to pan · double-click reset · R rotate · ESC close"
          : "scroll to zoom · drag to pan · double-click reset · R rotate · ESC close"}
      </p>
    </div>
  );
}
