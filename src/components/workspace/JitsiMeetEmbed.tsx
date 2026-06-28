import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, ExternalLink, PictureInPicture } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { jitsiMeetUrl } from '../../lib/studyRoomClient';
import { useI18n } from '../../lib/i18n';

type Props = {
  roomName: string;
  lang?: 'en' | 'el';
  className?: string;
};

type Layout = 'inline' | 'float' | 'popup';

const POPUP_FEATURES = 'popup=yes,width=980,height=640,resizable=yes,scrollbars=no,menubar=no,toolbar=no';

/** Jitsi embed with inline, fullscreen, floating, and pop-out window modes. */
export function JitsiMeetEmbed({ roomName, lang: _lang = 'en', className }: Props) {
  const { t } = useI18n();
  const meetUrl = `${jitsiMeetUrl(roomName)}&interfaceConfig.SHOW_JITSI_WATERMARK=false`;
  const [layout, setLayout] = useState<Layout>('inline');
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [floatPos, setFloatPos] = useState({ x: 72, y: 88 });
  const shellRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<Window | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (!popupOpen) return;
    const id = window.setInterval(() => {
      if (popupRef.current?.closed) {
        popupRef.current = null;
        setPopupOpen(false);
        if (layout === 'popup') setLayout('inline');
      }
    }, 600);
    return () => window.clearInterval(id);
  }, [popupOpen, layout]);

  const toggleFullscreen = useCallback(async () => {
    const el = layout === 'float' ? floatRef.current : shellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* browser may block without gesture */
    }
  }, [layout]);

  const openPopup = useCallback(() => {
    const name = `synapse-jitsi-${roomName.replace(/[^a-z0-9-]/gi, '-')}`;
    const existing = popupRef.current;
    if (existing && !existing.closed) {
      existing.focus();
      setPopupOpen(true);
      setLayout('popup');
      return;
    }
    const w = window.open(meetUrl, name, POPUP_FEATURES);
    if (!w) {
      setPopupBlocked(true);
      return;
    }
    setPopupBlocked(false);
    popupRef.current = w;
    setPopupOpen(true);
    setLayout('popup');
  }, [meetUrl, roomName]);

  const focusPopup = () => popupRef.current?.focus();

  const returnInline = () => {
    popupRef.current?.close();
    popupRef.current = null;
    setPopupOpen(false);
    setLayout('inline');
  };

  const toggleFloat = () => {
    if (layout === 'float') setLayout('inline');
    else setLayout('float');
  };

  const onDragStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: floatPos.x, origY: floatPos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setFloatPos({
      x: Math.max(8, dragRef.current.origX + dx),
      y: Math.max(8, dragRef.current.origY + dy),
    });
  };

  const onDragEnd = () => {
    dragRef.current = null;
  };

  const toolbar = (
    <div className="ws-jitsi-toolbar" role="toolbar" aria-label={t('jitsiVideoControls')}>
      <button type="button" className="ws-jitsi-tool-btn" onClick={() => void toggleFullscreen()} title={t('jitsiFullscreen')}>
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{t('jitsiFullShort')}</span>
      </button>
      <button type="button" className="ws-jitsi-tool-btn" onClick={openPopup} title={t('jitsiPopOutWindow')}>
        <ExternalLink className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('jitsiPopUp')}</span>
      </button>
      <button
        type="button"
        className={cn('ws-jitsi-tool-btn', layout === 'float' && 'ws-jitsi-tool-btn-active')}
        onClick={toggleFloat}
        title={t('jitsiFloatingPanel')}
      >
        <PictureInPicture className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('jitsiFloat')}</span>
      </button>
    </div>
  );

  const iframe = (frameClass?: string) => (
    <iframe
      title={t('jitsiGroupVideoCall')}
      src={layout === 'popup' ? undefined : meetUrl}
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      className={cn('w-full flex-1 min-h-[10rem] border-0 bg-surface-primary', frameClass)}
    />
  );

  if (layout === 'popup' && popupOpen) {
    return (
      <div className={cn('ws-jitsi-inline', className)} data-ws-theme="warm" data-testid="jitsi-meet-embed">
        {toolbar}
        <div className="ws-jitsi-popup-hint mt-2 rounded-lg border border-border-subtle bg-surface-card px-3 py-2 text-xs text-text-secondary">
          {t('jitsiVideoSeparateWindow')}
          {' '}
          <button type="button" className="ws-link-action" onClick={focusPopup}>
            {t('jitsiFocusWindow')}
          </button>
          {' · '}
          <button type="button" className="ws-link-action" onClick={returnInline}>
            {t('jitsiReturnHere')}
          </button>
        </div>
      </div>
    );
  }

  const floatPanel = layout === 'float' && (
    <div
      ref={floatRef}
      className="ws-jitsi-float"
      data-ws-theme="warm"
      style={{ left: floatPos.x, top: floatPos.y }}
      data-testid="jitsi-meet-float"
    >
      <div
        className="ws-jitsi-float-header"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <span className="text-[11px] font-semibold truncate">{t('jitsiVideoCall')}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" className="ws-jitsi-tool-btn p-1" onClick={() => void toggleFullscreen()} aria-label={t('jitsiFullscreen')}>
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className="ws-jitsi-tool-btn p-1" onClick={() => setLayout('inline')} aria-label={t('jitsiCloseFloat')}>
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="ws-jitsi-float-body">{iframe()}</div>
    </div>
  );

  return (
    <>
      <div
        ref={shellRef}
        className={cn('ws-jitsi-inline', className)}
        data-ws-theme="warm"
        data-testid="jitsi-meet-embed"
      >
        {toolbar}
        {popupBlocked && (
          <p className="mt-1.5 text-[10px] text-semantic-danger">
            {t('jitsiPopupBlocked')}
          </p>
        )}
        {layout !== 'float' && (
          <div className="mt-1.5 overflow-hidden rounded-lg border border-border-subtle h-48 sm:h-56">
            {iframe('h-full w-full')}
          </div>
        )}
        {layout === 'float' && (
          <p className="mt-2 text-[10px] text-text-muted">
            {t('jitsiFloatingPanelHint')}
          </p>
        )}
      </div>
      {typeof document !== 'undefined' && floatPanel ? createPortal(floatPanel, document.body) : null}
    </>
  );
}
