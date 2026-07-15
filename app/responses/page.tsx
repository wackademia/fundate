'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const PASSCODE = 'ourdate26';

type Row = { id: string; date: string; time: string; activity: string; created_at: string };

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function ResponsesPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) { setErr('Could not load responses.'); return; }
    setRows(data as Row[]);
  }

  useEffect(() => {
    if (unlocked) load();
  }, [unlocked]);

  if (!unlocked) {
    return (
      <div id="root-wrap">
        <div className="card">
          <div className="emoji">🔒</div>
          <h1>Responses</h1>
          <p className="subtitle">Enter the passcode to view</p>
          <input
            className="passcode-input"
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && input === PASSCODE) setUnlocked(true); }}
            placeholder="Passcode"
          />
          <button className="btn-primary" onClick={() => { if (input === PASSCODE) setUnlocked(true); }}>
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="root-wrap">
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="emoji">💌</div>
        <h1>Responses</h1>
        <p className="subtitle">{rows.length} submitted</p>
        <div className="btn-row" style={{ marginTop: 0, marginBottom: 18 }}>
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {err && <div className="error-text">{err}</div>}
        <div className="resp-list">
          {rows.map((r) => (
            <div className="resp-card" key={r.id}>
              <div className="resp-date">
                {new Date(r.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {' · '}{formatTime(r.time)}
              </div>
              <div className="resp-meta">Submitted {new Date(r.created_at).toLocaleString()}</div>
              <div className="resp-activity">{r.activity}</div>
            </div>
          ))}
          {rows.length === 0 && !loading && <p className="subtitle">No responses yet.</p>}
        </div>
      </div>
    </div>
  );
}
