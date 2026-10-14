import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import TaskCard from "./components/TaskCard.jsx";
import { CalendarPage, SubjectsPage, FocusPage, GoalsPage, InsightsPage, SettingsPage } from "./components/PlannerPages.jsx";
import { PlansPage, AssessmentsPage, ResourcesPage, CollaborationPage, ReportsPage, OnboardingPage, HelpPage, OrganizationPage, AccountPage, AccessibilityPage } from "./components/ProductPages.jsx";
import { CloudAccountPage, IntegrationsPage, BillingPage, FeedbackPage, AdminPage, AcceptInvitationPage, ResetPasswordPage, OrganizationCloudPage } from "./components/BusinessPages.jsx";
import { api, jsonBody } from "./lib/api.js";

const STORAGE_KEY = "studysnap_tasks_v2";
const SUBJECTS = ["Mathematics", "Science", "Computer science", "Languages", "History", "React", "JavaScript", "Python", "Database", "Other"];
const localDateKey = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const safeStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browser storage may be unavailable or full. */ } };
const loadArray = (key) => { try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; } };

function readTasks() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = current === null ? localStorage.getItem("studysnap_tasks") : null;
    const parsed = JSON.parse(current ?? legacy ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((task) => task && task.id != null && typeof task.title === "string").map((task) => ({
      ...task,
      subject: task.subject || "Other",
      priority: ["Low", "Medium", "High"].includes(task.priority) ? task.priority : "Medium",
      completed: Boolean(task.completed),
      dueDate: task.dueDate || "",
      estimate: Number(task.estimate) || 30,
      notes: task.notes || "",
    })) : [];
  } catch {
    return [];
  }
}

function App() {
  const [tasks, setTasks] = useState(readTasks);
  const [sessions, setSessions] = useState(() => loadArray("studysnap_sessions"));
  const [goals, setGoals] = useState(() => loadArray("studysnap_goals"));
  const [subjects, setSubjects] = useState(() => [...new Set([...SUBJECTS, ...loadArray("studysnap_subjects")])]);
  const [profile, setProfile] = useState(() => { try { return JSON.parse(localStorage.getItem("studysnap_profile") || "{}"); } catch { return {}; } });
  const [preferences, setPreferences] = useState(() => { try { return JSON.parse(localStorage.getItem("studysnap_preferences") || "{}"); } catch { return {}; } });
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [estimate, setEstimate] = useState("30");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [reminderRevision, setReminderRevision] = useState(0);
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState("Cloud sync has not run on this device.");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
    catch { setNotice("Your browser storage is full. Some changes may not be saved."); }
  }, [tasks]);
  useEffect(() => { safeStore("studysnap_sessions", sessions); }, [sessions]);
  useEffect(() => { safeStore("studysnap_goals", goals); }, [goals]);
  useEffect(() => { safeStore("studysnap_subjects", subjects); }, [subjects]);
  useEffect(() => { safeStore("studysnap_profile", profile); }, [profile]);
  useEffect(() => { safeStore("studysnap_preferences", preferences); }, [preferences]);
  useEffect(() => { document.documentElement.lang = preferences.language || "en"; document.documentElement.dataset.contrast = preferences.contrast || "normal"; document.documentElement.dataset.text = preferences.textSize || "regular"; }, [preferences]);
  useEffect(() => { api("/api/auth/me").then((result) => setCloudUser(result.user)).catch(() => setCloudUser(null)); }, []);
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted" || localStorage.getItem("studysnap_reminders_enabled") !== "true") return undefined;
    const remindForToday = () => {
      const due = tasks.filter((task) => !task.completed && task.dueDate === localDateKey());
      const key = `studysnap_reminded_${localDateKey()}`;
      if (due.length && !localStorage.getItem(key)) {
        new Notification("StudySnap · Due today", { body: `${due.length} study ${due.length === 1 ? "task is" : "tasks are"} due today. Open your planner to review them.` });
        localStorage.setItem(key, "true");
      }
    };
    remindForToday();
    const interval = window.setInterval(remindForToday, 60000);
    return () => window.clearInterval(interval);
  }, [tasks, reminderRevision]);

  function createTask(data) {
    const cleanTitle = String(data.title || "").trim();
    if (!cleanTitle) return;
    setTasks((previous) => [{ id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, externalId: data.externalId || "", title: cleanTitle, subject: data.subject || "Other", priority: data.priority || "Medium", dueDate: data.dueDate || "", estimate: Number(data.estimate) || 30, notes: data.notes || "", completed: false, createdAt: new Date().toISOString(), recurrence: data.recurrence || "none", subtasks: Array.isArray(data.subtasks) ? data.subtasks : [], taskType: data.taskType || "Study task", resourceUrl: data.resourceUrl || "" }, ...previous]);
  }
  function importTask(data) { if (data.externalId && tasks.some((task) => task.externalId === data.externalId)) { setNotice("That assignment is already in your task list."); return; } createTask(data); setNotice("Assignment imported to your study plan."); }
  function addTask(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) { setNotice("Add a task title to continue."); return; }
    createTask({ title: cleanTitle, subject, priority, dueDate, estimate, notes: notes.trim() });
    setTitle(""); setDueDate(""); setEstimate("30"); setNotes(""); setNotice("Task added to your plan.");
  }

  function updateTask(id, changes) {
    setTasks((previous) => {
      const current = previous.find((task) => task.id === id);
      const updated = previous.map((task) => task.id === id ? { ...task, ...changes } : task);
      if (current && !current.completed && changes.completed && current.recurrence && current.recurrence !== "none") {
        const nextDate = current.dueDate ? new Date(`${current.dueDate}T12:00:00`) : new Date();
        nextDate.setDate(nextDate.getDate() + (current.recurrence === "daily" ? 1 : 7));
        const next = { ...current, id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, dueDate: `${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2,"0")}-${String(nextDate.getDate()).padStart(2,"0")}`, completed: false, createdAt: new Date().toISOString() };
        updated.unshift(next);
      }
      return updated;
    });
  }
  function deleteTask(id) { setTasks((previous) => previous.filter((task) => task.id !== id)); }

  async function syncCloud(direction) {
    if (!cloudUser) { setCloudSyncStatus("Sign in before syncing."); return; }
    try {
      const remote = await api("/api/data");
      if (direction === "download") {
        const data = remote.data || {};
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
        setGoals(Array.isArray(data.goals) ? data.goals : []);
        setSubjects([...new Set([...SUBJECTS, ...(Array.isArray(data.subjects) ? data.subjects : [])])]);
        if (data.profile && typeof data.profile === "object") setProfile(data.profile);
        if (data.preferences && typeof data.preferences === "object") setPreferences(data.preferences);
        if (Array.isArray(data.templates)) safeStore("studysnap_templates", data.templates);
        if (Array.isArray(data.groups)) safeStore("studysnap_groups", data.groups);
        setCloudSyncStatus(`Downloaded cloud revision ${remote.revision} at ${remote.updatedAt ? new Date(remote.updatedAt).toLocaleString() : "initial setup"}.`);
      } else {
        const data = { tasks, sessions, goals, subjects, profile, preferences, templates: loadArray("studysnap_templates"), groups: loadArray("studysnap_groups") };
        const result = await api("/api/data", { method: "PUT", body: jsonBody({ revision: remote.revision, data }) });
        setCloudSyncStatus(`Uploaded as revision ${result.revision} at ${new Date(result.updatedAt).toLocaleString()}.`);
      }
    } catch (error) {
      setCloudSyncStatus(error.status === 409 ? `Sync conflict: ${error.payload.updatedAt ? new Date(error.payload.updatedAt).toLocaleString() : "the cloud copy is newer"}. Download it before trying again.` : error.message);
    }
  }

  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = tasks.length - completedCount;
  const today = localDateKey();
  const dueToday = tasks.filter((task) => !task.completed && task.dueDate === today).length;
  const minutesPlanned = tasks.filter((task) => !task.completed).reduce((sum, task) => sum + (Number(task.estimate) || 0), 0);
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesFilter = filter === "Pending" ? !task.completed : filter === "Completed" ? task.completed : true;
    const matchesQuery = `${task.title} ${task.subject} ${task.notes}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesFilter && matchesQuery;
  }), [tasks, filter, query]);

  function taskList(items = visibleTasks, compact = false) {
    if (items.length === 0) return <div className="empty-state"><span className="empty-icon">✦</span><h3>{query ? "No matching tasks" : tasks.length ? "Nothing in this view" : "A clear mind starts with a plan"}</h3><p>{query ? "Try another search term." : tasks.length ? "Choose another filter or add a new study task." : "Add a task to give your next study session a clear direction."}</p></div>;
    return <div className="task-list">{items.map((task) => <TaskCard key={task.id} task={task} compact={compact} onUpdate={updateTask} onDelete={deleteTask} />)}</div>;
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="brand" to="/"><span className="brand-mark">S</span><span><strong>StudySnap</strong><small>YOUR LEARNING SPACE</small></span></Link>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation">
        <NavLink to="/" end><span className="nav-icon">⌂</span>Overview</NavLink>
        <NavLink to="/tasks"><span className="nav-icon">▤</span>My tasks<span className="nav-count">{pendingCount}</span></NavLink>
        <NavLink to="/calendar"><span className="nav-icon">▦</span>Calendar</NavLink>
        <NavLink to="/subjects"><span className="nav-icon">◫</span>Subjects</NavLink>
        <NavLink to="/focus"><span className="nav-icon">◷</span>Focus room</NavLink>
        <NavLink to="/goals"><span className="nav-icon">◎</span>Goals</NavLink>
        <NavLink to="/insights"><span className="nav-icon">↗</span>Insights</NavLink>
        <NavLink to="/plans"><span className="nav-icon">↻</span>Study plans</NavLink>
        <NavLink to="/assessments"><span className="nav-icon">◇</span>Exams & work</NavLink>
        <NavLink to="/resources"><span className="nav-icon">↗</span>Notes & links</NavLink>
        <NavLink to="/groups"><span className="nav-icon">♧</span>Study groups</NavLink>
        <NavLink to="/reports"><span className="nav-icon">▥</span>Reports</NavLink>
        <NavLink to="/organization"><span className="nav-icon">▦</span>Organization</NavLink>
        <NavLink to="/cloud"><span className="nav-icon">☁</span>Cloud account</NavLink>
        <NavLink to="/integrations"><span className="nav-icon">↗</span>Integrations</NavLink>
        <NavLink to="/billing"><span className="nav-icon">$</span>Plans & billing</NavLink>
        <NavLink to="/feedback"><span className="nav-icon">✎</span>Feedback & pilot</NavLink>
        {cloudUser?.isAdmin && <NavLink to="/admin"><span className="nav-icon">⌘</span>Admin overview</NavLink>}
        <NavLink to="/account"><span className="nav-icon">◉</span>Account & privacy</NavLink>
        <NavLink to="/accessibility"><span className="nav-icon">◐</span>Accessibility</NavLink>
        <NavLink to="/help"><span className="nav-icon">?</span>Help center</NavLink>
        <NavLink to="/settings"><span className="nav-icon">⚙</span>Settings</NavLink>
        <NavLink to="/onboarding"><span className="nav-icon">✦</span>Getting started</NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="focus-card"><span className="focus-spark">✳</span><strong>Small steps add up.</strong><p>Your next focused session is a good place to start.</p></div><span className="sidebar-foot">Made for curious minds <span>✦</span></span></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><div><span className="breadcrumb">STUDY SPACE</span><span className="breadcrumb-sep">/</span><strong>My planner</strong></div><div className="today-pill"><span className="online-dot" /> Your progress is saved on this device</div></header>
      <main>
        {notice && <div role="status" className="notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}
        <Routes>
          <Route path="/" element={<>
            {!profile.completed && <Link className="onboarding-callout" to="/onboarding"><span>✦</span><div><strong>Make StudySnap yours</strong><small>Set your name, role, and study goal to personalize your space.</small></div><b>→</b></Link>}
            <section className="hero"><div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL STUDY PLANNER</p><h1>Make room for<br /><em>your next big idea.</em></h1><p className="hero-text">A little structure goes a long way. Choose what matters today and keep your learning momentum going.</p><a className="hero-link" href="#create-task">Plan a study task <span>↘</span></a></div><div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="book-stack"><div className="book book-back"/><div className="book book-mid"/><div className="book book-front"><span>✦</span><i>STUDY<br/>NOTES</i></div></div><span className="art-star star-one">✳</span><span className="art-star star-two">✧</span><span className="art-squiggle">〰</span><span className="art-label">ONE THING<br/>AT A TIME</span></div></section>
            <section className="stats" aria-label="Study statistics"><article className="stat-card stat-total"><div className="stat-top"><span className="stat-icon">▤</span><span className="stat-caption">ALL TIME</span></div><strong>{tasks.length}</strong><p>Tasks in your plan</p></article><article className="stat-card stat-done"><div className="stat-top"><span className="stat-icon">✓</span><span className="stat-caption">NICE WORK</span></div><strong>{completedCount}</strong><p>Sessions completed</p></article><article className="stat-card stat-focus"><div className="stat-top"><span className="stat-icon">◷</span><span className="stat-caption">UP NEXT</span></div><strong>{Math.floor(minutesPlanned / 60)}<small>h</small> {minutesPlanned % 60}<small>m</small></strong><p>Estimated study time</p></article><article className="stat-card stat-progress"><div className="stat-top"><span className="stat-icon">↗</span><span className="stat-caption">YOUR MOMENTUM</span></div><strong>{progress}<small>%</small></strong><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p>{dueToday ? `${dueToday} due today` : "Keep the streak going"}</p></article></section>
            <section className="content-grid"><div className="panel form-panel" id="create-task"><div className="section-heading"><div><p className="eyebrow">A PLAN THAT FEELS DOABLE</p><h2>Add a study task</h2></div><span className="heading-decoration">✳</span></div><form onSubmit={addTask}>
              <label htmlFor="task-title">What would you like to work on?</label><input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Review chapter 4 notes" maxLength={120} required />
              <div className="form-row"><div><label htmlFor="subject">Subject</label><select id="subject" value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((name) => <option key={name}>{name}</option>)}</select></div><div><label htmlFor="priority">Priority</label><select id="priority" value={priority} onChange={(event) => setPriority(event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></div></div>
              <div className="form-row"><div><label htmlFor="due-date">Due date <span className="optional">· optional</span></label><input id="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} min={today} /></div><div><label htmlFor="estimate">Time estimate</label><select id="estimate" value={estimate} onChange={(event) => setEstimate(event.target.value)}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option></select></div></div>
              <label htmlFor="notes">Notes <span className="optional">· optional</span></label><textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Add a reminder or break it into steps..." rows="2" maxLength={280} />
              <button className="primary-button" type="submit"><span>Add to my plan</span><b>＋</b></button>
            </form></div><section className="panel task-panel"><div className="section-heading task-list-heading"><div><p className="eyebrow">YOUR NEXT STEPS</p><h2>Study tasks <span className="heading-count">{pendingCount}</span></h2></div><Link className="see-all" to="/tasks">See all tasks <span>→</span></Link></div>{taskList(tasks.filter((task) => !task.completed).slice(0, 4), true)}</section></section>
          </>} />
          <Route path="/tasks" element={<section className="panel page-panel"><div className="page-heading"><div><p className="eyebrow">YOUR LEARNING, AT YOUR PACE</p><h1 className="page-title">My study tasks</h1><p className="page-subtitle">Everything you want to learn, all in one place.</p></div><a className="primary-button compact-cta" href="/#create-task">＋ Add a task</a></div><div className="task-toolbar"><div className="filters" aria-label="Filter tasks">{["All", "Pending", "Completed"].map((item) => <button key={item} className={filter === item ? "filter-button active" : "filter-button"} onClick={() => setFilter(item)}>{item}<span>{item === "All" ? tasks.length : item === "Pending" ? pendingCount : completedCount}</span></button>)}</div><label className="search-box"><span>⌕</span><input aria-label="Search tasks" placeholder="Search your plan" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>{taskList()}</section>} />
          <Route path="/about" element={<section className="about-card panel"><span className="about-symbol">✳</span><p className="eyebrow">A LITTLE ABOUT US</p><h1>Progress, at your pace.</h1><p>StudySnap is your calm corner for turning big learning goals into small, satisfying steps. Plan a session, make it yours, and celebrate the work you get done.</p><div className="about-values"><div><strong>01</strong><span>Keep your plan<br/>simple and clear</span></div><div><strong>02</strong><span>Make time for<br/>what matters</span></div><div><strong>03</strong><span>Notice every<br/>bit of progress</span></div></div><div className="technology"><span>BUILT WITH</span><strong>React · JavaScript · Thoughtful planning</strong></div></section>} />
          <Route path="/calendar" element={<CalendarPage tasks={tasks} updateTask={updateTask} deleteTask={deleteTask} locale={preferences.language} onRemindersEnabled={() => setReminderRevision((value) => value + 1)} />} />
          <Route path="/subjects" element={<SubjectsPage tasks={tasks} subjects={subjects} setSubjects={setSubjects} />} />
          <Route path="/focus" element={<FocusPage onSession={(session) => setSessions((previous) => [session, ...previous])} />} />
          <Route path="/goals" element={<GoalsPage goals={goals} setGoals={setGoals} tasks={tasks} />} />
          <Route path="/insights" element={<InsightsPage tasks={tasks} sessions={sessions} locale={preferences.language} />} />
          <Route path="/settings" element={<SettingsPage tasks={tasks} sessions={sessions} goals={goals} subjects={subjects} profile={profile} preferences={preferences} setProfile={setProfile} setPreferences={setPreferences} setTasks={setTasks} setSessions={setSessions} setGoals={setGoals} setSubjects={setSubjects} />} />
          <Route path="/plans" element={<PlansPage tasks={tasks} subjects={subjects} addTask={createTask} />} />
          <Route path="/assessments" element={<AssessmentsPage tasks={tasks} addTask={createTask} locale={preferences.language} />} />
          <Route path="/resources" element={<ResourcesPage tasks={tasks} setTasks={setTasks} />} />
          <Route path="/groups" element={<CollaborationPage tasks={tasks} />} />
          <Route path="/reports" element={<ReportsPage tasks={tasks} sessions={sessions} goals={goals} />} />
          <Route path="/onboarding" element={<OnboardingPage profile={profile} setProfile={setProfile} />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/organization" element={cloudUser ? <OrganizationCloudPage /> : <OrganizationPage profile={profile} setProfile={setProfile} tasks={tasks} goals={goals} />} />
          <Route path="/account" element={<AccountPage profile={profile} setProfile={setProfile} />} />
          <Route path="/cloud" element={<CloudAccountPage user={cloudUser} onAuthenticated={setCloudUser} onLogout={() => setCloudUser(null)} onSync={syncCloud} syncStatus={cloudSyncStatus} />} />
          <Route path="/integrations" element={cloudUser ? <IntegrationsPage onImport={importTask} /> : <section className="panel feature-page"><h1 className="page-title">Sign in to connect integrations</h1><Link className="hero-link" to="/cloud">Open cloud account →</Link></section>} />
          <Route path="/billing" element={cloudUser ? <BillingPage /> : <section className="panel feature-page"><h1 className="page-title">Sign in to view plans</h1><Link className="hero-link" to="/cloud">Open cloud account →</Link></section>} />
          <Route path="/feedback" element={cloudUser ? <FeedbackPage /> : <section className="panel feature-page"><h1 className="page-title">Sign in to send feedback</h1><Link className="hero-link" to="/cloud">Open cloud account →</Link></section>} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage user={cloudUser} />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accessibility" element={<AccessibilityPage preferences={preferences} setPreferences={setPreferences} />} />
          <Route path="*" element={<section className="panel page-panel"><p className="eyebrow">WRONG TURN?</p><h1>We couldn't find that page.</h1><Link className="hero-link" to="/">Back to your planner →</Link></section>} />
        </Routes>
      </main><footer><span>StudySnap</span><span>Make today count, one task at a time. <b>✦</b></span></footer>
    </div>
  </div>;
}

export default App;
