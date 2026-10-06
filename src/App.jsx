import React, { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import TaskCard from "./components/TaskCard.jsx";

function App() {
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem("studysnap_tasks");
    return savedTasks ? JSON.parse(savedTasks) : [];
  });
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("React");
  const [priority, setPriority] = useState("Medium");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    localStorage.setItem("studysnap_tasks", JSON.stringify(tasks));
  }, [tasks]);

  function addTask(event) {
    event.preventDefault();
    if (!title.trim()) return;

    const newTask = {
      id: Date.now(),
      title: title.trim(),
      subject,
      priority,
      completed: false,
    };
    setTasks([newTask, ...tasks]);
    setTitle("");
  }

  function completeTask(id) {
    setTasks(tasks.map((task) =>
      task.id === id ? { ...task, completed: true } : task
    ));
  }

  function deleteTask(id) {
    setTasks(tasks.filter((task) => task.id !== id));
  }

  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = tasks.length - completedCount;
  const visibleTasks = tasks.filter((task) => {
    if (filter === "Pending") return !task.completed;
    if (filter === "Completed") return task.completed;
    return true;
  });

  function renderTasks() {
    if (visibleTasks.length === 0) {
      return <p className="empty-state">{tasks.length === 0
        ? "No study tasks yet. Add your first task above."
        : "No tasks match this filter."}</p>;
    }

    return visibleTasks.map((task) => (
      <TaskCard key={task.id} task={task} onComplete={completeTask} onDelete={deleteTask} />
    ));
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">S</span>
          <span><strong>StudySnap</strong><small>Simple study planning for students</small></span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/tasks">Tasks</NavLink>
          <NavLink to="/about">About</NavLink>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={
            <>
              <section className="welcome">
                <div>
                  <p className="eyebrow">YOUR STUDY SPACE</p>
                  <h1>Plan your study.<br />Track your progress.</h1>
                  <p className="welcome-text">Keep your daily learning tasks organized in one place.</p>
                </div>
                <div className="welcome-icon" aria-hidden="true">📚</div>
              </section>

              <section className="stats" aria-label="Task statistics">
                <div className="stat-card"><span>{tasks.length}</span><p>Total tasks</p></div>
                <div className="stat-card"><span>{completedCount}</span><p>Completed</p></div>
                <div className="stat-card"><span>{pendingCount}</span><p>Pending</p></div>
              </section>

              <section className="content-grid">
                <div className="panel form-panel">
                  <div className="section-heading">
                    <div><p className="eyebrow">MAKE A PLAN</p><h2>Add a study task</h2></div>
                  </div>
                  <form onSubmit={addTask}>
                    <label htmlFor="task-title">Task title</label>
                    <input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Practice React Hooks" />
                    <div className="form-row">
                      <div><label htmlFor="subject">Subject</label>
                        <select id="subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
                          <option>React</option><option>JavaScript</option><option>Python</option><option>Database</option><option>Other</option>
                        </select>
                      </div>
                      <div><label htmlFor="priority">Priority</label>
                        <select id="priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
                          <option>Low</option><option>Medium</option><option>High</option>
                        </select>
                      </div>
                    </div>
                    <button className="primary-button" type="submit">Add task <span aria-hidden="true">＋</span></button>
                  </form>
                </div>

                <section className="panel task-panel">
                  <div className="section-heading task-list-heading">
                    <div><p className="eyebrow">STAY ON TRACK</p><h2>Study tasks</h2></div>
                    <Link className="see-all" to="/tasks">View all <span aria-hidden="true">→</span></Link>
                  </div>
                  <div className="task-list">{renderTasks()}</div>
                </section>
              </section>
            </>
          } />

          <Route path="/tasks" element={
            <section className="page-panel panel">
              <p className="eyebrow">YOUR PLAN</p><h1 className="page-title">All study tasks</h1>
              <div className="filters" aria-label="Filter tasks">
                {["All", "Pending", "Completed"].map((item) => (
                  <button key={item} className={filter === item ? "filter-button active" : "filter-button"} onClick={() => setFilter(item)}>{item}</button>
                ))}
              </div>
              <div className="task-list">{renderTasks()}</div>
            </section>
          } />

          <Route path="/about" element={
            <section className="about-card panel">
              <div className="brand-mark">S</div>
              <p className="eyebrow">ABOUT THIS PROJECT</p>
              <h1>StudySnap</h1>
              <p>A simple React-based student study planner created as a college mini-project.</p>
              <div className="technology"><strong>Technologies</strong><span>React.js · JavaScript · CSS · localStorage</span></div>
            </section>
          } />
          <Route path="*" element={<section className="panel page-panel"><h1>Page not found</h1><Link to="/">Back to dashboard</Link></section>} />
        </Routes>
      </main>

      <footer>Made for focused study, one task at a time.</footer>
    </div>
  );
}

export default App;
