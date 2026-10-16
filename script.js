
"use strict";

const STORAGE_KEY = "studybuddy.tasks.v1";
const $ = (id) => document.getElementById(id);

const form = $("studyForm");
const titleInput = $("taskTitle");
const subjectInput = $("taskSubject");
const dateInput = $("taskDate");
const priorityInput = $("taskPriority");
const taskList = $("taskList");
const emptyState = $("emptyState");
const searchInput = $("searchInput");
const statusFilter = $("statusFilter");
const subjectFilter = $("subjectFilter");
const toast = $("toast");

let tasks = [];
let toastTimer;

function todayString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function makeId() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    showToast("Couldn't save changes. Browser storage may be unavailable.");
    return false;
  }
}

function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return getStarterTasks();

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Invalid task data");

    return parsed
      .filter((task) => task && typeof task === "object" && task.title)
      .map((task) => ({
        id: String(task.id || makeId()),
        title: String(task.title).slice(0, 100),
        subject: String(task.subject || "Other"),
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || "")
          ? task.dueDate : todayString(),
        priority: ["Low", "Medium", "High"].includes(task.priority)
          ? task.priority : "Medium",
        completed: task.completed === true
      }));
  } catch (error) {
    showToast("Saved data couldn't be read. Starter tasks loaded.");
    return getStarterTasks();
  }
}

function getStarterTasks() {
  const today = todayString();
  return [
    {
      id: "starter-1",
      title: "Revise arrays and loops",
      subject: "Computer Science",
      dueDate: today,
      priority: "High",
      completed: false
    },
    {
      id: "starter-2",
      title: "Practise calculus problems",
      subject: "Mathematics",
      dueDate: today,
      priority: "Medium",
      completed: false
    },
    {
      id: "starter-3",
      title: "Review Newton's laws",
      subject: "Physics",
      dueDate: today,
      priority: "Low",
      completed: true
    }
  ];
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const pending = total - completed;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  $("totalCount").textContent = total;
  $("completedCount").textContent = completed;
  $("pendingCount").textContent = pending;
  $("progressCount").textContent = `${percentage}%`;
  $("progressBar").style.width = `${percentage}%`;
  $("taskPill").textContent = `${total} ${total === 1 ? "task" : "tasks"}`;
}

function updateSubjectFilter() {
  const current = subjectFilter.value || "all";
  const subjects = [...new Set(tasks.map((task) => task.subject))]
    .sort((a, b) => a.localeCompare(b));

  subjectFilter.replaceChildren(new Option("All subjects", "all"));

  subjects.forEach((subject) => {
    subjectFilter.add(new Option(subject, subject));
  });

  subjectFilter.value = subjects.includes(current) ? current : "all";
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card${task.completed ? " is-complete" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark ${task.title} complete`);
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const info = document.createElement("div");
  info.className = "task-info";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const subject = document.createElement("span");
  subject.className = "tag";
  subject.textContent = task.subject;

  const due = document.createElement("span");
  due.textContent = `Due ${formatDate(task.dueDate)}`;

  const priority = document.createElement("span");
  priority.className = `priority priority-${task.priority.toLowerCase()}`;
  priority.textContent = `${task.priority} priority`;

  meta.append(subject, due, priority);
  info.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "icon-button";
  toggleButton.textContent = task.completed ? "Undo" : "Done";
  toggleButton.setAttribute("aria-label", `${task.completed ? "Reopen" : "Complete"} ${task.title}`);
  toggleButton.addEventListener("click", () => toggleTask(task.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "icon-button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  actions.append(toggleButton, deleteButton);
  card.append(checkbox, info, actions);
  return card;
}

function render() {
  updateStats();
  updateSubjectFilter();

  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value || "all";
  const subject = subjectFilter.value || "all";

  const visibleTasks = tasks.filter((task) => {
    const matchesQuery =
      task.title.toLowerCase().includes(query) ||
      task.subject.toLowerCase().includes(query);

    const matchesStatus =
      status === "all" ||
      (status === "completed" && task.completed) ||
      (status === "pending" && !task.completed);

    const matchesSubject = subject === "all" || task.subject === subject;
    return matchesQuery && matchesStatus && matchesSubject;
  });

  taskList.replaceChildren(...visibleTasks.map(createTaskCard));
  emptyState.hidden = visibleTasks.length !== 0;
}

function toggleTask(id) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return;

  tasks[index].completed = !tasks[index].completed;

  if (!saveTasks()) {
    tasks[index].completed = !tasks[index].completed;
    render();
    return;
  }

  render();
  showToast("Your progress has been updated!");
}

function deleteTask(id) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return;

  const removed = tasks.splice(index, 1)[0];

  if (!saveTasks()) {
    tasks.splice(index, 0, removed);
    render();
    return;
  }

  render();
  showToast("Task deleted.");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  const newTask = {
    id: makeId(),
    title: titleInput.value.trim(),
    subject: subjectInput.value,
    dueDate: dateInput.value,
    priority: priorityInput.value,
    completed: false
  };

  if (!newTask.title) {
    titleInput.focus();
    showToast("Please enter a task name.");
    return;
  }

  tasks.unshift(newTask);

  if (!saveTasks()) {
    tasks.shift();
    return;
  }

  form.reset();
  priorityInput.value = "Medium";
  dateInput.value = todayString();
  searchInput.value = "";
  statusFilter.value = "all";
  subjectFilter.value = "all";

  render();
  showToast("Study task added successfully!");
  titleInput.focus();
});

searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);
subjectFilter.addEventListener("change", render);

$("todayDate").textContent = `📅 ${new Date().toLocaleDateString(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short"
})}`;

dateInput.min = todayString();
dateInput.value = todayString();

tasks = loadTasks();
render();
/* ==========================================================
   FOCUS MODE (Step 3)
   ========================================================== */
(function focusModeInit() {
  'use strict';

  /* ---------------------------------------------------------
     TEMPORARY TEST DURATIONS: CHANGE THESE TWO LINES AFTER TESTING
     Final values:
       FOCUS_DURATION_SECONDS       = 25 * 60;   (25 minutes)
       FOCUS_BREAK_DURATION_SECONDS = 5 * 60;    (5 minutes)
     --------------------------------------------------------- */
  const FOCUS_DURATION_SECONDS = 25 * 60;        // TEMP: change back to 25 * 60
  const FOCUS_BREAK_DURATION_SECONDS = 5 * 60;   // TEMP: change back to 5 * 60

  const FOCUS_STORAGE_KEY = 'studybuddy.focusSessions.v1';
  const FOCUS_MAX_HISTORY = 1000;
  const FOCUS_TICK_MS = 250;

  /* ---------- Elements ---------- */
  const focusModeFocusButton = document.getElementById('focusModeFocus');
  const focusModeBreakButton = document.getElementById('focusModeBreak');
  const focusModePillEl = document.getElementById('focusModePill');
  const focusTimeEl = document.getElementById('focusTimeDisplay');
  const focusStatusEl = document.getElementById('focusStatusText');
  const focusStartButton = document.getElementById('focusStartButton');
  const focusResetButton = document.getElementById('focusResetButton');
  const focusSessionCountEl = document.getElementById('focusSessionCount');
  const focusTotalMinutesEl = document.getElementById('focusTotalMinutes');

  const focusRequired = {
    focusModeFocus: focusModeFocusButton,
    focusModeBreak: focusModeBreakButton,
    focusTimeDisplay: focusTimeEl,
    focusStatusText: focusStatusEl,
    focusStartButton: focusStartButton,
    focusResetButton: focusResetButton,
    focusSessionCount: focusSessionCountEl,
    focusTotalMinutes: focusTotalMinutesEl
  };

  const focusMissing = Object.keys(focusRequired).filter(function (id) {
    return !focusRequired[id];
  });
  if (focusMissing.length > 0) {
    console.warn('Focus Mode not started. Missing element IDs:', focusMissing.join(', '));
    return;
  }

  /* ---------- State ---------- */
  let focusMode = 'focus';          // 'focus' | 'break'
  let focusState = 'idle';          // 'idle' | 'running' | 'paused'
  let focusEndTime = 0;             // Date.now() timestamp when the timer ends
  let focusRemainingMs = focusGetDurationMs('focus');
  let focusIntervalId = null;
  let focusMessage = '';            // one-off status message after a timer finishes
  let focusSessions = focusLoadSessions();

  /* ---------- Helpers ---------- */
  function focusGetDurationMs(mode) {
    const seconds = mode === 'focus' ? FOCUS_DURATION_SECONDS : FOCUS_BREAK_DURATION_SECONDS;
    return seconds * 1000;
  }

  function focusFormatTime(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  /* ---------- Storage (separate key, validated) ---------- */
  function focusLoadSessions() {
    try {
      const raw = localStorage.getItem(FOCUS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(function (item) {
          return (
            item &&
            typeof item === 'object' &&
            Number.isFinite(item.completedAt) &&
            item.completedAt > 0 &&
            Number.isFinite(item.durationSeconds) &&
            item.durationSeconds > 0
          );
        })
        .map(function (item) {
          return {
            completedAt: item.completedAt,
            durationSeconds: item.durationSeconds
          };
        })
        .slice(-FOCUS_MAX_HISTORY);
    } catch (error) {
      console.warn('Could not read focus history. Starting fresh.', error);
      return [];
    }
  }

  function focusSaveSessions() {
    try {
      localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(focusSessions));
    } catch (error) {
      console.warn('Could not save focus history.', error);
    }
  }

  /* ---------- Rendering ---------- */
  function focusGetStatusText() {
    if (focusState === 'idle' && focusMessage) return focusMessage;
    if (focusState === 'paused') return 'Paused';
    if (focusMode === 'focus') {
      return focusState === 'running' ? 'Focus session in progress' : 'Ready to focus';
    }
    return focusState === 'running' ? 'Break in progress' : 'Ready for a short break';
  }

  function focusRender() {
    const displayMs = focusState === 'running'
      ? focusEndTime - Date.now()
      : focusRemainingMs;

    focusTimeEl.textContent = focusFormatTime(displayMs);
    focusStatusEl.textContent = focusGetStatusText();

    // Mode buttons
    const isFocusMode = focusMode === 'focus';
    focusModeFocusButton.classList.toggle('is-active', isFocusMode);
    focusModeBreakButton.classList.toggle('is-active', !isFocusMode);
    focusModeFocusButton.setAttribute('aria-pressed', String(isFocusMode));
    focusModeBreakButton.setAttribute('aria-pressed', String(!isFocusMode));

    // Mode switching is only allowed while idle
    const lockModes = focusState !== 'idle';
    focusModeFocusButton.disabled = lockModes;
    focusModeBreakButton.disabled = lockModes;

    // Start / Pause / Resume label
    if (focusState === 'running') {
      focusStartButton.textContent = 'Pause';
    } else if (focusState === 'paused') {
      focusStartButton.textContent = 'Resume';
    } else {
      focusStartButton.textContent = 'Start';
    }

    // Optional mode pill
    if (focusModePillEl) {
      focusModePillEl.textContent = isFocusMode ? 'Focus' : 'Short Break';
      focusModePillEl.dataset.mode = focusMode;
    }

    // Statistics
    const totalSeconds = focusSessions.reduce(function (sum, session) {
      return sum + session.durationSeconds;
    }, 0);
    focusSessionCountEl.textContent = String(focusSessions.length);
    focusTotalMinutesEl.textContent = String(Math.floor(totalSeconds / 60));
  }

  /* ---------- Timer engine ---------- */
  function focusStopInterval() {
    if (focusIntervalId !== null) {
      clearInterval(focusIntervalId);
      focusIntervalId = null;
    }
  }

  function focusStartInterval() {
    focusStopInterval();
    focusIntervalId = setInterval(focusTick, FOCUS_TICK_MS);
  }

  function focusTick() {
    if (focusState !== 'running') return;
    if (focusEndTime - Date.now() <= 0) {
      focusComplete();
    } else {
      focusRender();
    }
  }

  function focusComplete() {
    focusStopInterval();
    focusState = 'idle';

    if (focusMode === 'focus') {
      focusSessions.push({
        completedAt: Date.now(),
        durationSeconds: FOCUS_DURATION_SECONDS
      });
      if (focusSessions.length > FOCUS_MAX_HISTORY) {
        focusSessions = focusSessions.slice(-FOCUS_MAX_HISTORY);
      }
      focusSaveSessions();
      document.dispatchEvent(new CustomEvent('focusSessionsUpdated'));
      focusMode = 'break';
      focusMessage = 'Focus session complete! Ready for a short break?';
    } else {
      focusMode = 'focus';
      focusMessage = 'Break over. Ready to focus again?';
    }

    focusRemainingMs = focusGetDurationMs(focusMode);
    focusRender();
  }

  /* ---------- Controls ---------- */
  function focusHandleStartPause() {
    focusMessage = '';

    if (focusState === 'idle') {
      focusEndTime = Date.now() + focusRemainingMs;
      focusState = 'running';
      focusStartInterval();
    } else if (focusState === 'running') {
      focusRemainingMs = Math.max(0, focusEndTime - Date.now());
      focusStopInterval();
      focusState = 'paused';
    } else if (focusState === 'paused') {
      focusEndTime = Date.now() + focusRemainingMs;
      focusState = 'running';
      focusStartInterval();
    }

    focusRender();
  }

  function focusHandleReset() {
    focusStopInterval();
    focusState = 'idle';
    focusMessage = '';
    focusRemainingMs = focusGetDurationMs(focusMode);
    focusRender();
  }

  function focusSetMode(newMode) {
    if (focusState !== 'idle') return;   // locked while running or paused
    focusMode = newMode;
    focusMessage = '';
    focusRemainingMs = focusGetDurationMs(focusMode);
    focusRender();
  }

  /* ---------- Events ---------- */
  focusStartButton.addEventListener('click', focusHandleStartPause);
  focusResetButton.addEventListener('click', focusHandleReset);
  focusModeFocusButton.addEventListener('click', function () { focusSetMode('focus'); });
  focusModeBreakButton.addEventListener('click', function () { focusSetMode('break'); });

  // Catch up immediately when the tab becomes visible again
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && focusState === 'running') {
      focusTick();
    }
  });

  /* ---------- Initial paint ---------- */
  focusRender();
})();/* ==========================================================
   DAILY STUDY GOAL (Step 3)
   ========================================================== */
(function goalInit() {
  'use strict';

  const GOAL_STORAGE_KEY = 'studybuddy.dailyGoal.v1';
  const GOAL_SESSIONS_KEY = 'studybuddy.focusSessions.v1';   // read only, never written here
  const GOAL_MIN_MINUTES = 15;
  const GOAL_MAX_MINUTES = 480;
  const GOAL_DATE_CHECK_MS = 30000;

  /* ---------- Elements ---------- */
  const goalFormEl = document.getElementById('goalForm');
  const goalInputEl = document.getElementById('goalMinutesInput');
  const goalErrorEl = document.getElementById('goalError');
  const goalStatusEl = document.getElementById('goalStatus');
  const goalBarEl = document.getElementById('goalProgressBar');
  const goalFillEl = document.getElementById('goalProgressFill');
  const goalPercentEl = document.getElementById('goalPercent');
  const goalSummaryEl = document.getElementById('goalMinutesSummary');
  const goalSessionCountEl = document.getElementById('goalSessionCount');

  const goalRequired = {
    goalForm: goalFormEl,
    goalMinutesInput: goalInputEl,
    goalError: goalErrorEl,
    goalStatus: goalStatusEl,
    goalProgressBar: goalBarEl,
    goalProgressFill: goalFillEl,
    goalPercent: goalPercentEl,
    goalMinutesSummary: goalSummaryEl,
    goalSessionCount: goalSessionCountEl
  };

  const goalMissing = Object.keys(goalRequired).filter(function (id) {
    return !goalRequired[id];
  });
  if (goalMissing.length > 0) {
    console.warn('Daily Goal not started. Missing element IDs:', goalMissing.join(', '));
    return;
  }

  // Prevent duplicate listeners if this code ever runs twice
  if (goalFormEl.dataset.goalReady === 'true') return;
  goalFormEl.dataset.goalReady = 'true';

  const goalCardEl = goalFormEl.closest('.goal-card');

  /* ---------- State ---------- */
  let goalMinutes = goalLoadGoal();          // number, or null when unset
  let goalDayKey = goalGetDayKey(new Date());

  /* ---------- Date helpers (local calendar day) ---------- */
  function goalGetDayKey(date) {
    return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate();
  }

  function goalGetTodayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    return { start: start, end: end };
  }

  /* ---------- Storage ---------- */
  function goalIsValidGoal(value) {
    return Number.isInteger(value) && value >= GOAL_MIN_MINUTES && value <= GOAL_MAX_MINUTES;
  }

  function goalLoadGoal() {
    try {
      const raw = localStorage.getItem(GOAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const minutes = parsed && typeof parsed === 'object' ? parsed.minutes : parsed;
      return goalIsValidGoal(minutes) ? minutes : null;
    } catch (error) {
      console.warn('Could not read daily goal.', error);
      return null;
    }
  }

  function goalSaveGoal(minutes) {
    try {
      localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify({ minutes: minutes }));
      return true;
    } catch (error) {
      console.warn('Could not save daily goal.', error);
      return false;
    }
  }

  function goalLoadSessions() {
    try {
      const raw = localStorage.getItem(GOAL_SESSIONS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (item) {
        return (
          item &&
          typeof item === 'object' &&
          Number.isFinite(item.completedAt) &&
          item.completedAt > 0 &&
          Number.isFinite(item.durationSeconds) &&
          item.durationSeconds > 0
        );
      });
    } catch (error) {
      console.warn('Could not read focus history for Daily Goal.', error);
      return [];
    }
  }

  /* ---------- Today's progress ---------- */
  function goalGetTodayStats() {
    const range = goalGetTodayRange();
    let totalSeconds = 0;
    let count = 0;
    goalLoadSessions().forEach(function (session) {
      if (session.completedAt >= range.start && session.completedAt < range.end) {
        totalSeconds += session.durationSeconds;
        count += 1;
      }
    });
    return { totalSeconds: totalSeconds, sessionCount: count };
  }

  /* ---------- Error handling ---------- */
  function goalShowError(message) {
    goalErrorEl.textContent = message;
    goalErrorEl.hidden = false;
    goalInputEl.classList.add('is-invalid');
    goalInputEl.setAttribute('aria-invalid', 'true');
  }

  function goalClearError() {
    goalErrorEl.textContent = '';
    goalErrorEl.hidden = true;
    goalInputEl.classList.remove('is-invalid');
    goalInputEl.removeAttribute('aria-invalid');
  }

  /* ---------- Rendering ---------- */
  function goalRender(notice) {
    const stats = goalGetTodayStats();
    const completedMinutes = Math.floor(stats.totalSeconds / 60);

    goalSessionCountEl.textContent = String(stats.sessionCount);

    if (goalMinutes === null) {
      goalPercentEl.textContent = '0%';
      goalFillEl.style.width = '0%';
      goalSummaryEl.textContent = completedMinutes + ' / – min';
      goalBarEl.setAttribute('aria-valuenow', '0');
      goalBarEl.setAttribute('aria-valuetext', 'No daily goal set');
      goalStatusEl.textContent = 'Set your daily goal to start tracking your focus time.';
      if (goalCardEl) goalCardEl.classList.remove('is-complete');
      return;
    }

    const goalSeconds = goalMinutes * 60;
    const rawPercent = (stats.totalSeconds / goalSeconds) * 100;
    const percent = Math.min(100, Math.floor(rawPercent));
    const reached = stats.totalSeconds >= goalSeconds;

    goalPercentEl.textContent = percent + '%';
    goalFillEl.style.width = percent + '%';
    goalSummaryEl.textContent = completedMinutes + ' / ' + goalMinutes + ' min';
    goalBarEl.setAttribute('aria-valuenow', String(percent));
    goalBarEl.setAttribute(
      'aria-valuetext',
      percent + ' percent of daily goal, ' + completedMinutes + ' of ' + goalMinutes + ' minutes'
    );
    if (goalCardEl) goalCardEl.classList.toggle('is-complete', reached);

    if (notice) {
      goalStatusEl.textContent = notice;
    } else if (reached) {
      goalStatusEl.textContent = 'Goal reached! Great work today.';
    } else {
      goalStatusEl.textContent = 'Your goal today is ' + goalMinutes + ' minutes of focus time.';
    }
  }

  /* ---------- Form handling ---------- */
  function goalHandleSubmit(event) {
    event.preventDefault();
    const rawValue = goalInputEl.value.trim();

    if (rawValue === '') {
      goalShowError('Please enter a goal in minutes.');
      return;
    }
    if (!/^\d+$/.test(rawValue)) {
      goalShowError('Use a whole number only, with no decimals or symbols.');
      return;
    }

    const minutes = Number(rawValue);
    if (!goalIsValidGoal(minutes)) {
      goalShowError('Choose a goal from ' + GOAL_MIN_MINUTES + ' to ' + GOAL_MAX_MINUTES + ' minutes.');
      return;
    }

    if (!goalSaveGoal(minutes)) {
      goalShowError('Your goal could not be saved. Check that browser storage is available.');
      return;
    }

    goalClearError();
    goalMinutes = minutes;
    goalInputEl.value = String(minutes);
    goalRender('Daily goal saved: ' + minutes + ' minutes.');
  }

  /* ---------- Date rollover ---------- */
  function goalCheckDate() {
    const currentKey = goalGetDayKey(new Date());
    if (currentKey !== goalDayKey) {
      goalDayKey = currentKey;
      goalRender();   // today's range changes; history is never touched
    }
  }

  /* ---------- Events (each registered once) ---------- */
  goalFormEl.addEventListener('submit', goalHandleSubmit);
  goalInputEl.addEventListener('input', goalClearError);

  // Fired by Focus Mode when a focus session completes
  document.addEventListener('focusSessionsUpdated', function () {
    goalCheckDate();
    goalRender();
  });

  // Refresh when returning to the tab (also catches a date change while away)
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      goalCheckDate();
      goalRender();
    }
  });

  // Keep multiple open tabs in sync
  window.addEventListener('storage', function (event) {
    if (event.key === GOAL_STORAGE_KEY) {
      goalMinutes = goalLoadGoal();
      if (goalMinutes !== null) goalInputEl.value = String(goalMinutes);
      goalRender();
    } else if (event.key === GOAL_SESSIONS_KEY) {
      goalRender();
    }
  });

  // Catches midnight while the tab stays open and visible
  setInterval(goalCheckDate, GOAL_DATE_CHECK_MS);

  /* ---------- Initial paint ---------- */
  if (goalMinutes !== null) goalInputEl.value = String(goalMinutes);
  goalRender();
})();