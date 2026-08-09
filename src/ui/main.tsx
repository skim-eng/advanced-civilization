import { Component, StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { UpdateBanner } from 'digital-boardgame-framework/client';
import App from './App.js';
import { Lobby, OnlineGame } from './online.js';
import DevApp from './dev/DevApp.js';
import { exchangeInvitation } from '../client/api.js';

/** Catches render/runtime crashes so the app shows a recoverable message (with a
 *  one-click report) instead of a blank screen. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#eee', padding: 24, textAlign: 'center' }}>
        <h2 style={{ margin: 0, color: '#ffd23f' }}>Something went wrong</h2>
        <p style={{ maxWidth: 520, color: '#ccc' }}>The game hit an error and stopped. No diagnostic data was sent. You can reload to continue; recent online moves are saved.</p>
        <code style={{ fontSize: 12, color: '#f88', maxWidth: 600, overflow: 'auto' }}>{this.state.error.message}</code>
        <button className="civ-btn" style={{ fontSize: 16, padding: '10px 18px' }} onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}

function Root() {
  const params = new URLSearchParams(location.search);
  const game = params.get('game');
  const invite = new URLSearchParams(location.hash.replace(/^#/, '')).get('invite');

  // Dev authoring tools (territory polygons, categories, adjacency). Local only.
  if (params.has('dev')) return <DevApp />;

  const [mode, setMode] = useState<'menu' | 'hotseat' | 'online'>('menu');
  let body: React.ReactNode;
  if (game) body = <InviteRoute gameId={game} invite={invite} />;
  else if (mode === 'hotseat') body = <App />;
  else if (mode === 'online') body = <Lobby />;
  else body = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#eee' }}>
      <h1 style={{ margin: 0 }}>Advanced Civilization</h1>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="civ-btn" style={{ fontSize: 16, padding: '10px 18px' }} onClick={() => setMode('hotseat')}>Local hotseat + AI</button>
        <button className="civ-btn" style={{ fontSize: 16, padding: '10px 18px' }} onClick={() => setMode('online')}>Online multiplayer</button>
      </div>
      <p className="civ-lbl" style={{ color: '#aaa', maxWidth: 560, textAlign: 'center' }}>
        Hotseat runs entirely in your browser and auto-saves on this device — an interrupted game can be resumed from its setup screen.
        Online multiplayer creates a shareable game with a link per seat; online games (including vs AI) live on the server, so you can
        close the tab and pick them up any time, from any device.
      </p>
    </div>
  );
  return body;
}

function InviteRoute({ gameId, invite }: { gameId: string; invite: string | null }) {
  const [ready, setReady] = useState(!invite);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!invite) return;
    let live = true;
    void exchangeInvitation('', gameId, invite)
      .then(() => {
        if (!live) return;
        history.replaceState(null, '', `${location.pathname}?game=${encodeURIComponent(gameId)}`);
        setReady(true);
      })
      .catch(() => { if (live) setError('This invitation is invalid or no longer available.'); });
    return () => { live = false; };
  }, [gameId, invite]);
  if (error) return <div style={{ color: '#eee', padding: 24 }}>This invitation is invalid or no longer available.</div>;
  if (!ready) return <div style={{ color: '#eee', padding: 24 }}>Opening invitation…</div>;
  return <OnlineGame gameId={gameId} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Shows a "A new version is available — Reload" banner when a newer build
        is deployed while this tab is open (polls /version.json). */}
    <UpdateBanner currentBuild={__DBF_BUILD_ID__} />
    <ErrorBoundary><Root /></ErrorBoundary>
  </StrictMode>,
);
