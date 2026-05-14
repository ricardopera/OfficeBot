import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminalStore } from '../../stores/terminalStore';
import { Plus, X, ChevronDown } from 'lucide-react';

export function TerminalPanel() {
  const { t } = useTranslation();
  const { sessions, activeTerminalId, isVisible, addSession, removeSession, setActiveTerminal, toggleVisible } =
    useTerminalStore();

  const handleNewTerminal = async () => {
    const session = await window.electronAPI.createTerminal();
    addSession(session);
  };

  const handleCloseTerminal = async (id: string) => {
    await window.electronAPI.closeTerminal(id);
    removeSession(id);
  };

  if (!isVisible) {
    return (
      <div
        className="flex items-center justify-between px-3 py-1 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer"
        onClick={toggleVisible}
      >
        <span className="text-xs text-gray-500">{t('terminal.title')}</span>
        <ChevronDown size={14} className="text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col border-t border-gray-200 dark:border-gray-700" style={{ height: 240 }}>
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => setActiveTerminal(s.id)}
            className={`flex items-center gap-1 px-3 py-1 text-xs cursor-pointer border-r border-gray-200 dark:border-gray-700 ${
              s.id === activeTerminalId ? 'bg-white dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {s.title}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseTerminal(s.id);
              }}
              className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button
          onClick={handleNewTerminal}
          className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          title={t('terminal.newTerminal')}
        >
          <Plus size={14} />
        </button>
        <div className="flex-1" />
        <button onClick={toggleVisible} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden bg-black">
        {activeTerminalId ? (
          <TerminalInstance id={activeTerminalId} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <button onClick={handleNewTerminal} className="flex items-center gap-2 hover:text-white">
              <Plus size={16} />
              {t('terminal.newTerminal')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TerminalInstance({ id }: { id: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cleanup: (() => void) | undefined;

    const init = async () => {
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');
      await import('@xterm/xterm/css/xterm.css');

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        theme: {
          background: '#000000',
          foreground: '#cccccc',
        },
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(containerRef.current!);
      fitAddon.fit();

      terminalRef.current = terminal;

      terminal.onData((data) => {
        window.electronAPI.sendTerminalInput(id, data);
      });

      const observer = new ResizeObserver(() => fitAddon.fit());
      observer.observe(containerRef.current!);

      const unsubOutput = window.electronAPI.onTerminalOutput(({ id: tid, data }) => {
        if (tid === id) terminal.write(data);
      });

      cleanup = () => {
        observer.disconnect();
        unsubOutput();
        terminal.dispose();
      };
    };

    init().catch(console.error);

    return () => cleanup?.();
  }, [id]);

  return <div ref={containerRef} className="h-full" />;
}
