/* =========================================================================
   02-POMO-CORE.JS (v17.0 PURE DESKTOP EDITION) — UNIFIED TIMER, OVERTIME
   GUARDRAIL, 5-WAY POMOCLOUD FIREBASE SYNC, PROTOCOL LAUNCHER, WINDOW-AWARE
   SALAH FREEZE LOCK, POMOTASKS, 4-GRAPH STUDIO, GLOBAL APP THEME/HARDWARE
   PANEL & CUSTOMIZABLE STATEFUL LAPTOP/DESKTOP HOTKEYS ENGINE
   ========================================================================= */

// 0. DEFENSIVE DESKTOP COMPATIBILITY SHIM (Guarantees 100% sync with 01-core-bus.js)
window.haptic = window.haptic || function() {};
window.escapeJsStr = window.escapeJsStr || function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/\r?\n/g, ' ');
};

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const defaultExtConfig = {
    studyTargetHours: 8.0,
    deenTargetHours: 1.0,
    customSubjects: ['Physics', 'Chemistry', 'Biology'],
    deenPurpose: {
        title: "🕌 Strengthen Deen & Imaan",
        desc: "Follow the Islamic path for my entire life — Salah on time & daily Deen knowledge."
    },
    mainGoal: {
        title: "Primary Life & Academic Goal",
        targetDate: addDaysToTodayISO(210)
    },
    sideGoals: [
        { id: 101, title: "Build & Ship Projects", targetDate: addDaysToTodayISO(45) },
        { id: 102, title: "Morning Fitness & Strength Routine", targetDate: addDaysToTodayISO(90) },
        { id: 103, title: "Master High-Yield Revision Bank", targetDate: addDaysToTodayISO(120) }
    ],
    salahTimes: {
        Fajr: "05:15",
        Dhuhr: "13:15",
        Asr: "16:45",
        Maghrib: "18:10",
        Isha: "19:45"
    },
    salahAlertsEnabled: true,
    salahFreezeEnabled: true,
    salahFreezeDurationMins: 10,
    masjidLocationName: "Local Masjid Schedule (Click any time to customize)"
};

window.extConfig = JSON.parse(safeGet('pages_pomodoro_ext_config_v9', 'null')) || defaultExtConfig;
extConfig.studyTargetHours = parseFloat(extConfig.studyTargetHours) || 8.0;
extConfig.deenTargetHours = parseFloat(extConfig.deenTargetHours) || 1.0;
if (!extConfig.deenPurpose) extConfig.deenPurpose = defaultExtConfig.deenPurpose;
if (!extConfig.mainGoal) extConfig.mainGoal = defaultExtConfig.mainGoal;
if (extConfig.mainGoal.title === 'Cracking NEET') extConfig.mainGoal.title = 'Primary Life & Academic Goal';
if (!Array.isArray(extConfig.sideGoals)) extConfig.sideGoals = defaultExtConfig.sideGoals;
if (!extConfig.salahTimes) extConfig.salahTimes = defaultExtConfig.salahTimes;
if (extConfig.salahFreezeEnabled === undefined) extConfig.salahFreezeEnabled = true;
extConfig.salahFreezeDurationMins = parseInt(extConfig.salahFreezeDurationMins) || 10;
if (!Array.isArray(extConfig.customSubjects) || !extConfig.customSubjects.length) {
    extConfig.customSubjects = ['Physics', 'Chemistry', 'Biology'];
}

window.salahHistory = JSON.parse(safeGet('pages_pomodoro_salah_hist_v9', '{}'));
window.deenHistory = JSON.parse(safeGet('pages_pomodoro_deen_hist_v9', '{}'));
window.todos = JSON.parse(safeGet('pages_pomodoro_todos_v9', '[]'));
window.todoLists = JSON.parse(safeGet('pages_pomodoro_todolists_v9', '[]'));
window.schedule = JSON.parse(safeGet('pages_pomodoro_schedule_v8', '[]'));
window.weeklyTemplates = JSON.parse(safeGet('pages_pomodoro_weekly_v8', 'null'));
if (!weeklyTemplates) {
    window.weeklyTemplates = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (let i = 0; i <= 6; i++) weeklyTemplates[i] = JSON.parse(JSON.stringify(schedule));
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklyTemplates));
}

window.activeTemplateDay = new Date().getDay();
window.currentStepIndex = 0;
window.timeLeft = 0;
window.timerInterval = null;
window.isRunning = false;
window.targetEndTime = 0;
window.accumulatedStudyTime = 0;
window.accumulatedDeenTime = 0;
window.isOvertime = false;
window.overtimeExtensionMins = 0;
window.lastOvertimeWarnStage = 0;
window.isPureCountUpMode = false;
window.pureCountUpSeconds = 0;
window.activeTaskTab = 'backlog';
window.activeTaskSubj = extConfig.customSubjects[0] || 'Physics';
window.todoLayoutMode = safeGet('pages_pomodoro_todo_layout_v1', 'list');

let lastRenderedTime = -1, guidePopupTimeout = null, lastPopupStep = -1;

window.saveExtConfig = function() {
    safeSet('pages_pomodoro_ext_config_v9', JSON.stringify(extConfig));
    safeSet('pages_pomodoro_salah_hist_v9', JSON.stringify(salahHistory));
    safeSet('pages_pomodoro_deen_hist_v9', JSON.stringify(deenHistory));
    PomoEventBus.emit('config:saved');
};

/* =========================================================================
   1. POMOCLOUD FIREBASE OMNI-SYNC & EXTERNAL STUDIO BRIDGE
   ========================================================================= */
const firebaseConfig = {
    apiKey: "AIza" + "SyAbi9-V0S3DOtOAgBirMxrvV6J-XdwLf3Q",
    authDomain: "neettimercloud.firebaseapp.com",
    projectId: "neettimercloud",
    storageBucket: "neettimercloud.firebasestorage.app",
    messagingSenderId: "337999532676",
    appId: "1:337999532676:web:545ae526ab038192e3e8d1"
};

let db = null, auth = null, isAuthReady = false;
try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    }
} catch (e) {}

window.getPomoCloudDb = function() { return db; };

async function authenticateForCloud() {
    if (!auth) { isAuthReady = false; return false; }
    try { await auth.signInAnonymously(); isAuthReady = true; return true; }
    catch (err) { isAuthReady = true; return true; }
}
authenticateForCloud();

let currentSyncRoom = safeGet('pages_pomodoro_sync_room', '');
let savedPlainUser = safeGet('pages_pomodoro_sync_user', '');
let savedPlainPass = safeGet('pages_pomodoro_sync_pass', '');
let unsubscribeSnapshot = null;
let isInternalSyncUpdate = false;
let lastCloudReceiveTime = 0;
let cloudBroadcastTimer = null;

window.getCurrentSyncRoom = function() { return currentSyncRoom; };

window.broadcastToCloud = function() {
    if (!currentSyncRoom || isInternalSyncUpdate || (Date.now() - lastCloudReceiveTime < 900) || !db) return;
    clearTimeout(cloudBroadcastTimer);
    cloudBroadcastTimer = setTimeout(async () => {
        if (!currentSyncRoom || isInternalSyncUpdate || (Date.now() - lastCloudReceiveTime < 900) || !db) return;
        try {
            const roomDoc = db.collection('artifacts').doc('neettimercloud').collection('public').doc('data').collection('sync_rooms').doc(currentSyncRoom);
            await roomDoc.set({
                stepIndex: currentStepIndex,
                timeLeft: timeLeft,
                isRunning: isRunning,
                isOvertime: isOvertime,
                targetEndTime: targetEndTime,
                schedule: schedule,
                tasksStr: safeGet('pages_pomodoro_tasks_v8', '[]'),
                weeklyStr: safeGet('pages_pomodoro_weekly_v8', null),
                statsStr: safeGet('pages_pomodoro_stats_v8', '{"history":{}}'),
                mcqStr: safeGet('pages_pomodoro_mcq_v8', '{}'),
                pomoExtStr: JSON.stringify({ extConfig, salahHistory, deenHistory, todos, todoLists }),
                timestamp: Date.now()
            }, { merge: true });
        } catch (e) {}
    }, 380);
};

async function connectToCloud(roomId) {
    if (!db) return;
    if (!isAuthReady) await authenticateForCloud();
    try {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        document.getElementById('sync-status')?.classList.remove('hidden');
        const roomDoc = db.collection('artifacts').doc('neettimercloud').collection('public').doc('data').collection('sync_rooms').doc(roomId);
        unsubscribeSnapshot = roomDoc.onSnapshot((docSnap) => {
            if (!docSnap.exists) return;
            const data = docSnap.data();
            isInternalSyncUpdate = true;
            lastCloudReceiveTime = Date.now();

            if (data.schedule && JSON.stringify(schedule) !== JSON.stringify(data.schedule)) {
                window.schedule = data.schedule;
                safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
                renderSchedule();
            }
            if (data.isOvertime !== undefined) {
                window.isOvertime = Boolean(data.isOvertime);
                timeDisplay?.classList.toggle('overtime-glow', window.isOvertime);
            }
            if (data.stepIndex !== undefined && currentStepIndex !== data.stepIndex) loadStep(data.stepIndex, true);
            if (data.isRunning !== undefined) {
                if (data.isRunning && !isRunning) {
                    targetEndTime = data.targetEndTime;
                    let rem = Math.round((targetEndTime - Date.now()) / 1000);
                    timeLeft = rem > 0 ? rem : Math.abs(rem);
                    startTimer(true);
                } else if (!data.isRunning && isRunning) {
                    timeLeft = data.timeLeft;
                    stopTimer(true, true);
                }
            } else if (!isRunning && data.timeLeft !== undefined) {
                timeLeft = data.timeLeft;
                updateDisplay();
            }
            if (data.tasksStr) { safeSet('pages_pomodoro_tasks_v8', data.tasksStr); PomoEventBus.emit('vault:remoteUpdated'); }
            if (data.weeklyStr) { safeSet('pages_pomodoro_weekly_v8', data.weeklyStr); window.weeklyTemplates = JSON.parse(data.weeklyStr); populateSettingsList(); }
            if (data.statsStr) { safeSet('pages_pomodoro_stats_v8', data.statsStr); renderStats(); renderHomeHUD(); }
            if (data.mcqStr) { safeSet('pages_pomodoro_mcq_v8', data.mcqStr); }
            if (data.pomoExtStr) {
                try {
                    const ext = JSON.parse(data.pomoExtStr);
                    if (ext.extConfig) { window.extConfig = ext.extConfig; safeSet('pages_pomodoro_ext_config_v9', JSON.stringify(extConfig)); }
                    if (ext.salahHistory) { window.salahHistory = ext.salahHistory; safeSet('pages_pomodoro_salah_hist_v9', JSON.stringify(salahHistory)); }
                    if (ext.deenHistory) { window.deenHistory = ext.deenHistory; safeSet('pages_pomodoro_deen_hist_v9', JSON.stringify(deenHistory)); }
                    if (Array.isArray(ext.todos)) { window.todos = ext.todos; safeSet('pages_pomodoro_todos_v9', JSON.stringify(todos)); renderTodoListsBar(); renderTodos(); }
                    if (Array.isArray(ext.todoLists)) { window.todoLists = ext.todoLists; safeSet('pages_pomodoro_todolists_v9', JSON.stringify(todoLists)); renderTodoListsBar(); }
                    renderHomeHUD();
                    renderSalahStrip();
                    PomoEventBus.emit('compass:remoteUpdated');
                } catch (err) {}
            }
            isInternalSyncUpdate = false;
        });
    } catch (e) {}
}

const syncEmailInp = document.getElementById('sync-email-input');
const syncPassInp = document.getElementById('sync-pass-input');
const loginSyncBtn = document.getElementById('login-sync-btn');
if (currentSyncRoom && loginSyncBtn) {
    connectToCloud(currentSyncRoom);
    loginSyncBtn.textContent = "Disconnect System";
    loginSyncBtn.className = "w-full bg-red-600/30 border border-red-500/40 text-red-300 font-bold py-2.5 rounded-lg text-sm";
    syncEmailInp.value = savedPlainUser || currentSyncRoom;
    syncPassInp.value = savedPlainPass || '';
    syncEmailInp.disabled = true;
    syncPassInp.disabled = true;
}

loginSyncBtn?.addEventListener('click', () => {
    if (currentSyncRoom) {
        currentSyncRoom = '';
        safeSet('pages_pomodoro_sync_room', '');
        safeSet('pages_pomodoro_sync_user', '');
        safeSet('pages_pomodoro_sync_pass', '');
        if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
        loginSyncBtn.textContent = "Connect System";
        loginSyncBtn.className = "w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg text-sm shadow-md";
        document.getElementById('sync-status')?.classList.add('hidden');
        syncEmailInp.disabled = false;
        syncPassInp.disabled = false;
        syncEmailInp.value = '';
        syncPassInp.value = '';
        showToast("PomoCloud Disconnected");
    } else {
        const em = syncEmailInp.value.trim();
        const pw = syncPassInp.value.trim();
        if (em && pw) {
            currentSyncRoom = encodeURIComponent(btoa(em + ":" + pw)).replace(/%/g, '');
            safeSet('pages_pomodoro_sync_room', currentSyncRoom);
            safeSet('pages_pomodoro_sync_user', em);
            safeSet('pages_pomodoro_sync_pass', pw);
            syncEmailInp.disabled = true;
            syncPassInp.disabled = true;
            loginSyncBtn.textContent = "Disconnect System";
            loginSyncBtn.className = "w-full bg-red-600/30 border border-red-500/40 text-red-300 font-bold py-2.5 rounded-lg text-sm";
            connectToCloud(currentSyncRoom);
            broadcastToCloud();
            showToast("Connected to PomoCloud Room: " + em);
        } else {
            showToast("Enter Room ID and Security Key", true);
        }
    }
});

document.getElementById('toggle-sync-pass-btn')?.addEventListener('click', () => {
    syncPassInp.type = syncPassInp.type === 'password' ? 'text' : 'password';
});

document.getElementById('export-backup-btn')?.addEventListener('click', () => {
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pages_pomodoro_')) dump[k] = localStorage.getItem(k);
    }
    const jsonStr = JSON.stringify(dump);
    document.getElementById('backup-json-input').value = jsonStr;
    try { navigator.clipboard.writeText(jsonStr); } catch (e) {}
    showToast("Backup JSON copied & ready!");
});

document.getElementById('import-backup-btn')?.addEventListener('click', () => {
    const raw = document.getElementById('backup-json-input').value.trim();
    if (!raw) { showToast("Paste backup JSON first", true); return; }
    try {
        const parsed = JSON.parse(raw);
        Object.keys(parsed).forEach(k => {
            if (k.startsWith('pages_pomodoro_')) safeSet(k, parsed[k]);
        });
        showToast("Backup Restored! Reloading...");
        setTimeout(() => window.location.reload(), 900);
    } catch (e) { showToast("Invalid Backup JSON", true); }
});

/* =========================================================================
   2. NAVIGATION, ESC HANDLER, DIM MODE & CUSTOMIZABLE HOTKEYS ENGINE
   ========================================================================= */
window.currentPageId = 'page-timer';
window.switchPage = function(targetId) {
    document.querySelectorAll('.app-page').forEach(page => page.classList.remove('active-page'));
    document.getElementById(targetId)?.classList.add('active-page');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-target') === targetId) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    window.currentPageId = targetId;
    if (targetId === 'page-timer') { renderHomeHUD(); renderSalahStrip(); evaluateDriftAndAlerts(); }
    if (targetId === 'page-schedule') { renderSchedule(); populateSettingsList(); }
    if (targetId === 'page-todo') { renderTodoListsBar(); renderTodos(); }
    if (targetId === 'page-vault') { PomoEventBus.emit('vault:tabOpened'); }
    if (targetId === 'page-settings') { renderStats(); renderSettingsSalahList(); }
    if (targetId === 'page-reader') { PomoEventBus.emit('reader:openedTab'); }
};

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchPage(e.currentTarget.getAttribute('data-target')));
});

document.getElementById('header-goal-pill')?.addEventListener('click', () => {
    switchPage('page-vault');
    if (window.activateVaultSubview) window.activateVaultSubview('compass');
});
document.getElementById('top-rpg-quick-btn')?.addEventListener('click', () => {
    switchPage('page-vault');
    document.getElementById('mode-rpg-rank-btn')?.click();
});
document.getElementById('home-masjid-Config-btn')?.addEventListener('click', () => {
    switchPage('page-settings');
    document.querySelector('.prof-tab[data-tab="prof-salah"]')?.click();
});
document.getElementById('desktop-pip-top-btn')?.addEventListener('click', () => {
    if (window.launchPipMiniCockpitWidget) window.launchPipMiniCockpitWidget();
});

/* =========================================================================
   2B. CUSTOMIZABLE LAPTOP / DESKTOP HOTKEYS ENGINE (WITH SAME-KEY UNDO)
   ========================================================================= */
const DEFAULT_HOTKEY_ACTIONS = [
    // Category 1: Global & Navigation
    { id: 'nav_timer', cat: 'Global & Navigation', label: 'Switch to Timer Cockpit', defKey: 'Alt+1' },
    { id: 'nav_plan', cat: 'Global & Navigation', label: 'Switch to Live Protocol Plan', defKey: 'Alt+2' },
    { id: 'nav_tasks', cat: 'Global & Navigation', label: 'Switch to PomoTasks & My Day', defKey: 'Alt+3' },
    { id: 'nav_vault', cat: 'Global & Navigation', label: 'Switch to Compass & Memory Vault', defKey: 'Alt+4' },
    { id: 'nav_reader', cat: 'Global & Navigation', label: 'Switch to 3D Wooden Shelf & Reader', defKey: 'Alt+5' },
    { id: 'nav_profile', cat: 'Global & Navigation', label: 'Switch to Profile & Cloud Settings', defKey: 'Alt+6' },
    { id: 'global_hotkeys_modal', cat: 'Global & Navigation', label: 'Open Custom Hotkeys Recorder', defKey: '?' },
    { id: 'global_privacy_lock', cat: 'Global & Navigation', label: 'Lock Workspace with Privacy PIN', defKey: 'Alt+l' },
    { id: 'global_app_theme', cat: 'Global & Navigation', label: 'Cycle Global App Theme (1-Click)', defKey: 'Alt+t' },

    // Category 2: Timer, Tasks & Vault
    { id: 'timer_start_stop', cat: 'Timer & Tasks', label: 'Start / Stop Timer (Works in Timer & Reader!)', defKey: 'Space' },
    { id: 'timer_complete', cat: 'Timer & Tasks', label: 'Complete Active Pomodoro Session', defKey: 'c' },
    { id: 'timer_skip', cat: 'Timer & Tasks', label: 'Skip Active Pomodoro Session', defKey: 's' },
    { id: 'timer_undo', cat: 'Timer & Tasks', label: 'Previous / Undo Pomodoro Session', defKey: 'u' },
    { id: 'timer_dim', cat: 'Timer & Tasks', label: 'Toggle OLED Power-Saving Dim Mode', defKey: 'd' },
    { id: 'timer_pip', cat: 'Timer & Tasks', label: 'Pop Out Mini-PiP Floating Timer', defKey: 'w' },
    { id: 'tasks_new_focus', cat: 'Timer & Tasks', label: 'Focus New PomoTask / Vault Input Box', defKey: 'n' },
    { id: 'tasks_grid_toggle', cat: 'Timer & Tasks', label: 'Toggle Tasks Grid / List View', defKey: 'g' },
    { id: 'tasks_analytics', cat: 'Timer & Tasks', label: 'Open 4-Graph Multi-Horizon Studio', defKey: 'a' },

    // Category 3: Reader Navigation, Views & Modes (Stateful 1st Click Open / 2nd Click Close)
    { id: 'reader_next_page', cat: 'Reader Navigation & Views', label: 'Next Page in Active Book', defKey: 'ArrowRight' },
    { id: 'reader_prev_page', cat: 'Reader Navigation & Views', label: 'Previous Page in Active Book', defKey: 'ArrowLeft' },
    { id: 'reader_zoom_in', cat: 'Reader Navigation & Views', label: 'Zoom In Book Page', defKey: '=' },
    { id: 'reader_zoom_out', cat: 'Reader Navigation & Views', label: 'Zoom Out Book Page', defKey: '-' },
    { id: 'reader_dual_split', cat: 'Reader Navigation & Views', label: 'Dual-Book Split View (2nd Press Closes)', defKey: 'v' },
    { id: 'reader_scratchpad', cat: 'Reader Navigation & Views', label: 'Open PomoNote Scratchpad (2nd Press Closes)', defKey: 'm' },
    { id: 'reader_bionic', cat: 'Reader Navigation & Views', label: 'Bionic Fast-Reading Mode (2nd Press OFF)', defKey: 'y' },
    { id: 'reader_cycle_theme', cat: 'Reader Navigation & Views', label: 'Cycle Eye-Healthy Reading Theme', defKey: 'r' },
    { id: 'reader_sel_method', cat: 'Reader Navigation & Views', label: 'Switch Official Blue Text vs. Box-Draw Select', defKey: 'x' },
    { id: 'reader_toc_drawer', cat: 'Reader Navigation & Views', label: 'Chapters/Bookmarks Drawer (2nd Press Closes)', defKey: 't' },
    { id: 'reader_search_drawer', cat: 'Reader Navigation & Views', label: 'Search Book Drawer (2nd Press Closes)', defKey: 'f' },
    { id: 'reader_dictionary', cat: 'Reader Navigation & Views', label: '4-Language Dictionary (2nd Press Closes)', defKey: 'l' },

    // Category 4: Reader Pencil, Occlusion, Bookmark, Note & Highlight Colors (2nd Press Undoes!)
    { id: 'reader_master_undo', cat: 'Reader Tools (Same-Key Undo)', label: 'Master Undo Last Pencil / Highlight / Mask', defKey: 'z' },
    { id: 'reader_pencil_studio', cat: 'Reader Tools (Same-Key Undo)', label: 'Toggle Pencil Studio Bar (2nd Press Closes)', defKey: 'p' },
    { id: 'reader_tool_pencil', cat: 'Reader Tools (Same-Key Undo)', label: 'Pencil Freehand Tool (2nd Press Undoes Stroke)', defKey: '1' },
    { id: 'reader_tool_line', cat: 'Reader Tools (Same-Key Undo)', label: 'Straight Line Tool (2nd Press Undoes Line)', defKey: '2' },
    { id: 'reader_tool_arrow', cat: 'Reader Tools (Same-Key Undo)', label: 'Arrow Tool (2nd Press Undoes Arrow)', defKey: '3' },
    { id: 'reader_tool_rect', cat: 'Reader Tools (Same-Key Undo)', label: 'Square / Box Tool (2nd Press Undoes Square)', defKey: '4' },
    { id: 'reader_tool_circle', cat: 'Reader Tools (Same-Key Undo)', label: 'Circle / Ellipse Tool (2nd Press Undoes Circle)', defKey: '5' },
    { id: 'reader_tool_text', cat: 'Reader Tools (Same-Key Undo)', label: 'Canvas Text Tool (2nd Press Undoes Text)', defKey: '6' },
    { id: 'reader_tool_eraser', cat: 'Reader Tools (Same-Key Undo)', label: 'Click-Delete Eraser (2nd Press Exits)', defKey: '7' },
    { id: 'reader_occlude_tool', cat: 'Reader Tools (Same-Key Undo)', label: 'Image Occlusion Mask Tool (2nd Press Undoes Mask)', defKey: 'o' },
    { id: 'reader_occlude_reveal', cat: 'Reader Tools (Same-Key Undo)', label: 'Reveal / Mask All Occluded Labels on Page', defKey: 'i' },
    { id: 'reader_bookmark_toggle', cat: 'Reader Tools (Same-Key Undo)', label: 'Bookmark Page/Line (2nd Press Undoes Bookmark)', defKey: 'b' },
    { id: 'reader_note_toggle', cat: 'Reader Tools (Same-Key Undo)', label: 'Show / Add Note on Page (2nd Press Undoes/Closes)', defKey: ';' },
    { id: 'reader_hl_undo', cat: 'Reader Tools (Same-Key Undo)', label: 'Undo Last Highlight on Page', defKey: 'Backspace' },
    { id: 'reader_hl_yellow', cat: 'Reader Tools (Same-Key Undo)', label: 'Highlight Yellow (2nd Press Undoes Highlight)', defKey: 'h' },
    { id: 'reader_hl_green', cat: 'Reader Tools (Same-Key Undo)', label: 'Highlight Green (2nd Press Undoes Highlight)', defKey: 'q' },
    { id: 'reader_hl_blue', cat: 'Reader Tools (Same-Key Undo)', label: 'Highlight Blue (2nd Press Undoes Highlight)', defKey: 'e' },
    { id: 'reader_hl_pink', cat: 'Reader Tools (Same-Key Undo)', label: 'Highlight Pink (2nd Press Undoes Highlight)', defKey: 'k' },
    { id: 'reader_hl_orange', cat: 'Reader Tools (Same-Key Undo)', label: 'Highlight Orange (2nd Press Undoes Highlight)', defKey: '8' },
    { id: 'reader_hl_purple', cat: 'Reader Tools (Same-Key Undo)', label: 'Highlight Purple (2nd Press Undoes Highlight)', defKey: '9' }
];

function getDefaultHotkeyMap() {
    const map = {};
    DEFAULT_HOTKEY_ACTIONS.forEach(a => { map[a.id] = a.defKey; });
    return map;
}

window.customHotkeysMap = Object.assign(
    getDefaultHotkeyMap(),
    JSON.parse(safeGet('pages_pomodoro_custom_hotkeys_v17', '{}'))
);

window.saveCustomHotkeysMap = function() {
    safeSet('pages_pomodoro_custom_hotkeys_v17', JSON.stringify(window.customHotkeysMap));
};

function normalizeKeyEventString(e) {
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return null;
    const mods = [];
    if (e.ctrlKey || e.metaKey) mods.push('Ctrl');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey && e.key.length > 1) mods.push('Shift');

    let k = e.code === 'Space' || e.key === ' ' ? 'Space' : e.key;
    if (k.length === 1 && k !== '?') k = k.toLowerCase();
    return mods.length ? `${mods.join('+')}+${k}` : k;
}

let recordingActionId = null;

window.startRecordingHotkey = function(actionId) {
    recordingActionId = actionId;
    const btn = document.getElementById(`hk-rec-btn-${actionId}`);
    if (btn) {
        btn.textContent = '🔴 Press Any Key... (Esc to Cancel)';
        btn.className = "bg-rose-600 text-white border border-rose-400 px-3 py-1 rounded-lg font-mono font-extrabold text-xs animate-pulse";
    }
};

window.resetSingleHotkey = function(actionId) {
    const def = DEFAULT_HOTKEY_ACTIONS.find(a => a.id === actionId);
    if (def) {
        window.customHotkeysMap[actionId] = def.defKey;
        window.saveCustomHotkeysMap();
        window.openDesktopKeysModal();
    }
};

window.resetAllHotkeysToDefault = function() {
    window.customHotkeysMap = getDefaultHotkeyMap();
    window.saveCustomHotkeysMap();
    window.openDesktopKeysModal();
    showToast("⌨️ All Hotkeys restored to defaults!");
};

window.openDesktopKeysModal = function() {
    recordingActionId = null;
    const modal = document.getElementById('reader-suboptions-modal');
    const titleEl = document.getElementById('suboptions-modal-title');
    const bodyEl = document.getElementById('suboptions-modal-body');
    if (!modal || !titleEl || !bodyEl) return;

    titleEl.textContent = "⌨️ Customizable Laptop / Desktop Hotkeys Studio";

    const categories = ['Global & Navigation', 'Timer & Tasks', 'Reader Navigation & Views', 'Reader Tools (Same-Key Undo)'];
    let html = `
        <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-2xl border border-cyan-500/40">
            <div>
                <p class="text-xs font-extrabold text-cyan-300">💡 Click any key badge below and press your desired key or shortcut!</p>
                <p class="text-[10px] text-slate-400">In Reader Tools, pressing the <b>same hotkey a 2nd time</b> automatically undoes or closes that tool.</p>
            </div>
            <button type="button" onclick="window.resetAllHotkeysToDefault()" class="bg-slate-800 hover:bg-red-900/60 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-extrabold">↺ Reset Defaults</button>
        </div>
        <input type="text" id="hk-filter-search-inp" placeholder="🔎 Filter hotkeys (e.g. pencil, highlight, mask, bionic, timer)..." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
        <div id="hk-categories-list-box" class="flex flex-col gap-3 max-h-[62vh] native-scroll pr-1">
    `;

    categories.forEach(cat => {
        const items = DEFAULT_HOTKEY_ACTIONS.filter(a => a.cat === cat);
        html += `
            <div class="hk-cat-group bg-slate-950/90 border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5">
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-1 mb-1">${escapeHtml(cat)}</span>
                ${items.map(act => {
                    const curKey = window.customHotkeysMap[act.id] || act.defKey;
                    return `
                        <div class="hk-item-row flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800/90 gap-2" data-label="${escapeHtml(act.label.toLowerCase())}">
                            <span class="text-xs text-slate-200 font-semibold">${escapeHtml(act.label)}</span>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <button type="button" id="hk-rec-btn-${act.id}" onclick="window.startRecordingHotkey('${act.id}')" class="bg-slate-950 hover:bg-blue-600 text-cyan-300 hover:text-white border border-cyan-500/40 px-3 py-1 rounded-lg font-mono font-extrabold text-xs min-w-[72px] text-center shadow">
                                    ${escapeHtml(curKey)}
                                </button>
                                <button type="button" onclick="window.resetSingleHotkey('${act.id}')" class="text-[10px] text-slate-400 hover:text-white px-1.5 py-1 rounded bg-slate-950 border border-slate-800" title="Reset to Default (${escapeHtml(act.defKey)})">↺</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    });

    html += `</div>`;
    bodyEl.innerHTML = html;
    modal.classList.remove('hidden');

    document.getElementById('hk-filter-search-inp')?.addEventListener('input', (e) => {
        const q = (e.target.value || '').trim().toLowerCase();
        bodyEl.querySelectorAll('.hk-item-row').forEach(row => {
            const match = !q || (row.getAttribute('data-label') || '').includes(q);
            row.classList.toggle('hidden', !match);
        });
    });
};

document.getElementById('desktop-keys-top-btn')?.addEventListener('click', () => window.openDesktopKeysModal());

function executeReaderHotkeyAction(actionId) {
    if (window.PomoReaderCore && typeof window.PomoReaderCore.handleReaderHotkey === 'function') {
        const handled = window.PomoReaderCore.handleReaderHotkey(actionId);
        if (handled) return true;
    }

    // Fallback DOM dispatch if PomoReaderCore handler isn't bound yet
    if (actionId === 'reader_next_page') { document.getElementById('reader-next-page-btn')?.click(); return true; }
    if (actionId === 'reader_prev_page') { document.getElementById('reader-prev-page-btn')?.click(); return true; }
    if (actionId === 'reader_zoom_in') { document.getElementById('reader-zoom-in-btn')?.click(); return true; }
    if (actionId === 'reader_zoom_out') { document.getElementById('reader-zoom-out-btn')?.click(); return true; }
    if (actionId === 'reader_dual_split') { window.openDualBookSplitViewer?.(); return true; }
    if (actionId === 'reader_scratchpad') { window.toggleSplitScreenScratchpad?.(); return true; }
    if (actionId === 'reader_bionic') { window.toggleBionicReadingMode?.(); return true; }
    if (actionId === 'reader_sel_method') { window.toggleOfficialVsBoxSelectionMode?.(); return true; }
    if (actionId === 'reader_toc_drawer') {
        const dr = document.getElementById('reader-toc-bookmarks-drawer');
        if (dr && !dr.classList.contains('hidden')) dr.classList.add('hidden');
        else document.getElementById('reader-bottom-toc-btn')?.click();
        return true;
    }
    if (actionId === 'reader_search_drawer') {
        const dr = document.getElementById('reader-fullsearch-drawer');
        if (dr && !dr.classList.contains('hidden')) dr.classList.add('hidden');
        else document.getElementById('reader-bottom-search-btn')?.click();
        return true;
    }
    if (actionId === 'reader_dictionary') {
        const md = document.getElementById('reader-dictionary-modal');
        if (md && !md.classList.contains('hidden')) md.classList.add('hidden');
        else document.getElementById('reader-open-dict-top-btn')?.click();
        return true;
    }
    if (actionId === 'reader_master_undo') { window.undoLastReaderAnnotation?.(); return true; }
    if (actionId === 'reader_pencil_studio') { document.getElementById('reader-pencil-toggle-btn')?.click(); return true; }
    return false;
}

if (!window._desktopHotkeysBound) {
    window._desktopHotkeysBound = true;
    window.addEventListener('keydown', (e) => {
        // 1. If user is currently recording a custom hotkey in the Hotkey Studio Modal
        if (recordingActionId) {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === 'Escape') {
                recordingActionId = null;
                window.openDesktopKeysModal();
                return;
            }
            const keyCombo = normalizeKeyEventString(e);
            if (!keyCombo) return;

            window.customHotkeysMap[recordingActionId] = keyCombo;
            const savedId = recordingActionId;
            recordingActionId = null;
            window.saveCustomHotkeysMap();
            window.openDesktopKeysModal();
            const actObj = DEFAULT_HOTKEY_ACTIONS.find(a => a.id === savedId);
            showToast(`⌨️ Bound "${actObj?.label || savedId}" to [${keyCombo}]!`);
            return;
        }

        const tag = (e.target?.tagName || '').toLowerCase();
        const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
        const pressedCombo = normalizeKeyEventString(e);
        if (!pressedCombo) return;

        const readerOpen = !document.getElementById('reader-fullscreen-overlay')?.classList.contains('hidden');

        // Helper to match an action ID
        const matchesAction = (actId) => {
            const bound = window.customHotkeysMap[actId];
            return bound && bound.toLowerCase() === pressedCombo.toLowerCase();
        };

        // 2. Allow Modifier-based Global Shortcuts even when not typing
        if (!isTyping || pressedCombo.includes('Alt+') || pressedCombo.includes('Ctrl+')) {
            if (matchesAction('nav_timer'))   { e.preventDefault(); document.getElementById('reader-fullscreen-overlay')?.classList.add('hidden'); switchPage('page-timer'); return; }
            if (matchesAction('nav_plan'))    { e.preventDefault(); document.getElementById('reader-fullscreen-overlay')?.classList.add('hidden'); switchPage('page-schedule'); return; }
            if (matchesAction('nav_tasks'))   { e.preventDefault(); document.getElementById('reader-fullscreen-overlay')?.classList.add('hidden'); switchPage('page-todo'); return; }
            if (matchesAction('nav_vault'))   { e.preventDefault(); document.getElementById('reader-fullscreen-overlay')?.classList.add('hidden'); switchPage('page-vault'); return; }
            if (matchesAction('nav_reader'))  { e.preventDefault(); document.getElementById('reader-fullscreen-overlay')?.classList.add('hidden'); switchPage('page-reader'); return; }
            if (matchesAction('nav_profile')) { e.preventDefault(); document.getElementById('reader-fullscreen-overlay')?.classList.add('hidden'); switchPage('page-settings'); return; }
            if (matchesAction('global_privacy_lock')) { e.preventDefault(); document.getElementById('privacy-lock-top-btn')?.click(); return; }
            if (matchesAction('global_app_theme')) { e.preventDefault(); window.cycleGlobalAppTheme?.(); return; }
        }

        // Guardrail: never fire single-key hotkeys while typing inside an input/textarea/scratchpad
        if (isTyping) return;

        if (matchesAction('global_hotkeys_modal')) {
            e.preventDefault();
            const md = document.getElementById('reader-suboptions-modal');
            if (md && !md.classList.contains('hidden')) md.classList.add('hidden');
            else window.openDesktopKeysModal();
            return;
        }

        // 3. Stateful Timer Start / Stop (Works both on Timer Cockpit AND inside Active Book Reader!)
        if (matchesAction('timer_start_stop') && (window.currentPageId === 'page-timer' || readerOpen)) {
            e.preventDefault();
            if (window.isRunning) {
                window.stopTimer();
                showToast("⏸️ Study Timer Paused");
            } else {
                window.startTimer();
                showToast("▶️ Study Timer Running");
            }
            return;
        }

        // 4. Active Book Reader Stateful Hotkeys (With 2nd-Click Undo / Toggle)
        if (readerOpen) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                window.undoLastReaderAnnotation?.();
                return;
            }
            const readerActions = [
                'reader_next_page', 'reader_prev_page', 'reader_zoom_in', 'reader_zoom_out',
                'reader_dual_split', 'reader_scratchpad', 'reader_bionic', 'reader_cycle_theme',
                'reader_sel_method', 'reader_toc_drawer', 'reader_search_drawer', 'reader_dictionary',
                'reader_master_undo', 'reader_pencil_studio',
                'reader_tool_pencil', 'reader_tool_line', 'reader_tool_arrow', 'reader_tool_rect',
                'reader_tool_circle', 'reader_tool_text', 'reader_tool_eraser',
                'reader_occlude_tool', 'reader_occlude_reveal',
                'reader_bookmark_toggle', 'reader_note_toggle',
                'reader_hl_undo', 'reader_hl_yellow', 'reader_hl_green',
                'reader_hl_blue', 'reader_hl_pink', 'reader_hl_orange', 'reader_hl_purple'
            ];
            for (const actId of readerActions) {
                if (matchesAction(actId)) {
                    e.preventDefault();
                    executeReaderHotkeyAction(actId);
                    return;
                }
            }
            return;
        }

        // 5. Timer, Tasks & Vault Page Hotkeys
        if (matchesAction('timer_complete') && window.currentPageId === 'page-timer') { e.preventDefault(); window.completeSession(); return; }
        if (matchesAction('timer_skip') && window.currentPageId === 'page-timer') { e.preventDefault(); document.getElementById('skip-btn')?.click(); return; }
        if (matchesAction('timer_undo') && window.currentPageId === 'page-timer') { e.preventDefault(); document.getElementById('undo-btn')?.click(); return; }
        if (matchesAction('timer_dim') && window.currentPageId === 'page-timer') { e.preventDefault(); document.body.classList.toggle('dim-mode'); return; }
        if (matchesAction('timer_pip')) { e.preventDefault(); window.launchPipMiniCockpitWidget?.(); return; }
        if (matchesAction('tasks_analytics')) { e.preventDefault(); window.openTodoAnalyticsModal?.('12m'); return; }

        if (matchesAction('tasks_new_focus')) {
            if (window.currentPageId === 'page-todo') { e.preventDefault(); document.getElementById('todo-new-input')?.focus(); return; }
            if (window.currentPageId === 'page-vault') { e.preventDefault(); document.getElementById('task-title-input')?.focus(); return; }
        }
        if (matchesAction('tasks_grid_toggle') && window.currentPageId === 'page-todo') {
            e.preventDefault();
            document.getElementById('todo-grid-toggle-btn')?.click();
            return;
        }
    });
}

window.handleAndroidBack = function() {
    const openModals = [
        'salah-freeze-active-overlay', 'critical-overtime-modal', 'pomowake-recheck-modal',
        'master-15-upgrades-modal', 'alarmy-studio-modal', 'protocol-run-modal', 'todo-analytics-modal',
        'reader-dictionary-modal', 'ilovepdf-studio-modal',
        'v4-canvas-text-modal', 'v45-manual-import-modal', 'line-item-viewer-modal',
        'reader-suboptions-modal', 'reader-toc-bookmarks-drawer', 'reader-fullsearch-drawer',
        'book-corner-modal', 'reader-master-settings-modal', 'goal-date-modal',
        'inapp-time-modal', 'targets-modal', 'custom-repeat-modal', 'todo-detail-modal',
        'todo-suggestions-modal', 'new-todolist-modal', 'confirm-reset-modal', 'full-screen-guide-overlay'
    ];
    for (const mId of openModals) {
        const el = document.getElementById(mId);
        if (el && !el.classList.contains('hidden')) {
            el.classList.add('hidden');
            return true;
        }
    }
    const activeReaderOverlay = document.getElementById('reader-fullscreen-overlay');
    if (activeReaderOverlay && !activeReaderOverlay.classList.contains('hidden')) {
        document.getElementById('reader-back-to-shelf-btn')?.click();
        return true;
    }
    if (document.body.classList.contains('dim-mode')) {
        document.body.classList.remove('dim-mode');
        return true;
    }
    if (window.currentPageId !== 'page-timer') {
        switchPage('page-timer');
        return true;
    }
    return false;
};

window.addEventListener('popstate', () => window.handleAndroidBack());
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !recordingActionId) window.handleAndroidBack();
});

document.getElementById('dim-toggle-btn')?.addEventListener('click', () => {
    document.body.classList.add('dim-mode');
    enforceKeepScreenOn();
});
document.getElementById('dim-exit-btn')?.addEventListener('click', () => {
    document.body.classList.remove('dim-mode');
});
document.getElementById('dim-stop-btn')?.addEventListener('click', () => {
    if (isRunning) stopTimer();
    else startTimer();
});

document.querySelectorAll('.prof-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-tab');
        document.querySelectorAll('.prof-tab').forEach(t => t.className = "prof-tab flex-1 bg-transparent text-slate-400 font-bold py-2 rounded-lg text-xs transition-all");
        e.currentTarget.className = "prof-tab flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-all";
        document.querySelectorAll('.prof-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById(targetId)?.classList.remove('hidden');
        if (targetId === 'prof-salah') renderSettingsSalahList();
    });
});

/* =========================================================================
   3. UNIFIED TIMER, 5-WAY SYNC & 3-STAGE OVERTIME GUARDRAIL ENGINE
   ========================================================================= */
const defaultStudyQuotes = ["No distractions. Lock in.", "Your competition is working right now.", "Pain is temporary. Mastery & Success are forever."];
const defaultBreakQuotes = ["Hydrate. Breathe.", "Stand up and stretch.", "Rest your eyes. 20-20-20 rule."];
window.studyQuotes = JSON.parse(safeGet('pages_pomodoro_study_q', JSON.stringify(defaultStudyQuotes)));
window.breakQuotes = JSON.parse(safeGet('pages_pomodoro_break_q', JSON.stringify(defaultBreakQuotes)));

const sqEl = document.getElementById('custom-study-quotes');
const bqEl = document.getElementById('custom-break-quotes');
if (sqEl) sqEl.value = studyQuotes.join('\n');
if (bqEl) bqEl.value = breakQuotes.join('\n');

window.timeDisplay = document.getElementById('time-display');
const sessionTypeDisplay = document.getElementById('session-type');
const currentPhaseDisplay = document.getElementById('current-phase-display');

window.persistState = function() {
    safeSet('pages_pomodoro_app_state_v8', JSON.stringify({
        currentStepIndex, timeLeft, isRunning, targetEndTime, accumulatedStudyTime, accumulatedDeenTime, isOvertime
    }));
};

window.isDeenBlock = function(item) {
    if (!item) return false;
    if (item.category === 'deen') return true;
    const t = (item.title || '').toLowerCase();
    return t.includes('deen') || t.includes('quran') || t.includes('salah') || t.includes('namaz') || t.includes('tafseer') || t.includes('hadith') || t.includes('imaan');
};

window.recordOvertimeToStatsLedger = function(extraMins) {
    if (!extraMins || extraMins <= 0) return;
    const today = getLocalTodayString();
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0, overtimeMins: 0 };
    stats.history[today].overtimeMins = (stats.history[today].overtimeMins || 0) + extraMins;
    safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
};

window.ensureProtocolBlockSyncedToTodo = function(blk) {
    if (!blk || blk.type === 'break') return;
    const today = getLocalTodayString();
    const plannedMins = Math.max(1, Math.round((blk.duration || 2700) / 60));

    if (blk.linkedTodoId) {
        const existing = todos.find(t => String(t.id) === String(blk.linkedTodoId));
        if (existing) {
            existing.durationMins = plannedMins;
            existing.myDayDate = today;
            saveTodos();
            renderTodos();
            return;
        }
    }

    const newTodoId = Date.now() + Math.floor(Math.random() * 999);
    blk.linkedTodoId = newTodoId;
    todos.unshift({
        id: newTodoId,
        linkedVaultId: blk.linkedVaultId || null,
        title: blk.title,
        completed: false,
        important: true,
        myDayDate: today,
        createdDate: today,
        dueDate: blk.dueDate || today,
        durationMins: plannedMins,
        repeat: { type: 'none' },
        steps: [],
        note: blk.note || 'Auto-synced from Live Protocol',
        listId: 'tasks'
    });
    saveTodos();
    renderTodos();
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
};

window.syncCompletionToTimerAndProtocol = function(sourceType, itemId, isNowCompleted) {
    if (!isNowCompleted) return { usedMins: 0, plannedMins: 0, overtimeMins: 0 };
    const today = getLocalTodayString();
    let matchedIdx = -1;

    schedule.forEach((blk, idx) => {
        if (blk.status === 'completed') return;
        if (sourceType === 'todo' && String(blk.linkedTodoId) === String(itemId)) matchedIdx = idx;
        if (sourceType === 'vault' && String(blk.linkedVaultId) === String(itemId)) matchedIdx = idx;
    });

    if (matchedIdx === -1) return null;

    const blk = schedule[matchedIdx];
    const plannedMins = Math.max(1, Math.round((blk.duration || 2700) / 60));
    let usedMins = plannedMins;
    let overtimeMins = 0;

    if (matchedIdx === currentStepIndex && (isRunning || isOvertime || timeLeft < blk.duration)) {
        if (isOvertime) {
            overtimeMins = Math.max(1, Math.ceil(timeLeft / 60));
            usedMins = plannedMins + overtimeMins;
            window.recordOvertimeToStatsLedger(overtimeMins);
        } else {
            const elapsedSec = Math.max(60, (blk.duration || 2700) - timeLeft);
            usedMins = Math.max(1, Math.round(elapsedSec / 60));
        }

        stopTimer(true, true);
        blk.status = 'completed';
        blk._credited = true;
        blk.usedDurationMins = usedMins;
        blk.overtimeMins = overtimeMins;

        if (isDeenBlock(blk)) {
            deenHistory[today] = (deenHistory[today] || 0) + usedMins;
            saveExtConfig();
        } else {
            const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
            if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0 };
            stats.history[today].mins += usedMins;
            stats.history[today].sessions += 1;
            safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
        }

        window.accumulatedStudyTime = 0;
        window.accumulatedDeenTime = 0;
        window.isOvertime = false;
        document.getElementById('complete-main-btn')?.classList.add('hidden');
        timeDisplay?.classList.remove('overtime-glow');
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        loadStep(currentStepIndex + 1, false);
        renderSchedule();
        renderStats();
        renderHomeHUD();
        showToast(`⏱️ Timer Auto-Stopped! Logged ${usedMins}m${overtimeMins > 0 ? ` (incl. +${overtimeMins}m overtime)` : ''} to Stats!`);
    } else {
        blk.status = 'completed';
        blk.usedDurationMins = plannedMins;
        if (blk.type === 'work' && !blk._credited) {
            blk._credited = true;
            if (isDeenBlock(blk)) {
                deenHistory[today] = (deenHistory[today] || 0) + plannedMins;
                saveExtConfig();
            } else {
                const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
                if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0 };
                stats.history[today].mins += plannedMins;
                stats.history[today].sessions += 1;
                safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
            }
        }
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        renderSchedule();
        renderStats();
        renderHomeHUD();
    }

    return { usedMins, plannedMins, overtimeMins };
};

function syncLinkedProtocolCompletion(item, usedMins = null, plannedMins = null, overtimeMins = 0) {
    if (!item) return;
    const today = getLocalTodayString();
    if (item.linkedTodoId) {
        const t = todos.find(x => String(x.id) === String(item.linkedTodoId));
        if (t) {
            t.completed = true;
            t.completedDate = today;
            if (usedMins !== null) t.usedDurationMins = usedMins;
            if (plannedMins !== null) t.plannedDurationMins = plannedMins;
            t.overtimeMins = overtimeMins || 0;
            saveTodos();
            renderTodos();
        }
    }
    if (item.linkedVaultId) {
        const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
        const vt = tasks.find(x => String(x.id) === String(item.linkedVaultId));
        if (vt) {
            vt.completed = true;
            vt.completedDate = today;
            if (usedMins !== null) vt.usedDurationMins = usedMins;
            if (plannedMins !== null) vt.plannedDurationMins = plannedMins;
            vt.overtimeMins = overtimeMins || 0;
            safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
            PomoEventBus.emit('vault:updated');
        }
    }
}

window.renderSchedule = function() {
    const cont = document.getElementById('schedule-container');
    if (!cont) return;
    cont.innerHTML = '';
    if (schedule.length === 0) {
        cont.innerHTML = `
            <div class="p-4 text-xs text-center bg-slate-900/50 rounded-xl border border-slate-800/60 flex flex-col items-center gap-2">
                <p class="text-slate-400 italic">Live Protocol is empty. Insert a block above, or auto-generate a 50m/10m Pomodoro cycle:</p>
                <button type="button" onclick="window.autoPackPomodoroCycles && window.autoPackPomodoroCycles(3, 'Deep Study Block')" class="bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 font-extrabold px-3.5 py-1.5 rounded-xl text-xs">🪄 Auto-Generate 3× (50m Study / 10m Break) Cycles</button>
            </div>
        `;
        document.getElementById('session-count-badge').textContent = `0 Remaining`;
        return;
    }
    const activeCount = schedule.filter(s => s.status !== 'completed' && s.status !== 'skipped').length;
    document.getElementById('session-count-badge').textContent = `${activeCount} Remaining`;

    schedule.forEach((item, index) => {
        const div = document.createElement('div');
        let baseClasses = "flex justify-between items-center p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ";
        if (index === currentStepIndex) baseClasses += "bg-blue-950/50 border-blue-500/60 shadow-md ";
        else if (item.status === 'completed' || item.status === 'skipped') baseClasses += "opacity-45 line-through bg-slate-900/60 border-slate-800 ";
        else baseClasses += "bg-slate-900 border-slate-800 hover:border-slate-700 ";

        div.className = baseClasses;
        div.onclick = () => {
            if (index !== currentStepIndex) jumpToStep(index, true);
            switchPage('page-timer');
        };

        const mins = Math.max(1, Math.round(item.duration / 60));
        const deenFlag = isDeenBlock(item);
        const icon = item.type === 'break' ? '💧' : (deenFlag ? '🕌' : '🧠');
        const linkBadge = item.linkedVaultId
            ? `<span class="text-[9px] bg-purple-950 text-purple-300 border border-purple-700/50 px-1.5 py-0.5 rounded ml-1">📚 Vault</span>`
            : (item.linkedTodoId ? `<span class="text-[9px] bg-blue-950 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 rounded ml-1">☑️ Task</span>` : '');

        div.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <span class="text-base shrink-0">${icon}</span>
                <div class="min-w-0 flex-1">
                    <p class="text-xs sm:text-sm font-bold truncate ${index === currentStepIndex ? 'text-blue-400' : 'text-slate-200'}">${escapeHtml(item.title)} ${linkBadge}</p>
                    <span class="text-[10px] font-mono text-slate-400">${mins} mins • ${item.type === 'break' ? 'Break' : (deenFlag ? 'Deen' : 'Study')}${item.dueDate ? ` • 📅 Due ${formatDDMMYYYY(item.dueDate)}` : ''}</span>
                </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
                <button onclick="event.stopPropagation(); moveLiveBlock(${index}, -1)" class="bg-slate-950 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-800 text-[10px]">⬆️</button>
                <button onclick="event.stopPropagation(); moveLiveBlock(${index}, 1)" class="bg-slate-950 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-800 text-[10px]">⬇️</button>
                <button onclick="event.stopPropagation(); quickComplete(${index})" class="bg-slate-950 hover:bg-emerald-950 text-emerald-400 px-2 py-1 rounded border border-slate-800 text-[10px]">✅</button>
                <button onclick="event.stopPropagation(); deleteLiveBlock(${index})" class="bg-slate-950 hover:bg-red-950 text-red-400 px-2 py-1 rounded border border-slate-800 text-[10px]">🗑️</button>
            </div>
        `;
        cont.appendChild(div);
    });
};

window.moveLiveBlock = function(index, dir) {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= schedule.length) return;
    const temp = schedule[index];
    schedule[index] = schedule[targetIdx];
    schedule[targetIdx] = temp;
    if (currentStepIndex === index) window.currentStepIndex = targetIdx;
    else if (currentStepIndex === targetIdx) window.currentStepIndex = index;
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    persistState();
    renderSchedule();
    broadcastToCloud();
};

window.deleteLiveBlock = function(index) {
    if (index < 0 || index >= schedule.length) return;
    const deletingCurrent = (index === currentStepIndex);
    schedule.splice(index, 1);
    if (schedule.length === 0) {
        stopTimer(true, true);
        window.currentStepIndex = 0;
        loadStep(0, false);
    } else if (deletingCurrent) {
        stopTimer(true, true);
        if (currentStepIndex >= schedule.length) window.currentStepIndex = schedule.length - 1;
        loadStep(currentStepIndex, false);
    } else if (index < currentStepIndex) {
        window.currentStepIndex = Math.max(0, currentStepIndex - 1);
    }
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    persistState();
    renderSchedule();
    broadcastToCloud();
    showToast("Block removed from Live Protocol");
};

window.quickComplete = function(index) {
    if (index === currentStepIndex) {
        const cur = schedule[currentStepIndex];
        if (cur && cur.type === 'work' && !isOvertime && timeLeft > 0) {
            if (isDeenBlock(cur)) window.accumulatedDeenTime += timeLeft;
            else window.accumulatedStudyTime += timeLeft;
        }
        completeSession();
    } else if (schedule[index]) {
        const item = schedule[index];
        if (item.status !== 'completed') {
            item.status = 'completed';
            const mins = Math.max(1, Math.round(item.duration / 60));
            syncLinkedProtocolCompletion(item, mins, mins, 0);
            if (item.type === 'work' && !item._credited) {
                item._credited = true;
                const today = getLocalTodayString();
                if (isDeenBlock(item)) {
                    deenHistory[today] = (deenHistory[today] || 0) + mins;
                    saveExtConfig();
                } else {
                    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
                    if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0 };
                    stats.history[today].mins += mins;
                    stats.history[today].sessions += 1;
                    safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
                }
                renderStats();
                renderHomeHUD();
                evaluateDriftAndAlerts();
                PomoEventBus.emit('stats:updated');
                showToast(`✅ +${mins}m credited to ${isDeenBlock(item) ? 'Deen' : 'Study'}!`);
            }
            safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
            renderSchedule();
            broadcastToCloud();
        }
    }
};

document.getElementById('toggle-live-add-btn')?.addEventListener('click', () => {
    const dr = document.getElementById('live-insert-drawer');
    dr.classList.toggle('hidden');
    dr.classList.toggle('flex');
});

document.getElementById('confirm-live-insert-btn')?.addEventListener('click', () => {
    const titleInp = document.getElementById('live-new-title');
    const durInp = document.getElementById('live-new-dur');
    const catVal = document.getElementById('live-new-cat').value;
    const mins = Math.max(1, parseInt(durInp.value) || 45);
    const isBrk = catVal === 'break';
    const defaultName = isBrk ? 'Recovery Break' : (catVal === 'deen' ? 'Deen & Imaan Session' : 'Deep Study Block');
    const newBlock = {
        id: Date.now(),
        type: isBrk ? 'break' : 'work',
        category: catVal === 'deen' ? 'deen' : (isBrk ? 'break' : 'study'),
        title: titleInp.value.trim() || defaultName,
        duration: mins * 60
    };
    const wasEmpty = schedule.length === 0;
    schedule.push(newBlock);
    if (newBlock.type === 'work') window.ensureProtocolBlockSyncedToTodo(newBlock);
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    titleInp.value = '';
    document.getElementById('live-insert-drawer').classList.add('hidden');
    if (wasEmpty) loadStep(0, false);
    renderSchedule();
    broadcastToCloud();
    showToast("Inserted into Live Protocol & synced to PomoTasks!");
});

window.loadStep = function(index, preserveState = false) {
    window.currentStepIndex = Math.max(0, Math.min(index, schedule.length));
    if (!preserveState) {
        window.isOvertime = false;
        timeDisplay?.classList.remove('overtime-glow');
    } else if (isOvertime) {
        timeDisplay?.classList.add('overtime-glow');
    }

    if (currentStepIndex >= schedule.length || schedule.length === 0) {
        window.timeLeft = 0;
        window.isOvertime = false;
        timeDisplay?.classList.remove('overtime-glow');
        updateDisplay();
        sessionTypeDisplay.textContent = schedule.length === 0 ? "Press Space or ▶️ for 50m Deep Focus" : "All Sessions Done (Press ▶️ for +50m)";
        currentPhaseDisplay.textContent = schedule.length === 0 ? "READY TO LOCK IN" : "PROTOCOL COMPLETE";
        currentPhaseDisplay.className = "mt-1 bg-emerald-500/10 px-4 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-widest font-phase";
        document.getElementById('anim-study')?.classList.add('hidden');
        document.getElementById('anim-deen')?.classList.add('hidden');
        document.getElementById('anim-break')?.classList.add('hidden');
        document.getElementById('guide-box-title').textContent = schedule.length === 0 ? "⚡ Focus Coach Ready" : "🎉 Day Complete";
        document.getElementById('deep-guide-text').textContent = schedule.length === 0 ? "Press Space or click the blue ▶️ Start button anytime to auto-launch a 50m Study + 10m Break cycle, or click ⚡ on any PomoTask / Vault item." : "Alhamdulillah! Incredible work today.";
        stopTimer(true, true);
        document.getElementById('start-btn')?.classList.remove('hidden');
        document.getElementById('pause-btn')?.classList.add('hidden');
        document.getElementById('complete-main-btn')?.classList.add('hidden');
        renderSchedule();
        persistState();
        return;
    }

    const currentSession = schedule[currentStepIndex];
    if (!preserveState) window.timeLeft = currentSession.duration;
    sessionTypeDisplay.textContent = currentSession.title;

    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('pause-btn').classList.add('hidden');
    document.getElementById('complete-main-btn').classList.toggle('hidden', !isOvertime);

    const deenBlock = isDeenBlock(currentSession);
    if (currentSession.type === 'work') {
        currentPhaseDisplay.textContent = deenBlock ? "DEEN & IMAAN PHASE" : "DEEP STUDY PHASE";
        currentPhaseDisplay.className = deenBlock
            ? "mt-1 bg-emerald-500/15 px-4 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 border border-emerald-500/30 uppercase tracking-widest font-phase"
            : "mt-1 bg-tomato/15 px-4 py-0.5 rounded-full text-[10px] font-bold text-tomato border border-tomato/30 uppercase tracking-widest font-phase";
        document.getElementById('guide-box-title').textContent = deenBlock ? "🕌 Deen Focus Protocol" : "🔥 Focus Protocol";
        document.getElementById('deep-guide-text').textContent = currentSession.note
            ? `📝 Session Note: ${currentSession.note}`
            : (deenBlock ? "Strengthening your Imaan brings Barakah to your entire day." : studyQuotes[Math.floor(Math.random() * studyQuotes.length)]);
        document.getElementById('anim-study')?.classList.toggle('hidden', deenBlock);
        document.getElementById('anim-deen')?.classList.toggle('hidden', !deenBlock);
        document.getElementById('anim-break')?.classList.add('hidden');
    } else {
        currentPhaseDisplay.textContent = "RECOVERY PHASE";
        currentPhaseDisplay.className = "mt-1 bg-blue-500/15 px-4 py-0.5 rounded-full text-[10px] font-bold text-blue-400 border border-blue-500/30 uppercase tracking-widest font-phase";
        document.getElementById('guide-box-title').textContent = "💧 Recovery Protocol";
        document.getElementById('deep-guide-text').textContent = breakQuotes[Math.floor(Math.random() * breakQuotes.length)];
        document.getElementById('anim-study')?.classList.add('hidden');
        document.getElementById('anim-deen')?.classList.add('hidden');
        document.getElementById('anim-break')?.classList.remove('hidden');
    }

    lastRenderedTime = -1;
    updateDisplay();
    renderSchedule();
    if (currentStepIndex > 0 && !isRunning && !preserveState) playAlarmSound();
    persistState();
};

window.updateDisplay = function() {
    if (timeLeft === lastRenderedTime && !isOvertime) return;
    lastRenderedTime = timeLeft;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    if (timeDisplay) {
        timeDisplay.textContent = `${isOvertime ? '+' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
};

window.lastPersistedTickSec = -1;
function timerCoreTick() {
    if (!isRunning) return;
    const now = Date.now();
    const remaining = Math.round((targetEndTime - now) / 1000);
    const curSess = schedule[currentStepIndex];

    if (remaining <= 0) {
        if (!isOvertime) {
            if (curSess?.type === 'work' && timeLeft > 0) {
                if (isDeenBlock(curSess)) window.accumulatedDeenTime += timeLeft;
                else window.accumulatedStudyTime += timeLeft;
            }
            window.isOvertime = true;
            playAlarmSound();
            if (window.sendDesktopNotification && curSess) {
                window.sendDesktopNotification(`✅ Session Complete: ${curSess.title}`, `Press C or click ✓ Complete in DeenTimeR Pro to log your time & advance!`, 'timer-done');
            }
            timeDisplay.classList.add('overtime-glow');
            document.getElementById('pause-btn').classList.add('hidden');
            document.getElementById('complete-main-btn').classList.remove('hidden');
            renderHomeHUD();
        }
        window.timeLeft = Math.abs(remaining);
        if (window.isPureCountUpMode) window.pureCountUpSeconds = window.timeLeft;
        updateDisplay();
        if (Math.abs(window.timeLeft - lastPersistedTickSec) >= 5 || window.timeLeft === 0) {
            lastPersistedTickSec = window.timeLeft;
            persistState();
        }
    } else {
        window.isOvertime = false;
        timeDisplay.classList.remove('overtime-glow');
        if (curSess?.type === 'work' && timeLeft > remaining) {
            const delta = timeLeft - remaining;
            if (isDeenBlock(curSess)) window.accumulatedDeenTime += delta;
            else window.accumulatedStudyTime += delta;
            if (remaining % 15 === 0) renderHomeHUD();
        }
        window.timeLeft = remaining;
        updateDisplay();
        if (Math.abs(remaining - lastPersistedTickSec) >= 5 || remaining === 0) {
            lastPersistedTickSec = remaining;
            persistState();
        }
    }
}

window.startTimer = function(skipBc = false) {
    if (isRunning) return;
    if (schedule.length === 0 || currentStepIndex >= schedule.length) {
        const autoBlk = {
            id: Date.now(),
            type: 'work',
            category: 'study',
            title: '🧠 50m Deep Study Focus Block',
            duration: 50 * 60
        };
        const autoBrk = {
            id: Date.now() + 1,
            type: 'break',
            category: 'break',
            title: '💧 10m Pomodoro Recovery Break',
            duration: 10 * 60
        };
        const startIdx = schedule.length;
        schedule.push(autoBlk, autoBrk);
        window.ensureProtocolBlockSyncedToTodo(autoBlk);
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        loadStep(startIdx, false);
    }

    enforceKeepScreenOn();
    try {
        if (!window.fallbackCtx) window.fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (window.fallbackCtx.state === 'suspended') window.fallbackCtx.resume();
    } catch (e) {}

    window.isRunning = true;
    document.getElementById('start-btn').classList.add('hidden');
    if (isOvertime) document.getElementById('complete-main-btn').classList.remove('hidden');
    else document.getElementById('pause-btn').classList.remove('hidden');

    const currentSession = schedule[currentStepIndex];
    if (lastPopupStep !== currentStepIndex && currentSession) {
        lastPopupStep = currentStepIndex;
        clearTimeout(guidePopupTimeout);
        document.getElementById('full-screen-guide-overlay').classList.add('hidden');
        if (currentSession.type !== 'work' && !document.body.classList.contains('dim-mode')) {
            document.getElementById('full-screen-guide-text').textContent = breakQuotes[Math.floor(Math.random() * breakQuotes.length)];
            document.getElementById('full-screen-guide-overlay').classList.remove('hidden');
            guidePopupTimeout = setTimeout(() => document.getElementById('full-screen-guide-overlay').classList.add('hidden'), 8000);
        }
    }

    window.targetEndTime = isOvertime ? Date.now() - (timeLeft * 1000) : Date.now() + (timeLeft * 1000);
    clearInterval(timerInterval);
    window.timerInterval = setInterval(timerCoreTick, 250);
    persistState();
    if (!skipBc) broadcastToCloud();
};

window.stopTimer = function(skipBc = false, skipFlush = false) {
    if (!isRunning) return;
    window.isRunning = false;
    document.getElementById('start-btn').classList.remove('hidden');
    document.getElementById('pause-btn').classList.add('hidden');
    clearInterval(timerInterval);
    if (!skipFlush) flushSessionStats(false);
    persistState();
    if (!skipBc) broadcastToCloud();
};

let activeAlarmNodes = [];
function killActiveAlarms() {
    activeAlarmNodes.forEach(n => { try { n.stop(); n.disconnect(); } catch (e) {} });
    activeAlarmNodes = [];
}

window.playChime = function(type = 'todo') {
    try {
        if (!window.fallbackCtx) window.fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (window.fallbackCtx.state === 'suspended') window.fallbackCtx.resume();
        const now = window.fallbackCtx.currentTime;
        const osc = window.fallbackCtx.createOscillator();
        const gain = window.fallbackCtx.createGain();
        osc.connect(gain);
        gain.connect(window.fallbackCtx.destination);
        if (type === 'todo') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(880, now + 0.09);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
        } else if (type === 'salah') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554.37, now + 0.18);
            osc.frequency.setValueAtTime(659.25, now + 0.36);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            osc.start(now);
            osc.stop(now + 0.9);
        }
    } catch (e) {}
};

window.playAlarmSound = function() {
    try {
        if (!window.fallbackCtx) window.fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (window.fallbackCtx.state === 'suspended') window.fallbackCtx.resume();
        killActiveAlarms();
        const isWork = schedule[currentStepIndex]?.type === 'work';
        const count = isWork ? 12 : 8;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (!isRunning && i > 2) return;
                try {
                    const osc = window.fallbackCtx.createOscillator();
                    const gain = window.fallbackCtx.createGain();
                    osc.connect(gain);
                    gain.connect(window.fallbackCtx.destination);
                    osc.type = isWork ? 'square' : 'sine';
                    osc.frequency.setValueAtTime(isWork ? 820 : 523.25, window.fallbackCtx.currentTime);
                    gain.gain.setValueAtTime(0.35, window.fallbackCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, window.fallbackCtx.currentTime + 0.3);
                    osc.start(window.fallbackCtx.currentTime);
                    osc.stop(window.fallbackCtx.currentTime + 0.3);
                    activeAlarmNodes.push(osc, gain);
                } catch (e) {}
            }, i * 550);
        }
    } catch (e) {}
};

window.flushSessionStats = function(isWorkComplete = false) {
    const today = getLocalTodayString();
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    if (!stats.history[today]) stats.history[today] = { mins: 0, sessions: 0 };

    if (accumulatedStudyTime >= 60) {
        const addM = Math.floor(accumulatedStudyTime / 60);
        stats.history[today].mins += addM;
        window.accumulatedStudyTime = accumulatedStudyTime % 60;
    }
    if (accumulatedDeenTime >= 60) {
        const addD = Math.floor(accumulatedDeenTime / 60);
        deenHistory[today] = (deenHistory[today] || 0) + addD;
        window.accumulatedDeenTime = accumulatedDeenTime % 60;
    }
    if (isWorkComplete && schedule[currentStepIndex]?.type === 'work') {
        if (accumulatedStudyTime >= 15) stats.history[today].mins += 1;
        if (accumulatedDeenTime >= 15) deenHistory[today] = (deenHistory[today] || 0) + 1;
        window.accumulatedStudyTime = 0;
        window.accumulatedDeenTime = 0;
        stats.history[today].sessions += 1;
    }

    safeSet('pages_pomodoro_stats_v8', JSON.stringify(stats));
    saveExtConfig();
    renderStats();
    renderHomeHUD();
    evaluateDriftAndAlerts();
    PomoEventBus.emit('stats:updated');
};

window.completeSession = function() {
    stopTimer(true, true);
    killActiveAlarms();
    const cur = schedule[currentStepIndex];

    if (cur && cur.type === 'work') {
        const plannedMins = Math.max(1, Math.round((cur.duration || 2700) / 60));
        let overtimeMins = 0;
        let usedMins = plannedMins;

        if (window.isPureCountUpMode) {
            usedMins = Math.max(1, Math.ceil((window.pureCountUpSeconds || timeLeft) / 60));
            overtimeMins = Math.max(0, usedMins - plannedMins);
            window.isPureCountUpMode = false;
            window.pureCountUpSeconds = 0;
        } else if (isOvertime) {
            overtimeMins = Math.max(1, Math.ceil(timeLeft / 60));
            usedMins = plannedMins + overtimeMins;
            window.recordOvertimeToStatsLedger(overtimeMins);
            if (isDeenBlock(cur)) window.accumulatedDeenTime += timeLeft;
            else window.accumulatedStudyTime += timeLeft;
        } else if (timeLeft > 0 && timeLeft < cur.duration) {
            usedMins = Math.max(1, Math.round((cur.duration - timeLeft) / 60));
        }

        cur.usedDurationMins = usedMins;
        cur.overtimeMins = overtimeMins;
        if (!cur.linkedTodoId) window.ensureProtocolBlockSyncedToTodo(cur);
        syncLinkedProtocolCompletion(cur, usedMins, plannedMins, overtimeMins);
    }

    if (cur) {
        cur.status = 'completed';
        cur._credited = true;
    }

    window.overtimeExtensionMins = 0;
    window.lastOvertimeWarnStage = 0;
    if (window.stopLoudSirenLoop) window.stopLoudSirenLoop(true);
    document.getElementById('critical-overtime-modal')?.classList.add('hidden');

    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    flushSessionStats(cur?.type === 'work');
    window.isOvertime = false;
    document.getElementById('complete-main-btn').classList.add('hidden');
    timeDisplay.classList.remove('overtime-glow');
    loadStep(currentStepIndex + 1);
    if (currentStepIndex < schedule.length) startTimer();
    renderSchedule();
    renderStats();
    PomoEventBus.emit('session:completed');
};

window.jumpToStep = function(index, isManualSelectOrUndo = false) {
    stopTimer(true, true);
    killActiveAlarms();
    document.getElementById('full-screen-guide-overlay').classList.add('hidden');
    clearTimeout(guidePopupTimeout);

    if (!isManualSelectOrUndo && schedule[currentStepIndex] && schedule[currentStepIndex].status !== 'completed') {
        schedule[currentStepIndex].status = 'skipped';
    }
    if (isManualSelectOrUndo && schedule[index] && schedule[index].status === 'skipped') {
        delete schedule[index].status;
    }

    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    window.accumulatedStudyTime = 0;
    window.accumulatedDeenTime = 0;
    flushSessionStats(false);
    window.isOvertime = false;
    document.getElementById('complete-main-btn').classList.add('hidden');
    timeDisplay.classList.remove('overtime-glow');
    loadStep(index);
    if (!isManualSelectOrUndo && currentStepIndex < schedule.length) startTimer();
    else broadcastToCloud();
    renderSchedule();
};

document.getElementById('start-btn')?.addEventListener('click', () => startTimer());
document.getElementById('pause-btn')?.addEventListener('click', () => stopTimer());
document.getElementById('skip-btn')?.addEventListener('click', () => { if (currentStepIndex < schedule.length) jumpToStep(currentStepIndex + 1, false); });
document.getElementById('undo-btn')?.addEventListener('click', () => { if (currentStepIndex > 0) jumpToStep(currentStepIndex - 1, true); });
document.getElementById('complete-main-btn')?.addEventListener('click', completeSession);
document.getElementById('close-guide-btn')?.addEventListener('click', () => {
    document.getElementById('full-screen-guide-overlay').classList.add('hidden');
    clearTimeout(guidePopupTimeout);
});

window.startPureCountUpStopwatch = function(customTitle = null) {
    stopTimer(true, true);
    const title = customTitle || '⏱️ Open Count-Up Focus Session';
    const newBlk = {
        id: Date.now(),
        type: 'work',
        category: 'study',
        title,
        duration: 25 * 60
    };
    window.ensureProtocolBlockSyncedToTodo(newBlk);
    const insertAt = Math.min(currentStepIndex, schedule.length);
    schedule.splice(insertAt, 0, newBlk);
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    loadStep(insertAt, false);

    window.isOvertime = true;
    window.isPureCountUpMode = true;
    window.pureCountUpSeconds = 0;
    window.timeLeft = 0;
    window.targetEndTime = Date.now();
    document.getElementById('complete-main-btn')?.classList.remove('hidden');
    switchPage('page-timer');
    startTimer();
    showToast("⏱️ Count-Up Stopwatch Started! All time will save to PomoTasks & Stats.");
};

setInterval(() => {
    if (!isRunning || !isOvertime || window.isPureCountUpMode) return;
    const curSess = schedule[currentStepIndex];
    if (!curSess || curSess.type !== 'work') return;

    const overMins = Math.floor(timeLeft / 60);
    const softLimit = 5 + window.overtimeExtensionMins;
    const critLimit = 10 + window.overtimeExtensionMins;

    if (overMins >= softLimit && overMins < critLimit && window.lastOvertimeWarnStage < 1) {
        window.lastOvertimeWarnStage = 1;
        if (window.playChime) window.playChime('salah');
        showToast(`⚠️ +${overMins}m Overtime on "${curSess.title}"! Wrap up your current point.`, true);
    } else if (overMins >= critLimit && window.lastOvertimeWarnStage < 2) {
        window.lastOvertimeWarnStage = 2;
        window.triggerCriticalOvertimeModal(curSess, overMins);
    }
}, 2000);

window.triggerCriticalOvertimeModal = function(sessObj, overMins) {
    let modal = document.getElementById('critical-overtime-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'critical-overtime-modal';
        modal.className = "hidden fixed inset-0 z-[99990] alarmy-siren-bg flex items-center justify-center p-4";
        document.body.appendChild(modal);
    }
    if (window.startLoudSirenLoop) window.startLoudSirenLoop();
    const plannedMins = Math.max(1, Math.round((sessObj.duration || 2700) / 60));
    modal.innerHTML = `
        <div class="bg-slate-950/95 border-2 border-red-500 rounded-3xl p-6 w-full max-w-md shadow-2xl text-center flex flex-col gap-4">
            <span class="text-5xl animate-bounce">🚨</span>
            <div>
                <span class="text-[10px] font-mono font-extrabold uppercase tracking-widest bg-red-600 text-white px-3 py-1 rounded-full">CRITICAL SCHEDULE DRIFT ALARM (+${overMins}m EXTRA)</span>
                <h3 class="text-lg font-extrabold text-white mt-2">${escapeHtml(sessObj.title)}</h3>
                <p class="text-xs text-amber-200 mt-1">Assigned: <b>${plannedMins}m</b> • Extra Count-Up: <b class="text-red-400">+${overMins}m</b> (Total: ${plannedMins + overMins}m)</p>
            </div>
            <div class="flex flex-col gap-2">
                <button type="button" onclick="window.completeSession()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg">
                    ✅ Complete Session & Save ${plannedMins + overMins}m to PomoTasks Now
                </button>
                <button type="button" onclick="window.authorizeOvertimeExtension(10)" class="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold py-2.5 rounded-xl text-xs">
                    ⏳ Authorize +10m Extension (Snooze Siren)
                </button>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

window.authorizeOvertimeExtension = function(extraM) {
    window.overtimeExtensionMins += (extraM || 10);
    window.lastOvertimeWarnStage = 1;
    if (window.stopLoudSirenLoop) window.stopLoudSirenLoop(true);
    document.getElementById('critical-overtime-modal')?.classList.add('hidden');
    showToast(`⏳ Authorized +${extraM}m overtime extension.`);
};
/* ==========================================================================
   4. UNIFIED "ADD TO LIVE PROTOCOL & RUN NOW" LAUNCHER MODAL
   ========================================================================== */
function ensureProtocolRunModalExists() {
    let modal = document.getElementById('protocol-run-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'protocol-run-modal';
    modal.className = "hidden fixed inset-0 z-[10050] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4";
    modal.innerHTML = `
        <div class="bg-slate-900 border border-blue-500/40 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl flex flex-col gap-4">
            <div class="flex justify-between items-start border-b border-slate-800 pb-3">
                <div>
                    <span id="proto-run-source-badge" class="text-[9px] font-mono font-extrabold uppercase tracking-widest bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">⚡ Protocol Launcher</span>
                    <h3 class="text-sm sm:text-base font-extrabold text-white mt-1.5">Configure Focus Session</h3>
                </div>
                <button type="button" onclick="document.getElementById('protocol-run-modal').classList.add('hidden')" class="text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold">✕</button>
            </div>

            <div class="flex flex-col gap-3">
                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Session Title</label>
                    <input type="text" id="proto-run-title" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs sm:text-sm font-bold text-white outline-none focus:border-blue-500">
                </div>

                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Target Duration (Minutes)</label>
                    <div class="grid grid-cols-5 gap-1.5 mb-2">
                        <button type="button" onclick="document.getElementById('proto-run-mins').value=25" class="bg-slate-950 hover:bg-blue-950/60 border border-slate-800 hover:border-blue-500/50 text-slate-300 font-mono text-xs font-bold py-1.5 rounded-lg">25m</button>
                        <button type="button" onclick="document.getElementById('proto-run-mins').value=45" class="bg-slate-950 hover:bg-blue-950/60 border border-slate-800 hover:border-blue-500/50 text-slate-300 font-mono text-xs font-bold py-1.5 rounded-lg">45m</button>
                        <button type="button" onclick="document.getElementById('proto-run-mins').value=50" class="bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/40 text-blue-300 font-mono text-xs font-extrabold py-1.5 rounded-lg">50m</button>
                        <button type="button" onclick="document.getElementById('proto-run-mins').value=60" class="bg-slate-950 hover:bg-blue-950/60 border border-slate-800 hover:border-blue-500/50 text-slate-300 font-mono text-xs font-bold py-1.5 rounded-lg">60m</button>
                        <button type="button" onclick="document.getElementById('proto-run-mins').value=90" class="bg-slate-950 hover:bg-blue-950/60 border border-slate-800 hover:border-blue-500/50 text-slate-300 font-mono text-xs font-bold py-1.5 rounded-lg">90m</button>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <span class="text-[9px] text-slate-500 font-bold uppercase block mb-0.5">Custom Mins</span>
                            <input type="number" id="proto-run-mins" min="1" max="360" value="50" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs font-mono font-bold text-emerald-400 text-center outline-none focus:border-emerald-500">
                        </div>
                        <div>
                            <span class="text-[9px] text-slate-500 font-bold uppercase block mb-0.5">Category</span>
                            <select id="proto-run-cat" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs font-bold text-slate-200 outline-none focus:border-blue-500">
                                <option value="study">🧠 Deep Study</option>
                                <option value="deen">🕌 Deen & Imaan</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Due Date (Syncs across Task & Vault)</label>
                    <input type="date" id="proto-run-due" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs font-mono text-slate-200 outline-none focus:border-blue-500">
                </div>

                <label class="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 p-2.5 rounded-xl cursor-pointer">
                    <input type="checkbox" id="proto-run-add-break" checked class="w-4 h-4 accent-blue-500 rounded">
                    <span class="text-xs font-bold text-slate-300">Auto-append <b class="text-blue-400">10m Recovery Break</b> after this block</span>
                </label>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button type="button" onclick="window.commitProtocolLauncherAction(false)" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-extrabold py-3 rounded-xl text-xs transition-all">
                    ➕ Queue in Live Protocol
                </button>
                <button type="button" onclick="window.commitProtocolLauncherAction(true)" class="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg transition-all">
                    🚀 Run Timer Immediately
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

window.openProtocolRunModal = function(sourceType, itemId) {
    const modal = ensureProtocolRunModalExists();
    window.pendingProtocolLaunch = { sourceType, itemId };

    const badge = document.getElementById('proto-run-source-badge');
    const titleInp = document.getElementById('proto-run-title');
    const minsInp = document.getElementById('proto-run-mins');
    const catInp = document.getElementById('proto-run-cat');
    const dueInp = document.getElementById('proto-run-due');

    if (sourceType === 'todo') {
        const t = todos.find(x => String(x.id) === String(itemId));
        if (!t) return;
        badge.textContent = "☑️ PomoTask → Live Protocol";
        titleInp.value = t.title || 'PomoTask Focus Session';
        minsInp.value = t.plannedDurationMins || 50;
        catInp.value = (t.listId === 'deen' || isDeenBlock({ title: t.title })) ? 'deen' : 'study';
        dueInp.value = t.dueDate || getLocalTodayString();
    } else if (sourceType === 'vault') {
        const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
        const vt = tasks.find(x => String(x.id) === String(itemId));
        if (!vt) return;
        badge.textContent = "📚 Study Vault → Live Protocol";
        titleInp.value = `[${vt.subj}] ${vt.chap} (${vt.act})`;
        minsInp.value = vt.plannedDurationMins || 50;
        catInp.value = isDeenBlock({ title: vt.subj + ' ' + vt.chap }) ? 'deen' : 'study';
        dueInp.value = vt.dueDate || vt.nextRev || getLocalTodayString();
    }
    modal.classList.remove('hidden');
};

window.commitProtocolLauncherAction = function(runImmediately = false) {
    const ctx = window.pendingProtocolLaunch;
    if (!ctx) return;

    const title = document.getElementById('proto-run-title')?.value.trim() || 'Deep Study Block';
    const mins = Math.max(1, parseInt(document.getElementById('proto-run-mins')?.value) || 50);
    const cat = document.getElementById('proto-run-cat')?.value || 'study';
    const dueDate = document.getElementById('proto-run-due')?.value || '';
    const appendBreak = !!document.getElementById('proto-run-add-break')?.checked;

    let linkedTodoId = null;
    let linkedVaultId = null;

    if (ctx.sourceType === 'todo') {
        linkedTodoId = ctx.itemId;
        const t = todos.find(x => String(x.id) === String(ctx.itemId));
        if (t) {
            t.plannedDurationMins = mins;
            if (dueDate) t.dueDate = dueDate;
            t.myDayDate = getLocalTodayString();
            if (t.linkedVaultId) linkedVaultId = t.linkedVaultId;
            saveTodos();
            renderTodos();
        }
    } else if (ctx.sourceType === 'vault') {
        linkedVaultId = ctx.itemId;
        const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
        const vt = tasks.find(x => String(x.id) === String(ctx.itemId));
        if (vt) {
            vt.plannedDurationMins = mins;
            if (dueDate) vt.dueDate = dueDate;
            safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
            PomoEventBus.emit('vault:updated');
        }
        let existingTodo = todos.find(x => String(x.linkedVaultId) === String(linkedVaultId) && !x.completed);
        if (!existingTodo) {
            existingTodo = {
                id: 'todo_vault_' + Date.now(),
                title,
                listId: 'vault',
                myDayDate: getLocalTodayString(),
                important: true,
                completed: false,
                dueDate: dueDate || getLocalTodayString(),
                repeat: 'none',
                plannedDurationMins: mins,
                usedDurationMins: 0,
                steps: [],
                notes: 'Synced from Study Vault via Protocol Launcher',
                linkedVaultId,
                createdAt: Date.now()
            };
            todos.unshift(existingTodo);
        } else {
            existingTodo.plannedDurationMins = mins;
            if (dueDate) existingTodo.dueDate = dueDate;
            existingTodo.myDayDate = getLocalTodayString();
        }
        linkedTodoId = existingTodo.id;
        saveTodos();
        renderTodos();
    }

    const workBlock = {
        id: Date.now(),
        type: 'work',
        category: cat,
        title,
        duration: mins * 60,
        dueDate,
        linkedTodoId,
        linkedVaultId
    };

    const brkBlock = appendBreak ? {
        id: Date.now() + 1,
        type: 'break',
        category: 'break',
        title: '💧 10m Pomodoro Recovery Break',
        duration: 10 * 60
    } : null;

    document.getElementById('protocol-run-modal')?.classList.add('hidden');

    if (runImmediately) {
        stopTimer(true, true);
        const insertIdx = Math.min(currentStepIndex, schedule.length);
        if (brkBlock) schedule.splice(insertIdx, 0, workBlock, brkBlock);
        else schedule.splice(insertIdx, 0, workBlock);
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        loadStep(insertIdx, false);
        switchPage('page-timer');
        startTimer();
        showToast(`🚀 Running "${title}" (${mins}m)!`);
    } else {
        const wasEmpty = schedule.length === 0;
        schedule.push(workBlock);
        if (brkBlock) schedule.push(brkBlock);
        safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
        if (wasEmpty) loadStep(0, false);
        renderSchedule();
        broadcastToCloud();
        showToast(`➕ Queued "${title}" (${mins}m) in Live Protocol!`);
    }
};

/* ==========================================================================
   5. DAILY TEMPLATE BUILDER (SETTINGS PAGE)
   ========================================================================== */
function updateDayTabs() {
    document.querySelectorAll('.day-tab').forEach(btn => {
        if (parseInt(btn.dataset.day) === editingDayIndex) {
            btn.className = "day-tab px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-blue-600 text-white shadow";
        } else {
            btn.className = "day-tab px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-900 text-slate-400 hover:text-white border border-slate-800";
        }
    });
}

document.querySelectorAll('.day-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
        saveTemplateInputs();
        editingDayIndex = parseInt(e.target.dataset.day);
        updateDayTabs();
        populateSettingsList();
    });
});

document.getElementById('copy-all-days-btn')?.addEventListener('click', () => {
    saveTemplateInputs();
    const sourceDay = JSON.parse(JSON.stringify(weeklySchedules[editingDayIndex]));
    for (let i = 0; i < 7; i++) {
        weeklySchedules[i] = JSON.parse(JSON.stringify(sourceDay));
    }
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklySchedules));
    broadcastToCloud();
    showToast("Copied template to all 7 days of the week!");
});

function saveTemplateInputs() {
    const titles = document.querySelectorAll('.set-title');
    const durs = document.querySelectorAll('.set-dur');
    const currentList = weeklySchedules[editingDayIndex];
    if (!currentList || titles.length !== currentList.length) return;
    currentList.forEach((item, index) => {
        if (titles[index]) item.title = titles[index].value;
        if (durs[index]) item.duration = Math.max(1, parseInt(durs[index].value) || 1) * 60;
    });
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklySchedules));
}

window.templateCycleType = function(idx) {
    saveTemplateInputs();
    const item = weeklySchedules[editingDayIndex][idx];
    if (!item) return;
    if (item.type === 'work' && !isDeenBlock(item)) {
        item.type = 'work';
        item.category = 'deen';
    } else if (item.type === 'work' && isDeenBlock(item)) {
        item.type = 'break';
        item.category = 'break';
    } else {
        item.type = 'work';
        item.category = 'study';
    }
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklySchedules));
    populateSettingsList();
};

window.templateMove = function(idx, dir) {
    saveTemplateInputs();
    const list = weeklySchedules[editingDayIndex];
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const temp = list[idx];
    list[idx] = list[target];
    list[target] = temp;
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklySchedules));
    populateSettingsList();
};

window.templateDelete = function(idx) {
    saveTemplateInputs();
    weeklySchedules[editingDayIndex].splice(idx, 1);
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklySchedules));
    populateSettingsList();
};

function populateSettingsList() {
    const list = document.getElementById('settings-schedule-list');
    if (!list) return;
    list.innerHTML = '';
    const daySchedule = weeklySchedules[editingDayIndex] || [];
    daySchedule.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = "flex flex-wrap sm:flex-nowrap gap-2 items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800";
        const deen = isDeenBlock(item);
        const badgeText = item.type === 'break' ? '💧 Break' : (deen ? '🕌 Deen' : '🧠 Study');
        const badgeClass = item.type === 'break'
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
            : (deen ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-tomato/20 text-tomato border-tomato/40');
        row.innerHTML = `
            <button type="button" onclick="templateCycleType(${index})" class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase w-24 shrink-0 text-center border transition-all ${badgeClass}">${badgeText}</button>
            <input type="text" value="${escapeHtml(item.title)}" class="bg-slate-900 text-white p-2 rounded-lg text-xs flex-1 min-w-[140px] border border-slate-800 outline-none focus:border-blue-500 set-title">
            <div class="flex items-center gap-1 shrink-0">
                <input type="number" value="${Math.round(item.duration / 60)}" class="bg-slate-900 text-white p-2 rounded-lg text-xs w-14 text-center font-mono border border-slate-800 outline-none focus:border-blue-500 set-dur" min="1">
                <span class="text-slate-500 text-[10px] font-mono">m</span>
            </div>
            <div class="flex items-center gap-1 shrink-0 ml-auto">
                <button type="button" onclick="templateMove(${index}, -1)" class="text-slate-300 bg-slate-900 hover:bg-slate-800 px-2 py-1.5 rounded border border-slate-800 text-xs">⬆️</button>
                <button type="button" onclick="templateMove(${index}, 1)" class="text-slate-300 bg-slate-900 hover:bg-slate-800 px-2 py-1.5 rounded border border-slate-800 text-xs">⬇️</button>
                <button type="button" onclick="templateDelete(${index})" class="text-red-400 hover:text-white px-2.5 py-1.5 bg-red-950/30 hover:bg-red-600 rounded-lg border border-red-900/50 text-xs">✕</button>
            </div>
        `;
        list.appendChild(row);
    });
}

document.getElementById('add-sess-btn')?.addEventListener('click', () => {
    saveTemplateInputs();
    weeklySchedules[editingDayIndex].push({
        id: Date.now(),
        type: 'work',
        category: 'study',
        title: 'Deep Focus Block',
        duration: 45 * 60
    });
    safeSet('pages_pomodoro_weekly_v8', JSON.stringify(weeklySchedules));
    populateSettingsList();
});

document.getElementById('load-day-btn')?.addEventListener('click', () => {
    saveTemplateInputs();
    window.schedule = JSON.parse(JSON.stringify(weeklySchedules[editingDayIndex]));
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    stopTimer(true, true);
    window.accumulatedStudyTime = 0;
    window.accumulatedDeenTime = 0;
    window.isOvertime = false;
    loadStep(0, false);
    renderSchedule();
    broadcastToCloud();
    showToast("Template loaded into today's Live Protocol!");
    switchPage('page-timer');
});

/* ==========================================================================
   6. STUDY/DEEN BALANCE HUD, SALAH TRACKER & WINDOW-AWARE SALAH FREEZE
   ========================================================================== */
window.getTodayStudyMinutes = function() {
    const today = getLocalTodayString();
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    return (stats.history[today]?.mins || 0) + Math.floor(accumulatedStudyTime / 60);
};

window.getTodayDeenMinutes = function() {
    const today = getLocalTodayString();
    return (deenHistory[today] || 0) + Math.floor(accumulatedDeenTime / 60);
};

window.getTodaySalahDoneCount = function() {
    const today = getLocalTodayString();
    const log = salahLog[today] || {};
    return SALAH_KEYS.filter(k => log[k]).length;
};

window.renderHomeHUD = function() {
    const sMins = getTodayStudyMinutes();
    const dMins = getTodayDeenMinutes();
    const sTarget = Math.max(30, extCfg.studyTargetMins || 360);
    const dTarget = Math.max(15, extCfg.deenTargetMins || 90);

    const sPct = Math.min(100, Math.round((sMins / sTarget) * 100));
    const dPct = Math.min(100, Math.round((dMins / dTarget) * 100));

    const elSText = document.getElementById('hud-study-text');
    const elSBar = document.getElementById('hud-study-bar');
    const elDText = document.getElementById('hud-deen-text');
    const elDBar = document.getElementById('hud-deen-bar');

    if (elSText) elSText.textContent = `${sMins} / ${sTarget}m (${sPct}%)`;
    if (elSBar) elSBar.style.width = `${sPct}%`;
    if (elDText) elDText.textContent = `${dMins} / ${dTarget}m (${dPct}%)`;
    if (elDBar) elDBar.style.width = `${dPct}%`;
};

window.renderSalahStrip = function() {
    const cont = document.getElementById('salah-strip-container');
    if (!cont) return;
    const today = getLocalTodayString();
    if (!salahLog[today]) salahLog[today] = {};
    const doneCount = getTodaySalahDoneCount();

    const badge = document.getElementById('salah-score-badge');
    if (badge) {
        badge.textContent = `${doneCount}/5 Prayed`;
        badge.className = doneCount === 5
            ? "text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 font-bold"
            : "text-[10px] font-mono bg-slate-900 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30";
    }

    cont.innerHTML = '';
    SALAH_KEYS.forEach(p => {
        const isDone = !!salahLog[today][p];
        const timeStr = (extCfg.prayerTimes && extCfg.prayerTimes[p]) || DEFAULT_PRAYERS[p];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all ${
            isDone
                ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-sm'
                : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
        }`;
        btn.innerHTML = `
            <span class="text-[10px] font-extrabold tracking-tight">${isDone ? '✅' : '🕋'} ${p}</span>
            <span class="text-[9px] font-mono opacity-80">${format12hTime(timeStr)}</span>
        `;
        btn.onclick = () => {
            salahLog[today][p] = !salahLog[today][p];
            if (salahLog[today][p]) {
                deenHistory[today] = (deenHistory[today] || 0) + 12;
                playChime('salah');
                showToast(`🕌 MashaAllah! ${p} Salah logged (+12m Deen Barakah)`);
            } else {
                deenHistory[today] = Math.max(0, (deenHistory[today] || 0) - 12);
            }
            saveExtConfig();
            renderSalahStrip();
            renderSettingsSalahList();
            renderHomeHUD();
            renderStats();
            evaluateDriftAndAlerts();
            PomoEventBus.emit('salah:updated');
            broadcastToCloud();
        };
        cont.appendChild(btn);
    });
};

window.renderSettingsSalahList = function() {
    const cont = document.getElementById('settings-salah-list');
    if (!cont) return;
    const today = getLocalTodayString();
    if (!salahLog[today]) salahLog[today] = {};
    const doneCount = getTodaySalahDoneCount();

    const setBadge = document.getElementById('settings-salah-score-badge');
    if (setBadge) setBadge.textContent = `${doneCount}/5 Prayed Today`;

    const locBadge = document.getElementById('masjid-coords-badge');
    if (locBadge && extCfg.masjidCoords) {
        locBadge.textContent = `📍 Synced (${extCfg.masjidCoords.lat.toFixed(2)}, ${extCfg.masjidCoords.lon.toFixed(2)})`;
    }

    cont.innerHTML = '';
    const now = new Date();
    const curMins = now.getHours() * 60 + now.getMinutes();

    SALAH_KEYS.forEach((p, idx) => {
        const isDone = !!salahLog[today][p];
        const startStr = (extCfg.prayerTimes && extCfg.prayerTimes[p]) || DEFAULT_PRAYERS[p];
        const nextP = SALAH_KEYS[(idx + 1) % SALAH_KEYS.length];
        const endStr = (extCfg.prayerEndTimes && extCfg.prayerEndTimes[p])
            || (extCfg.prayerTimes && extCfg.prayerTimes[nextP])
            || DEFAULT_PRAYER_ENDS[p];

        const [sh, sm] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);
        const startM = sh * 60 + sm;
        const endM = eh * 60 + em;
        const inWin = endM > startM ? (curMins >= startM && curMins < endM) : (curMins >= startM || curMins < endM);

        const card = document.createElement('div');
        card.className = `flex flex-col gap-2 p-3 rounded-2xl border transition-all ${
            isDone
                ? 'bg-emerald-950/40 border-emerald-500/50'
                : (inWin ? 'bg-amber-950/30 border-amber-500/60 shadow-lg' : 'bg-slate-950 border-slate-800')
        }`;
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-base">${isDone ? '✅' : (inWin ? '🕌' : '🕋')}</span>
                    <div>
                        <h4 class="text-xs font-extrabold ${isDone ? 'text-emerald-300' : 'text-white'}">${p}</h4>
                        <span class="text-[9px] font-mono ${inWin && !isDone ? 'text-amber-300 font-bold' : 'text-slate-400'}">
                            ${inWin && !isDone ? '⚡ ACTIVE SALAH WINDOW' : (isDone ? 'Alhamdulillah Prayed' : 'Scheduled Window')}
                        </span>
                    </div>
                </div>
                <button type="button" onclick="window.togglePrayerFromSettings('${p}')" class="px-2.5 py-1 rounded-xl text-[10px] font-extrabold border transition-all ${
                    isDone
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-900 hover:bg-emerald-950 text-emerald-400 border-emerald-500/40'
                }">${isDone ? '✓ Done' : 'Mark Prayed'}</button>
            </div>
            <div class="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80">
                <button type="button" onclick="window.openInAppTimeModal('${p}', 'start')" class="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl p-1.5 text-left transition-all">
                    <span class="text-[8px] font-bold uppercase text-slate-400 block">Adhan / Start</span>
                    <span class="text-xs font-mono font-extrabold text-emerald-400">🕒 ${format12hTime(startStr)}</span>
                </button>
                <button type="button" onclick="window.openInAppTimeModal('${p}', 'end')" class="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl p-1.5 text-left transition-all">
                    <span class="text-[8px] font-bold uppercase text-slate-400 block">Window Ends</span>
                    <span class="text-xs font-mono font-extrabold text-amber-400">⏳ ${format12hTime(endStr)}</span>
                </button>
            </div>
        `;
        cont.appendChild(card);
    });
};

window.togglePrayerFromSettings = function(p) {
    const today = getLocalTodayString();
    if (!salahLog[today]) salahLog[today] = {};
    salahLog[today][p] = !salahLog[today][p];
    if (salahLog[today][p]) {
        deenHistory[today] = (deenHistory[today] || 0) + 12;
        playChime('salah');
        showToast(`🕌 MashaAllah! ${p} logged (+12m Deen Barakah)`);
    } else {
        deenHistory[today] = Math.max(0, (deenHistory[today] || 0) - 12);
    }
    saveExtConfig();
    renderSalahStrip();
    renderSettingsSalahList();
    renderHomeHUD();
    renderStats();
    evaluateDriftAndAlerts();
    PomoEventBus.emit('salah:updated');
    broadcastToCloud();
};

let activeTimeModalContext = { prayer: 'Fajr', field: 'start', h12: 5, min: 15, ampm: 'AM' };

window.openInAppTimeModal = function(prayer, field) {
    const cur24 = field === 'start'
        ? ((extCfg.prayerTimes && extCfg.prayerTimes[prayer]) || DEFAULT_PRAYERS[prayer])
        : ((extCfg.prayerEndTimes && extCfg.prayerEndTimes[prayer]) || DEFAULT_PRAYER_ENDS[prayer]);
    const [h24, m] = cur24.split(':').map(Number);
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;

    activeTimeModalContext = { prayer, field, h12, min: m, ampm };
    document.getElementById('time-modal-title').textContent = `${prayer} — ${field === 'start' ? 'Adhan / Start Time' : 'Window End Time'}`;
    refreshInAppTimeModalUI();
    document.getElementById('inapp-time-modal')?.classList.remove('hidden');
};

function refreshInAppTimeModalUI() {
    const { h12, min, ampm } = activeTimeModalContext;
    const hStr = String(h12).padStart(2, '0');
    const mStr = String(min).padStart(2, '0');
    document.getElementById('time-modal-digital').textContent = `${hStr}:${mStr} ${ampm}`;
    document.getElementById('time-modal-hr-inp').value = h12;
    document.getElementById('time-modal-min-inp').value = mStr;

    const amBtn = document.getElementById('time-modal-am-btn');
    const pmBtn = document.getElementById('time-modal-pm-btn');
    if (amBtn && pmBtn) {
        amBtn.className = ampm === 'AM'
            ? "px-4 py-1.5 rounded-xl font-extrabold text-xs bg-emerald-600 text-white shadow"
            : "px-4 py-1.5 rounded-xl font-extrabold text-xs text-slate-400 hover:text-white";
        pmBtn.className = ampm === 'PM'
            ? "px-4 py-1.5 rounded-xl font-extrabold text-xs bg-emerald-600 text-white shadow"
            : "px-4 py-1.5 rounded-xl font-extrabold text-xs text-slate-400 hover:text-white";
    }

    const hrGrid = document.getElementById('time-modal-hours-grid');
    if (hrGrid) {
        hrGrid.innerHTML = '';
        for (let h = 1; h <= 12; h++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = h;
            b.className = h === h12
                ? "bg-emerald-600 text-white font-mono font-extrabold text-xs py-2 rounded-xl shadow"
                : "bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono font-bold text-xs py-2 rounded-xl";
            b.onclick = () => { activeTimeModalContext.h12 = h; refreshInAppTimeModalUI(); };
            hrGrid.appendChild(b);
        }
    }

    const minGrid = document.getElementById('time-modal-mins-grid');
    if (minGrid) {
        minGrid.innerHTML = '';
        [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].forEach(mVal => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = ':' + String(mVal).padStart(2, '0');
            b.className = mVal === min
                ? "bg-blue-600 text-white font-mono font-extrabold text-xs py-1.5 rounded-xl shadow"
                : "bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-mono font-bold text-xs py-1.5 rounded-xl";
            b.onclick = () => { activeTimeModalContext.min = mVal; refreshInAppTimeModalUI(); };
            minGrid.appendChild(b);
        });
    }
}

document.getElementById('time-modal-am-btn')?.addEventListener('click', () => { activeTimeModalContext.ampm = 'AM'; refreshInAppTimeModalUI(); });
document.getElementById('time-modal-pm-btn')?.addEventListener('click', () => { activeTimeModalContext.ampm = 'PM'; refreshInAppTimeModalUI(); });
document.getElementById('time-modal-hr-inp')?.addEventListener('input', (e) => {
    const v = Math.max(1, Math.min(12, parseInt(e.target.value) || 12));
    activeTimeModalContext.h12 = v;
    document.getElementById('time-modal-digital').textContent = `${String(v).padStart(2, '0')}:${String(activeTimeModalContext.min).padStart(2, '0')} ${activeTimeModalContext.ampm}`;
});
document.getElementById('time-modal-min-inp')?.addEventListener('input', (e) => {
    const v = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
    activeTimeModalContext.min = v;
    document.getElementById('time-modal-digital').textContent = `${String(activeTimeModalContext.h12).padStart(2, '0')}:${String(v).padStart(2, '0')} ${activeTimeModalContext.ampm}`;
});
document.getElementById('close-time-modal-btn')?.addEventListener('click', () => document.getElementById('inapp-time-modal')?.classList.add('hidden'));
document.getElementById('save-time-modal-btn')?.addEventListener('click', () => {
    const { prayer, field, h12, min, ampm } = activeTimeModalContext;
    let h24 = h12 % 12;
    if (ampm === 'PM') h24 += 12;
    const formatted24 = `${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    if (field === 'start') {
        if (!extCfg.prayerTimes) extCfg.prayerTimes = { ...DEFAULT_PRAYERS };
        extCfg.prayerTimes[prayer] = formatted24;
    } else {
        if (!extCfg.prayerEndTimes) extCfg.prayerEndTimes = { ...DEFAULT_PRAYER_ENDS };
        extCfg.prayerEndTimes[prayer] = formatted24;
    }
    saveExtConfig();
    renderSalahStrip();
    renderSettingsSalahList();
    document.getElementById('inapp-time-modal')?.classList.add('hidden');
    broadcastToCloud();
    showToast(`🕒 Saved ${prayer} ${field === 'start' ? 'Start' : 'End'} Time (${format12hTime(formatted24)})`);
});

document.getElementById('sync-masjid-gps-btn')?.addEventListener('click', () => {
    if (!navigator.geolocation) return showToast("Geolocation not supported on this device.", true);
    showToast("📍 Detecting local coordinates for Masjid Aladhan sync...");
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const { latitude, longitude } = pos.coords;
            extCfg.masjidCoords = { lat: latitude, lon: longitude };
            const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=1`);
            const data = await res.json();
            if (data?.data?.timings) {
                const t = data.data.timings;
                SALAH_KEYS.forEach(k => {
                    if (t[k]) extCfg.prayerTimes[k] = t[k].slice(0, 5);
                });
                if (t.Sunrise) extCfg.prayerEndTimes.Fajr = t.Sunrise.slice(0, 5);
                if (t.Asr) extCfg.prayerEndTimes.Dhuhr = t.Asr.slice(0, 5);
                if (t.Maghrib) extCfg.prayerEndTimes.Asr = t.Maghrib.slice(0, 5);
                if (t.Isha) extCfg.prayerEndTimes.Maghrib = t.Isha.slice(0, 5);
                saveExtConfig();
                renderSalahStrip();
                renderSettingsSalahList();
                broadcastToCloud();
                showToast("🕌 Local Masjid & Aladhan Prayer Windows Synced!");
            }
        } catch (err) {
            showToast("Failed to fetch Aladhan API timings.", true);
        }
    }, () => showToast("Location permission denied.", true));
});

let lastSalahFreezeKey = '';
let activeFreezePrayerName = null;

function triggerSalahFreezeOverlay(prayerName, startStr, endStr) {
    activeFreezePrayerName = prayerName;
    const modal = document.getElementById('salah-freeze-overlay');
    if (!modal) return;
    if (isRunning) stopTimer();
    playChime('salah');
    if (window.sendDesktopNotification) {
        window.sendDesktopNotification(`🕌 ${prayerName} Salah Window`, `Timer paused for ${prayerName} (${format12hTime(startStr)} – ${format12hTime(endStr)}).`, 'salah-freeze');
    }
    document.getElementById('salah-freeze-title').textContent = `It is Time for ${prayerName} Salah`;
    document.getElementById('salah-freeze-sub').textContent = `Your study timer has been respectfully paused for ${prayerName} (${format12hTime(startStr)} – ${format12hTime(endStr)}). Perform Wudu & pray with Khushu.`;
    modal.classList.remove('hidden');
}

document.getElementById('salah-freeze-prayed-btn')?.addEventListener('click', () => {
    const p = activeFreezePrayerName;
    const today = getLocalTodayString();
    if (p) {
        if (!salahLog[today]) salahLog[today] = {};
        if (!salahLog[today][p]) {
            salahLog[today][p] = true;
            deenHistory[today] = (deenHistory[today] || 0) + 15;
            saveExtConfig();
            renderSalahStrip();
            renderSettingsSalahList();
            renderHomeHUD();
            renderStats();
            PomoEventBus.emit('salah:updated');
            broadcastToCloud();
        }
    }
    document.getElementById('salah-freeze-overlay')?.classList.add('hidden');
    showToast(`🕌 Alhamdulillah! +15m Deen Barakah logged for ${p || 'Salah'}.`);
});

document.getElementById('salah-freeze-snooze-btn')?.addEventListener('click', () => {
    document.getElementById('salah-freeze-overlay')?.classList.add('hidden');
    showToast("Snoozed Salah Freeze for 10 minutes.");
});

window.evaluateDriftAndAlerts = function() {
    const banner = document.getElementById('smart-drift-banner');
    const titleEl = document.getElementById('drift-banner-title');
    const subEl = document.getElementById('drift-banner-sub');
    const iconEl = document.getElementById('drift-banner-icon');
    const actBtn = document.getElementById('drift-action-btn');
    if (!banner) return;

    const now = new Date();
    const curMins = now.getHours() * 60 + now.getMinutes();
    const today = getLocalTodayString();
    const log = salahLog[today] || {};

    if (extCfg.salahFreezeEnabled) {
        SALAH_KEYS.forEach((p, idx) => {
            if (log[p]) return;
            const tStr = (extCfg.prayerTimes && extCfg.prayerTimes[p]) || DEFAULT_PRAYERS[p];
            const nextP = SALAH_KEYS[(idx + 1) % SALAH_KEYS.length];
            const eStr = (extCfg.prayerEndTimes && extCfg.prayerEndTimes[p])
                || (extCfg.prayerTimes && extCfg.prayerTimes[nextP])
                || DEFAULT_PRAYER_ENDS[p];
            const [ph, pm] = tStr.split(':').map(Number);
            const pMins = ph * 60 + pm;
            const fKey = `${today}_${p}_${tStr}`;
            if (Math.abs(curMins - pMins) <= 1 && lastSalahFreezeKey !== fKey) {
                lastSalahFreezeKey = fKey;
                triggerSalahFreezeOverlay(p, tStr, eStr);
            }
        });
    }

    let pendingPrayerInWindow = null;
    for (let i = 0; i < SALAH_KEYS.length; i++) {
        const p = SALAH_KEYS[i];
        const nextP = SALAH_KEYS[(i + 1) % SALAH_KEYS.length];
        const t1 = (extCfg.prayerTimes && extCfg.prayerTimes[p]) || DEFAULT_PRAYERS[p];
        const t2 = (extCfg.prayerEndTimes && extCfg.prayerEndTimes[p])
            || (extCfg.prayerTimes && extCfg.prayerTimes[nextP])
            || DEFAULT_PRAYER_ENDS[p];
        const [h1, m1] = t1.split(':').map(Number);
        const [h2, m2] = t2.split(':').map(Number);
        const startM = h1 * 60 + m1;
        const endM = h2 * 60 + m2;
        const inWindow = endM > startM ? (curMins >= startM && curMins < endM) : (curMins >= startM || curMins < endM);
        if (inWindow && !log[p]) {
            pendingPrayerInWindow = { name: p, start: t1, end: t2 };
            break;
        }
    }

    const sMins = getTodayStudyMinutes();
    const dMins = getTodayDeenMinutes();
    const sTarget = extCfg.studyTargetMins || 360;
    const dTarget = extCfg.deenTargetMins || 90;
    const dayFraction = Math.max(0.1, Math.min(1, (now.getHours() - 5) / 16));
    const expectedStudyByNow = Math.round(sTarget * dayFraction);
    const studyDeficit = expectedStudyByNow - sMins;

    if (pendingPrayerInWindow) {
        banner.className = "w-full rounded-xl p-2.5 border flex items-center justify-between gap-2 shadow-md transition-all bg-emerald-950/60 border-emerald-500/50";
        iconEl.textContent = "🕌";
        titleEl.className = "text-xs font-extrabold uppercase tracking-wider text-emerald-300";
        titleEl.textContent = `${pendingPrayerInWindow.name} Window Active (${format12hTime(pendingPrayerInWindow.start)} – ${format12hTime(pendingPrayerInWindow.end)})`;
        subEl.textContent = `You haven't marked ${pendingPrayerInWindow.name} Salah yet. Pray first for Barakah in your study!`;
        actBtn.textContent = `✓ Mark ${pendingPrayerInWindow.name}`;
        actBtn.className = "bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shrink-0 transition-all";
        actBtn.onclick = () => {
            if (!salahLog[today]) salahLog[today] = {};
            salahLog[today][pendingPrayerInWindow.name] = true;
            deenHistory[today] = (deenHistory[today] || 0) + 12;
            saveExtConfig();
            renderSalahStrip();
            renderSettingsSalahList();
            renderHomeHUD();
            evaluateDriftAndAlerts();
            PomoEventBus.emit('salah:updated');
            showToast(`🕌 MashaAllah! ${pendingPrayerInWindow.name} marked complete.`);
        };
    } else if (sMins >= 90 && dMins < 15) {
        banner.className = "w-full rounded-xl p-2.5 border flex items-center justify-between gap-2 shadow-md transition-all bg-teal-950/60 border-teal-500/50";
        iconEl.textContent = "📖";
        titleEl.className = "text-xs font-extrabold uppercase tracking-wider text-teal-300";
        titleEl.textContent = "Deen & Imaan Balance Reminder";
        subEl.textContent = `You studied ${sMins}m today but logged only ${dMins}m of Deen/Quran. Insert a 15m Quran/Dhikr block!`;
        actBtn.textContent = "+ 15m Deen Block";
        actBtn.className = "bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shrink-0 transition-all";
        actBtn.onclick = () => {
            schedule.splice(currentStepIndex + 1, 0, {
                id: Date.now(),
                type: 'work',
                category: 'deen',
                title: '🕌 15m Quran & Dhikr Recharge',
                duration: 15 * 60
            });
            safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
            renderSchedule();
            banner.classList.add('hidden');
            showToast("Inserted 15m Deen Block next in Live Protocol!");
        };
    } else if (studyDeficit >= 60 && now.getHours() >= 11) {
        banner.className = "w-full rounded-xl p-2.5 border flex items-center justify-between gap-2 shadow-md transition-all bg-amber-950/60 border-amber-500/50";
        iconEl.textContent = "⚡";
        titleEl.className = "text-xs font-extrabold uppercase tracking-wider text-amber-300";
        titleEl.textContent = `Study Target Drift (-${studyDeficit}m Behind Pace)`;
        subEl.textContent = `Target pace is ${expectedStudyByNow}m by now (logged ${sMins}m). Auto-pack a catch-up sprint?`;
        actBtn.textContent = "⚡ Add 45m Sprint";
        actBtn.className = "bg-amber-600 hover:bg-amber-500 text-slate-950 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg shrink-0 transition-all";
        actBtn.onclick = () => {
            schedule.push({
                id: Date.now(),
                type: 'work',
                category: 'study',
                title: '⚡ High-Yield Catch-Up Sprint',
                duration: 45 * 60
            });
            safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
            renderSchedule();
            banner.classList.add('hidden');
            showToast("Added 45m Catch-Up Sprint to Live Protocol!");
        };
    } else {
        banner.classList.add('hidden');
    }
};

setInterval(evaluateDriftAndAlerts, 30000);

document.getElementById('save-balance-targets-btn')?.addEventListener('click', () => {
    extCfg.studyTargetMins = Math.max(30, parseInt(document.getElementById('cfg-study-target-mins').value) || 360);
    extCfg.deenTargetMins = Math.max(15, parseInt(document.getElementById('cfg-deen-target-mins').value) || 90);
    extCfg.salahFreezeEnabled = document.getElementById('cfg-salah-freeze-toggle').value === 'on';
    SALAH_KEYS.forEach(k => {
        const el = document.getElementById(`prayer-time-${k}`);
        if (el && el.value) extCfg.prayerTimes[k] = el.value;
    });
    saveExtConfig();
    renderHomeHUD();
    renderSalahStrip();
    renderSettingsSalahList();
    evaluateDriftAndAlerts();
    broadcastToCloud();
    showToast("Balance targets & Salah times saved!");
});

/* ==========================================================================
   7. POMOTASKS & MY DAY PLANNER (REPEAT ENGINE, DRAWER & ANALYTICS)
   ========================================================================== */
window.saveTodos = function() {
    safeSet('pomo_todos_v1', JSON.stringify(todos));
    safeSet('pomo_todo_lists_v1', JSON.stringify(todoLists));
    PomoEventBus.emit('todos:updated');
};

window.rolloverOverduePomoTasks = function() {
    const today = getLocalTodayString();
    let rolledCount = 0;
    todos.forEach(t => {
        if (!t.completed) {
            if (t.dueDate && t.dueDate < today) {
                t. rolledOverCount = (t.rolledOverCount || 0) + 1;
                t.dueDate = today;
                t.myDayDate = today;
                rolledCount++;
            } else if (t.myDayDate && t.myDayDate < today) {
                t.myDayDate = today;
                rolledCount++;
            }
        }
    });
    if (rolledCount > 0) saveTodos();
};
rolloverOverduePomoTasks();

function mountTodoTopBarUpgrades() {
    const suggBtn = document.getElementById('todo-suggestions-btn');
    if (suggBtn && !document.getElementById('todo-analytics-open-btn')) {
        const btnWrap = suggBtn.parentElement;
        const graphBtn = document.createElement('button');
        graphBtn.id = 'todo-analytics-open-btn';
        graphBtn.type = 'button';
        graphBtn.className = "bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all";
        graphBtn.innerHTML = `📈 4-Graph Progression`;
        graphBtn.onclick = () => window.openTodoAnalyticsModal('4w');
        btnWrap.insertBefore(graphBtn, suggBtn);
    }
}

function formatRepeatBadge(rep) {
    if (!rep || rep === 'none') return '';
    if (typeof rep === 'string') return `🔁 ${rep}`;
    if (typeof rep === 'object') {
        const unitMap = { day: 'd', week: 'w', month: 'mo', year: 'yr' };
        const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        let txt = `🔁 Every ${rep.interval || 1}${unitMap[rep.unit] || 'd'}`;
        if (rep.unit === 'week' && Array.isArray(rep.days) && rep.days.length > 0) {
            txt += ` (${rep.days.map(d => dayNames[d]).join(',')})`;
        }
        return txt;
    }
    return '';
}

function computeNextDueDate(baseDateStr, rep) {
    if (!rep || rep === 'none') return null;
    const base = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date();
    const next = new Date(base);

    if (typeof rep === 'string') {
        if (rep === 'daily') next.setDate(next.getDate() + 1);
        else if (rep === 'weekdays') {
            do { next.setDate(next.getDate() + 1); } while (next.getDay() === 0 || next.getDay() === 6);
        } else if (rep === 'weekly') next.setDate(next.getDate() + 7);
        else if (rep === 'monthly') next.setMonth(next.getMonth() + 1);
        else return null;
    } else if (typeof rep === 'object') {
        const interval = Math.max(1, parseInt(rep.interval) || 1);
        if (rep.unit === 'day') next.setDate(next.getDate() + interval);
        else if (rep.unit === 'week') {
            if (Array.isArray(rep.days) && rep.days.length > 0) {
                const sortedDays = [...rep.days].sort((a, b) => a - b);
                let found = false;
                for (let step = 1; step <= 7 * interval; step++) {
                    const cand = new Date(base);
                    cand.setDate(cand.getDate() + step);
                    if (sortedDays.includes(cand.getDay())) {
                        next.setTime(cand.getTime());
                        found = true;
                        break;
                    }
                }
                if (!found) next.setDate(next.getDate() + 7 * interval);
            } else {
                next.setDate(next.getDate() + 7 * interval);
            }
        } else if (rep.unit === 'month') next.setMonth(next.getMonth() + interval);
        else if (rep.unit === 'year') next.setFullYear(next.getFullYear() + interval);
    }
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

window.renderTodoListsBar = function() {
    mountTodoTopBarUpgrades();
    const bar = document.getElementById('todo-lists-bar');
    if (!bar) return;
    bar.innerHTML = '';
    const today = getLocalTodayString();

    todoLists.forEach(lst => {
        let count = 0;
        if (lst.id === 'myday') count = todos.filter(t => !t.completed && t.myDayDate === today).length;
        else if (lst.id === 'important') count = todos.filter(t => !t.completed && t.important).length;
        else if (lst.id === 'planned') count = todos.filter(t => !t.completed && t.dueDate).length;
        else if (lst.id === 'deen') count = todos.filter(t => !t.completed && t.listId === 'deen').length;
        else if (lst.id === 'vault') count = todos.filter(t => !t.completed && (t.listId === 'vault' || t.linkedVaultId)).length;
        else if (lst.id === 'tasks') count = todos.filter(t => !t.completed).length;
        else count = todos.filter(t => !t.completed && t.listId === lst.id).length;

        const active = activeTodoListId === lst.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 border transition-all ${
            active
                ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-800'
        }`;
        btn.innerHTML = `<span>${lst.icon}</span><span>${escapeHtml(lst.name)}</span><span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full ${active ? 'bg-blue-800 text-blue-100' : 'bg-slate-950 text-slate-400'}">${count}</span>`;
        btn.onclick = () => {
            activeTodoListId = lst.id;
            renderTodoListsBar();
            renderTodos();
        };
        bar.appendChild(btn);
    });
};

window.renderTodos = function() {
    const activeCont = document.getElementById('todo-items-container');
    const compCont = document.getElementById('todo-completed-container');
    if (!activeCont || !compCont) return;

    const today = getLocalTodayString();
    const curList = todoLists.find(l => l.id === activeTodoListId) || todoLists[0];
    document.getElementById('todo-view-title').innerHTML = `<span>${curList.icon}</span> <span>${escapeHtml(curList.name)}</span>`;
    document.getElementById('todo-view-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

    let filtered = [];
    if (activeTodoListId === 'myday') filtered = todos.filter(t => t.myDayDate === today);
    else if (activeTodoListId === 'important') filtered = todos.filter(t => t.important);
    else if (activeTodoListId === 'planned') filtered = todos.filter(t => !!t.dueDate);
    else if (activeTodoListId === 'deen') filtered = todos.filter(t => t.listId === 'deen');
    else if (activeTodoListId === 'vault') filtered = todos.filter(t => t.listId === 'vault' || !!t.linkedVaultId);
    else if (activeTodoListId === 'tasks') filtered = [...todos];
    else filtered = todos.filter(t => t.listId === activeTodoListId);

    const activeItems = filtered.filter(t => !t.completed).sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
    const completedItems = filtered.filter(t => t.completed);

    activeCont.innerHTML = '';
    if (activeItems.length === 0) {
        activeCont.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs italic bg-slate-950/50 rounded-2xl border border-slate-800/60">No active tasks in ${escapeHtml(curList.name)}. Add one above or pull from 💡 Suggestions!</div>`;
    } else {
        activeItems.forEach(t => activeCont.appendChild(createTodoRow(t)));
    }

    const compSec = document.getElementById('todo-completed-section');
    document.getElementById('todo-completed-count').textContent = completedItems.length;
    compCont.innerHTML = '';
    if (completedItems.length > 0) {
        compSec.classList.remove('hidden');
        completedItems.forEach(t => compCont.appendChild(createTodoRow(t)));
    } else {
        compSec.classList.add('hidden');
    }
};

function createTodoRow(t) {
    const today = getLocalTodayString();
    const row = document.createElement('div');
    row.className = `flex items-center justify-between gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer ${
        t.completed
            ? 'bg-slate-950/50 border-slate-800/60 opacity-60'
            : (t.important ? 'bg-slate-950 border-amber-500/40 hover:border-amber-500/70 shadow-sm' : 'bg-slate-950 border-slate-800 hover:border-slate-700')
    }`;

    const steps = Array.isArray(t.steps) ? t.steps : [];
    const doneSteps = steps.filter(s => s.done).length;
    const stepBadge = steps.length > 0 ? `<span class="text-[9px] font-mono bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800">☑️ ${doneSteps}/${steps.length}</span>` : '';
    const myDayBadge = t.myDayDate === today ? `<span class="text-[9px] font-bold text-amber-300 bg-amber-950/50 border border-amber-700/40 px-1.5 py-0.5 rounded">☀️ My Day</span>` : '';
    const dueBadge = t.dueDate ? `<span class="text-[9px] font-mono ${t.dueDate < today && !t.completed ? 'text-red-400 font-bold' : 'text-slate-400'}">📅 ${formatDDMMYYYY(t.dueDate)}</span>` : '';
    const repTxt = formatRepeatBadge(t.repeat);
    const repBadge = repTxt ? `<span class="text-[9px] font-mono text-blue-300 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/40">${escapeHtml(repTxt)}</span>` : '';
    const durBadge = (t.usedDurationMins || t.plannedDurationMins)
        ? `<span class="text-[9px] font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-700/40 px-1.5 py-0.5 rounded">⏱️ ${t.usedDurationMins ? `${t.usedDurationMins}m used` : `${t.plannedDurationMins}m plan`}${t.overtimeMins ? ` (+${t.overtimeMins}m OT)` : ''}</span>`
        : '';

    row.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
            <button type="button" class="todo-chk-btn w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                t.completed ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-extrabold text-xs' : 'border-slate-600 hover:border-emerald-400'
            }">${t.completed ? '✓' : ''}</button>
            <div class="min-w-0 flex-1">
                <p class="text-xs sm:text-sm font-bold truncate ${t.completed ? 'line-through text-slate-400' : 'text-white'}">${escapeHtml(t.title)}</p>
                <div class="flex flex-wrap items-center gap-1.5 mt-1">
                    ${myDayBadge}
                    ${stepBadge}
                    ${dueBadge}
                    ${repBadge}
                    ${durBadge}
                </div>
            </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" title="Configure & Launch in Live Protocol Timer" class="todo-focus-btn bg-blue-950/60 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all">⚡ Focus</button>
            <button type="button" title="Mark Important" class="todo-star-btn text-base px-1.5 py-0.5 rounded-lg hover:bg-slate-900">${t.important ? '⭐' : '☆'}</button>
        </div>
    `;

    row.querySelector('.todo-chk-btn').onclick = (e) => {
        e.stopPropagation();
        toggleTodoComplete(t.id);
    };
    row.querySelector('.todo-star-btn').onclick = (e) => {
        e.stopPropagation();
        toggleTodoImportant(t.id);
    };
    row.querySelector('.todo-focus-btn').onclick = (e) => {
        e.stopPropagation();
        window.openProtocolRunModal('todo', t.id);
    };
    row.onclick = () => openTodoDetail(t.id);
    return row;
}

window.toggleTodoComplete = function(id) {
    const t = todos.find(x => String(x.id) === String(id));
    if (!t) return;
    const today = getLocalTodayString();
    t.completed = !t.completed;
    t.completedDate = t.completed ? today : null;

    if (t.completed) {
        playChime('todo');
        if (t.repeat && t.repeat !== 'none') {
            const nextDue = computeNextDueDate(t.dueDate || today, t.repeat);
            if (nextDue) {
                todos.unshift({
                    ...JSON.parse(JSON.stringify(t)),
                    id: 'todo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                    completed: false,
                    completedDate: null,
                    usedDurationMins: 0,
                    overtimeMins: 0,
                    dueDate: nextDue,
                    myDayDate: nextDue === today ? today : '',
                    steps: (t.steps || []).map(s => ({ ...s, done: false })),
                    createdAt: Date.now()
                });
                showToast(`🔁 Recurring task scheduled for ${formatDDMMYYYY(nextDue)}`);
            }
        }
        if (t.linkedVaultId) {
            const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
            const vt = tasks.find(x => String(x.id) === String(t.linkedVaultId));
            if (vt && !vt.completed) {
                vt.completed = true;
                vt.completedDate = today;
                safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
                PomoEventBus.emit('vault:updated');
            }
        }
    }

    saveTodos();
    renderTodoListsBar();
    renderTodos();
    renderHomeHUD();
    broadcastToCloud();
};

window.toggleTodoImportant = function(id) {
    const t = todos.find(x => String(x.id) === String(id));
    if (!t) return;
    t.important = !t.important;
    saveTodos();
    renderTodoListsBar();
    renderTodos();
    broadcastToCloud();
};

function submitNewTodo() {
    const inp = document.getElementById('todo-quick-input');
    const title = inp?.value.trim();
    if (!title) return;

    const today = getLocalTodayString();
    const dueVal = document.getElementById('todo-quick-due')?.value || '';
    const repSel = document.getElementById('todo-quick-repeat')?.value || 'none';
    const repRule = repSel === 'custom' && pendingCustomRepeatConfig ? JSON.parse(JSON.stringify(pendingCustomRepeatConfig)) : repSel;

    const isMyDay = activeTodoListId === 'myday' || !dueVal || dueVal === today;
    const isImp = activeTodoListId === 'important';
    const listId = ['myday', 'important', 'planned', 'tasks'].includes(activeTodoListId) ? 'tasks' : activeTodoListId;

    const newTask = {
        id: 'todo_' + Date.now(),
        title,
        listId,
        myDayDate: isMyDay ? today : '',
        important: isImp,
        completed: false,
        dueDate: dueVal || today,
        repeat: repRule,
        plannedDurationMins: 50,
        usedDurationMins: 0,
        steps: [],
        notes: '',
        createdAt: Date.now()
    };

    todos.unshift(newTask);
    inp.value = '';
    saveTodos();
    renderTodoListsBar();
    renderTodos();
    broadcastToCloud();
    showToast("Task added to PomoTasks!");
}

document.getElementById('todo-quick-add-btn')?.addEventListener('click', submitNewTodo);
document.getElementById('todo-quick-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitNewTodo();
});

document.getElementById('todo-add-list-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('custom-list-name-input');
    if (inp) inp.value = '';
    document.getElementById('custom-list-modal')?.classList.remove('hidden');
});
document.getElementById('close-custom-list-modal-btn')?.addEventListener('click', () => {
    document.getElementById('custom-list-modal')?.classList.add('hidden');
});
document.getElementById('save-custom-list-btn')?.addEventListener('click', () => {
    const name = document.getElementById('custom-list-name-input')?.value.trim();
    const icon = document.getElementById('custom-list-icon-select')?.value || '📁';
    if (!name) return;
    const id = 'list_' + Date.now();
    todoLists.push({ id, name, icon, system: false });
    activeTodoListId = id;
    saveTodos();
    renderTodoListsBar();
    renderTodos();
    document.getElementById('custom-list-modal')?.classList.add('hidden');
});

document.getElementById('todo-toggle-completed-btn')?.addEventListener('click', () => {
    const cont = document.getElementById('todo-completed-container');
    const arrow = document.getElementById('todo-completed-arrow');
    if (cont) {
        cont.classList.toggle('hidden');
        if (arrow) arrow.textContent = cont.classList.contains('hidden') ? '▶' : '▼';
    }
});

let customRepeatDaysSelected = [1, 3, 5];
let repeatModalTarget = 'quick';

function openCustomRepeatModal(target = 'quick') {
    repeatModalTarget = target;
    document.getElementById('custom-repeat-modal')?.classList.remove('hidden');
    syncCustomRepeatDaysUI();
}

function syncCustomRepeatDaysUI() {
    const unit = document.getElementById('repeat-custom-unit')?.value || 'week';
    const wrap = document.getElementById('repeat-weekdays-wrap');
    if (wrap) wrap.classList.toggle('hidden', unit !== 'week');
    document.querySelectorAll('.rep-day-btn').forEach(btn => {
        const d = parseInt(btn.dataset.d);
        const on = customRepeatDaysSelected.includes(d);
        btn.className = on
            ? "rep-day-btn py-1.5 rounded-lg text-[10px] font-extrabold bg-blue-600 text-white border border-blue-400"
            : "rep-day-btn py-1.5 rounded-lg text-[10px] font-bold bg-slate-950 border border-slate-800 text-slate-400";
    });
}

document.getElementById('repeat-custom-unit')?.addEventListener('change', syncCustomRepeatDaysUI);
document.querySelectorAll('.rep-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const d = parseInt(btn.dataset.d);
        if (customRepeatDaysSelected.includes(d)) {
            customRepeatDaysSelected = customRepeatDaysSelected.filter(x => x !== d);
        } else {
            customRepeatDaysSelected.push(d);
        }
        syncCustomRepeatDaysUI();
    });
});

document.getElementById('todo-quick-repeat')?.addEventListener('change', (e) => {
    if (e.target.value === 'custom') openCustomRepeatModal('quick');
});
document.getElementById('todo-quick-custom-repeat-btn')?.addEventListener('click', () => openCustomRepeatModal('quick'));
document.getElementById('todo-detail-custom-repeat-btn')?.addEventListener('click', () => openCustomRepeatModal('detail'));
document.getElementById('close-repeat-modal-btn')?.addEventListener('click', () => document.getElementById('custom-repeat-modal')?.classList.add('hidden'));

document.getElementById('save-repeat-modal-btn')?.addEventListener('click', () => {
    const interval = Math.max(1, parseInt(document.getElementById('repeat-custom-interval')?.value) || 1);
    const unit = document.getElementById('repeat-custom-unit')?.value || 'week';
    const rule = { type: 'custom', interval, unit, days: unit === 'week' ? [...customRepeatDaysSelected] : [] };
    pendingCustomRepeatConfig = rule;

    if (repeatModalTarget === 'detail' && selectedTodoDetailId) {
        const t = todos.find(x => String(x.id) === String(selectedTodoDetailId));
        if (t) {
            t.repeat = rule;
            document.getElementById('todo-detail-repeat').value = 'custom';
            saveTodos();
            renderTodos();
        }
    } else {
        document.getElementById('todo-quick-repeat').value = 'custom';
    }
    document.getElementById('custom-repeat-modal')?.classList.add('hidden');
    showToast(`🔁 Custom repeat set (${formatRepeatBadge(rule)})`);
});

window.openTodoDetail = function(id) {
    const t = todos.find(x => String(x.id) === String(id));
    if (!t) return;
    selectedTodoDetailId = t.id;
    const today = getLocalTodayString();

    document.getElementById('todo-detail-title').value = t.title || '';
    document.getElementById('todo-detail-due').value = t.dueDate || '';
    document.getElementById('todo-detail-notes').value = t.notes || '';
    document.getElementById('todo-detail-repeat').value = (typeof t.repeat === 'object') ? 'custom' : (t.repeat || 'none');

    const myDayBtn = document.getElementById('todo-detail-myday-btn');
    if (myDayBtn) {
        const inMyDay = t.myDayDate === today;
        myDayBtn.textContent = inMyDay ? '☀️ Added to My Day (Click to Remove)' : '☀️ Add to My Day';
        myDayBtn.className = inMyDay
            ? "w-full p-2.5 rounded-xl border border-amber-500/50 bg-amber-950/30 text-amber-300 text-xs font-extrabold text-left flex items-center justify-between transition-all"
            : "w-full p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:border-amber-500/40 text-xs font-bold text-left flex items-center justify-between transition-all";
    }

    renderDetailSteps(t);
    document.getElementById('todo-detail-drawer')?.classList.remove('hidden');
};

function renderDetailSteps(t) {
    const cont = document.getElementById('todo-detail-steps-list');
    if (!cont) return;
    cont.innerHTML = '';
    (t.steps || []).forEach((s, idx) => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800";
        div.innerHTML = `
            <label class="flex items-center gap-2 text-xs text-slate-200 cursor-pointer flex-1">
                <input type="checkbox" ${s.done ? 'checked' : ''} onchange="window.toggleSubStep(${idx})" class="accent-emerald-500 rounded">
                <span class="${s.done ? 'line-through text-slate-500' : ''}">${escapeHtml(s.title)}</span>
            </label>
            <button type="button" onclick="window.deleteSubStep(${idx})" class="text-slate-500 hover:text-red-400 text-xs px-1">✕</button>
        `;
        cont.appendChild(div);
    });
}

window.toggleSubStep = function(idx) {
    const t = todos.find(x => String(x.id) === String(selectedTodoDetailId));
    if (!t || !t.steps || !t.steps[idx]) return;
    t.steps[idx].done = !t.steps[idx].done;
    saveTodos();
    renderDetailSteps(t);
    renderTodos();
};

window.deleteSubStep = function(idx) {
    const t = todos.find(x => String(x.id) === String(selectedTodoDetailId));
    if (!t || !t.steps) return;
    t.steps.splice(idx, 1);
    saveTodos();
    renderDetailSteps(t);
    renderTodos();
};

document.getElementById('todo-detail-add-step-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('todo-detail-step-input');
    const val = inp?.value.trim();
    if (!val || !selectedTodoDetailId) return;
    const t = todos.find(x => String(x.id) === String(selectedTodoDetailId));
    if (!t) return;
    if (!Array.isArray(t.steps)) t.steps = [];
    t.steps.push({ id: Date.now(), title: val, done: false });
    inp.value = '';
    saveTodos();
    renderDetailSteps(t);
    renderTodos();
});

document.getElementById('todo-detail-myday-btn')?.addEventListener('click', () => {
    const t = todos.find(x => String(x.id) === String(selectedTodoDetailId));
    if (!t) return;
    const today = getLocalTodayString();
    t.myDayDate = (t.myDayDate === today) ? '' : today;
    saveTodos();
    openTodoDetail(t.id);
    renderTodoListsBar();
    renderTodos();
});

['todo-detail-title', 'todo-detail-due', 'todo-detail-notes', 'todo-detail-repeat'].forEach(elId => {
    document.getElementById(elId)?.addEventListener('change', () => {
        const t = todos.find(x => String(x.id) === String(selectedTodoDetailId));
        if (!t) return;
        t.title = document.getElementById('todo-detail-title').value.trim() || t.title;
        t.dueDate = document.getElementById('todo-detail-due').value;
        t.notes = document.getElementById('todo-detail-notes').value;
        const repVal = document.getElementById('todo-detail-repeat').value;
        if (repVal === 'custom') openCustomRepeatModal('detail');
        else t.repeat = repVal;
        saveTodos();
        renderTodoListsBar();
        renderTodos();
    });
});

document.getElementById('todo-detail-close-btn')?.addEventListener('click', () => {
    document.getElementById('todo-detail-drawer')?.classList.add('hidden');
});

document.getElementById('todo-detail-delete-btn')?.addEventListener('click', () => {
    if (!selectedTodoDetailId) return;
    window.todos = todos.filter(x => String(x.id) !== String(selectedTodoDetailId));
    saveTodos();
    document.getElementById('todo-detail-drawer')?.classList.add('hidden');
    renderTodoListsBar();
    renderTodos();
    showToast("Task deleted.");
});

document.getElementById('todo-detail-send-timer-btn')?.addEventListener('click', () => {
    if (!selectedTodoDetailId) return;
    document.getElementById('todo-detail-drawer')?.classList.add('hidden');
    window.openProtocolRunModal('todo', selectedTodoDetailId);
});

document.getElementById('todo-suggestions-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('todo-suggestions-modal');
    const list = document.getElementById('todo-suggestions-list');
    if (!modal || !list) return;
    list.innerHTML = '';
    const today = getLocalTodayString();

    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]')).filter(v => !v.completed && (!v.nextRev || v.nextRev <= today));
    const unscheduledTodos = todos.filter(t => !t.completed && t.myDayDate !== today);

    if (vaultTasks.length === 0 && unscheduledTodos.length === 0) {
        list.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">✨ All due Study Vault revisions and tasks are already in your My Day!</div>`;
    } else {
        vaultTasks.slice(0, 8).forEach(vt => {
            const d = document.createElement('div');
            d.className = "flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-purple-500/30";
            d.innerHTML = `
                <div class="min-w-0 flex-1">
                    <span class="text-[9px] font-bold text-purple-300 uppercase">📚 Due Study Vault Revision</span>
                    <p class="text-xs font-bold text-white truncate">[${escapeHtml(vt.subj)}] ${escapeHtml(vt.chap)}</p>
                </div>
                <button type="button" class="bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shrink-0">+ Add to My Day</button>
            `;
            d.querySelector('button').onclick = () => {
                todos.unshift({
                    id: 'todo_v_' + Date.now(),
                    title: `[${vt.subj}] ${vt.chap} (${vt.act})`,
                    listId: 'vault',
                    myDayDate: today,
                    important: true,
                    completed: false,
                    dueDate: today,
                    repeat: 'none',
                    plannedDurationMins: 50,
                    steps: [],
                    linkedVaultId: vt.id,
                    createdAt: Date.now()
                });
                saveTodos();
                renderTodoListsBar();
                renderTodos();
                d.remove();
            };
            list.appendChild(d);
        });

        unscheduledTodos.slice(0, 10).forEach(ut => {
            const d = document.createElement('div');
            d.className = "flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800";
            d.innerHTML = `
                <div class="min-w-0 flex-1">
                    <span class="text-[9px] font-bold text-amber-300 uppercase">☑️ Backlog Task</span>
                    <p class="text-xs font-bold text-white truncate">${escapeHtml(ut.title)}</p>
                </div>
                <button type="button" class="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg shrink-0">+ My Day</button>
            `;
            d.querySelector('button').onclick = () => {
                ut.myDayDate = today;
                saveTodos();
                renderTodoListsBar();
                renderTodos();
                d.remove();
            };
            list.appendChild(d);
        });
    }
    modal.classList.remove('hidden');
});

document.getElementById('todo-suggestions-close-btn')?.addEventListener('click', () => {
    document.getElementById('todo-suggestions-modal')?.classList.add('hidden');
});

/* ==========================================================================
   8. 4-GRAPH MULTI-HORIZON PROGRESSION STUDIO (1W, 4W, 6M, 12M, 18M, 3Y)
   ========================================================================== */
window.computeTodoAndVaultProgression = function(horizonKey = '4w') {
    const horizonDaysMap = { '1w': 7, '4w': 28, '6m': 180, '12m': 365, '18m': 540, '3y': 1095 };
    const totalDays = horizonDaysMap[horizonKey] || 28;
    const bucketSize = totalDays <= 28 ? 1 : (totalDays <= 180 ? 7 : 30);

    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const now = new Date();
    const series = [];

    for (let i = totalDays - 1; i >= 0; i -= bucketSize) {
        let focusMins = 0;
        let deenMins = 0;
        let tasksCompleted = 0;
        let vaultCompleted = 0;
        let label = '';

        for (let b = 0; b < bucketSize && (i - b) >= 0; b++) {
            const d = new Date(now);
            d.setDate(d.getDate() - (i - b));
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (b === 0) label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            focusMins += (stats.history[iso]?.mins || 0);
            deenMins += (deenHistory[iso] || 0);
            tasksCompleted += todos.filter(t => t.completed && t.completedDate === iso).length;
            vaultCompleted += vaultTasks.filter(v => v.completed && (v.completedDate === iso || v.dateAdded === iso)).length;
        }
        series.push({ label, focusMins, deenMins, tasksCompleted, vaultCompleted });
    }
    return series;
};

function buildSvgLineChartCard(title, subtitle, dataPoints, colorHex, unitSuffix = '') {
    const vals = dataPoints.map(p => p.val);
    const maxVal = Math.max(1, ...vals);
    const totalVal = vals.reduce((a, b) => a + b, 0);
    const w = 360, h = 110, pad = 16;

    const pts = dataPoints.map((pt, idx) => {
        const x = pad + (idx / Math.max(1, dataPoints.length - 1)) * (w - pad * 2);
        const y = (h - pad) - (pt.val / maxVal) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const areaPts = `${pad},${h - pad} ${pts} ${w - pad},${h - pad}`;

    return `
        <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2 shadow-inner">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="text-xs font-extrabold text-white">${title}</h4>
                    <span class="text-[10px] text-slate-400">${subtitle}</span>
                </div>
                <span class="text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800" style="color:${colorHex}">Total: ${totalVal}${unitSuffix}</span>
            </div>
            <svg viewBox="0 0 ${w} ${h}" class="w-full h-28 overflow-visible">
                <polygon points="${areaPts}" fill="${colorHex}" fill-opacity="0.14"></polygon>
                <polyline fill="none" stroke="${colorHex}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${pts}"></polyline>
            </svg>
        </div>
    `;
}

window.openTodoAnalyticsModal = function(horizon = '4w') {
    let modal = document.getElementById('todo-multi-horizon-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'todo-multi-horizon-modal';
        modal.className = "hidden fixed inset-0 z-[10060] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4";
        document.body.appendChild(modal);
    }

    const series = window.computeTodoAndVaultProgression(horizon);
    const horizons = [
        { k: '1w', l: '1 Week' },
        { k: '4w', l: '4 Weeks' },
        { k: '6m', l: '6 Months' },
        { k: '12m', l: '12 Months' },
        { k: '18m', l: '18 Months' },
        { k: '3y', l: '3 Years' }
    ];

    modal.innerHTML = `
        <div class="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl flex flex-col gap-4">
            <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-3">
                <div>
                    <span class="text-[9px] font-mono uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-extrabold">📈 Multi-Horizon Telemetry</span>
                    <h3 class="text-base sm:text-lg font-extrabold text-white mt-1">4-Graph Task, Study, Vault & Deen Progression</h3>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                    ${horizons.map(h => `
                        <button type="button" onclick="window.openTodoAnalyticsModal('${h.k}')" class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition-all ${
                            horizon === h.k ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }">${h.l}</button>
                    `).join('')}
                    <button type="button" onclick="document.getElementById('todo-multi-horizon-modal').classList.add('hidden')" class="ml-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg text-xs font-bold">✕</button>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                ${buildSvgLineChartCard('1. PomoTasks Completed', 'Finished tasks & recurring habits', series.map(s => ({ label: s.label, val: s.tasksCompleted })), '#3b82f6', '')}
                ${buildSvgLineChartCard('2. Deep Study Focus Minutes', 'Logged Pomodoro & Stopwatch study', series.map(s => ({ label: s.label, val: s.focusMins })), '#ff6347', 'm')}
                ${buildSvgLineChartCard('3. Study Vault Revisions & Cards', 'Chapters & spaced repetition completed', series.map(s => ({ label: s.label, val: s.vaultCompleted })), '#a855f7', '')}
                ${buildSvgLineChartCard('4. Deen & Salah Barakah Minutes', 'Salah + Quran + Dhikr consistency', series.map(s => ({ label: s.label, val: s.deenMins })), '#10b981', 'm')}
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
};

/* ==========================================================================
   9. GLOBAL APP THEME, DESKTOP UI SCALE & STATS DASHBOARD
   ========================================================================== */
function mountProfileAppThemeAndHardwareCard() {
    const profilePage = document.getElementById('page-profile');
    if (!profilePage || document.getElementById('global-desktop-theme-card')) return;

    const card = document.createElement('div');
    card.id = 'global-desktop-theme-card';
    card.className = "bg-slate-900 p-5 rounded-3xl border border-indigo-500/30 shadow-xl flex flex-col gap-3";
    card.innerHTML = `
        <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2.5">
            <div>
                <h3 class="text-sm font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2">🖥️ Global App Theme, Desktop Scale & Offline Vault Backup</h3>
                <p class="text-[11px] text-slate-400">Customize workspace skin, desktop font/UI zoom, or export/restore your entire 11-module local database.</p>
            </div>
            <div class="flex items-center gap-2">
                <button type="button" onclick="window.exportFullWorkspaceBackupJson()" class="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all">💾 Export Full Backup (.JSON)</button>
                <label class="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 font-extrabold px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all">
                    📂 Restore Backup
                    <input type="file" accept=".json" class="hidden" onchange="if(this.files[0]) window.importFullWorkspaceBackupJson(this.files[0])">
                </label>
            </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-6 gap-2">
            ${[
                { id: 'slate', label: '🌑 Slate Pro' },
                { id: 'amoled', label: '🖤 OLED Pitch' },
                { id: 'emerald', label: '🕌 Emerald Masjid' },
                { id: 'sepia', label: '📜 Warm Paper' },
                { id: 'muddy-dark', label: '🪵 Muddy Dark' },
                { id: 'daylight', label: '☀️ Daylight' }
            ].map(t => `
                <button type="button" onclick="window.applyGlobalAppTheme('${t.id}')" class="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-slate-200 font-bold py-2 px-2.5 rounded-xl text-xs transition-all">${t.label}</button>
            `).join('')}
        </div>
    `;
    profilePage.insertBefore(card, profilePage.firstChild);
}

window.renderStats = function() {
    mountProfileAppThemeAndHardwareCard();
    const today = getLocalTodayString();
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const todayStudy = getTodayStudyMinutes();
    const todayDeen = getTodayDeenMinutes();
    const todaySessions = stats.history[today]?.sessions || 0;

    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const m = (stats.history[iso]?.mins || 0) + (deenHistory[iso] || 0);
        if (m >= 15) streak++;
        else if (i > 0) break;
        d.setDate(d.getDate() - 1);
    }

    const elHours = document.getElementById('stat-today-hours');
    const elDeen = document.getElementById('stat-today-deen');
    const elSess = document.getElementById('stat-today-sessions');
    const elStreak = document.getElementById('stat-streak');

    if (elHours) elHours.textContent = (todayStudy / 60).toFixed(1);
    if (elDeen) elDeen.textContent = (todayDeen / 60).toFixed(1);
    if (elSess) elSess.textContent = todaySessions;
    if (elStreak) elStreak.textContent = `${streak} 🔥`;

    const chart = document.getElementById('weekly-chart');
    if (chart) {
        chart.innerHTML = '';
        const days = [];
        let maxM = 60;
        for (let i = 6; i >= 0; i--) {
            const dt = new Date();
            dt.setDate(dt.getDate() - i);
            const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
            const sM = i === 0 ? todayStudy : (stats.history[iso]?.mins || 0);
            const dM = i === 0 ? todayDeen : (deenHistory[iso] || 0);
            if (sM + dM > maxM) maxM = sM + dM;
            days.push({ label: dt.toLocaleDateString('en-US', { weekday: 'short' }), sM, dM });
        }

        days.forEach(day => {
            const sH = Math.round((day.sM / maxM) * 100);
            const dH = Math.round((day.dM / maxM) * 100);
            const col = document.createElement('div');
            col.className = "flex-1 flex flex-col items-center justify-end h-full gap-1";
            col.innerHTML = `
                <span class="text-[9px] font-mono text-slate-400">${day.sM + day.dM}m</span>
                <div class="w-full max-w-[32px] bg-slate-900 rounded-t-lg overflow-hidden flex flex-col justify-end border border-slate-800" style="height: 110px;">
                    <div class="w-full bg-emerald-500 transition-all" style="height: ${dH}%"></div>
                    <div class="w-full bg-tomato transition-all" style="height: ${sH}%"></div>
                </div>
                <span class="text-[10px] font-bold text-slate-400">${day.label}</span>
            `;
            chart.appendChild(col);
        });
    }
};

window.sendTelegramMessage = async function(text) {
    const token = document.getElementById('tg-bot-token')?.value.trim() || safeGet('pomo_tg_token', '');
    const chatId = document.getElementById('tg-chat-id')?.value.trim() || safeGet('pomo_tg_chat', '');
    if (!token || !chatId) return showToast("Enter Telegram Bot Token & Chat ID first.", true);
    safeSet('pomo_tg_token', token);
    safeSet('pomo_tg_chat', chatId);
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
        });
        if (res.ok) showToast("✈️ Telegram dispatch sent!");
        else showToast("Telegram API rejected request.", true);
    } catch (e) {
        showToast("Network error contacting Telegram.", true);
    }
};

document.getElementById('test-tg-btn')?.addEventListener('click', () => {
    window.sendTelegramMessage(`🕌 *DeenTimeR Pro Telemetry*\nStudy Today: *${getTodayStudyMinutes()}m*\nDeen Today: *${getTodayDeenMinutes()}m*\nSalah: *${getTodaySalahDoneCount()}/5*`);
});

function renderCoachQuotesSettings() {
    const sEl = document.getElementById('custom-study-quotes');
    const bEl = document.getElementById('custom-break-quotes');
    if (sEl) sEl.value = studyQuotes.join('\n');
    if (bEl) bEl.value = breakQuotes.join('\n');
}

document.getElementById('save-quotes-btn')?.addEventListener('click', () => {
    const sLines = (document.getElementById('custom-study-quotes')?.value || '').split('\n').map(x => x.trim()).filter(Boolean);
    const bLines = (document.getElementById('custom-break-quotes')?.value || '').split('\n').map(x => x.trim()).filter(Boolean);
    if (sLines.length > 0) window.studyQuotes = sLines;
    if (bLines.length > 0) window.breakQuotes = bLines;
    safeSet('pages_pomodoro_study_quotes_v8', JSON.stringify(studyQuotes));
    safeSet('pages_pomodoro_break_quotes_v8', JSON.stringify(breakQuotes));
    showToast("Coach instructions saved!");
});

document.getElementById('reset-quotes-btn')?.addEventListener('click', () => {
    window.studyQuotes = [...defaultStudyQuotes];
    window.breakQuotes = [...defaultBreakQuotes];
    safeSet('pages_pomodoro_study_quotes_v8', JSON.stringify(studyQuotes));
    safeSet('pages_pomodoro_break_quotes_v8', JSON.stringify(breakQuotes));
    renderCoachQuotesSettings();
    showToast("Restored default coach quotes.");
});

document.getElementById('factory-reset-btn')?.addEventListener('click', () => {
    localStorage.clear();
    location.reload();
});

// Bootstrap Core Module
(function initPomoCore() {
    const stTargetEl = document.getElementById('cfg-study-target-mins');
    const dnTargetEl = document.getElementById('cfg-deen-target-mins');
    const frzEl = document.getElementById('cfg-salah-freeze-toggle');
    if (stTargetEl) stTargetEl.value = extCfg.studyTargetMins || 360;
    if (dnTargetEl) dnTargetEl.value = extCfg.deenTargetMins || 90;
    if (frzEl) frzEl.value = extCfg.salahFreezeEnabled ? 'on' : 'off';

    SALAH_KEYS.forEach(k => {
        const el = document.getElementById(`prayer-time-${k}`);
        if (el) el.value = (extCfg.prayerTimes && extCfg.prayerTimes[k]) || DEFAULT_PRAYERS[k];
    });

    const tgTok = document.getElementById('tg-bot-token');
    const tgChat = document.getElementById('tg-chat-id');
    if (tgTok) tgTok.value = safeGet('pomo_tg_token', '');
    if (tgChat) tgChat.value = safeGet('pomo_tg_chat', '');

    updateDayTabs();
    populateSettingsList();
    renderCoachQuotesSettings();
    renderHomeHUD();
    renderSalahStrip();
    renderSettingsSalahList();
    renderTodoListsBar();
    renderTodos();
    renderStats();
    evaluateDriftAndAlerts();

    const savedState = JSON.parse(safeGet('pages_pomodoro_state_v8', 'null'));
    if (savedState && Array.isArray(schedule) && schedule.length > 0) {
        window.currentStepIndex = Math.min(savedState.stepIndex || 0, Math.max(0, schedule.length - 1));
        window.accumulatedStudyTime = savedState.accStudy || 0;
        window.accumulatedDeenTime = savedState.accDeen || 0;
        window.isOvertime = !!savedState.isOvertime;
        if (savedState.isRunning && savedState.targetEnd) {
            const rem = Math.round((savedState.targetEnd - Date.now()) / 1000);
            window.timeLeft = rem <= 0 ? Math.abs(rem) : rem;
            window.isOvertime = rem <= 0;
            loadStep(currentStepIndex, true);
            startTimer(true);
        } else {
            window.timeLeft = savedState.savedTimeLeft || schedule[currentStepIndex]?.duration || 2700;
            loadStep(currentStepIndex, true);
        }
    } else {
        loadStep(0, false);
    }
})();
