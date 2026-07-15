'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

type Step = 'ask' | 'date' | 'time' | 'activity' | 'done';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function buildTimeSlots() {
  const slots: string[] = [];
  for (let h = 9; h <= 21; h++) {
    for (const m of [0, 30]) {
      if (h === 21 && m === 30) continue;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();
const ACTIVITY_CHIPS = ['Dinner 🍝', 'Movie 🎬', 'Coffee ☕', 'Walk in the park 🌳', 'Surprise me ✨'];

function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<any[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    function resize() {
      canvas!.width = window.innerWidth * devicePixelRatio;
      canvas!.height = window.innerHeight * devicePixelRatio;
      canvas!.style.width = window.innerWidth + 'px';
      canvas!.style.height = window.innerHeight + 'px';
      ctx!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function burst(n = 140) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const colors = ['#ff4d6d', '#ff9a9e', '#ffd166', '#6bcB77', '#4ea8de', '#ffffff'];
    for (let i = 0; i < n; i++) {
      particlesRef.current.push({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 2.4,
        vy: 2 + Math.random() * 3,
        size: 6 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.25,
        shape: Math.random() < 0.5 ? 'rect' : 'circle',
        life: 0,
      });
    }
    requestAnimationFrame(function step() {
      const c = canvasRef.current;
      const cx = c?.getContext('2d');
      if (!c || !cx) return;
      cx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particlesRef.current.forEach((p) => {
        p.vy += 0.02;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life++;
        cx.save();
        cx.translate(p.x, p.y);
        cx.rotate(p.rot);
        cx.fillStyle = p.color;
        cx.globalAlpha = Math.max(0, 1 - p.life / 420);
        if (p.shape === 'rect') cx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else { cx.beginPath(); cx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2); cx.fill(); }
        cx.restore();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.y < window.innerHeight + 40 && p.life < 420);
      if (particlesRef.current.length > 0) requestAnimationFrame(step);
    });
  }

  return { canvasRef, burst };
}

function AskScreen({ onYes, burst }: { onYes: () => void; burst: (n?: number) => void }) {
  const noRef = useRef<HTMLButtonElement | null>(null);
  const yesRef = useRef<HTMLButtonElement | null>(null);
  const [counterText, setCounterText] = useState(' ');
  const dodgesRef = useRef(0);
  const curRef = useRef<{ x: number; y: number } | null>(null);
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const animRef = useRef<number | null>(null);

  const dodgeLines = [
    'Nice try 😏', 'Nope, not today', "You'll have to be quicker than that",
    'Still no! 👀', 'So close... yet so far', 'Getting warmer? Not really.',
    'Give up yet?', 'Persistent, I like it.',
  ];

  useEffect(() => {
    const noBtn = noRef.current;
    const yesBtn = yesRef.current;
    if (!noBtn || !yesBtn) return;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
    function clampToViewport(x: number, y: number, w: number, h: number, margin: number) {
      const maxX = window.innerWidth - w - margin;
      const maxY = window.innerHeight - h - margin;
      return [Math.min(Math.max(x, margin), Math.max(margin, maxX)), Math.min(Math.max(y, margin), Math.max(margin, maxY))];
    }
    function pickNewTarget() {
      const r = noBtn!.getBoundingClientRect();
      const margin = 16;
      let nx = Math.random() * (window.innerWidth - r.width - margin * 2) + margin;
      let ny = Math.random() * (window.innerHeight - r.height - margin * 2) + margin;
      [nx, ny] = clampToViewport(nx, ny, r.width, r.height, margin);
      targetRef.current = { x: nx, y: ny };
    }
    function tick() {
      const cur = curRef.current, target = targetRef.current;
      if (!cur || !target) return;
      cur.x = lerp(cur.x, target.x, 0.18);
      cur.y = lerp(cur.y, target.y, 0.18);
      noBtn!.style.left = cur.x + 'px';
      noBtn!.style.top = cur.y + 'px';
      const dist = Math.hypot(cur.x - target.x, cur.y - target.y);
      if (dist > 0.5) animRef.current = requestAnimationFrame(tick);
      else animRef.current = null;
    }
    function startGlide() {
      if (!noBtn!.classList.contains('fixed-pos')) {
        const r = noBtn!.getBoundingClientRect();
        noBtn!.classList.add('fixed-pos');
        curRef.current = { x: r.left, y: r.top };
        noBtn!.style.left = r.left + 'px';
        noBtn!.style.top = r.top + 'px';
      }
      pickNewTarget();
      if (!animRef.current) animRef.current = requestAnimationFrame(tick);
    }
    function registerDodge() {
      dodgesRef.current++;
      const d = dodgesRef.current;
      const line = dodgeLines[Math.min(d - 1, dodgeLines.length - 1)];
      setCounterText(d > 1 ? `${line} (${d} tries)` : line);
      const scale = Math.min(1 + d * 0.09, 2.2);
      yesBtn!.style.transform = `scale(${scale})`;
    }
    function onMouseMove(e: MouseEvent) {
      const r = noBtn!.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < 90) { registerDodge(); startGlide(); }
    }
    function onTouch(e: Event) { e.preventDefault(); registerDodge(); startGlide(); }
    function onResize() {
      if (noBtn!.classList.contains('fixed-pos')) {
        const r = noBtn!.getBoundingClientRect();
        const [nx, ny] = clampToViewport(r.left, r.top, r.width, r.height, 16);
        curRef.current = { x: nx, y: ny };
        targetRef.current = { x: nx, y: ny };
        noBtn!.style.left = nx + 'px';
        noBtn!.style.top = ny + 'px';
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    noBtn.addEventListener('click', onTouch as any);
    noBtn.addEventListener('touchstart', onTouch as any, { passive: false });
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      noBtn.removeEventListener('click', onTouch as any);
      noBtn.removeEventListener('touchstart', onTouch as any);
      window.removeEventListener('resize', onResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="card">
      <div className="emoji">💘</div>
      <h1>Will you go on a date with me?</h1>
      <div className="btn-row">
        <button ref={yesRef} className="btn-primary" onClick={() => { burst(90); onYes(); }}>Yes!</button>
        <button ref={noRef} id="noBtn" className="btn-secondary">No</button>
      </div>
      <div id="counter">{counterText}</div>
    </div>
  );
}

function DateStep({ value, onPick, onNext, onBack }: { value: Date | null; onPick: (d: Date) => void; onNext: () => void; onBack: () => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewMonth, setViewMonth] = useState(new Date(value ?? today));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const isPastMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="step-panel">
      <div className="emoji">📅</div>
      <h1>Pick a date</h1>
      <p className="subtitle">When should this date happen?</p>
      <div className="cal-header">
        <button className="cal-nav" disabled={isPastMonth} onClick={() => setViewMonth(new Date(year, month - 1, 1))}>&#8249;</button>
        <span>{MONTHS[month]} {year}</span>
        <button className="cal-nav" onClick={() => setViewMonth(new Date(year, month + 1, 1))}>&#8250;</button>
      </div>
      <div className="cal-grid">
        {DOW.map((d, i) => <div className="cal-dow" key={i}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <button key={i} className="cal-day empty" disabled />;
          const past = d < today;
          const selected = value ? sameDay(d, value) : false;
          return (
            <button
              key={i}
              className={`cal-day${selected ? ' selected' : ''}`}
              disabled={past}
              onClick={() => onPick(d)}
            >{d.getDate()}</button>
          );
        })}
      </div>
      <div className="btn-row">
        <button className="back-link" onClick={onBack}>&larr; Back</button>
        <button className="btn-primary" disabled={!value} onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

function TimeStep({ value, onPick, onNext, onBack }: { value: string | null; onPick: (t: string) => void; onNext: () => void; onBack: () => void }) {
  return (
    <div className="step-panel">
      <div className="emoji">⏰</div>
      <h1>Pick a time</h1>
      <p className="subtitle">What time works best?</p>
      <div className="time-grid">
        {TIME_SLOTS.map((t) => (
          <button key={t} className={`time-slot${value === t ? ' selected' : ''}`} onClick={() => onPick(t)}>
            {formatTime(t)}
          </button>
        ))}
      </div>
      <div className="btn-row">
        <button className="back-link" onClick={onBack}>&larr; Back</button>
        <button className="btn-primary" disabled={!value} onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

function ActivityStep({
  value, onChange, onSubmit, onBack, submitting, error, dateVal, timeVal,
}: {
  value: string; onChange: (s: string) => void; onSubmit: () => void; onBack: () => void;
  submitting: boolean; error: string; dateVal: Date; timeVal: string;
}) {
  return (
    <div className="step-panel">
      <div className="emoji">🌟</div>
      <h1>What should we do?</h1>
      <p className="subtitle">Tell me the plan</p>
      <div className="chips">
        {ACTIVITY_CHIPS.map((c) => (
          <button key={c} className="chip" onClick={() => onChange(c.replace(/\s[\p{Emoji}]$/u, '').trim())}>{c}</button>
        ))}
      </div>
      <textarea
        maxLength={200}
        placeholder="e.g. Dinner at that little Italian place, then a walk…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="summary-box" style={{ marginTop: 16 }}>
        <div><b>Date:</b> {dateVal.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div><b>Time:</b> {formatTime(timeVal)}</div>
      </div>
      <div className="btn-row">
        <button className="back-link" onClick={onBack} disabled={submitting}>&larr; Back</button>
        <button className="btn-primary" disabled={!value.trim() || submitting} onClick={onSubmit}>
          {submitting ? 'Sending…' : 'Confirm the date 💕'}
        </button>
      </div>
      {error && <div className="error-text">{error}</div>}
    </div>
  );
}

function DoneScreen({ dateVal, timeVal, activity }: { dateVal: Date; timeVal: string; activity: string }) {
  return (
    <div className="card">
      <div className="emoji">🎉</div>
      <h1>It's a date!</h1>
      <div className="summary-box">
        <div><b>Date:</b> {dateVal.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div><b>Time:</b> {formatTime(timeVal)}</div>
        <div><b>Plan:</b> {activity}</div>
      </div>
      <p className="subtitle">Can't wait 💕</p>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState<Step>('ask');
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [activity, setActivity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { canvasRef, burst } = useConfetti();

  const stepIndex = { ask: 0, date: 1, time: 2, activity: 3, done: 4 }[step];

  async function handleSubmit() {
    if (!date || !time || !activity.trim()) return;
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase.from('responses').insert({
      date: toDateKey(date),
      time,
      activity: activity.trim(),
    });
    setSubmitting(false);
    if (err) {
      setError("Hmm, that didn't save. Mind trying again?");
      return;
    }
    burst(160);
    setStep('done');
  }

  return (
    <div id="root-wrap">
      <canvas id="confetti-canvas" ref={canvasRef} />
      {step !== 'ask' && step !== 'done' && (
        <div className="progress-dots">
          {[1, 2, 3].map((i) => <span key={i} className={i <= stepIndex ? 'active' : ''} />)}
        </div>
      )}
      {step === 'ask' && <AskScreen onYes={() => setStep('date')} burst={burst} />}
      {step === 'date' && (
        <DateStep value={date} onPick={setDate} onNext={() => setStep('time')} onBack={() => setStep('ask')} />
      )}
      {step === 'time' && (
        <TimeStep value={time} onPick={setTime} onNext={() => setStep('activity')} onBack={() => setStep('date')} />
      )}
      {step === 'activity' && date && time && (
        <ActivityStep
          value={activity}
          onChange={setActivity}
          onSubmit={handleSubmit}
          onBack={() => setStep('time')}
          submitting={submitting}
          error={error}
          dateVal={date}
          timeVal={time}
        />
      )}
      {step === 'done' && date && time && <DoneScreen dateVal={date} timeVal={time} activity={activity} />}
    </div>
  );
}
