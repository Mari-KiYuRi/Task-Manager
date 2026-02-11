import React, { useState, useEffect, useRef } from "react";
import { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSearchParams } from "react-router-dom";

import ru from "date-fns/locale/ru";
import dayjs from "dayjs";
import "dayjs/locale/ru";

import isoWeek from "dayjs/plugin/isoWeek";
import DatePicker from "react-datepicker";

import API from "../api";
import Task from "../components/Task";

dayjs.extend(isoWeek);
dayjs.locale("ru");
registerLocale('ru', ru);

export default function Week() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [pickerOpen, setPickerOpen] = useState(false);
    const [daysOpen, setDaysOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [activeDate, setActiveDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [repeatType, setRepeatType] = useState("once");
    const [priority, setPriority] = useState("medium");
    const [tasks, setTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [title, setTitle] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [subtaskInputs, setSubtaskInputs] = useState(new Set());
    const [subtaskTitles, setSubtaskTitles] = useState({});
    const token = localStorage.getItem("token");

    const calendarRef = React.useRef(null);
    const daysRef = React.useRef(null);
    const searchRef = React.useRef(null);

    const [searchParams] = useSearchParams();

    useEffect(() => {
        const dateFromUrl = searchParams.get('date');
        if (dateFromUrl) {
            setActiveDate(dateFromUrl);
            setSelectedDate(new Date(dateFromUrl));
            fetchTasks(dateFromUrl);
        }
    }, [searchParams]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setPickerOpen(false);
            }
            if (daysRef.current && !daysRef.current.contains(event.target)) {
                setDaysOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const startOfWeek = dayjs(selectedDate).startOf("isoWeek");
    const days = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, "day"));
    const today = dayjs().format("YYYY-MM-DD");
    const user_id = localStorage.getItem("id");

    useEffect(() => {
        fetchTasks(activeDate);
        fetchAllTasks();
    }, [activeDate]);

    // поиск задач
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setSearchResults([]);
            return;
        }

        const query = searchQuery.toLowerCase();
        const results = allTasks.filter(task =>
            task.title.toLowerCase().includes(query)
        ).slice(0, 20); // ограничение: 20 результатов

        setSearchResults(results);
    }, [searchQuery, allTasks]);

    // загрузка всех задач пользователя
    async function fetchAllTasks() {
        if (isLoading) return;

        setIsLoading(true);
        try {
            const startDate = dayjs().subtract(5, 'year').format('YYYY-MM-DD');
            const endDate = dayjs().add(5, 'year').format('YYYY-MM-DD');

            const res = await fetch(`${API}/tasks/range`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    user_id: user_id,
                    start_date: startDate,
                    end_date: endDate
                })
            });
            
            if (res.ok) {
                const allFetchedTasks = await res.json();
                setAllTasks(allFetchedTasks);
            } else {
                console.error('Ошибка при загрузке задач за период');
                setAllTasks([]);
            }
        } catch (e) {
            console.error("Ошибка при получении всех задач:", e);
            setAllTasks([]);
        } finally {
            setIsLoading(false);
        }
    }

    // загрузка задач для выбранного дня
    async function fetchTasks(date) {
        try {
            console.log('Fetching tasks for date:', date, 'user_id:', user_id);

            const res = await fetch(`${API}/tasks/date/${date}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    user_id: user_id,
                })
            });

            console.log('Response status:', res.status);
            // const resClone = res.clone();
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error("Ошибка при получении задач:", res.status, errorText);
                return;
            }

            const data = await res.json();
            console.log('Received tasks:', data);

            const sortedTasks = data.sort((a,b) => {
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                
                const priorityOrder = {high: 3, medium: 2, low: 1};
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];

                if (priorityDiff !== 0) return priorityDiff;
                return 0;
            })

            setTasks(sortedTasks);
        } catch (e) {
            console.error("Ошибка при получении задач:", e);
        }
    }

    // добавление основной задачи
    async function addTask() {
        if (!title.trim()) return;
        try {
            await fetch(`${API}/add_task`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({
                    user_id,
                    title,
                    date: dayjs(activeDate).format("YYYY-MM-DD"),
                    repeat_type: repeatType,
                    priority: priority,
                }),
            });

            setTitle("");
            fetchTasks(activeDate);
            fetchAllTasks();
        } catch (error) {
            console.error("Ошибка при добавлении задачи:", error);
        }
    }

    // добавление подзадачи (просто как отдельная задача)
    async function addSubtask(parentTaskTitle) {
        const subtaskTitle = subtaskTitles[parentTaskTitle];
        if (!subtaskTitle?.trim()) {
            hideSubtaskInput(parentTaskTitle);
            return;
        }

        try {
            await fetch(`${API}/add_task`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({
                    user_id,
                    title: `${parentTaskTitle} → ${subtaskTitle}`,
                    date: dayjs(activeDate).format("YYYY-MM-DD"),
                }),
            });

            // Очищаем поле ввода и скрываем его
            hideSubtaskInput(parentTaskTitle);

            fetchTasks(activeDate);
            fetchAllTasks();
        } catch (error) {
            console.error("Ошибка при добавлении подзадачи:", error);
        }
    }

    // скрыть поле ввода подзадачи
    const hideSubtaskInput = (taskTitle) => {
        setSubtaskTitles(prev => ({
            ...prev,
            [taskTitle]: ""
        }));
        setSubtaskInputs(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskTitle);
            return newSet;
        });
    };

    // выбор задачи из поиска
    const handleSearchResultClick = (task) => {
        setActiveDate(task.date);
        setSearchQuery("");
        setSearchOpen(false);
        setSelectedDate(new Date(task.date));

        setTimeout(() => {
            const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
            if (taskElement) {
                taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    taskElement.style.backgroundColor = '';
                }, 2000);
            }
        }, 100);
    };

    // показать/скрыть поле ввода подзадачи
    const toggleSubtaskInput = (taskTitle) => {
        setSubtaskInputs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskTitle)) {
                newSet.delete(taskTitle);
            } else {
                newSet.add(taskTitle);
            }
            return newSet;
        });

        // Инициализируем поле ввода если его нет
        if (!subtaskTitles[taskTitle]) {
            setSubtaskTitles(prev => ({
                ...prev,
                [taskTitle]: ""
            }));
        }
    };

    // обновление текста подзадачи
    const updateSubtaskTitle = (taskTitle, value) => {
        setSubtaskTitles(prev => ({
            ...prev,
            [taskTitle]: value
        }));
    };

    // обработка потери фокуса для поля ввода подзадачи
    const handleSubtaskBlur = (taskTitle) => {
        // Добавляем небольшую задержку, чтобы клик по кнопке "Добавить" успел обработаться
        setTimeout(() => {
            hideSubtaskInput(taskTitle);
        }, 100);
    };

    //навигация по дням
    const goToPreviousDay = () => {
        const newDate = dayjs(activeDate).subtract(1, 'day');
        setActiveDate(newDate.format("YYYY-MM-DD"));
        setSelectedDate(newDate.toDate());
    };

    const goToNextDay = () => {
        const newDate = dayjs(activeDate).add(1, 'day');
        setActiveDate(newDate.format("YYYY-MM-DD"));
        setSelectedDate(newDate.toDate());
    };

    // календарь
    const openCalendar = () => {
        setPickerOpen(true);
        setDaysOpen(false);
        setSearchOpen(false);
    };
    const openDaysDropdown = () => {
        setDaysOpen(true);
        setPickerOpen(false);
        setSearchOpen(false);
    };

    const openSearch = () => {
        setSearchOpen(true);
        setPickerOpen(false);
        setDaysOpen(false);
    };

    const onDateSelect = (date) => {
        setSelectedDate(date);
        const newActive = dayjs(date).format("YYYY-MM-DD");
        setActiveDate(newActive);
        setPickerOpen(false);
    };

    const onDaySelect = (dateStr) => {
        setActiveDate(dateStr);
        setSelectedDate(new Date(dateStr));
        setDaysOpen(false);
    };

    // Группировка задач по основным задачам и подзадачам
    const groupedTasks = tasks.reduce((acc, task) => {
        if (task.title.includes(' → ')) {
            const [mainTask, subtask] = task.title.split(' → ');
            if (!acc[mainTask]) {
                acc[mainTask] = { main: null, subtasks: [] };
            }
            acc[mainTask].subtasks.push(task);
        } else {
            if (!acc[task.title]) {
                acc[task.title] = { main: task, subtasks: [] };
            } else {
                acc[task.title].main = task;
            }
        }
        return acc;
    }, {});
        
    return (
        <div className="week-container">
            {/* Верхняя панель с календарем и выбором дня */}
            <div className="week-controls">
                <div className="control-group">
                    <div className="week-range" onClick={openCalendar}>
                        {startOfWeek.format("DD.MM")} —{" "}
                        {startOfWeek.add(6, "day").format("DD.MM.YYYY")} ▼
                    </div>

                    {pickerOpen && (
                        <div ref={calendarRef} className="calendar-popup">
                            <DatePicker
                                inline
                                selected={selectedDate}
                                onChange={(date) => {
                                    onDateSelect(date);
                                    setPickerOpen(false);
                                }}
                                dateFormat="dd.MM.yyyy"
                                calendarClassName="custom-calendar"
                                calendarStartDay={1}
                                locale="ru"
                                dropdownMode="select"
                            />
                        </div>
                    )}
                </div>

                <div className="control-group">
                    <div className="days-dropdown-trigger" onClick={openDaysDropdown}>
                        {dayjs(activeDate).format("dddd, DD.MM.YYYY")} ▼
                    </div>

                    {daysOpen && (
                        <div ref={daysRef} className="days-dropdown">
                            {days.map((d) => {
                                const dateStr = d.format("YYYY-MM-DD");
                                const isActive = dateStr === activeDate;
                                const isToday = dateStr === today;
                                const isWeekend = d.isoWeekday() >= 6;

                                return (
                                    <div
                                        key={dateStr}
                                        className={`day-option ${isActive ? "active" : ""} ${isWeekend ? "weekend" : ""}`}
                                        onClick={() => onDaySelect(dateStr)}
                                    >
                                        <span className="day-name">{d.format("dddd")}</span>
                                        {isToday && <span className="today-badge">сегодня</span>}
                                        <span className="day-date">{d.format("DD.MM.YYYY")}</span>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="control-group search-group">
                    <div className="search-container" ref={searchRef}>
                        <input
                            type="text"
                            placeholder="Поиск по задачам..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={openSearch}
                            className="search-input"
                        />

                        {searchOpen && searchResults.length > 0 && (
                            <div className="search-results">
                                {searchResults.map((task) => (
                                    <div
                                        key={task.id}
                                        className="search-result-item"
                                        onClick={() => handleSearchResultClick(task)}
                                    >
                                        <div className="search-task-title">
                                            {task.title}
                                        </div>
                                        <div className="search-task-date">
                                            {dayjs(task.date).format("DD.MM.YYYY")}
                                        </div>
                                        <div className={`search-task-status ${task.completed ? 'completed' : 'pending'}`}>
                                            {task.completed ? '✓' : '✕'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {searchOpen && searchQuery.trim() !== "" && searchResults.length === 0 && (
                            <div className="search-results">
                                <div className="search-no-results">
                                    Задачи не найдены
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Основная область с задачами */}
            <main className="task-panel-center">
                <div className="day-navigation">
                    <button
                        className="nav-btn prev-day"
                        onClick={goToPreviousDay}
                        title="Предыдущий день">
                        ◀
                    </button>
                    <h2 className="task-header">
                        Задачи на {dayjs(activeDate).format("dddd, DD.MM.YYYY")}
                    </h2>
                    <button
                        className="nav-btn next-day"
                        onClick={goToNextDay}
                        title="Следующий день">
                        ▶
                    </button>
                </div>

                <div className="task-input-container">
                    <input
                        placeholder="Новая задача"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTask()}
                        className="search-input"
                    />

                    <div className="repeat-select-container">
                        <select 
                        value={repeatType}
                        onChange={(e) => setRepeatType(e.target.value)}
                        className="repeat-select"
                        >
                        <option value="once">Разовая</option>
                        <option value="daily">Ежедневная</option>
                        <option value="weekly">Еженедельная</option>
                        </select>
                    </div>

                    <button className="btn" onClick={addTask}>
                        Добавить
                    </button>
                </div>

                <div className="task-list">
                    {tasks.length === 0 ? (
                        <div className="empty">Нет задач на этот день</div>
                    ) : (
                        Object.entries(groupedTasks).map(([taskTitle, { main, subtasks }]) => {
                            return (
                                <Task 
                                    key={main.id} 
                                    main={main} 
                                    taskTitle={taskTitle}
                                    onTaskUpdate={() => {
                                        fetchTasks(activeDate);
                                        fetchAllTasks();
                                    }}
                                />
                            );
                        })
                    )}
                </div>
            </main>
        </div>
    );
}