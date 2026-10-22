import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { hasSupabaseConfig, supabase } from './lib/supabase.js';
import Icon from './components/Icon.jsx';
import { DashboardPage, RoadmapPage, LearningLogPage, TimerPage, ReportsPage, SettingsPage } from './components/TrainingPages.jsx';
import './training.css';

const navItems = [
  { to: '/', label: 'Overview', icon: 'home', end: true },
  { to: '/roadmap', label: 'Roadmap', icon: 'map' },
  { to: '/journal', label: 'Learning log', icon: 'book' },
  { to: '/timer', label: 'Study timer', icon: 'clock' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
];

function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signup') {
        const result = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: window.location.origin } });
        if (!result.data.session) setNotice('Your account is ready. Check your inbox to confirm your email, then sign in.');
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      }
    } catch (e) { setError(e.message || 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!email) { setError('Enter your email first, then choose reset password.'); return; }
    setError(''); setNotice('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (resetError) setError(resetError.message); else setNotice('If an account exists for that email, a password reset link is on its way.');
  }
  return <main className="auth-shell"><section className="auth-story"><Link to="/" className="brand"><span className="brand-mark">S</span><span>Study<span className="brand-light">path</span></span></Link><div className="auth-story-copy"><span className="eyebrow">YOUR SDE JOURNEY, WITH A PLAN</span><h1>Build the skills.<br/>Keep the evidence.</h1><p>A thoughtful workspace for learning software engineering one topic, one session, one day at a time.</p><div className="story-note"><span className="note-dot"/><span>Start with a roadmap. Make it yours as you go.</span></div></div><div className="story-footer">A personal learning workspace</div></section><section className="auth-panel"><div className="auth-form-wrap"><span className="eyebrow">{mode === 'signup' ? 'GET STARTED' : 'WELCOME BACK'}</span><h2>{mode === 'signup' ? 'Create your workspace' : 'Sign in to your workspace'}</h2><p className="muted">{mode === 'signup' ? 'Your roadmap and learning journal will be private to your account.' : 'Pick up where you left off.'}</p><form onSubmit={submit} className="stack-form">{mode === 'signup' && <label>Your name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="How should we address you?" required /></label>}<label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} placeholder="At least 8 characters" required /></label>{error && <div className="notice error">{error}</div>}{notice && <div className="notice success">{notice}</div>}<button className="button primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'} <Icon name="arrow" size={16}/></button></form>{mode === 'signin' && <button className="text-button reset-link" onClick={resetPassword}>Forgot your password?</button>}<div className="auth-switch">{mode === 'signup' ? 'Already have an account?' : 'New to Studypath?'} <button className="text-button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice(''); }}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></div><p className="auth-privacy">Your study data is stored in your private workspace and protected by account level access.</p></div></section></main>;
}

function SetupScreen() {
  const [copied, setCopied] = useState(false);
  const envSnippet = 'VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key';
  async function copy() { try { await navigator.clipboard.writeText(envSnippet); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } }
  return <main className="setup-shell"><div className="setup-card"><Link to="/" className="brand"><span className="brand-mark">S</span><span>Study<span className="brand-light">path</span></span></Link><div className="setup-icon"><Icon name="settings" size={24}/></div><span className="eyebrow">ONE-TIME SETUP</span><h1>Connect your learning space</h1><p className="muted setup-intro">Add your Supabase project details to enable secure sign-in, a personal roadmap, saved study entries and private file attachments.</p><div className="setup-steps"><div><span className="step-number">1</span><div><strong>Add the project credentials</strong><p>Create a <code>.env.local</code> file in the app folder and add:</p><pre>{envSnippet}</pre><button className="text-button" onClick={copy}>{copied ? 'Copied' : 'Copy values'}</button></div></div><div><span className="step-number">2</span><div><strong>Create the database tables</strong><p>Run <code>supabase/migrations/202610220001_sde_learning_journey.sql</code> in your Supabase SQL Editor. It creates private user data rules and seeds a customizable SDE roadmap for new accounts.</p></div></div><div><span className="step-number">3</span><div><strong>Restart the app</strong><p>Restart the development server after saving credentials. Then create your account to begin.</p></div></div></div><div className="notice info"><strong>Use the publishable key only.</strong> Never put a Supabase <code>service_role</code> or secret key in a browser app.</div><button className="button secondary full" onClick={() => window.location.reload()}>I’ve added the credentials <Icon name="arrow" size={16}/></button></div><footer className="setup-footer">Your workspace is yours. You can change the roadmap at any time.</footer></main>;
}

function Workspace({ session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [phases, setPhases] = useState([]);
  const [topics, setTopics] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);

  const refresh = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    setError('');
    const results = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
      supabase.from('roadmap_phases').select('*').order('position'),
      supabase.from('roadmap_topics').select('*').order('position'),
      supabase.from('learning_entries').select('*').order('started_at', { ascending: false }).limit(1500),
    ]);
    const failed = results.find(r => r.error);
    if (failed) setError(failed.error.message);
    else {
      const [p, ph, tp, en] = results.map(r => r.data);
      setProfile(p || { id: session.user.id, display_name: session.user.user_metadata?.display_name || '', target_role: 'Software Development Engineer', weekly_goal_hours: 10 });
      setPhases(ph || []); setTopics(tp || []); setEntries(en || []);
    }
    setLoading(false);
  }, [session.user.id, session.user.user_metadata]);
  useEffect(() => { refresh(true); }, [refresh]);

  async function runSave(action) {
    setSaving(true);
    try { await action(); await refresh(false); }
    catch (e) { setError(e.message || 'Could not save your changes.'); }
    finally { setSaving(false); }
  }
  async function saveEntry(data) {
    setSaving(true); setError('');
    let uploadedPath = '';
    try {
      if (data.file) {
        const safe = data.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        uploadedPath = session.user.id + '/' + data.id + '/' + safe;
        const { error: uploadError } = await supabase.storage.from('learning-files').upload(uploadedPath, data.file, { upsert: true, contentType: data.file.type });
        if (uploadError) throw uploadError;
      }
      const { file, topic_status, ...fields } = data;
      const row = { ...fields, user_id: session.user.id, attachment_path: uploadedPath };
      const { error: insertError } = await supabase.from('learning_entries').insert(row);
      if (insertError) throw insertError;
      if (topic_status && data.topic_id) {
        const { error: topicError } = await supabase.from('roadmap_topics').update({ status: topic_status, completed_at: topic_status === 'completed' ? new Date().toISOString() : null }).eq('id', data.topic_id);
        if (topicError) setError('Entry saved, but topic status could not be updated: ' + topicError.message);
      }
      await refresh(false);
      navigate('/journal');
    } catch (e) {
      if (uploadedPath) await supabase.storage.from('learning-files').remove([uploadedPath]);
      setError(e.message || 'Could not save this learning entry.');
    } finally { setSaving(false); }
  }
  async function deleteEntry(entry) {
    if (!window.confirm('Delete this learning log entry?')) return;
    await runSave(async () => {
      const { error: e } = await supabase.from('learning_entries').delete().eq('id', entry.id);
      if (e) throw e;
      if (entry.attachment_path) await supabase.storage.from('learning-files').remove([entry.attachment_path]);
    });
  }
  async function openAttachment(path) {
    const { data, error: e } = await supabase.storage.from('learning-files').createSignedUrl(path, 60);
    if (e) setError(e.message); else window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }
  async function saveProfile(values) {
    await runSave(async () => {
      const { error: e } = await supabase.from('profiles').upsert({ id: session.user.id, ...values, updated_at: new Date().toISOString() });
      if (e) throw e;
      if (values.display_name !== undefined) await supabase.auth.updateUser({ data: { display_name: values.display_name } });
    });
  }

  const context = { profile, phases, topics, entries, session, loading, saving, error, setError, refresh, runSave, saveEntry, deleteEntry, openAttachment, saveProfile };
  const currentPage = navItems.find(item => item.to === location.pathname)?.label || (location.pathname === '/settings' ? 'Settings' : 'Overview');
  if (loading) return <div className="loading-screen"><span className="loader"/><span>Opening your workspace…</span></div>;
  if (error && phases.length === 0 && /does not exist|schema cache|relation .* not found/i.test(error)) return <div className="setup-shell"><div className="setup-card"><span className="setup-icon"><Icon name="map" size={24}/></span><span className="eyebrow">DATABASE SETUP</span><h1>Your roadmap tables aren’t ready</h1><p className="muted">Connect your project, then run the supplied Supabase migration in the SQL Editor. It creates the account profile, editable roadmap, study journal and private attachment bucket.</p><div className="notice error">{error}</div><p className="muted"><code>supabase/migrations/202610220001_sde_learning_journey.sql</code></p><button className="button primary full" onClick={() => refresh(true)}>Check again</button></div></div>;

  return <div className="app-shell">
    <aside className={'sidebar' + (mobileMenu ? ' mobile-open' : '')}>
      <Link to="/" className="brand"><span className="brand-mark">S</span><span>Study<span className="brand-light">path</span></span></Link>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav className="side-nav">{navItems.map(item => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileMenu(false)} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}><Icon name={item.icon}/><span>{item.label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="roadmap-mini"><div className="mini-heading">YOUR PATH <span>{phases.length} phases</span></div><div className="mini-progress"><span style={{ width: topics.length ? (topics.filter(t => t.status === 'completed').length / topics.length * 100) + '%' : '0%' }}/></div><div className="mini-caption">{topics.filter(t => t.status === 'completed').length} of {topics.length} topics complete</div><Link to="/roadmap" className="mini-link">View roadmap <Icon name="arrow" size={14}/></Link></div><NavLink to="/settings" className={({ isActive }) => 'profile-link' + (isActive ? ' active' : '')} onClick={() => setMobileMenu(false)}><span className="avatar">{(profile?.display_name || session.user.email || 'S').charAt(0).toUpperCase()}</span><span className="profile-copy"><strong>{profile?.display_name || 'Your profile'}</strong><small>Personal workspace</small></span><Icon name="settings" size={16}/></NavLink></div>
    </aside>
    <div className="workspace-main"><header className="topbar"><button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation"><Icon name="menu"/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{currentPage}</strong></div><div className="topbar-right"><span className="sync-status"><i/> Saved to your workspace</span><span className="topbar-date">{new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span></div></header>
      <main className="page-container">{error && <div className="notice error workspace-error"><span>{error}</span><button className="icon-button" onClick={() => setError('')} aria-label="Dismiss">×</button></div>}<Routes><Route path="/" element={<DashboardPage {...context}/>} /><Route path="/roadmap" element={<RoadmapPage {...context}/>} /><Route path="/journal" element={<LearningLogPage {...context}/>} /><Route path="/timer" element={<TimerPage {...context}/>} /><Route path="/reports" element={<ReportsPage {...context}/>} /><Route path="/settings" element={<SettingsPage {...context}/>} /><Route path="*" element={<DashboardPage {...context}/>} /></Routes><footer className="page-footer">A steady practice beats a perfect plan. Keep showing up.</footer></main>
    </div>
  </div>;
}

export default function TrainingApp() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    if (!hasSupabaseConfig) { setSession(null); return undefined; }
    let live = true;
    supabase.auth.getSession().then(({ data }) => { if (live) setSession(data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { if (live) setSession(next); });
    return () => { live = false; subscription.unsubscribe(); };
  }, []);
  if (!hasSupabaseConfig) return <SetupScreen/>;
  if (session === undefined) return <div className="loading-screen"><span className="loader"/><span>Opening your workspace…</span></div>;
  return session ? <Workspace session={session}/> : <AuthScreen/>;
}
