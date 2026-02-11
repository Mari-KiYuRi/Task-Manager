import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import { API } from "../api";
import { set } from "date-fns";


export default function TaskCalendar() { 
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [allTasks, setAllTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [tasksByDate, setTasksByDate] = useState({});
    const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);

    const navigate = useNavigate();
    const monthYearPickerRef = useRef(null);
    const monthYearBtnRef = useRef(null);

    const token = localStorage.getItem("token");
    const user_id = localStorage.getItem("id");
    const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const currentYear = dayjs().year();
    const years = Array.from({length: 11}, (_, i) => currentYear - 5 + i);
    
    useEffect(() => {
        function handleClickOutside(event) {
            if (showMonthYearPicker &&
                monthYearPickerRef.current && 
                !monthYearPickerRef.current.contains(event.target) &&
                monthYearBtnRef.current &&
                !monthYearBtnRef.current.contains(event.target)) {
                setShowMonthYearPicker(false);
            }
        }

        if (showMonthYearPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => { document.removeEventListener('mousedown', handleClickOutside); }
    }, [showMonthYearPicker]);

    const generateCalendar = (date = currentDate) => {
        const monthStart = date.startOf('month');
        const monthEnd = date.endOf('month');
        const calendarStart = monthStart.startOf('week');
        const calendarEnd = monthEnd.endOf('week');

        const days = [];
        let currentDay = calendarStart;

        while (currentDay.isBefore(calendarEnd) || currentDay.isSame(calendarEnd)) {
            days.push(currentDay);
            currentDay = currentDay.add(1,'day');
        }

        const calendarDays = [];
        for (let i = 0; i < days.length; i += 7) {
            calendarDays.push(days.slice(i, i + 7));
        }
        
        return calendarDays;
    }

    const calendarDays = generateCalendar();

    // загрузка всех задач для отображения в календаре
    async function fetchTasksForCalendar() {
        if (isLoading) return;

        setIsLoading(true);
        try {
            const calendarStart = currentDate.startOf('month').startOf('week');
            const calendarEnd = currentDate.endOf('month').endOf('week');

            const dates = [];
            let current = calendarStart;

            while(current.isBefore(calendarEnd) || current.isSame(calendarEnd)) {
                dates.push(current.format('YYYY-MM-DD'));
                current = current.add(1, 'day');
            }

            console.log('Загрузка задач для календаря, даты:', dates.length);
            
            // Получаем задачи для всех дат в календаре
            const tasksPromises = dates.map(date =>
                fetch(`${API}/tasks/date/${date}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        user_id: user_id,
                    })
                })
                .then(res => res.ok ? res.json() : [])
                .catch(error => {
                    console.error(`Ошибка при загрузке задач для ${date}:`, error);
                    return [];
                })
            );

            const tasksArrays = await Promise.all(tasksPromises);
            const allFetchedTasks = tasksArrays.flat();

            const tasksByDateMap = {};
            dates.forEach(date => {
                tasksByDateMap[date] = [];
            });

            allFetchedTasks.forEach(task => {
                if (tasksByDateMap[task.date]) {
                    tasksByDateMap[task.date].push(task);
                }
            });

            Object.keys(tasksByDateMap).forEach(date => {
                tasksByDateMap[date] = tasksByDateMap[date].sort((a, b) => {
                    if (a.completed && !b.completed) return 1;
                    if (!a.completed && b.completed) return -1;
                    return 0;
                });
            });

            setTasksByDate(tasksByDateMap);
            setAllTasks(allFetchedTasks);

        } catch (e) {
            console.error("Ошибка при получении задач для календаря:", e);
            setTasksByDate({});
            setAllTasks([]);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchTasksForCalendar();
    }, [currentDate]);

    const goToPreviousMonth = () => {
        setCurrentDate(currentDate.subtract(1, 'month'));
    };

    const goToNextMonth = () => {
        setCurrentDate(currentDate.add(1, 'month'));
    };

    const goToToday = () => {
        setCurrentDate(dayjs());
        setShowMonthYearPicker(false);
    };

    const handleMonthYearChange = (monthIndex, year) => {
        const newDate = currentDate.month(monthIndex).year(year);
        setCurrentDate(newDate);
        setShowMonthYearPicker(false);
    }

    const getDayClass = (day) => {
        const today = dayjs().format('YYYY-MM-DD');
        const dayStr = day.format('YYYY-MM-DD');
        const isToday = dayStr === today;
        const isCurrentMonth = day.month() === currentDate.month();
        const isWeekend = day.day() === 0 || day.day() === 6;

        let className = 'calendar-day';
        if (!isCurrentMonth) className += ' other-month';
        if (isToday) className += ' today';
        if (isWeekend) className += ' weekend';

        return className;
    };

    const getTasksForDay = (day) => {
        const dayStr = day.format('YYYY-MM-DD');
        return tasksByDate[dayStr] || [];
    };

    const getDayStatus = (day) => {
        const tasks = getTasksForDay(day);
        if (tasks.length === 0) return 'no-tasks';

        const completedTasks = tasks.filter(task => task.completed);
        const pendingTasks = tasks.filter(task => !task.completed);
        const overdueTasks = tasks.filter(task => task.date >= dayjs().format('YYYY-MM-DD'));
        
        if (overdueTasks.length === tasks.length) return 'all-overdue';
        if (completedTasks.length === tasks.length) return 'all-completed';
        if (pendingTasks.length === tasks.length) return 'all-pending';
        return 'mixed';
    };

    const handleDayClick = (day) => {
        const selectedDate = day.format('YYYY-MM-DD');
        navigate(`/?date=${selectedDate}`);
    }

    const handleTaskClick = (task, event) => {
        event.stopPropagation();
        navigate(`/?date=${task.date}`);
    }

    return (
        <div className='calendar-container'>
            <div>
                <div className="calendar-header">
                    <button className="nav-btn" onClick={goToPreviousMonth}>
                        ◀
                    </button>
                    <div className="month-year-selector">
                        <button 
                            ref={monthYearBtnRef}
                            className="month-year-btn" 
                            onClick={() => setShowMonthYearPicker(!showMonthYearPicker)}>
                            <h2>
                                {currentDate.format("MMMM YYYY").charAt(0).toUpperCase() + 
                                currentDate.format("MMMM YYYY").slice(1)} ▼
                            </h2>
                        </button>

                        {showMonthYearPicker && (
                            <div className="month-year-picker" ref={monthYearPickerRef}>
                                <div className="months-grid">
                                    {months.map((month, index) => (
                                        <button
                                            key={month}
                                            className={`month-btn ${index === currentDate.month() && currentDate.year() === currentDate.year() ? 'selected' : ''}`}
                                            onClick={() => handleMonthYearChange(index, currentDate.year())}
                                        >
                                            {month}
                                        </button>
                                    ))}
                                </div>
                                <div className="years-grid">
                                    {years.map(year => (
                                        <button
                                            key={year}
                                            className={`year-btn ${year ===currentDate.year() ? 'selected' : ''}`}
                                            onClick={() => handleMonthYearChange(currentDate.month(), year)}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button className="nav-btn" onClick={goToNextMonth}>
                        ▶
                    </button>
                </div>                
            </div>

            <table className="calendar-table">
                <thead>
                    <tr>
                        {daysOfWeek.map(day => (
                            <th key={day} className='day-header'>{day}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {calendarDays.map((week, weekIndex) => (
                        <tr key={weekIndex} className="calendar-week">
                            {week.map((day, dayIndex) => {
                                const dayTasks = getTasksForDay(day);
                                const dayStatus = getDayStatus(day);
                                const isPast = day.isBefore(dayjs(), 'day');

                                return (
                                    <td 
                                        key={`${weekIndex}-${dayIndex}`}
                                        className={getDayClass(day)}
                                        onClick={() => handleDayClick(day)}
                                    >
                                    <div className="day-number">
                                        {day.format('D')}
                                    </div>
                                    <div className="calendar-tasks-container">
                                        {dayTasks.slice(0, 3).map(task => (
                                            <div
                                                key={task.id}
                                                className={`calendar-task ${task.completed ? 'completed' : 'pending'} ${isPast && !task.completed ? 'overdue' : ''}`}
                                                title={task.title}
                                                onClick={(e) => handleTaskClick(task, e)}
                                            >
                                                {window.innerWidth <= 480
                                                    ? (task.title.length > 8 ? task.title.substring(0, 8) + '...' : task.title)
                                                    : (task.title.length > 15 ? task.title.substring(0, 15) + '...' : task.title)
                                                }
                                            </div>
                                        ))}
                                        {dayTasks.length > 3 && (
                                            <div className="more-tasks">
                                                + ещё {dayTasks.length - 3}
                                            </div>
                                        )}
                                    </div>
                                    {dayTasks.length > 0 && (
                                        <div className={`day-status ${dayStatus}`}>
                                            {dayTasks.filter(t => !t.completed).length}/{dayTasks.length}
                                        </div>
                                    )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {isLoading && (
                <div className="loading-indicator">
                    Загрузка задач...
                </div>
            )}
        </div>
    );
}