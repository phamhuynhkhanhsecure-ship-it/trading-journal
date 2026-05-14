import { useState, useCallback, useRef, useEffect } from 'react';

interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.15;

export function useImageZoom() {
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, translateX: 0, translateY: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lastTranslate = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const resetZoom = useCallback(() => {
    setZoom({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(prev => ({
      ...prev,
      scale: Math.min(prev.scale + ZOOM_STEP, MAX_SCALE),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const newScale = Math.max(prev.scale - ZOOM_STEP, MIN_SCALE);
      // If going back to 1 or less, reset translate too
      if (newScale <= 1) {
        return { scale: newScale, translateX: 0, translateY: 0 };
      }
      return { ...prev, scale: newScale };
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => {
      const newScale = Math.max(MIN_SCALE, Math.min(prev.scale + delta, MAX_SCALE));

      if (newScale <= 1) {
        return { scale: newScale, translateX: 0, translateY: 0 };
      }

      // Zoom towards cursor position
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;

        const scaleFactor = newScale / prev.scale;
        const newTranslateX = cursorX - scaleFactor * (cursorX - prev.translateX);
        const newTranslateY = cursorY - scaleFactor * (cursorY - prev.translateY);

        return { scale: newScale, translateX: newTranslateX, translateY: newTranslateY };
      }

      return { ...prev, scale: newScale };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom.scale <= 1) return;
    e.preventDefault();
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    lastTranslate.current = { x: zoom.translateX, y: zoom.translateY };
  }, [zoom.scale, zoom.translateX, zoom.translateY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    e.preventDefault();

    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;

    setZoom(prev => ({
      ...prev,
      translateX: lastTranslate.current.x + dx,
      translateY: lastTranslate.current.y + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Pass-through wheel handler for the native event (to attach via ref)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const nativeWheelHandler = (e: WheelEvent) => {
      e.preventDefault();
    };

    el.addEventListener('wheel', nativeWheelHandler, { passive: false });
    return () => el.removeEventListener('wheel', nativeWheelHandler);
  }, []);

  const zoomPercentage = Math.round(zoom.scale * 100);

  const imgStyle: React.CSSProperties = {
    transform: `translate(${zoom.translateX}px, ${zoom.translateY}px) scale(${zoom.scale})`,
    cursor: zoom.scale > 1 ? (isPanning.current ? 'grabbing' : 'grab') : 'default',
    transformOrigin: 'center center',
    transition: isPanning.current ? 'none' : 'transform 0.15s ease-out',
  };

  return {
    containerRef,
    zoom,
    zoomPercentage,
    resetZoom,
    zoomIn,
    zoomOut,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    imgStyle,
    isZoomed: zoom.scale !== 1,
  };
}
