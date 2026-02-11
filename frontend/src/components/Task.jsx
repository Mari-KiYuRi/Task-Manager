import dayjs from "dayjs";
import { Checkbox } from "@mui/material";
import React, { useState, useEffect } from "react";
import API from "../api";
import ConfirmationModal from './ConfirmationModal';
import DeleteSubtaskModal from "./DeleteSubtaskModal";

export default function Task(props) {
  const main = props.main;
  const taskTitle = props.taskTitle;

  const [isExpanded, setExpanded] = useState(false);
  const [showSubtaskInput, setShowSubtasks] = useState(true);
  const [currentSubtaskInput, setCurrentSubtaskInput] = useState("");
  const [checked, setChecked] = useState(Boolean(main.completed));
  const [subtasks, setSubtasks] = useState(null);
  const [display, setDisplay] = useState(true);
  const [priority, setPriority] = useState(main.priority || 'medium');
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskTitle, setEditTaskTitle] = useState(main.title);
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState("");
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [showDeleteSubtaskModal, setShowDeleteSubtaskModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [subtaskToDelete, setSubtaskToDelete] = useState(null);

  const token = localStorage.getItem("token");

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Функция для переключения меню
  const toggleMenu = (id) => {
    const newOpenMenuId = openMenuId === id ? null : id;
    setOpenMenuId(openMenuId === id ? null : id);
    setIsMenuOpen(!!newOpenMenuId);
  };

  // Закрытие меню при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.task-menu-container')) {
        setOpenMenuId(null);
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Закрываем меню если клик был вне меню
      if (openMenuId && !event.target.closest('.task-menu-container')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  const getSubtasks = async (id) => {
    const response = await fetch(`${API}/get_subtasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ task_id: id }),
    });
    const data = await response.json();
    return data?.response ?? [];
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!main?.id) { setSubtasks([]); return; }
      setSubtasks(null);
      try {
        const fetchedSubtasks = await getSubtasks(main.id);
        const sortedSubtasks = fetchedSubtasks.sort((a, b) => {
          if (a.completed && !b.completed) return 1;
          if (!a.completed && b.completed) return -1;
          return 0;
        })
        setSubtasks(sortedSubtasks);
      } catch {
        if (!cancelled) setSubtasks([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [main?.id, token]);

  const getTaskStatusClass = (task) => {
    const taskDate = dayjs(task.date);
    const isPast = taskDate.isBefore(dayjs(), "day");
    const isDone = checked;
    if (isDone) return "done";
    if (isPast) return "overdue";
    return "pending";
  };

  const getSubtaskStatusClass = (subtask, parentTaskDate) => {
    const taskData = dayjs(parentTaskDate);
    const isPast = taskData.isBefore(dayjs(), "day");
    const isDone = subtask.completed === 1;
    if (isDone) return "done";
    if (isPast) return "overdue";
    return "pending";
  }

  const updCurrentSubtask = async (subtaskValue, taskParent, id) => {
    setShowSubtasks(true);
    if (!subtaskValue?.trim()) return;

    if (!isExpanded) {
      setExpanded(true);
    }

    await fetch(`${API}/add_subtask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ task_id: id, subtask_title: subtaskValue.trim() }),
    });
    setCurrentSubtaskInput("");
    try {
      const data = await getSubtasks(id);
      const sortedSubtasks = data.sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return 0;
      });
      setSubtasks(Array.isArray(sortedSubtasks) ? sortedSubtasks : []);
    } catch { }
  };

  async function updateTask() {
    if (!editTaskTitle.trim()) {
      setEditTaskTitle(main.title);
      setIsEditingTask(false);
      return;
    }

    try {
      await fetch(`${API}/tasks/${main.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ title: editTaskTitle }),
      });
      setIsEditingTask(false);

      if (props.onTaskUpdate) {
        props.onTaskUpdate();
      }
    } catch (error) {
      console.error("Ошибка при обновлении задачи:", error);
    }
  }

  async function updateSubtask(subtaskId) {
    if (!editSubtaskTitle.trim()) {
      setEditingSubtaskId(null);
      setEditSubtaskTitle("");
      return;
    }

    try {
      await fetch(`${API}/subtasks/${subtaskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ subtask_title: editSubtaskTitle }),
      });

      setEditingSubtaskId(null);
      setEditSubtaskTitle("");

      const data = await getSubtasks(main.id);
      setSubtasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Ошибка при обновлении подзадачи:", error);
    }
  }

  const startEditingSubtask = (subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditSubtaskTitle(subtask.subtask_title);
  }

  async function updatePriority(newPriority) {
    try {
      await fetch(`${API}/tasks/${main.id}/priority`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ priority: newPriority }),
      });
      setPriority(newPriority);
      setIsEditingPriority(false);

      if (props.onTaskUpdate) {
        props.onTaskUpdate();
      }
    } catch (error) {
      console.error("Ошибка при обновлении приоритета:", error);
    }
  }

  async function toggleTask(id) {
    try {
      if (subtasks && subtasks.length > 0) {
        const allSubtasksCompleted = subtasks.every(st => st.completed === 1);

        if (!allSubtasksCompleted) {
          alert("Нельзя отметить задачу выполненной, пока не выполнены все подзадачи");
          return;
        }
      }

      console.log(id);
      await fetch(`${API}/tasks/${id}/toggle`, {
        method: "PUT",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      setChecked(!checked);

      if (props.onTaskUpdate) {
        props.onTaskUpdate();
      }
    } catch (error) {
      console.error("Ошибка при переключении задачи:", error);
    }
  }

  async function toggleSubtask(id) {
    try {
      const oldSubtask = subtasks.find(st => st.id === id);
      if (!oldSubtask) return;

      const newCompleted = oldSubtask.completed ? 0 : 1;

      const updateSubtasks = subtasks.map(st =>
        st.id === id ? { ...st, completed: newCompleted } : st
      ).sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        return 0;
      });

      setSubtasks(updateSubtasks);

      await fetch(`${API}/subtasks/${id}/toggle`, {
        method: "PUT",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      const allSubtasksCompleted = updateSubtasks.every(st => st.completed === 1);

      if (allSubtasksCompleted && !checked) {
        await fetch(`${API}/tasks/${main.id}/toggle`, {
          method: "PUT",
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        setChecked(true);

        if (props.onTaskUpdate) {
          props.onTaskUpdate();
        }
      }
    } catch (error) {
      console.error("Ошибка при переключении подзадачи:", error);
      setSubtasks(prev =>
        prev.map(st => st.id === id ? { ...st, completed: oldSubtask.completed } : st)
      );
      console.log(st.id.completed);
    }
  }

  async function removeTask(id) {
    setShowDeleteTaskModal(false);
    try {
      const taskResponse = await fetch(`${API}/tasks/${id}`, {
        method: "GET",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      if (!taskResponse.ok) {
        throw new Error("Не удалось получить информацию о задаче");
      }

      const task = await taskResponse.json();

      if (task.repeat_type && task.repeat_type !== "once") {
        setTaskToDelete({ id, task });
        setShowDeleteTaskModal(true);
      } else {
        setTaskToDelete({ id, task });
        setShowDeleteTaskModal(true);
      }
    } catch (error) {
      console.error("Ошибка при получении информации о задаче:", error);
    }
  }

  async function removeSubtask(id) {
    setSubtaskToDelete(id);
    setShowDeleteSubtaskModal(true);
  }

  const confirmDeleteTask = async (deleteFutureOnly = false) => {
    if (!taskToDelete) return;  

    try {
      const task = taskToDelete.task;
      if (task.repeat_type && task.repeat_type !== "once") {
        if (deleteFutureOnly) {
          await fetch(`${API}/tasks/${taskToDelete.id}/series`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : ""
            },
            body: JSON.stringify({ delete_all: false })
          });
        } else {
          await fetch(`${API}/tasks/${taskToDelete.id}`, {
            method: "DELETE",
            headers: {Authorization: token ? `Bearer ${token}` : ""}
          });
        }
      } else {
        await fetch(`${API}/tasks/${taskToDelete.id}`, {
          method: "DELETE",
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
      }

      setDisplay(false);
      if (props.onTaskUpdate) {
        props.onTaskUpdate();
      }
    } catch (error) {
      console.error("Ошибка при удалении задачи:", error);
    } finally {
      setShowDeleteTaskModal(false);
      setTaskToDelete(null);
    }
  };

  const confirmDeleteSubtask = async () => {
    if (!subtaskToDelete) return;

    try {
      const response = await fetch(`${API}/subtasks/${subtaskToDelete}`, {
      method: "DELETE",
      headers: { 
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Ошибка при удалении подзадачи");
      }

      if (main.id) {
        const data = await getSubtasks(main.id);
        const sortedSubtasks = data.sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
          return 0;
        });
        setSubtasks(Array.isArray(sortedSubtasks) ? sortedSubtasks : []);
      }
    } catch (error) {
      console.error("Ошибка при удалении подзадачи:", error);
    } finally {
      setShowDeleteSubtaskModal(false);
      setSubtaskToDelete(null);
    }
  };

  return (
    <div key={taskTitle} className="task-group" style={{ display: display ? "block" : "none" }}>
      {main && (
        <div
          className={`task main-task ${getTaskStatusClass(main)} 
            ${subtasks && subtasks.length > 0 && subtasks.some(st => st.completed === 0) ? 'locked' : ''}
            ${openMenuId === main.id ? ' menu-open' : ''}
          `}
          data-task-id={main.id}
        >

          <div
            className="task-content"
            onClick={(e) => {
              // Обработчик только для области контента
              if (Array.isArray(subtasks) && subtasks.length > 0) {
                setExpanded(!isExpanded);
                return;
              }

              const isPast = dayjs(main.date).isBefore(dayjs(), "day");
              if (!isPast) toggleTask(main.id);
            }}
          >
            <div className="task-content">
              <div className="task-main">
                {Array.isArray(subtasks) && subtasks.length > 0 && (
                  <button
                    className="expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(!isExpanded);
                    }}
                  >
                    {isExpanded ? "▼" : "►"}
                  </button>
                )}

                {isEditingTask ? (
                  <input
                    type="text"
                    value={editTaskTitle}
                    onChange={(e) => setEditTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateTask();
                      if (e.key === 'Escape') {
                        setEditTaskTitle(main.title);
                        setIsEditingTask(false);
                      }
                    }}
                    onBlur={updateTask}
                    autoFocus
                    className="task-edit-input"
                  />
                ) : (
                  <div
                    className={`task-title ${checked ? "completed" : ""}`}
                    onDoubleClick={() => setIsEditingTask(true)}
                  >
                    {main.title}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="row">
            {Array.isArray(subtasks) && subtasks.length > 0 && (
              <span className="subtask-count">
                ({subtasks.filter(st => st.completed === 1).length}/{subtasks.length})
              </span>
            )}
            <div className={`priority-indicator ${openMenuId === main.id ? 'menu-open' : ''}`}>
              {isEditingPriority ? (
                <select
                  value={priority}
                  onChange={(e) => updatePriority(e.target.value)}
                  onBlur={() => setIsEditingPriority(false)}
                  className="priority-select-small"
                  autoFocus
                >
                  <option value="high">Высокий</option>
                  <option value="medium">Средний</option>
                  <option value="low">Низкий</option>
                </select>
              ) : (
                <span
                  className={`priority-badge priority-${priority}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingPriority(true);
                  }}
                  title="Кликните для изменения приоритета"
                />
              )}
            </div>

            <Checkbox
              className={`${openMenuId === main.id ? 'menu-open' : ''}`}
              inputProps={{ 'aria-label': 'Checkbox demo' }}
              color="default"
              checked={checked}
              disabled={subtasks && subtasks.length > 0 && subtasks.some(st => st.completed === 0)}
              onChange={() => {
                toggleTask(main.id);
                setChecked(!checked);
              }}
            />

            <div className="task-menu-container">
              <button
                className={`menu-trigger-btn ${openMenuId === main.id ? 'menu-open' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMenu(main.id);
                }}
              >
                ⋮
              </button>

              {openMenuId === main.id && (
                <div className="task-menu">
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setShowSubtasks(!showSubtaskInput);
                    setOpenMenuId(null);
                  }}>
                    Добавить подзадачу
                  </button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTask(true);
                    setOpenMenuId(null);
                  }}>
                    Изменить
                  </button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    removeTask(main.id);
                    setOpenMenuId(null);
                  }}>
                    Удалить
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {!showSubtaskInput && (
        <div className="subtask-input">
          <input
            placeholder="Новая подзадача..."
            value={currentSubtaskInput}
            onChange={(e) => setCurrentSubtaskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updCurrentSubtask(currentSubtaskInput, taskTitle, main.id)}
            autoFocus
          />
        </div>
      )}

      {isExpanded && Array.isArray(subtasks) && subtasks.length > 0 && (
        <div className="subtasks-container">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className={`task subtasks-list main-task
              ${getSubtaskStatusClass(subtask, main.date)}
              ${openMenuId === subtask.id ? 'menu-open' : ''}`}>
              {editingSubtaskId === subtask.id ? (
                <input
                  type="text"
                  value={editSubtaskTitle}
                  onChange={(e) => setEditSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') updateSubtask(subtask.id);
                    if (e.key === 'Escape') {
                      setEditingSubtaskId(null);
                      setEditSubtaskTitle("");
                    }
                  }}
                  onBlur={() => updateSubtask(subtask.id)}
                  autoFocus
                  className="subtask-edit-input"
                />
              ) : (
                <span
                  className={subtask.completed ? "completed" : ""}
                  onDoubleClick={() => startEditingSubtask(subtask)}
                >
                  {subtask.subtask_title}
                </span>
              )}

              <div className="row">

                <Checkbox
                  inputProps={{ 'aria-label': 'Checkbox demo' }}
                  color="default"
                  checked={subtask.completed === 1}
                  onChange={() => toggleSubtask(subtask.id)}
                />

                <div className="task-menu-container">
                  <button
                    className="menu-trigger-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMenu(subtask.id);
                    }}
                  >
                    ⋮
                  </button>

                  {openMenuId === subtask.id && (
                    <div
                      className="task-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button onClick={(e) => {
                        e.stopPropagation();
                        startEditingSubtask(subtask);
                        setOpenMenuId(null);
                      }}>
                        Изменить
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        removeSubtask(subtask.id);
                        setOpenMenuId(null);
                      }}>
                        Удалить
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmationModal
        isOpen={showDeleteTaskModal && taskToDelete}
        onClose={() => {
          setShowDeleteTaskModal(false);
          setTaskToDelete(null);
        }}
        onConfirm={() => confirmDeleteTask(false)}
        onSecondaryConfirm={
          taskToDelete?.task?.repeat_type &&
            taskToDelete.task.repeat_type !== "once" ?
            () => confirmDeleteTask(true) : null
        }
        title="Удаление задачи"
        message={
          taskToDelete?.task?.repeat_type && taskToDelete.task.repeat_type !== "once" ?
            `Эта задача повторяется (${taskToDelete.task.repeat_type === "daily" ? 
            "ежедневно" : "еженедельно"}).\nЧто вы хотите удалить?` : ""
        }
        confirmText={
          taskToDelete?.task?.repeat_type && taskToDelete.task.repeat_type !== "once" ?
            "Только эту задачу" : "Удалить"
        }
        secondaryText={
          taskToDelete?.task?.repeat_type && taskToDelete.task.repeat_type !== "once" ?
            "Все начиная с этого дня" : null
        }
        type="danger"
      />

      <DeleteSubtaskModal
        isOpen={showDeleteSubtaskModal}
        onClose={() => {
          setShowDeleteSubtaskModal(false);
          setSubtaskToDelete(null);
        }}
        onConfirm={confirmDeleteSubtask}
      />
    </div>
  );
}