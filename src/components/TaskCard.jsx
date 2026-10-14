import React, { useState } from "react";

function TaskCard({ task, onUpdate, onDelete, compact = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: task.title, notes: task.notes || "", subtasks: (task.subtasks || []).map((item) => item.title || item.text || "").join("\n") });
  const overdue = !task.completed && task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10);

  function save(event) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    onUpdate(task.id, { title, notes: draft.notes.trim(), subtasks: draft.subtasks.split("\n").map((value) => value.trim()).filter(Boolean).map((text, index) => ({ id: task.subtasks?.[index]?.id || `${task.id}-sub-${index}`, text, completed: task.subtasks?.[index]?.completed || false })) });
    setEditing(false);
  }

  return <article className={`task-card ${task.completed ? "is-complete" : ""} ${compact ? "is-compact" : ""}`}>
    <button className={`completion-toggle ${task.completed ? "checked" : ""}`} aria-label={task.completed ? `Reopen ${task.title}` : `Mark ${task.title} complete`} onClick={() => onUpdate(task.id, { completed: !task.completed })}>{task.completed && <span>✓</span>}</button>
    <div className="task-copy">
      {editing ? <form className="edit-form" onSubmit={save}><input aria-label="Task title" maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} autoFocus /><textarea aria-label="Task notes" placeholder="Notes" maxLength={1000} rows="2" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /><textarea aria-label="Subtasks, one per line" placeholder="Subtasks, one per line" maxLength={1000} rows="2" value={draft.subtasks} onChange={(event) => setDraft({ ...draft, subtasks: event.target.value })} /><div><button className="text-button" type="submit">Save</button><button className="text-button muted-button" type="button" onClick={() => setEditing(false)}>Cancel</button></div></form> : <>
        <div className="task-heading"><h3>{task.title}</h3><span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span></div>
        <p className="task-meta"><span>{task.subject}</span><i>·</i><span>◷ {Number(task.estimate) >= 60 ? `${Number(task.estimate) / 60} hr${Number(task.estimate) > 60 ? "s" : ""}` : `${task.estimate} min`}</span>{task.dueDate && <><i>·</i><span className={overdue ? "overdue" : ""}>{overdue ? "Overdue" : `Due ${new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}</span></>}</p>
        {task.notes && !compact && <p className="task-notes">{task.notes}</p>}
        {task.subtasks?.length > 0 && <div className="subtask-list">{task.subtasks.map((subtask, index) => <label key={subtask.id || index}><input type="checkbox" checked={Boolean(subtask.completed)} onChange={(event) => onUpdate(task.id, { subtasks: task.subtasks.map((item, itemIndex) => itemIndex === index ? { ...item, completed: event.target.checked } : item) })}/><span className={subtask.completed ? "subtask-done" : ""}>{subtask.text || subtask.title}</span></label>)}</div>}
        {task.completed && <p className="completed-note"><span>✓</span> Completed</p>}
      </>}
    </div>
    {!editing && <div className="task-actions"><button className="icon-button" onClick={() => { setDraft({ title: task.title, notes: task.notes || "" }); setEditing(true); }} aria-label={`Edit ${task.title}`} title="Edit">✎</button><button className="icon-button delete-button" onClick={() => onDelete(task.id)} aria-label={`Delete ${task.title}`} title="Delete">×</button></div>}
  </article>;
}

export default TaskCard;
