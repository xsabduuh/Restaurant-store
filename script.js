// ============================================================
// 🚀 تحدي الإنجاز اليومي - النسخة المتطورة (SPA + Three.js + صوت + مشاركة)
// ============================================================

import * as THREE from 'three';

// ---------- إعدادات عامة ----------
const STORAGE = {
    TASKS: 'daily_tasks',
    COMPLETIONS: 'task_completions',
    FINANCIAL: 'financial_records',
    MONTH_START: 'month_start_date',
    FINANCIAL_GOAL: 'financial_goal',
    HISTORY: 'monthly_history',
    ACHIEVEMENTS: 'achievements_unlocked',
    SETTINGS: 'app_settings'
};

let tasks = [];
let completions = {};
let financialRecords = {};
let monthStartDate = null;
let financialGoal = 5000;
let unlockedAchievements = [];
let settings = {
    darkMode: false,
    soundEnabled: true,
    colorScheme: 'default'
};

// عناصر DOM
let currentPage = 'dashboard';
let xpChart, financeChart;
let audioComplete, audioAchievement;

// ---------- دوال مساعدة ----------
function getTodayStr() {
    const d = new Date();
    return d.toISOString().slice(0,10);
}

function addOneMonth(dateStr) {
    let [year, month, day] = dateStr.split('-').map(Number);
    let newDate = new Date(year, month-1, day);
    newDate.setMonth(newDate.getMonth() + 1);
    return `${newDate.getFullYear()}-${String(newDate.getMonth()+1).padStart(2,'0')}-${String(newDate.getDate()).padStart(2,'0')}`;
}

function addOneDay(dateStr) {
    let date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function daysBetween(d1, d2) {
    return Math.ceil((new Date(d2) - new Date(d1)) / (86400000));
}

// ---------- تحميل وحفظ البيانات ----------
function loadData() {
    tasks = JSON.parse(localStorage.getItem(STORAGE.TASKS) || '[]');
    if (!tasks.length) tasks = [
        { id: '1', name: 'البرمجة لمدة ساعة' },
        { id: '2', name: 'قراءة 20 صفحة' },
        { id: '3', name: 'تمارين رياضية' }
    ];
    completions = JSON.parse(localStorage.getItem(STORAGE.COMPLETIONS) || '{}');
    financialRecords = JSON.parse(localStorage.getItem(STORAGE.FINANCIAL) || '{}');
    monthStartDate = localStorage.getItem(STORAGE.MONTH_START) || getTodayStr();
    financialGoal = parseFloat(localStorage.getItem(STORAGE.FINANCIAL_GOAL) || '5000');
    unlockedAchievements = JSON.parse(localStorage.getItem(STORAGE.ACHIEVEMENTS) || '[]');
    const storedSettings = localStorage.getItem(STORAGE.SETTINGS);
    if (storedSettings) settings = { ...settings, ...JSON.parse(storedSettings) };
    applySettings();
}

function saveTasks() { localStorage.setItem(STORAGE.TASKS, JSON.stringify(tasks)); }
function saveCompletions() { localStorage.setItem(STORAGE.COMPLETIONS, JSON.stringify(completions)); }
function saveFinancialRecords() { localStorage.setItem(STORAGE.FINANCIAL, JSON.stringify(financialRecords)); }
function saveMonthStart() { localStorage.setItem(STORAGE.MONTH_START, monthStartDate); }
function saveFinancialGoal() { localStorage.setItem(STORAGE.FINANCIAL_GOAL, financialGoal); }
function saveAchievements() { localStorage.setItem(STORAGE.ACHIEVEMENTS, JSON.stringify(unlockedAchievements)); }
function saveSettings() { localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(settings)); }

// ---------- حساب الإحصائيات ----------
function getCurrentMonthStats() {
    const today = getTodayStr();
    const endDate = addOneMonth(monthStartDate);
    const actualEnd = today < endDate ? today : endDate;
    let current = new Date(monthStartDate);
    const end = new Date(actualEnd);
    let earnedXP = 0;
    let maxXP = 0;
    let financialTotal = 0;
    while (current <= end) {
        const dateStr = current.toISOString().slice(0,10);
        const completed = completions[dateStr] || [];
        earnedXP += completed.length * 10;
        maxXP += tasks.length * 10;
        financialTotal += financialRecords[dateStr] || 0;
        current.setDate(current.getDate() + 1);
    }
    const xpPercent = maxXP === 0 ? 0 : (earnedXP / maxXP) * 100;
    const financialPercent = financialGoal === 0 ? 100 : (financialTotal / financialGoal) * 100;
    return { earnedXP, maxXP, financialTotal, financialGoal, xpPercent, financialPercent };
}

function calculateStreak() {
    let streak = 0;
    let current = new Date(getTodayStr());
    while (true) {
        const dateStr = current.toISOString().slice(0,10);
        const completed = completions[dateStr] || [];
        if (completed.length > 0) streak++;
        else break;
        current.setDate(current.getDate() - 1);
    }
    return streak;
}

// ---------- إنهاء الشهر ----------
function finalizeMonth() {
    const endDate = addOneMonth(monthStartDate);
    let current = new Date(monthStartDate);
    let totalDays = 0, earnedXP = 0, maxXP = 0, financialTotal = 0;
    while (current < new Date(endDate)) {
        const dateStr = current.toISOString().slice(0,10);
        totalDays++;
        const completed = completions[dateStr] || [];
        earnedXP += completed.length * 10;
        maxXP += tasks.length * 10;
        financialTotal += financialRecords[dateStr] || 0;
        current.setDate(current.getDate() + 1);
    }
    const xpPercent = maxXP === 0 ? 0 : (earnedXP / maxXP) * 100;
    const financialPercent = financialGoal === 0 ? 100 : (financialTotal / financialGoal) * 100;
    const passed = (xpPercent >= 80 && financialPercent >= 100);
    const history = JSON.parse(localStorage.getItem(STORAGE.HISTORY) || '[]');
    history.push({
        start: monthStartDate,
        end: endDate,
        totalXP: earnedXP,
        maxXP,
        financialTotal,
        financialGoal,
        xpPercent,
        financialPercent,
        passed
    });
    localStorage.setItem(STORAGE.HISTORY, JSON.stringify(history));
    // بدء شهر جديد
    monthStartDate = addOneDay(endDate);
    saveMonthStart();
    if (passed && settings.soundEnabled) {
        canvasConfetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        audioAchievement?.play();
    }
    renderAll();
}

function checkMonthRollover() {
    const today = getTodayStr();
    if (today > addOneMonth(monthStartDate)) finalizeMonth();
}

// ---------- المهام ----------
function addTask(name) {
    if (!name.trim()) return;
    tasks.push({ id: Date.now().toString(), name: name.trim() });
    saveTasks();
    renderTasks();
    updateAllStats();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    for (let d in completions) completions[d] = completions[d].filter(tid => tid !== id);
    saveCompletions();
    renderTasks();
    updateAllStats();
}

function toggleTask(taskId, checked) {
    const today = getTodayStr();
    if (!completions[today]) completions[today] = [];
    if (checked) {
        if (!completions[today].includes(taskId)) completions[today].push(taskId);
        if (settings.soundEnabled) audioComplete?.play();
    } else {
        completions[today] = completions[today].filter(id => id !== taskId);
    }
    saveCompletions();
    updateAllStats();
    renderTasks();
    checkAchievements();
}

function renderTasks() {
    const today = getTodayStr();
    const completedToday = completions[today] || [];
    const container = document.getElementById('tasksList');
    if (!container) return;
    container.innerHTML = '';
    tasks.forEach(task => {
        const li = document.createElement('li');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'task-check';
        cb.checked = completedToday.includes(task.id);
        cb.onchange = (e) => toggleTask(task.id, e.target.checked);
        const span = document.createElement('span');
        span.className = 'task-text';
        span.textContent = task.name;
        const del = document.createElement('button');
        del.innerHTML = '<i class="fas fa-trash-alt"></i>';
        del.className = 'delete-task';
        del.onclick = () => deleteTask(task.id);
        li.appendChild(cb);
        li.appendChild(span);
        li.appendChild(del);
        container.appendChild(li);
    });
}

// ---------- المالية ----------
function setFinancialGoal(goal) {
    if (goal > 0) financialGoal = goal;
    saveFinancialGoal();
    updateAllStats();
}

function recordSaving(amount) {
    if (amount <= 0) return;
    const today = getTodayStr();
    financialRecords[today] = (financialRecords[today] || 0) + amount;
    saveFinancialRecords();
    updateAllStats();
}

// ---------- تحديث الواجهة الرئيسية ----------
function updateAllStats() {
    const stats = getCurrentMonthStats();
    const streak = calculateStreak();
    document.getElementById('todayXP').innerText = (completions[getTodayStr()] || []).length * 10;
    document.getElementById('streakCount').innerText = streak;
    document.getElementById('monthXP').innerText = stats.earnedXP;
    document.getElementById('monthMaxXP').innerText = stats.maxXP;
    document.getElementById('savedAmount').innerText = stats.financialTotal;
    document.getElementById('goalDisplay').innerText = financialGoal;
    const xpPercent = stats.xpPercent;
    const financialPercent = Math.min(100, (stats.financialTotal / financialGoal) * 100);
    document.getElementById('xpPercentRing').innerText = `${xpPercent.toFixed(0)}%`;
    document.getElementById('financialPercentRing').innerText = `${financialPercent.toFixed(0)}%`;
    const xpRing = document.getElementById('xpRing');
    const finRing = document.getElementById('financialRing');
    if (xpRing) xpRing.style.strokeDashoffset = 283 * (1 - xpPercent / 100);
    if (finRing) finRing.style.strokeDashoffset = 283 * (1 - financialPercent / 100);
    const monthStatus = document.getElementById('monthStatusCard');
    if (monthStatus) {
        if (xpPercent >= 80 && financialPercent >= 100) {
            monthStatus.innerHTML = `<i class="fas fa-check-circle"></i> حالة الشهر: <strong style="color:#4ade80">ناجح</strong>`;
        } else {
            monthStatus.innerHTML = `<i class="fas fa-hourglass-half"></i> حالة الشهر: <strong>جاري (${xpPercent.toFixed(0)}% XP, ${financialPercent.toFixed(0)}% مالي)</strong>`;
        }
    }
    // نصيحة ذكاء اصطناعي
    const insightText = document.getElementById('insightText');
    if (insightText) {
        const neededXP = Math.max(0, Math.ceil(stats.maxXP * 0.8 - stats.earnedXP));
        if (neededXP > 0) insightText.innerHTML = `🧠 تحليل ذكي: تحتاج إلى ${neededXP} XP إضافي للوصول إلى 80% من هدف الشهر.`;
        else insightText.innerHTML = `🎉 مذهل! أنت على الطريق الصحيح للنجاح هذا الشهر.`;
    }
    // تحديث الرسم البياني في صفحة الإحصائيات
    if (currentPage === 'stats') updateCharts();
}

// ---------- الإنجازات ----------
const achievementsList = [
    { id: 'first_task', name: 'أول خطوة', desc: 'إنجاز أول مهمة', icon: 'fa-star', condition: () => Object.values(completions).some(arr => arr.length > 0) },
    { id: 'streak_7', name: 'أسبوع متواصل', desc: 'تسلسل 7 أيام متتالية', icon: 'fa-calendar-check', condition: () => calculateStreak() >= 7 },
    { id: 'xp_1000', name: 'صائد النقاط', desc: '1000 XP في شهر', icon: 'fa-trophy', condition: () => getCurrentMonthStats().earnedXP >= 1000 },
    { id: 'financial_goal', name: 'المحقق المالي', desc: 'تحقيق الهدف المالي لشهر', icon: 'fa-chart-line', condition: () => getCurrentMonthStats().financialPercent >= 100 },
    { id: 'month_pass', name: 'بطل الشهر', desc: 'إنهاء شهر بنجاح', icon: 'fa-crown', condition: () => {
        const history = JSON.parse(localStorage.getItem(STORAGE.HISTORY) || '[]');
        if (history.length === 0) return false;
        return history[history.length-1].passed;
    } }
];

function checkAchievements() {
    let changed = false;
    achievementsList.forEach(ach => {
        if (!unlockedAchievements.includes(ach.id) && ach.condition()) {
            unlockedAchievements.push(ach.id);
            changed = true;
            if (settings.soundEnabled) audioAchievement?.play();
            canvasConfetti({ particleCount: 100, startVelocity: 15, spread: 70, origin: { y: 0.6 } });
            setTimeout(() => alert(`🏅 إنجاز جديد: ${ach.name}\n${ach.desc}`), 100);
        }
    });
    if (changed) {
        saveAchievements();
        if (currentPage === 'achievements') renderAchievements();
    }
}

function renderAchievements() {
    const container = document.getElementById('achievementsGrid');
    if (!container) return;
    container.innerHTML = '';
    achievementsList.forEach(ach => {
        const unlocked = unlockedAchievements.includes(ach.id);
        const card = document.createElement('div');
        card.className = `achievement-card ${unlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
            <div class="achievement-icon"><i class="fas ${ach.icon}"></i></div>
            <div class="achievement-title">${ach.name}</div>
            <div class="achievement-desc">${ach.desc}</div>
            <div>${unlocked ? '<i class="fas fa-check-circle" style="color:#4ade80"></i> مفتوح' : '<i class="fas fa-lock"></i> مغلق'}</div>
        `;
        container.appendChild(card);
    });
}

// ---------- الإحصائيات والرسوم البيانية ----------
function getLast7Days() {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push(d.toISOString().slice(0,10));
    }
    return days;
}

function updateCharts() {
    const last7 = getLast7Days();
    const xpData = last7.map(d => (completions[d] || []).length * 10);
    const financeData = last7.map(d => financialRecords[d] || 0);
    if (xpChart) {
        xpChart.data.datasets[0].data = xpData;
        xpChart.update();
    }
    if (financeChart) {
        financeChart.data.datasets[0].data = financeData;
        financeChart.update();
    }
    // السجل اليومي
    const container = document.getElementById('dailyLogContainer');
    if (container) {
        const allDates = [...new Set([...Object.keys(completions), ...Object.keys(financialRecords)])].sort().reverse();
        if (allDates.length === 0) container.innerHTML = '<p>لا توجد سجلات بعد</p>';
        else {
            container.innerHTML = '';
            allDates.slice(0, 30).forEach(date => {
                const xp = (completions[date] || []).length * 10;
                const saved = financialRecords[date] || 0;
                const div = document.createElement('div');
                div.className = 'log-entry';
                div.innerHTML = `<span><i class="fas fa-calendar-alt"></i> ${date}</span><span><i class="fas fa-bolt"></i> XP: ${xp}</span><span><i class="fas fa-coins"></i> مدخرات: ${saved} ₿</span>`;
                container.appendChild(div);
            });
        }
    }
}

// ---------- الإعدادات والمظهر ----------
function applySettings() {
    document.body.classList.toggle('light-mode', settings.darkMode);
    const scheme = settings.colorScheme;
    let primary, secondary;
    if (scheme === 'purple') primary = '#a855f7', secondary = '#d946ef';
    else if (scheme === 'green') primary = '#22c55e', secondary = '#4ade80';
    else if (scheme === 'sunset') primary = '#f97316', secondary = '#facc15';
    else primary = '#38bdf8', secondary = '#0ea5e9';
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--primary-glow', `${primary}80`);
    // حفظ الإعدادات
    saveSettings();
}

function setupSettingsUI() {
    const darkToggle = document.getElementById('darkModeToggle');
    const soundToggle = document.getElementById('soundToggle');
    const colorSelect = document.getElementById('colorSchemeSelect');
    if (darkToggle) darkToggle.checked = settings.darkMode;
    if (soundToggle) soundToggle.checked = settings.soundEnabled;
    if (colorSelect) colorSelect.value = settings.colorScheme;
    darkToggle?.addEventListener('change', e => { settings.darkMode = e.target.checked; applySettings(); });
    soundToggle?.addEventListener('change', e => { settings.soundEnabled = e.target.checked; applySettings(); });
    colorSelect?.addEventListener('change', e => { settings.colorScheme = e.target.value; applySettings(); });
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('importFile')?.addEventListener('change', importData);
    document.getElementById('resetDataBtn')?.addEventListener('click', () => {
        if (confirm('سيتم مسح كل البيانات نهائياً!')) {
            localStorage.clear();
            location.reload();
        }
    });
    document.getElementById('shareAchievementBtn')?.addEventListener('click', shareAsImage);
}

function exportData() {
    const data = {
        tasks, completions, financialRecords, monthStartDate, financialGoal,
        unlockedAchievements, history: localStorage.getItem(STORAGE.HISTORY)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `challenge_backup_${getTodayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.tasks) tasks = data.tasks;
            if (data.completions) completions = data.completions;
            if (data.financialRecords) financialRecords = data.financialRecords;
            if (data.monthStartDate) monthStartDate = data.monthStartDate;
            if (data.financialGoal) financialGoal = data.financialGoal;
            if (data.unlockedAchievements) unlockedAchievements = data.unlockedAchievements;
            if (data.history) localStorage.setItem(STORAGE.HISTORY, data.history);
            saveTasks(); saveCompletions(); saveFinancialRecords(); saveMonthStart(); saveFinancialGoal(); saveAchievements();
            alert('تم استيراد البيانات بنجاح. سيتم تحديث الصفحة.');
            location.reload();
        } catch { alert('الملف غير صالح'); }
    };
    reader.readAsText(file);
}

async function shareAsImage() {
    const element = document.getElementById('achievementsGrid');
    if (!element) return;
    try {
        const canvas = await html2canvas(element);
        const link = document.createElement('a');
        link.download = 'my_achievements.png';
        link.href = canvas.toDataURL();
        link.click();
    } catch (err) { alert('فشل إنشاء الصورة'); }
}

// ---------- الإدخال الصوتي ----------
function setupVoiceInput() {
    const voiceBtn = document.getElementById('voiceAddBtn');
    if (!voiceBtn) return;
    if (!('webkitSpeechRecognition' in window)) {
        voiceBtn.disabled = true;
        voiceBtn.title = 'المتصفح لا يدعم الإدخال الصوتي';
        return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.interimResults = false;
    voiceBtn.onclick = () => {
        recognition.start();
        voiceBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
    };
    recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        document.getElementById('newTaskInput').value = text;
        addTask(text);
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    };
    recognition.onerror = () => { voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>'; };
}

// ---------- التنقل بين الصفحات ----------
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const pages = ['dashboard', 'stats', 'achievements', 'settings'];
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (!page) return;
            currentPage = page;
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(`${page}-page`).classList.add('active');
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (page === 'stats') {
                if (!xpChart) initCharts();
                else updateCharts();
            } else if (page === 'achievements') renderAchievements();
        });
    });
    // زر الإضافة السريع
    document.getElementById('fab')?.addEventListener('click', () => {
        document.getElementById('newTaskInput').focus();
    });
}

// ---------- الرسوم البيانية ----------
function initCharts() {
    const ctx1 = document.getElementById('xpTrendChart')?.getContext('2d');
    const ctx2 = document.getElementById('financeTrendChart')?.getContext('2d');
    if (!ctx1 || !ctx2) return;
    const last7 = getLast7Days();
    xpChart = new Chart(ctx1, {
        type: 'line',
        data: { labels: last7, datasets: [{ label: 'XP', data: [], borderColor: '#38bdf8', tension: 0.3 }] },
        options: { responsive: true }
    });
    financeChart = new Chart(ctx2, {
        type: 'bar',
        data: { labels: last7, datasets: [{ label: 'مدخرات (₿)', data: [], backgroundColor: '#4ade80' }] },
        options: { responsive: true }
    });
    updateCharts();
}

// ---------- Three.js الخلفية ثلاثية الأبعاد ----------
function initThreeBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;
    const geometry = new THREE.BufferGeometry();
    const particlesCount = 1500;
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount; i++) {
        positions[i*3] = (Math.random() - 0.5) * 100;
        positions[i*3+1] = (Math.random() - 0.5) * 60;
        positions[i*3+2] = (Math.random() - 0.5) * 50 - 20;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.15, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    function animate() {
        requestAnimationFrame(animate);
        particles.rotation.y += 0.0005;
        particles.rotation.x += 0.0003;
        renderer.render(scene, camera);
    }
    animate();
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
}

// ---------- تهيئة الصوت ----------
function initAudio() {
    audioComplete = document.getElementById('completeSound');
    audioAchievement = document.getElementById('achievementSound');
    if (audioComplete) audioComplete.volume = 0.3;
    if (audioAchievement) audioAchievement.volume = 0.4;
}

// ---------- عرض الترحيب ----------
function setGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 12) greeting = 'صباح الخير ☀️';
    else if (hour < 18) greeting = 'مساء الخير 🌤️';
    else greeting = 'مساء الخير 🌙';
    document.getElementById('greeting').innerText = `${greeting}، ابدأ يومك بقوة!`;
}

// ---------- الوظيفة الرئيسية ----------
function renderAll() {
    renderTasks();
    updateAllStats();
    setGreeting();
}

function init() {
    loadData();
    checkMonthRollover();
    initThreeBackground();
    initAudio();
    setupNavigation();
    renderAll();
    setupSettingsUI();
    setupVoiceInput();
    if (document.getElementById('xpTrendChart')) initCharts();
    if (document.getElementById('achievementsGrid')) renderAchievements();
    // إضافة حدث إضافة مهمة
    document.getElementById('addTaskBtn')?.addEventListener('click', () => {
        addTask(document.getElementById('newTaskInput').value);
        document.getElementById('newTaskInput').value = '';
    });
    document.getElementById('setGoalBtn')?.addEventListener('click', () => {
        const val = parseFloat(document.getElementById('financialGoalInput').value);
        if (!isNaN(val) && val > 0) setFinancialGoal(val);
    });
    document.getElementById('recordSavingBtn')?.addEventListener('click', () => {
        const val = parseFloat(document.getElementById('dailySavingInput').value);
        if (!isNaN(val) && val > 0) recordSaving(val);
    });
    // تحديث دوري (كل دقيقة)
    setInterval(() => {
        checkMonthRollover();
        updateAllStats();
    }, 60000);
}

init();