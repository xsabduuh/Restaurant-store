// ---------- البيانات والتخزين ----------
const STORAGE_KEYS = {
    TASKS: 'daily_tasks',
    COMPLETIONS: 'task_completions',   // { "YYYY-MM-DD": [taskId, ...] }
    FINANCIAL: 'financial_records',    // { "YYYY-MM-DD": amount }
    MONTH_START: 'month_start_date',
    FINANCIAL_GOAL: 'financial_goal',
    HISTORY: 'monthly_history'
};

let tasks = [];              // { id, name }
let completions = {};       // تاريخ -> قائمة معرفات المهام المنفذة
let financialRecords = {};  // تاريخ -> المبلغ المضافة
let monthStartDate = null;  // تاريخ بداية الشهر (YYYY-MM-DD)
let financialGoal = 0;

// عناصر DOM
const tasksListEl = document.getElementById('tasksList');
const newTaskInput = document.getElementById('newTaskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const todayXPSpan = document.getElementById('todayXP');
const monthXPSpan = document.getElementById('monthXP');
const monthMaxXPSpan = document.getElementById('monthMaxXP');
const financialGoalInput = document.getElementById('financialGoalInput');
const setGoalBtn = document.getElementById('setGoalBtn');
const savedAmountSpan = document.getElementById('savedAmount');
const goalDisplaySpan = document.getElementById('goalDisplay');
const financialProgressBar = document.getElementById('financialProgressBar');
const dailySavingInput = document.getElementById('dailySavingInput');
const recordSavingBtn = document.getElementById('recordSavingBtn');
const monthRangeSpan = document.getElementById('monthRange');
const daysLeftSpan = document.getElementById('daysLeft');
const completionRateSpan = document.getElementById('completionRate');
const xpRateSpan = document.getElementById('xpRate');
const financialRateSpan = document.getElementById('financialRate');
const monthStatusSpan = document.getElementById('monthStatus');
const historyListDiv = document.getElementById('historyList');
const manualCheckBtn = document.getElementById('manualCheckBtn');
const todaySavingMsg = document.getElementById('todaySavingMsg');

// ---------- وظائف مساعدة للتواريخ ----------
function getTodayStr() {
    const d = new Date();
    return d.toISOString().slice(0,10);
}

function addOneMonth(dateStr) {
    let [year, month, day] = dateStr.split('-').map(Number);
    let newDate = new Date(year, month - 1, day);
    newDate.setMonth(newDate.getMonth() + 1);
    let y = newDate.getFullYear();
    let m = String(newDate.getMonth() + 1).padStart(2,'0');
    let d = String(newDate.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
}

function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff;
}

// ---------- تهيئة الشهر (أول استخدام) ----------
function initMonth() {
    if (!monthStartDate) {
        monthStartDate = getTodayStr();
        localStorage.setItem(STORAGE_KEYS.MONTH_START, monthStartDate);
    }
    // التأكد من أن start date لا يتجاوز end date (لو مر شهر كامل)
    const today = getTodayStr();
    let endDate = addOneMonth(monthStartDate);
    if (today > endDate) {
        finalizeCurrentMonth();
    }
    updateMonthUI();
}

function finalizeCurrentMonth() {
    if (!monthStartDate) return;
    const endDate = addOneMonth(monthStartDate);
    // حساب إحصائيات الشهر المنتهي
    const stats = calculateMonthStats(monthStartDate, endDate);
    if (stats.totalDays > 0) {
        const passed = (stats.xpPercent >= 80 && stats.financialPercent >= 100);
        const history = getHistory();
        history.push({
            start: monthStartDate,
            end: endDate,
            totalXP: stats.earnedXP,
            maxXP: stats.maxXP,
            financialTotal: stats.financialTotal,
            financialGoal: stats.financialGoal,
            xpPercent: stats.xpPercent,
            financialPercent: stats.financialPercent,
            passed: passed
        });
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    }
    // بدء شهر جديد: startDate = endDate + 1 يوم
    let newStart = addOneDay(endDate);
    monthStartDate = newStart;
    localStorage.setItem(STORAGE_KEYS.MONTH_START, monthStartDate);
    // لا نقوم بمسح المهام أو السجلات المالية القديمة، فقط نبدأ صفحة جديدة للشهر.
    // ولكن financialRecords ستظل لكن سيتم احتساب القيم الجديدة فقط للشهر الجديد.
    // تنبيه: نريد أن تبدأ السجلات المالية من الصفر للشهر الجديد عملياً (نحن لا نمسح البيانات القديمة لكن الحسابات تعتمد على dates)
    // لإعادة ضبط وهمي: المستخدم يضيف مدخرات جديدة للشهر الجديد. البيانات القديمة محفوظة في الهيستوري.
    updateMonthUI();
    renderAll();
}

function addOneDay(dateStr) {
    let date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    let y = date.getFullYear();
    let m = String(date.getMonth() + 1).padStart(2,'0');
    let d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
}

// حساب إحصائيات الشهر بين start و end (end غير محسوب؟)
function calculateMonthStats(startDate, endDate) {
    let current = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = 0;
    let earnedXP = 0;
    let maxPossibleXP = 0;
    let financialTotal = 0;
    let tasksAtMonthStart = tasks; // لحظة الحساب (استخدم قائمة المهام الحالية)
    const taskCount = tasksAtMonthStart.length;
    const xpPerTask = 10;

    while (current < end) {
        const dateStr = current.toISOString().slice(0,10);
        totalDays++;
        // XP
        const completedToday = completions[dateStr] || [];
        earnedXP += completedToday.length * xpPerTask;
        maxPossibleXP += taskCount * xpPerTask;
        // مالي
        financialTotal += (financialRecords[dateStr] || 0);
        current.setDate(current.getDate() + 1);
    }
    const xpPercent = maxPossibleXP === 0 ? 0 : (earnedXP / maxPossibleXP) * 100;
    const financialPercent = financialGoal === 0 ? 100 : (financialTotal / financialGoal) * 100;
    return {
        totalDays, earnedXP, maxXP: maxPossibleXP,
        financialTotal, financialGoal,
        xpPercent, financialPercent
    };
}

// إحصائيات الشهر الحالي حتى اليوم
function getCurrentMonthStats() {
    if (!monthStartDate) return null;
    const today = getTodayStr();
    let endDate = addOneMonth(monthStartDate);
    let actualEnd = today < endDate ? today : endDate;
    let current = new Date(monthStartDate);
    const end = new Date(actualEnd);
    let earnedXP = 0;
    let maxPossibleXP = 0;
    let financialTotal = 0;
    const taskCount = tasks.length;
    const xpPerTask = 10;
    let daysCount = 0;
    while (current <= end) {
        const dateStr = current.toISOString().slice(0,10);
        daysCount++;
        const completedToday = completions[dateStr] || [];
        earnedXP += completedToday.length * xpPerTask;
        maxPossibleXP += taskCount * xpPerTask;
        financialTotal += (financialRecords[dateStr] || 0);
        current.setDate(current.getDate() + 1);
    }
    const xpPercent = maxPossibleXP === 0 ? 0 : (earnedXP / maxPossibleXP) * 100;
    const financialPercent = financialGoal === 0 ? 100 : (financialTotal / financialGoal) * 100;
    return {
        earnedXP, maxXP: maxPossibleXP,
        financialTotal, financialGoal,
        xpPercent, financialPercent,
        daysCount
    };
}

// ---------- إدارة المهام ----------
function loadTasks() {
    const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (stored) {
        tasks = JSON.parse(stored);
    } else {
        tasks = [
            { id: '1', name: 'البرمجة لمدة ساعة' },
            { id: '2', name: 'قراءة 20 صفحة' },
            { id: '3', name: 'تمارين رياضية' }
        ];
        saveTasks();
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

function addTask(name) {
    if (!name.trim()) return;
    const newId = Date.now().toString();
    tasks.push({ id: newId, name: name.trim() });
    saveTasks();
    renderTasksList();
    updateAllStats();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    // إزالة هذا المهمة من كل سجلات الإنجاز (لكي لا تظهر في الإحصائيات القديمة)
    for (let date in completions) {
        completions[date] = completions[date].filter(taskId => taskId !== id);
    }
    localStorage.setItem(STORAGE_KEYS.COMPLETIONS, JSON.stringify(completions));
    renderTasksList();
    updateAllStats();
}

function toggleTaskCompletion(taskId, isChecked) {
    const today = getTodayStr();
    if (!completions[today]) completions[today] = [];
    if (isChecked) {
        if (!completions[today].includes(taskId)) completions[today].push(taskId);
    } else {
        completions[today] = completions[today].filter(id => id !== taskId);
    }
    localStorage.setItem(STORAGE_KEYS.COMPLETIONS, JSON.stringify(completions));
    updateAllStats();
}

function renderTasksList() {
    const today = getTodayStr();
    const completedToday = completions[today] || [];
    tasksListEl.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = completedToday.includes(task.id);
        cb.addEventListener('change', (e) => toggleTaskCompletion(task.id, e.target.checked));
        const span = document.createElement('span');
        span.textContent = task.name;
        const delBtn = document.createElement('button');
        delBtn.textContent = '✖';
        delBtn.classList.add('delete-task');
        delBtn.addEventListener('click', () => deleteTask(task.id));
        li.appendChild(cb);
        li.appendChild(span);
        li.appendChild(delBtn);
        tasksListEl.appendChild(li);
    });
    updateTodayXP();
}

function updateTodayXP() {
    const today = getTodayStr();
    const completed = completions[today] || [];
    const xp = completed.length * 10;
    todayXPSpan.textContent = xp;
}

// ---------- إدارة الهدف المالي والتسجيلات اليومية ----------
function loadFinancial() {
    const storedGoal = localStorage.getItem(STORAGE_KEYS.FINANCIAL_GOAL);
    if (storedGoal) financialGoal = parseFloat(storedGoal);
    else financialGoal = 5000;
    const storedRecords = localStorage.getItem(STORAGE_KEYS.FINANCIAL);
    if (storedRecords) financialRecords = JSON.parse(storedRecords);
    else financialRecords = {};
    updateFinancialUI();
}

function saveFinancialGoal() {
    localStorage.setItem(STORAGE_KEYS.FINANCIAL_GOAL, financialGoal);
}

function saveFinancialRecords() {
    localStorage.setItem(STORAGE_KEYS.FINANCIAL, JSON.stringify(financialRecords));
}

function setFinancialGoal(goal) {
    if (goal > 0) financialGoal = goal;
    saveFinancialGoal();
    updateFinancialUI();
    updateAllStats();
}

function recordSaving(amount) {
    const today = getTodayStr();
    if (amount <= 0) {
        todaySavingMsg.textContent = '⚠️ أدخل مبلغاً موجباً';
        setTimeout(() => todaySavingMsg.textContent = '', 2000);
        return;
    }
    financialRecords[today] = amount;
    saveFinancialRecords();
    updateFinancialUI();
    updateAllStats();
    todaySavingMsg.textContent = `✅ تم تسجيل ${amount} ₿ ليوم ${today}`;
    setTimeout(() => todaySavingMsg.textContent = '', 2000);
}

function updateFinancialUI() {
    const today = getTodayStr();
    const todayAmount = financialRecords[today] || 0;
    dailySavingInput.value = todayAmount > 0 ? todayAmount : '';
    goalDisplaySpan.textContent = financialGoal;
    const stats = getCurrentMonthStats();
    const saved = stats ? stats.financialTotal : 0;
    savedAmountSpan.textContent = saved;
    const percent = financialGoal === 0 ? 0 : Math.min(100, (saved / financialGoal) * 100);
    financialProgressBar.style.width = `${percent}%`;
}

// ---------- تحديث الإحصائيات والواجهة العامة ----------
function updateAllStats() {
    updateTodayXP();
    const stats = getCurrentMonthStats();
    if (!stats) return;
    monthXPSpan.textContent = stats.earnedXP;
    monthMaxXPSpan.textContent = stats.maxXP;
    const completionRate = stats.maxXP === 0 ? 0 : (stats.earnedXP / stats.maxXP) * 100;
    completionRateSpan.textContent = `${completionRate.toFixed(1)}%`;
    xpRateSpan.textContent = `${stats.xpPercent.toFixed(1)}%`;
    financialRateSpan.textContent = `${stats.financialPercent.toFixed(1)}%`;

    // حالة النجاح أو الفشل حتى الآن (توقع)
    if (stats.xpPercent >= 80 && stats.financialPercent >= 100) {
        monthStatusSpan.textContent = '✅ في الطريق للنجاح';
        monthStatusSpan.style.color = '#4ADE80';
    } else {
        monthStatusSpan.textContent = '⚠️ تحتاج لبذل جهد أكبر';
        monthStatusSpan.style.color = '#F87171';
    }
    updateMonthUI();
}

function updateMonthUI() {
    if (!monthStartDate) return;
    const endDate = addOneMonth(monthStartDate);
    monthRangeSpan.textContent = `${monthStartDate} → ${endDate}`;
    const today = getTodayStr();
    let daysRemaining = daysBetween(today, endDate);
    if (daysRemaining < 0) daysRemaining = 0;
    daysLeftSpan.textContent = daysRemaining;
}

function renderHistory() {
    const history = getHistory();
    if (history.length === 0) {
        historyListDiv.innerHTML = '<p class="empty-history">لا يوجد سجل بعد</p>';
        return;
    }
    historyListDiv.innerHTML = '';
    history.slice().reverse().forEach(h => {
        const div = document.createElement('div');
        div.className = `history-item ${h.passed ? 'pass' : 'fail'}`;
        div.innerHTML = `
            <strong>${h.start} → ${h.end}</strong><br>
            🎯 XP: ${h.totalXP} / ${h.maxXP} (${h.xpPercent.toFixed(1)}%)<br>
            💰 مالي: ${h.financialTotal} / ${h.financialGoal} (${h.financialPercent.toFixed(1)}%)<br>
            ${h.passed ? '🏆 نجح الشهر' : '❌ رسب الشهر'}
        `;
        historyListDiv.appendChild(div);
    });
}

function getHistory() {
    const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return stored ? JSON.parse(stored) : [];
}

// ---------- تحميل البيانات العامة ----------
function loadCompletions() {
    const stored = localStorage.getItem(STORAGE_KEYS.COMPLETIONS);
    if (stored) completions = JSON.parse(stored);
    else completions = {};
}

// التحقق من انتهاء الشهر عند كل تفاعل
function checkMonthRollover() {
    if (!monthStartDate) return;
    const today = getTodayStr();
    const endDate = addOneMonth(monthStartDate);
    if (today > endDate) {
        finalizeCurrentMonth();
        renderAll();
    }
}

// ---------- ربط الأحداث والتهيئة ----------
function bindEvents() {
    addTaskBtn.addEventListener('click', () => {
        addTask(newTaskInput.value);
        newTaskInput.value = '';
    });
    setGoalBtn.addEventListener('click', () => {
        let val = parseFloat(financialGoalInput.value);
        if (!isNaN(val) && val > 0) setFinancialGoal(val);
    });
    recordSavingBtn.addEventListener('click', () => {
        let val = parseFloat(dailySavingInput.value);
        if (!isNaN(val)) recordSaving(val);
    });
    manualCheckBtn.addEventListener('click', () => {
        checkMonthRollover();
        updateAllStats();
        renderHistory();
    });
}

function renderAll() {
    renderTasksList();
    updateFinancialUI();
    updateAllStats();
    renderHistory();
}

function init() {
    loadTasks();
    loadCompletions();
    loadFinancial();
    const storedStart = localStorage.getItem(STORAGE_KEYS.MONTH_START);
    if (storedStart) monthStartDate = storedStart;
    else monthStartDate = getTodayStr();
    initMonth();  // يضمن أن الشهر سليم
    bindEvents();
    renderAll();
    checkMonthRollover();
}

init();