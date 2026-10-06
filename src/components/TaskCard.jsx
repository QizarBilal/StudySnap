import React from "react";

function TaskCard({ task, onComplete, onDelete }) {
  return (
    <article className={`task-card ${task.completed ? "is-complete" : ""}`}>
      <div className="task-copy">
        <div className="task-heading">
          <h3>{task.title}</h3>
          <span className={`priority priority-${task.priority.toLowerCase()}`}>
            {task.priority}
          </span>
        </div>
        <p className="task-subject">{task.subject}</p>
        {task.completed && <p className="completed-note">✓ Completed</p>}
      </div>
      <div className="task-actions">
        {!task.completed && (
          <button className="text-button" onClick={() => onComplete(task.id)}>
            Mark complete
          </button>
        )}
        <button
          className="text-button delete-button"
          onClick={() => onDelete(task.id)}
          aria-label={`Delete ${task.title}`}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default TaskCard;
