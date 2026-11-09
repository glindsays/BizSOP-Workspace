'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Scan, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const MAX_CANVAS_SIDE = 8000; // batas aman ukuran canvas untuk export PNG

function cleanChart(raw: string) {
  let s = raw.replace(/^\s*```(?:mermaid)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  // "\n" harfiah (ter-escape ganda) tanpa baris baru asli diubah jadi baris baru
  if (!s.includes('\n') && s.includes('\\n')) s = s.replace(/\\n/g, '\n');
  return s;
}

function download(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

export function MermaidVisualizer({ chart, fileName = 'flowchart' }: { chart: string; fileName?: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [expanded, setExpanded] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Render mermaid (di-import dinamis supaya aman dari SSR)
  useEffect(() => {
    let cancelled = false;
    const id = `mmd-${Math.random().toString(36).slice(2, 9)}`;

    (async () => {
      setRendering(true);
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            primaryColor: '#eef2ff',
            primaryBorderColor: '#6366f1',
            primaryTextColor: '#1e293b',
            lineColor: '#64748b',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          },
          // SVG murni (tanpa foreignObject) agar export PNG tidak gagal
          flowchart: { htmlLabels: false, useMaxWidth: false },
        });
        const { svg } = await mermaid.render(id, cleanChart(chart));
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      } catch (e) {
        document.getElementById(`d${id}`)?.remove();
        if (!cancelled) {
          setSvg('');
          setError(e instanceof Error ? e.message : 'Sintaks Mermaid tidak valid.');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart]);

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    const el = innerRef.current?.querySelector('svg');
    if (!vp || !el) return;
    const vb = el.viewBox.baseVal;
    if (!vb || !vb.width || !vb.height) return setView({ x: 0, y: 0, scale: 1 });
    const scale = Math.min((vp.clientWidth - 48) / vb.width, (vp.clientHeight - 48) / vb.height, 1.5);
    setView({ x: 0, y: 0, scale: Math.max(MIN_SCALE, scale) });
  }, []);

  // Fit otomatis setelah SVG masuk / mode fullscreen berubah
  useEffect(() => {
    if (svg) requestAnimationFrame(fit);
  }, [svg, expanded, fit]);

  const zoom = useCallback((factor: number) => {
    setView((v) => ({ ...v, scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor)) }));
  }, []);

  // Scroll untuk zoom (listener non-passive agar bisa preventDefault)
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoom, svg]);

  // Layar penuh: Esc untuk keluar, scroll halaman dikunci
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExpanded(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [expanded]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: view.x, oy: view.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = drag.current;
    setView((v) => ({ ...v, x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  // Siapkan SVG dengan ukuran eksplisit untuk export
  const prepareSvg = () => {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const el = doc.documentElement;
    const vb = (el.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    const w = vb[2] || 800;
    const h = vb[3] || 600;
    el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    el.setAttribute('width', String(w));
    el.setAttribute('height', String(h));
    return { text: new XMLSerializer().serializeToString(el), w, h };
  };

  const exportSvg = () => {
    setExportError(null);
    const { text } = prepareSvg();
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    download(url, `${fileName}.svg`);
    URL.revokeObjectURL(url);
  };

  const exportPng = () => {
    setExportError(null);
    const { text, w, h } = prepareSvg();
    // 2x untuk ketajaman, tapi dibatasi agar diagram besar tidak melewati batas canvas browser
    const ratio = Math.min(2, MAX_CANVAS_SIDE / Math.max(w, h));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setExportError('Browser tidak dapat membuat gambar PNG. Gunakan export SVG.');
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        download(canvas.toDataURL('image/png'), `${fileName}.png`);
      } catch {
        setExportError('Gagal membuat PNG. Gunakan export SVG.');
      }
    };
    img.onerror = () => setExportError('Gagal membuat PNG. Gunakan export SVG.');
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
        <p className="text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          Diagram tidak dapat dirender (sintaks dari AI tidak valid). Coba generate ulang.
        </p>
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer">Detail teknis</summary>
          <pre className="mt-2 whitespace-pre-wrap overflow-x-auto">{error}</pre>
          <pre className="mt-2 whitespace-pre-wrap overflow-x-auto bg-white border rounded p-2">{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-white overflow-hidden flex flex-col',
        expanded ? 'fixed inset-0 z-50 rounded-none' : 'h-[560px]'
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b bg-slate-50 px-2 py-1.5">
        <Button size="icon" variant="ghost" onClick={() => zoom(1.2)} title="Perbesar">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => zoom(1 / 1.2)} title="Perkecil">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={fit} title="Sesuaikan layar">
          <Scan className="w-4 h-4" />
        </Button>
        <span className="text-xs text-slate-500 w-12 text-center">{Math.round(view.scale * 100)}%</span>
        {exportError && <span className="ml-2 truncate text-xs text-red-600">{exportError}</span>}
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={exportSvg} disabled={!svg}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> SVG
          </Button>
          <Button size="sm" variant="ghost" onClick={exportPng} disabled={!svg}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> PNG
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setExpanded((v) => !v)} title="Layar penuh">
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Viewport */}
      <div
        ref={viewportRef}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing touch-none bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {rendering && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Merender diagram...
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={innerRef}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      </div>
    </div>
  );
}