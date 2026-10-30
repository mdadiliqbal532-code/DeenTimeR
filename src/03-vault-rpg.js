/* ==========================================================================
   MODULE 03: VAULT, COMPASS & POLYMATH MEMORY BEAST RPG (src/03-vault-rpg.js)
   100% Complete & Uncut:
   - 3-Tier Life Compass (Ultimate Target + Secondary Goal + 6 Side Quests + Numpad Date Picker)
   - Memory Beast FSRS-5 Spaced Repetition & Active Recall Flashcard Deck
   - Custom Multi-Field Subjects & Additive +4/-1 MCQ Batch Accuracy Engine
   - Advanced Analytical Profile Telemetry Studio
   - 4-Widget Omni-Command Bento Strip on Home Timer Page
   - 20-Rank Polymath & Memory Beast RPG Leveling, 5-Pillar Skill Tree & Weekly Boss Raid
   ========================================================================== */

let activeVaultSubmode = safeGet('pomo_vault_submode_v1', 'neet');
let currentVaultSubjectFilter = 'all';

function activateVaultSubview(mode) {
    activeVaultSubmode = mode;
    safeSet('pomo_vault_submode_v1', mode);

    const vCompass = document.getElementById('vault-view-compass');
    const vNeet = document.getElementById('vault-view-neet');
    const vRpg = document.getElementById('vault-view-rpg');

    vCompass?.classList.toggle('hidden', mode !== 'compass');
    vNeet?.classList.toggle('hidden', mode !== 'neet');
    vRpg?.classList.toggle('hidden', mode !== 'rpg');
    if (vRpg && mode === 'rpg') vRpg.classList.add('flex');

    const tabCompass = document.getElementById('vtab-compass');
    const tabNeet = document.getElementById('vtab-neet');
    const tabRpg = document.getElementById('vtab-rpg');

    if (tabCompass) {
        tabCompass.className = mode === 'compass'
            ? "flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 bg-indigo-600 text-white shadow-lg"
            : "flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white";
    }
    if (tabNeet) {
        tabNeet.className = mode === 'neet'
            ? "flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 bg-purple-600 text-white shadow-lg"
            : "flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white";
    }
    if (tabRpg) {
        tabRpg.className = mode === 'rpg'
            ? "flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 bg-amber-600 text-white shadow-lg"
            : "flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 text-slate-400 hover:text-white";
    }

    if (mode === 'compass') renderCompassView();
    if (mode === 'neet') renderTasks();
    if (mode === 'rpg') renderRpgArena();
}

document.getElementById('vtab-compass')?.addEventListener('click', () => activateVaultSubview('compass'));
document.getElementById('vtab-neet')?.addEventListener('click', () => activateVaultSubview('neet'));
document.getElementById('vtab-rpg')?.addEventListener('click', () => activateVaultSubview('rpg'));

/* ==========================================================================
   1. 3-TIER LIFE COMPASS & NUMPAD GOAL EDITOR
   ========================================================================== */
function getSmartGoalSuggestion(daysRem, tier = 'main') {
    if (daysRem <= 0) return "🚨 Target Day Arrived! Execute with calm Tawakkul & full focus.";
    if (daysRem <= 7) return "🔥 Final 7-Day Sprint: Focus strictly on high-yield revisions, active recall flashcards & mistake ledger.";
    if (daysRem <= 30) return "⚡ Critical 30-Day Window: Daily timed mock drills + FSRS spaced repetition reviews.";
    if (daysRem <= 90) return "🎯 90-Day Consolidation: Complete remaining syllabus blocks and lock in 50m Pomodoro cycles.";
    return tier === 'main'
        ? "🧭 Long-Horizon Mastery: Build relentless daily consistency across Study, Reading & Deen."
        : "🚀 Steady Momentum: Break this milestone into weekly PomoTasks and Study Vault chapters.";
}

window.renderCompassView = function() {
    const main = lifeCompass.main || { title: 'Master Target Goal', subtitle: 'High-Focus Milestone', date: '2026-05-03', start: '2025-05-01' };
    const mainDays = Math.max(0, calcDaysRemaining(main.date));
    const totalSpan = Math.max(1, Math.ceil((new Date(main.date + 'T00:00:00') - new Date((main.start || '2025-01-01') + 'T00:00:00')) / 86400000));
    const elapsed = Math.max(0, totalSpan - mainDays);
    const pct = Math.min(100, Math.max(2, Math.round((elapsed / totalSpan) * 100)));

    const elTitle = document.getElementById('comp-main-title');
    const elSub = document.getElementById('comp-main-sub');
    const elDate = document.getElementById('comp-main-date-badge');
    const elDays = document.getElementById('comp-main-days');
    const elBar = document.getElementById('comp-main-bar');
    const elSugg = document.getElementById('comp-main-suggestion');

    if (elTitle) elTitle.textContent = main.title;
    if (elSub) elSub.textContent = main.subtitle || 'Primary Life Horizon';
    if (elDate) elDate.textContent = `Target: ${formatDDMMYYYY(main.date)}`;
    if (elDays) elDays.textContent = mainDays;
    if (elBar) elBar.style.width = `${pct}%`;
    if (elSugg) elSugg.textContent = getSmartGoalSuggestion(mainDays, 'main');

    const sec = lifeCompass.secondary || { title: 'Secondary Goal', subtitle: 'Medium-Term Milestone', date: '2025-12-01' };
    const secDays = Math.max(0, calcDaysRemaining(sec.date));
    const sTitle = document.getElementById('comp-sec-title');
    const sSub = document.getElementById('comp-sec-sub');
    const sDays = document.getElementById('comp-sec-days');
    const sDate = document.getElementById('comp-sec-date');
    const sSugg = document.getElementById('comp-sec-suggestion');

    if (sTitle) sTitle.textContent = sec.title;
    if (sSub) sSub.textContent = sec.subtitle || 'Medium-Term Milestone';
    if (sDays) sDays.textContent = secDays;
    if (sDate) sDate.textContent = `Target: ${formatDDMMYYYY(sec.date)}`;
    if (sSugg) sSugg.textContent = getSmartGoalSuggestion(secDays, 'secondary');

    const sideGrid = document.getElementById('comp-sides-grid');
    const sideBadge = document.getElementById('side-goals-count-badge');
    const sides = Array.isArray(lifeCompass.sides) ? lifeCompass.sides : [];
    if (sideBadge) sideBadge.textContent = `${sides.length} / 6 Active`;

    if (sideGrid) {
        sideGrid.innerHTML = '';
        sides.forEach((sg, idx) => {
            const dRem = Math.max(0, calcDaysRemaining(sg.date));
            const card = document.createElement('div');
            card.className = "bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between gap-2 shadow-md transition-all";
            card.innerHTML = `
                <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0">
                        <span class="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-bold">⚡ Side Quest #${idx + 1}</span>
                        <h4 class="text-sm font-extrabold text-white truncate mt-0.5">${escapeHtml(sg.title)}</h4>
                        <p class="text-[11px] text-slate-400 truncate">${escapeHtml(sg.subtitle || 'Sprint Target')}</p>
                    </div>
                    <span class="text-xl font-extrabold font-mono text-emerald-400 shrink-0">${dRem}<small class="text-[9px] text-slate-500 ml-0.5">d</small></span>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                    <span>📅 ${formatDDMMYYYY(sg.date)}</span>
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="window.openGoalModal('side', ${idx})" class="text-blue-400 hover:text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">✏️ Edit</button>
                        <button type="button" onclick="window.deleteSideGoal(${idx})" class="text-red-400 hover:text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">✕</button>
                    </div>
                </div>
            `;
            sideGrid.appendChild(card);
        });
    }
};

window.deleteSideGoal = function(idx) {
    if (!Array.isArray(lifeCompass.sides)) return;
    lifeCompass.sides.splice(idx, 1);
    saveCompass();
    renderCompassView();
    renderOmniBentoStrip();
    broadcastToCloud();
};

let goalModalCtx = { tier: 'main', sideIdx: -1, mode: 'days', daysStr: '30', isoDate: getLocalTodayString() };

window.openGoalModal = function(tier = 'main', sideIdx = -1) {
    let targetObj = lifeCompass.main;
    if (tier === 'secondary') targetObj = lifeCompass.secondary;
    else if (tier === 'side') {
        if (sideIdx >= 0 && lifeCompass.sides[sideIdx]) {
            targetObj = lifeCompass.sides[sideIdx];
        } else {
            if ((lifeCompass.sides || []).length >= 6) return showToast("Maximum 6 Side Quests reached!", true);
            targetObj = { title: '', subtitle: '', date: addDaysToDateStr(getLocalTodayString(), 14) };
        }
    }

    const dRem = Math.max(1, calcDaysRemaining(targetObj.date || getLocalTodayString()));
    goalModalCtx = {
        tier,
        sideIdx,
        mode: 'days',
        daysStr: String(dRem),
        isoDate: targetObj.date || addDaysToDateStr(getLocalTodayString(), 30)
    };

    document.getElementById('goal-modal-heading').textContent =
        tier === 'main' ? '👑 Configure Ultimate Target' : (tier === 'secondary' ? '⚔️ Configure Secondary Goal' : '⚡ Configure Side Quest');
    document.getElementById('goal-inp-title').value = targetObj.title || '';
    document.getElementById('goal-inp-sub').value = targetObj.subtitle || '';

    syncPickerFromISO(goalModalCtx.isoDate);
    refreshGoalModalUI();
    document.getElementById('compass-goal-modal')?.classList.remove('hidden');
};

function syncPickerFromISO(isoStr) {
    goalModalCtx.isoDate = isoStr;
    const dRem = Math.max(0, calcDaysRemaining(isoStr));
    goalModalCtx.daysStr = String(dRem);
    const [y, m, d] = (isoStr || getLocalTodayString()).split('-');
    const ddEl = document.getElementById('goal-dd-inp');
    const mmEl = document.getElementById('goal-mm-inp');
    const yyEl = document.getElementById('goal-yyyy-inp');
    if (ddEl) ddEl.value = d || '01';
    if (mmEl) mmEl.value = m || '01';
    if (yyEl) yyEl.value = y || '2026';
}

function syncPickerFromDays(daysNum) {
    const safeD = Math.max(0, Math.min(3650, parseInt(daysNum) || 0));
    goalModalCtx.daysStr = String(safeD);
    goalModalCtx.isoDate = addDaysToDateStr(getLocalTodayString(), safeD);
    const [y, m, d] = goalModalCtx.isoDate.split('-');
    const ddEl = document.getElementById('goal-dd-inp');
    const mmEl = document.getElementById('goal-mm-inp');
    const yyEl = document.getElementById('goal-yyyy-inp');
    if (ddEl) ddEl.value = d;
    if (mmEl) mmEl.value = m;
    if (yyEl) yyEl.value = y;
}

function refreshGoalModalUI() {
    const isDays = goalModalCtx.mode === 'days';
    document.getElementById('goal-numpad-section')?.classList.toggle('hidden', !isDays);
    document.getElementById('goal-date-section')?.classList.toggle('hidden', isDays);

    const btnDays = document.getElementById('goal-mode-days-btn');
    const btnDate = document.getElementById('goal-mode-date-btn');
    if (btnDays && btnDate) {
        btnDays.className = isDays
            ? "px-3 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white"
            : "px-3 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white";
        btnDate.className = !isDays
            ? "px-3 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white"
            : "px-3 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-white";
    }

    document.getElementById('goal-days-display').textContent = goalModalCtx.daysStr || '0';
    document.getElementById('goal-computed-date-preview').textContent = `Target Date: ${formatDDMMYYYY(goalModalCtx.isoDate)}`;
    document.getElementById('goal-computed-days-preview').textContent = `${Math.max(0, calcDaysRemaining(goalModalCtx.isoDate))} Days Remaining`;
}

document.getElementById('goal-mode-days-btn')?.addEventListener('click', () => {
    goalModalCtx.mode = 'days';
    refreshGoalModalUI();
});
document.getElementById('goal-mode-date-btn')?.addEventListener('click', () => {
    goalModalCtx.mode = 'date';
    refreshGoalModalUI();
});

document.querySelectorAll('.goal-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const k = btn.dataset.k;
        let cur = goalModalCtx.daysStr === '0' ? '' : goalModalCtx.daysStr;
        if (k === 'C') cur = '0';
        else if (k === 'BS') cur = cur.slice(0, -1) || '0';
        else if (cur.length < 4) cur += k;
        syncPickerFromDays(parseInt(cur) || 0);
        refreshGoalModalUI();
    });
});

['goal-dd-inp', 'goal-mm-inp', 'goal-yyyy-inp'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
        const dd = String(Math.max(1, Math.min(31, parseInt(document.getElementById('goal-dd-inp')?.value) || 1))).padStart(2, '0');
        const mm = String(Math.max(1, Math.min(12, parseInt(document.getElementById('goal-mm-inp')?.value) || 1))).padStart(2, '0');
        const yy = String(Math.max(2024, Math.min(2040, parseInt(document.getElementById('goal-yyyy-inp')?.value) || 2026)));
        goalModalCtx.isoDate = `${yy}-${mm}-${dd}`;
        goalModalCtx.daysStr = String(Math.max(0, calcDaysRemaining(goalModalCtx.isoDate)));
        document.getElementById('goal-computed-days-preview').textContent = `${goalModalCtx.daysStr} Days Remaining`;
    });
});

document.getElementById('close-goal-modal-btn')?.addEventListener('click', () => {
    document.getElementById('compass-goal-modal')?.classList.add('hidden');
});

document.getElementById('save-goal-modal-btn')?.addEventListener('click', () => {
    const title = document.getElementById('goal-inp-title')?.value.trim() || 'Target Milestone';
    const subtitle = document.getElementById('goal-inp-sub')?.value.trim() || 'Focused Execution';
    const date = goalModalCtx.isoDate || getLocalTodayString();

    if (goalModalCtx.tier === 'main') {
        lifeCompass.main = { title, subtitle, date, start: lifeCompass.main?.start || getLocalTodayString() };
    } else if (goalModalCtx.tier === 'secondary') {
        lifeCompass.secondary = { title, subtitle, date };
    } else if (goalModalCtx.tier === 'side') {
        if (!Array.isArray(lifeCompass.sides)) lifeCompass.sides = [];
        if (goalModalCtx.sideIdx >= 0 && lifeCompass.sides[goalModalCtx.sideIdx]) {
            lifeCompass.sides[goalModalCtx.sideIdx] = { ...lifeCompass.sides[goalModalCtx.sideIdx], title, subtitle, date };
        } else {
            lifeCompass.sides.push({ id: 'sq_' + Date.now(), title, subtitle, date });
        }
    }

    saveCompass();
    renderCompassView();
    renderOmniBentoStrip();
    document.getElementById('compass-goal-modal')?.classList.add('hidden');
    broadcastToCloud();
    showToast("🧭 Life Compass Target Locked!");
});

/* ==========================================================================
   2. MEMORY BEAST FSRS-5 RETENTION ENGINE & CUSTOM SUBJECT STUDIO
   ========================================================================== */
window.computeMemoryRetentionPct = function(task) {
    if (!task) return 100;
    const stabilityDays = Math.max(1, parseFloat(task.stabilityDays) || (task.revCount ? task.revCount * 3.5 : 2.5));
    const lastRevDate = task.lastReviewedDate || task.dateAdded || getLocalTodayString();
    const elapsedDays = Math.max(0, -calcDaysRemaining(lastRevDate));
    const retention = Math.round(100 * Math.exp(-elapsedDays / (stabilityDays * 2.2)));
    return Math.max(12, Math.min(100, retention));
};

window.quickBoostMemoryStability = function(taskId, gradeMultiplier = 2.2) {
    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const t = tasks.find(x => String(x.id) === String(taskId));
    if (!t) return;
    const today = getLocalTodayString();
    t.revCount = (t.revCount || 0) + 1;
    t.lastReviewedDate = today;
    t.stabilityDays = Math.min(180, Math.round(((t.stabilityDays || 2) * gradeMultiplier) * 10) / 10);
    const nextInterval = Math.max(1, Math.round(t.stabilityDays));
    t.nextRev = addDaysToDateStr(today, nextInterval);
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
    renderTasks();
    renderOmniBentoStrip();
    PomoEventBus.emit('vault:updated');
    broadcastToCloud();
    showToast(`🧠 FSRS-5 Memory Boosted! Next review in +${nextInterval}d (Stability: ${t.stabilityDays}d)`);
};

function getCustomVaultSubjects() {
    try {
        const list = JSON.parse(safeGet('pomo_custom_vault_subjects_v1', 'null'));
        if (Array.isArray(list) && list.length > 0) return list;
    } catch (e) {}
    return [
        { id: 'Physics', icon: '⚡', label: 'Physics' },
        { id: 'Chemistry', icon: '🧪', label: 'Chemistry' },
        { id: 'Biology', icon: '🧬', label: 'Biology' },
        { id: 'Coding & CS', icon: '💻', label: 'Coding & CS' },
        { id: 'Tafsir & Deen', icon: '🕌', label: 'Tafsir & Deen' },
        { id: 'Literature', icon: '📖', label: 'Literature' }
    ];
}

function saveCustomVaultSubjects(list) {
    safeSet('pomo_custom_vault_subjects_v1', JSON.stringify(list));
}

function upgradeVaultAddFormUI() {
    const form = document.getElementById('task-form');
    if (!form || document.getElementById('vault-custom-subj-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'vault-custom-subj-bar';
    bar.className = "flex items-center justify-between gap-2 flex-wrap bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800 mb-3";
    form.parentElement.insertBefore(bar, form);
    renderCustomSubjectBar();
}

function renderCustomSubjectBar() {
    const bar = document.getElementById('vault-custom-subj-bar');
    const sel = document.getElementById('task-subj');
    const subjects = getCustomVaultSubjects();

    if (sel) {
        const currentVal = sel.value;
        sel.innerHTML = subjects.map(s => `<option value="${escapeHtml(s.id)}">${s.icon} ${escapeHtml(s.label)}</option>`).join('');
        if (currentVal && subjects.some(s => s.id === currentVal)) sel.value = currentVal;
    }

    if (!bar) return;
    bar.innerHTML = `
        <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
            <button type="button" onclick="window.setVaultSubjectFilter('all')" class="px-2.5 py-1 rounded-xl text-[10px] font-extrabold border transition-all ${
                currentVaultSubjectFilter === 'all' ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }">🌐 All Fields</button>
            ${subjects.map(s => `
                <button type="button" onclick="window.setVaultSubjectFilter('${escapeHtml(s.id)}')" class="px-2.5 py-1 rounded-xl text-[10px] font-extrabold border transition-all shrink-0 ${
                    currentVaultSubjectFilter === s.id ? 'bg-purple-600 text-white border-purple-400' : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                }">${s.icon} ${escapeHtml(s.label)}</button>
            `).join('')}
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="window.openManualFlashcardCreatorModal()" class="bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all">🃏 + Flashcard</button>
            <button type="button" onclick="window.openCustomSubjectModal()" class="bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all">➕ Subjects</button>
        </div>
    `;
}

window.setVaultSubjectFilter = function(subjId) {
    currentVaultSubjectFilter = subjId;
    renderCustomSubjectBar();
    renderTasks();
};

window.openCustomSubjectModal = function() {
    let modal = document.getElementById('vault-custom-subj-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'vault-custom-subj-modal';
        modal.className = "hidden fixed inset-0 z-[10060] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4";
        document.body.appendChild(modal);
    }
    const subjects = getCustomVaultSubjects();
    modal.innerHTML = `
        <div class="bg-slate-900 border border-purple-500/40 rounded-3xl p-5 w-full max-w-md shadow-2xl flex flex-col gap-3">
            <div class="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <h3 class="text-sm font-extrabold text-white">📚 Custom Study Fields & Subjects</h3>
                <button type="button" onclick="document.getElementById('vault-custom-subj-modal').classList.add('hidden')" class="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold">✕</button>
            </div>
            <div class="flex gap-2">
                <input type="text" id="new-vault-subj-icon" value="📘" class="w-12 bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-sm">
                <input type="text" id="new-vault-subj-name" placeholder="e.g. Anatomy, Calculus, Fiqh, AI..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white font-bold outline-none focus:border-purple-500">
                <button type="button" id="add-vault-subj-confirm-btn" class="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-3 py-2 rounded-xl text-xs">Add</button>
            </div>
            <div class="flex flex-col gap-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                ${subjects.map((s, idx) => `
                    <div class="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
                        <span class="font-bold text-white">${s.icon} ${escapeHtml(s.label)}</span>
                        <button type="button" onclick="window.removeCustomVaultSubj(${idx})" class="text-red-400 hover:text-white px-2 py-0.5 rounded bg-slate-900">✕</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
    document.getElementById('add-vault-subj-confirm-btn').onclick = () => {
        const icon = document.getElementById('new-vault-subj-icon')?.value.trim() || '📘';
        const label = document.getElementById('new-vault-subj-name')?.value.trim();
        if (!label) return;
        const list = getCustomVaultSubjects();
        list.push({ id: label, icon, label });
        saveCustomVaultSubjects(list);
        renderCustomSubjectBar();
        window.openCustomSubjectModal();
    };
};

window.removeCustomVaultSubj = function(idx) {
    const list = getCustomVaultSubjects();
    if (list.length <= 1) return showToast("Keep at least 1 subject.", true);
    list.splice(idx, 1);
    saveCustomVaultSubjects(list);
    renderCustomSubjectBar();
    window.openCustomSubjectModal();
};

window.openManualFlashcardCreatorModal = function(prefillSubj = '', prefillPrompt = '', prefillAnswer = '') {
    let modal = document.getElementById('manual-flashcard-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'manual-flashcard-modal';
        modal.className = "hidden fixed inset-0 z-[10065] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4";
        document.body.appendChild(modal);
    }
    const subjects = getCustomVaultSubjects();
    modal.innerHTML = `
        <div class="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 w-full max-w-md shadow-2xl flex flex-col gap-3">
            <div class="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <h3 class="text-sm font-extrabold text-amber-400">🃏 Create Active Recall Flashcard (FSRS-5)</h3>
                <button type="button" onclick="document.getElementById('manual-flashcard-modal').classList.add('hidden')" class="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold">✕</button>
            </div>
            <select id="fc-new-subj" class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white">
                ${subjects.map(s => `<option value="${escapeHtml(s.id)}" ${s.id === prefillSubj ? 'selected' : ''}>${s.icon} ${escapeHtml(s.label)}</option>`).join('')}
            </select>
            <textarea id="fc-new-front" rows="2" placeholder="Front Question / Cloze Prompt..." class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500">${escapeHtml(prefillPrompt)}</textarea>
            <textarea id="fc-new-back" rows="3" placeholder="Back Answer / Key Explanation / Formula..." class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-300 outline-none focus:border-emerald-500">${escapeHtml(prefillAnswer)}</textarea>
            <button type="button" id="fc-save-card-btn" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs shadow-lg">💾 Save to FSRS Flashcard Deck</button>
        </div>
    `;
    modal.classList.remove('hidden');
    document.getElementById('fc-save-card-btn').onclick = () => {
        const subj = document.getElementById('fc-new-subj')?.value || 'General';
        const front = document.getElementById('fc-new-front')?.value.trim();
        const back = document.getElementById('fc-new-back')?.value.trim();
        if (!front) return showToast("Enter a front prompt for the flashcard.", true);
        const cards = JSON.parse(safeGet('pomo_Highlight_flashcards_v1', '[]'));
        cards.unshift({
            id: 'fc_' + Date.now(),
            bookTitle: subj,
            page: 1,
            prompt: front,
            answer: back || 'Verified in Study Vault',
            dueDate: getLocalTodayString(),
            intervalDays: 1,
            ease: 2.5,
            reps: 0
        });
        safeSet('pomo_Highlight_flashcards_v1', JSON.stringify(cards));
        modal.classList.add('hidden');
        renderTasks();
        renderOmniBentoStrip();
        showToast("🃏 Flashcard added to FSRS-5 Active Recall Deck!");
    };
};

function createNewVaultTaskObject(subj, chap, act, revDays) {
    const today = getLocalTodayString();
    const rDays = parseInt(revDays) || 0;
    return {
        id: Date.now() + Math.floor(Math.random() * 1000),
        subj,
        chap,
        act,
        dateAdded: today,
        lastReviewedDate: today,
        stabilityDays: rDays > 0 ? rDays : 3,
        revCount: 1,
        nextRev: rDays > 0 ? addDaysToDateStr(today, rDays) : null,
        completed: false,
        plannedDurationMins: 50
    };
}

document.getElementById('task-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const subj = document.getElementById('task-subj').value;
    const chap = document.getElementById('task-chap').value.trim();
    const act = document.getElementById('task-act').value;
    const rev = document.getElementById('task-rev').value;
    if (!chap) return;

    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const newTask = createNewVaultTaskObject(subj, chap, act, rev);
    tasks.unshift(newTask);
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));

    document.getElementById('task-chap').value = '';
    renderTasks();
    renderOmniBentoStrip();
    PomoEventBus.emit('vault:updated');
    broadcastToCloud();
    showToast(`📚 Logged "${chap}" into Study Vault!`);
});

window.toggleTask = function(id) {
    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const t = tasks.find(x => String(x.id) === String(id));
    if (!t) return;
    const today = getLocalTodayString();
    t.completed = !t.completed;
    t.completedDate = t.completed ? today : null;
    if (t.completed) {
        t.revCount = (t.revCount || 1) + 1;
        t.lastReviewedDate = today;
        t.stabilityDays = Math.min(180, Math.round((t.stabilityDays || 3) * 1.8));
        t.nextRev = addDaysToDateStr(today, t.stabilityDays);
        if (window.playChime) window.playChime('todo');
    }
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
    renderTasks();
    renderOmniBentoStrip();
    PomoEventBus.emit('vault:updated');
    broadcastToCloud();
};

window.deleteTask = function(id) {
    let tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    tasks = tasks.filter(x => String(x.id) !== String(id));
    safeSet('pages_pomodoro_tasks_v8', JSON.stringify(tasks));
    renderTasks();
    renderOmniBentoStrip();
    PomoEventBus.emit('vault:updated');
    broadcastToCloud();
};

/* ==========================================================================
   3. STUDY VAULT CARDS, FSRS FLASHCARD DECK & ADDITIVE +4/-1 MCQ ENGINE
   ========================================================================== */
function mountAdditiveMcqBatchControls() {
    const attInp = document.getElementById('mcq-attempted');
    if (!attInp || document.getElementById('mcq-additive-batch-bar')) return;

    const card = attInp.closest('.bg-slate-900');
    if (!card) return;

    const batchBar = document.createElement('div');
    batchBar.id = 'mcq-additive-batch-bar';
    batchBar.className = "mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2";
    batchBar.innerHTML = `
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">➕ Quick Log MCQ Drill Batch:</span>
        <div class="flex items-center gap-1.5 flex-wrap">
            <input type="number" id="mcq-batch-att" placeholder="+Attempted" class="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white">
            <input type="number" id="mcq-batch-cor" placeholder="+Correct" class="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-emerald-400">
            <button type="button" id="mcq-batch-add-btn" class="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-2.5 py-1 rounded-lg text-[10px]">+ Add Batch</button>
        </div>
    `;
    card.appendChild(batchBar);

    document.getElementById('mcq-batch-add-btn')?.addEventListener('click', () => {
        const bAtt = Math.max(0, parseInt(document.getElementById('mcq-batch-att')?.value) || 0);
        const bCor = Math.max(0, parseInt(document.getElementById('mcq-batch-cor')?.value) || 0);
        if (bAtt <= 0) return;
        const validCor = Math.min(bAtt, bCor);
        document.getElementById('mcq-attempted').value = (parseInt(document.getElementById('mcq-attempted').value) || 0) + bAtt;
        document.getElementById('mcq-correct').value = (parseInt(document.getElementById('mcq-correct').value) || 0) + validCor;
        document.getElementById('mcq-batch-att').value = '';
        document.getElementById('mcq-batch-cor').value = '';
        updateMCQMath();
        showToast(`🎯 Added +${bAtt} MCQs (+${validCor} Correct) to Today's Ledger!`);
    });
}

window.loadMCQInputs = function() {
    mountAdditiveMcqBatchControls();
    const today = getLocalTodayString();
    const mcqData = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
    const todayMcq = mcqData[today] || { attempted: 0, correct: 0 };
    const attEl = document.getElementById('mcq-attempted');
    const corEl = document.getElementById('mcq-correct');
    if (attEl) attEl.value = todayMcq.attempted || 0;
    if (corEl) corEl.value = todayMcq.correct || 0;
    updateMCQMath(false);
};

window.updateMCQMath = function(shouldBroadcast = true) {
    const attEl = document.getElementById('mcq-attempted');
    const corEl = document.getElementById('mcq-correct');
    if (!attEl || !corEl) return;

    const att = Math.max(0, parseInt(attEl.value) || 0);
    const cor = Math.max(0, Math.min(att, parseInt(corEl.value) || 0));
    if (parseInt(corEl.value) > att) corEl.value = cor;

    const wrong = Math.max(0, att - cor);
    const netMarks = (cor * 4) - (wrong * 1);
    const acc = att > 0 ? Math.round((cor / att) * 100) : 0;

    const accBadge = document.getElementById('mcq-accuracy-badge');
    if (accBadge) {
        accBadge.textContent = `${acc}% Accuracy • Net: ${netMarks >= 0 ? '+' : ''}${netMarks} pts`;
    }

    const today = getLocalTodayString();
    const mcqData = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
    mcqData[today] = { attempted: att, correct: cor, netMarks };
    safeSet('pages_pomodoro_mcq_v8', JSON.stringify(mcqData));

    if (shouldBroadcast) {
        PomoEventBus.emit('mcq:updated');
        broadcastToCloud();
    }
};

document.getElementById('mcq-attempted')?.addEventListener('input', () => updateMCQMath(true));
document.getElementById('mcq-correct')?.addEventListener('input', () => updateMCQMath(true));

function createVaultItemCard(t, isDue = false) {
    const retPct = window.computeMemoryRetentionPct(t);
    const retColor = retPct >= 80 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40' : (retPct >= 55 ? 'text-amber-300 border-amber-500/40 bg-amber-950/40' : 'text-red-400 border-red-500/40 bg-red-950/40');

    const div = document.createElement('div');
    div.className = `p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 ${
        t.completed ? 'bg-slate-950/50 border-slate-800/70 opacity-60' : (isDue ? 'bg-slate-950 border-red-500/50 shadow-md' : 'bg-slate-950 border-slate-800 hover:border-purple-500/40')
    }`;

    div.innerHTML = `
        <div class="flex justify-between items-start gap-2">
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5 mb-1">
                    <span class="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-950/70 text-purple-300 border border-purple-700/40">${escapeHtml(t.subj)}</span>
                    <span class="text-[9px] font-mono px-1.5 py-0.5 rounded border ${retColor}">🧠 ${retPct}% Recall</span>
                    <span class="text-[9px] font-mono text-slate-400">${escapeHtml(t.act)}</span>
                </div>
                <h4 class="text-xs sm:text-sm font-extrabold ${t.completed ? 'line-through text-slate-500' : 'text-white'} break-words">${escapeHtml(t.chap)}</h4>
            </div>
            <button type="button" onclick="window.toggleTask('${t.id}')" class="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                t.completed ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-extrabold text-xs' : 'border-slate-700 hover:border-emerald-400 text-transparent'
            }">✓</button>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-400">
            <span>${t.nextRev ? `🔄 Next Rev: ${formatDDMMYYYY(t.nextRev)} (Rep #${t.revCount || 1})` : `Added: ${formatDDMMYYYY(t.dateAdded)}`}</span>
            <div class="flex items-center gap-1">
                <button type="button" onclick="window.openProtocolRunModal('vault', '${t.id}')" class="bg-blue-950/70 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 px-2 py-0.5 rounded-lg font-sans font-extrabold text-[10px]">⚡ Focus</button>
                <button type="button" onclick="window.quickBoostMemoryStability('${t.id}', 2.2)" title="FSRS-5 Recall Pass" class="bg-emerald-950/60 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 px-2 py-0.5 rounded-lg font-sans font-extrabold text-[10px]">🧠 +Recall</button>
                <button type="button" onclick="window.deleteTask('${t.id}')" class="text-red-400 hover:text-white bg-slate-900 px-2 py-0.5 rounded-lg">✕</button>
            </div>
        </div>
    `;
    return div;
}

window.gradeVaultFlashcardFSRS = function(cardId, grade) {
    const cards = JSON.parse(safeGet('pomo_Highlight_flashcards_v1', '[]'));
    const c = cards.find(x => String(x.id) === String(cardId));
    if (!c) return;
    const today = getLocalTodayString();
    c.reps = (c.reps || 0) + 1;

    if (grade === 'again') {
        c.intervalDays = 1;
        c.ease = Math.max(1.3, (c.ease || 2.5) - 0.2);
    } else if (grade === 'good') {
        c.intervalDays = Math.max(2, Math.round((c.intervalDays || 1) * (c.ease || 2.3)));
    } else if (grade === 'easy') {
        c.ease = Math.min(3.2, (c.ease || 2.5) + 0.15);
        c.intervalDays = Math.max(4, Math.round((c.intervalDays || 1) * c.ease * 1.3));
    }
    c.dueDate = addDaysToDateStr(today, c.intervalDays);
    safeSet('pomo_Highlight_flashcards_v1', JSON.stringify(cards));
    renderTasks();
    renderOmniBentoStrip();
    showToast(`🃏 Card scheduled for +${c.intervalDays}d!`);
};

window.deleteVaultFlashcard = function(cardId) {
    let cards = JSON.parse(safeGet('pomo_Highlight_flashcards_v1', '[]'));
    cards = cards.filter(x => String(x.id) !== String(cardId));
    safeSet('pomo_Highlight_flashcards_v1', JSON.stringify(cards));
    renderTasks();
    renderOmniBentoStrip();
};

window.renderTasks = function() {
    upgradeVaultAddFormUI();
    const revList = document.getElementById('revisions-due-list');
    const taskList = document.getElementById('tasks-list');
    if (!revList || !taskList) return;

    const today = getLocalTodayString();
    const allTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const filtered = currentVaultSubjectFilter === 'all'
        ? allTasks
        : allTasks.filter(t => t.subj === currentVaultSubjectFilter);

    const dueRevs = filtered.filter(t => !t.completed && t.nextRev && t.nextRev <= today);
    const regularTasks = filtered.filter(t => !dueRevs.includes(t));

    const revBadge = document.getElementById('rev-due-badge');
    if (revBadge) revBadge.textContent = `${dueRevs.length} Due`;

    revList.innerHTML = '';
    if (dueRevs.length === 0) {
        revList.innerHTML = `<div class="col-span-full p-4 text-center text-xs text-slate-400 bg-slate-950/50 rounded-2xl border border-slate-800/70">✨ Zero overdue FSRS revisions! Memory stability is locked in.</div>`;
    } else {
        dueRevs.forEach(t => revList.appendChild(createVaultItemCard(t, true)));
    }

    taskList.innerHTML = '';
    if (regularTasks.length === 0) {
        taskList.innerHTML = `<div class="col-span-full p-4 text-center text-xs text-slate-500 italic bg-slate-950/40 rounded-2xl border border-slate-800/60">No study chapters logged for this filter yet.</div>`;
    } else {
        regularTasks.forEach(t => taskList.appendChild(createVaultItemCard(t, false)));
    }

    // Mount FSRS Flashcard Deck below tasks-list
    let fcSection = document.getElementById('vault-fsrs-flashcard-deck');
    if (!fcSection && taskList.parentElement) {
        fcSection = document.createElement('div');
        fcSection.id = 'vault-fsrs-flashcard-deck';
        fcSection.className = "mt-5 pt-4 border-t border-slate-800 flex flex-col gap-3";
        taskList.parentElement.appendChild(fcSection);
    }
    if (fcSection) {
        const cards = JSON.parse(safeGet('pomo_Highlight_flashcards_v1', '[]'));
        const dueCards = cards.filter(c => !c.dueDate || c.dueDate <= today);
        fcSection.innerHTML = `
            <div class="flex justify-between items-center">
                <h4 class="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2">🃏 Active Recall & Highlight Flashcards (${dueCards.length} Due / ${cards.length} Total)</h4>
                <button type="button" onclick="window.openManualFlashcardCreatorModal()" class="text-[10px] font-extrabold bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 px-2.5 py-1 rounded-lg">+ New Card</button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                ${cards.slice(0, 8).map(c => `
                    <div class="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between gap-2">
                        <div>
                            <div class="flex justify-between items-center text-[9px] font-mono text-slate-400 mb-1">
                                <span class="text-amber-300 font-bold">📖 ${escapeHtml(c.bookTitle || 'Study Vault')}${c.page ? ` • p.${c.page}` : ''}</span>
                                <span>Due: ${formatDDMMYYYY(c.dueDate || today)}</span>
                            </div>
                            <p class="text-xs font-bold text-white">${escapeHtml(c.prompt)}</p>
                            <details class="mt-1.5 text-[11px] text-emerald-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800 cursor-pointer">
                                <summary class="font-bold text-slate-400 select-none">👁️ Reveal Answer</summary>
                                <p class="mt-1 text-emerald-300">${escapeHtml(c.answer || 'Reviewed')}</p>
                            </details>
                        </div>
                        <div class="flex items-center justify-between pt-1.5 border-t border-slate-900">
                            <div class="flex items-center gap-1">
                                <button type="button" onclick="window.gradeVaultFlashcardFSRS('${c.id}', 'again')" class="bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold">Again (1d)</button>
                                <button type="button" onclick="window.gradeVaultFlashcardFSRS('${c.id}', 'good')" class="bg-blue-950/60 hover:bg-blue-600 text-blue-300 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold">Good</button>
                                <button type="button" onclick="window.gradeVaultFlashcardFSRS('${c.id}', 'easy')" class="bg-emerald-950/60 hover:bg-emerald-600 text-emerald-300 hover:text-white px-2 py-0.5 rounded text-[9px] font-bold">Easy</button>
                            </div>
                            <button type="button" onclick="window.deleteVaultFlashcard('${c.id}')" class="text-[10px] text-slate-500 hover:text-red-400">✕</button>
                        </div>
                    </div>
                `).join('') || '<div class="col-span-full text-xs text-slate-500 italic p-3 bg-slate-950/40 rounded-xl border border-slate-800/50">Highlight text inside any book in PomoReader (🃏 Flashcard) or click "+ New Card" above.</div>'}
            </div>
        `;
    }
};
/* ==========================================================================
   4. ADVANCED ANALYTICAL PROFILE TELEMETRY STUDIO
   ========================================================================== */
window.renderAdvancedProfileTelemetry = function() {
    const profilePage = document.getElementById('page-profile');
    if (!profilePage) return;

    let card = document.getElementById('advanced-profile-telemetry-studio');
    if (!card) {
        card = document.createElement('div');
        card.id = 'advanced-profile-telemetry-studio';
        card.className = "bg-slate-900 p-5 rounded-3xl border border-emerald-500/30 shadow-xl flex flex-col gap-4";
        const weeklyChartCard = document.getElementById('weekly-chart')?.closest('.bg-slate-900');
        if (weeklyChartCard && weeklyChartCard.nextSibling) {
            profilePage.insertBefore(card, weeklyChartCard.nextSibling);
        } else {
            profilePage.appendChild(card);
        }
    }

    const tasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const mcqData = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
    const overtimeLedger = JSON.parse(safeGet('pomo_overtime_ledger_v1', '{}'));
    const today = getLocalTodayString();

    let totalAtt = 0, totalCor = 0, totalNetMarks = 0;
    Object.values(mcqData).forEach(d => {
        totalAtt += (d.attempted || 0);
        totalCor += (d.correct || 0);
        totalNetMarks += (d.netMarks !== undefined ? d.netMarks : ((d.correct || 0) * 4 - ((d.attempted || 0) - (d.correct || 0))));
    });
    const lifetimeAcc = totalAtt > 0 ? Math.round((totalCor / totalAtt) * 100) : 0;
    const avgRetention = tasks.length > 0
        ? Math.round(tasks.reduce((acc, t) => acc + window.computeMemoryRetentionPct(t), 0) / tasks.length)
        : 100;
    const todayOvertime = overtimeLedger[today] || 0;

    card.innerHTML = `
        <div class="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-3">
            <div>
                <h3 class="text-sm font-extrabold text-emerald-400 uppercase tracking-wider">🧬 Polymath & FSRS-5 Telemetry Studio</h3>
                <p class="text-[11px] text-slate-400">Real-time cross-module cognitive retention, +4/-1 MCQ precision & schedule drift diagnostics.</p>
            </div>
            <button type="button" onclick="window.openTodoAnalyticsModal('6m')" class="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all">📈 Open 4-Graph Horizon Studio</button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span class="text-[9px] font-bold uppercase text-purple-400 block">🧠 Avg Memory Retention</span>
                <span class="text-xl font-extrabold font-mono text-white">${avgRetention}%</span>
                <span class="text-[10px] text-slate-500 block">${tasks.length} Vault Chapters</span>
            </div>
            <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span class="text-[9px] font-bold uppercase text-blue-400 block">🎯 Lifetime MCQ Accuracy</span>
                <span class="text-xl font-extrabold font-mono text-white">${lifetimeAcc}%</span>
                <span class="text-[10px] text-slate-500 block">${totalCor}/${totalAtt} (${totalNetMarks >= 0 ? '+' : ''}${totalNetMarks} pts)</span>
            </div>
            <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span class="text-[9px] font-bold uppercase text-amber-400 block">⏳ Today's Overtime Drift</span>
                <span class="text-xl font-extrabold font-mono text-white">+${todayOvertime}m</span>
                <span class="text-[10px] text-slate-500 block">Count-Up Extra Focus</span>
            </div>
            <div class="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span class="text-[9px] font-bold uppercase text-emerald-400 block">☑️ Active My Day Tasks</span>
                <span class="text-xl font-extrabold font-mono text-white">${todos.filter(t => !t.completed && t.myDayDate === today).length}</span>
                <span class="text-[10px] text-slate-500 block">${todos.filter(t => t.completed && t.completedDate === today).length} Completed Today</span>
            </div>
        </div>
    `;
};

/* ==========================================================================
   5. 4-WIDGET OMNI-COMMAND BENTO STRIP ON HOME TIMER PAGE
   ========================================================================== */
window.renderOmniBentoStrip = function() {
    const rightCol = document.querySelector('#page-timer .cockpit-right');
    if (!rightCol) return;

    let strip = document.getElementById('home-omni-bento-strip');
    if (!strip) {
        strip = document.createElement('div');
        strip.id = 'home-omni-bento-strip';
        strip.className = "grid grid-cols-2 sm:grid-cols-4 gap-2";
        const liveProtoCard = document.getElementById('schedule-container')?.closest('.cockpit-card');
        if (liveProtoCard) {
            rightCol.insertBefore(strip, liveProtoCard);
        } else {
            rightCol.appendChild(strip);
        }
    }

    const today = getLocalTodayString();
    const myDayPending = todos.filter(t => !t.completed && t.myDayDate === today).length;
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const dueRevs = vaultTasks.filter(v => !v.completed && v.nextRev && v.nextRev <= today).length;
    const mainDays = Math.max(0, calcDaysRemaining(lifeCompass.main?.date || '2026-05-03'));
    const rpg = window.calculateLifetimeRPGStats ? window.calculateLifetimeRPGStats() : { level: 1, rankObj: { icon: '🌱', title: 'Novice' } };

    strip.innerHTML = `
        <button type="button" onclick="window.switchPage('page-todo')" class="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-2.5 text-left transition-all flex flex-col justify-between">
            <span class="text-[9px] font-bold uppercase text-blue-400">☀️ My Day</span>
            <span class="text-sm font-extrabold font-mono text-white mt-0.5">${myDayPending} Pending</span>
        </button>
        <button type="button" onclick="window.switchPage('page-tasks'); activateVaultSubview('neet');" class="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-2.5 text-left transition-all flex flex-col justify-between">
            <span class="text-[9px] font-bold uppercase text-purple-400">🔄 FSRS Vault</span>
            <span class="text-sm font-extrabold font-mono ${dueRevs > 0 ? 'text-red-400' : 'text-emerald-400'} mt-0.5">${dueRevs} Due Today</span>
        </button>
        <button type="button" onclick="window.switchPage('page-tasks'); activateVaultSubview('compass');" class="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-2.5 text-left transition-all flex flex-col justify-between">
            <span class="text-[9px] font-bold uppercase text-indigo-400">🧭 Target Horizon</span>
            <span class="text-sm font-extrabold font-mono text-white mt-0.5">${mainDays} Days</span>
        </button>
        <button type="button" onclick="window.switchPage('page-tasks'); activateVaultSubview('rpg');" class="bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-2.5 text-left transition-all flex flex-col justify-between">
            <span class="text-[9px] font-bold uppercase text-amber-400">${rpg.rankObj.icon} RPG Rank</span>
            <span class="text-sm font-extrabold font-mono text-amber-300 mt-0.5">LVL ${rpg.level}</span>
        </button>
    `;
};

/* ==========================================================================
   6. POLYMATH & MEMORY BEAST RPG LEVELING, 5-PILLAR SKILL TREE & BOSS RAID
   ========================================================================== */
const RPG_RANKS = [
    { minLvl: 1, icon: '🌱', title: 'Novice Seeker', perks: 'Base Focus Engine Unlocked' },
    { minLvl: 3, icon: '🕯️', title: 'Apprentice Reader', perks: '+5% Deep Reading XP Bonus' },
    { minLvl: 5, icon: '📜', title: 'Scribe of Discipline', perks: 'FSRS-5 Recall Multiplier Active' },
    { minLvl: 8, icon: '⚔️', title: 'Focus Vanguard', perks: 'Weekly Boss Raid Critical Strikes' },
    { minLvl: 12, icon: '🛡️', title: 'Guardian of Salah & Study', perks: 'Imaan Barakah Shield Active' },
    { minLvl: 16, icon: '🧠', title: 'Memory Beast Adept', perks: 'High-Retention Spaced Mastery' },
    { minLvl: 20, icon: '🏛️', title: 'Polymath Scholar', perks: 'Cross-Disciplinary Synthesis' },
    { minLvl: 25, icon: '👑', title: 'Grandmaster of Hikmah', perks: 'Elite Academic & Spiritual Mastery' },
    { minLvl: 35, icon: '🌌', title: 'Sovereign Polymath Legend', perks: 'Immortalized Peak Consistency' }
];

function getDayMetrics(isoDate) {
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const mcqData = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
    const readerDaily = JSON.parse(safeGet('pomo_reader_daily_mins_v1', '{}'));
    const sMins = stats.history[isoDate]?.mins || 0;
    const dMins = deenHistory[isoDate] || 0;
    const rMins = readerDaily[isoDate] || 0;
    const salahDone = SALAH_KEYS.filter(k => (salahLog[isoDate] || {})[k]).length;
    const mcq = mcqData[isoDate] || { attempted: 0, correct: 0 };
    return { sMins, dMins, rMins, salahDone, mcq };
}

window.calculateLifetimeRPGStats = function() {
    const stats = JSON.parse(safeGet('pages_pomodoro_stats_v8', '{"history":{}}'));
    const mcqData = JSON.parse(safeGet('pages_pomodoro_mcq_v8', '{}'));
    const vaultTasks = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]'));
    const readerDaily = JSON.parse(safeGet('pomo_reader_daily_mins_v1', '{}'));
    const flashcards = JSON.parse(safeGet('pomo_Highlight_flashcards_v1', '[]'));

    let totalStudyMins = 0;
    Object.values(stats.history || {}).forEach(h => { totalStudyMins += (h.mins || 0); });
    totalStudyMins += Math.floor((window.accumulatedStudyTime || 0) / 60);

    let totalDeenMins = 0;
    Object.values(deenHistory || {}).forEach(m => { totalDeenMins += (m || 0); });
    totalDeenMins += Math.floor((window.accumulatedDeenTime || 0) / 60);

    let totalSalahPrayed = 0;
    Object.values(salahLog || {}).forEach(dayObj => {
        SALAH_KEYS.forEach(k => { if (dayObj && dayObj[k]) totalSalahPrayed++; });
    });

    let totalMcqCor = 0, totalMcqAtt = 0;
    Object.values(mcqData || {}).forEach(m => {
        totalMcqCor += (m.correct || 0);
        totalMcqAtt += (m.attempted || 0);
    });

    let totalReaderMins = 0;
    Object.values(readerDaily || {}).forEach(m => { totalReaderMins += (m || 0); });

    const completedVault = vaultTasks.filter(v => v.completed).length;
    const totalRevs = vaultTasks.reduce((acc, v) => acc + (v.revCount || 1), 0);
    const completedTodos = todos.filter(t => t.completed).length;

    const focusXP = totalStudyMins * 10 + completedTodos * 45;
    const memoryXP = completedVault * 120 + totalRevs * 40 + flashcards.length * 35;
    const polymathXP = totalReaderMins * 12 + totalMcqCor * 8;
    const deenXP = totalDeenMins * 12 + totalSalahPrayed * 50;

    const totalXP = Math.max(0, focusXP + memoryXP + polymathXP + deenXP);
    const level = Math.max(1, Math.floor(Math.sqrt(totalXP / 250)) + 1);
    const prevLvlXP = Math.pow(level - 1, 2) * 250;
    const nextLvlXP = Math.pow(level, 2) * 250;
    const xpIntoLvl = totalXP - prevLvlXP;
    const xpNeededForNext = Math.max(100, nextLvlXP - prevLvlXP);
    const progressPct = Math.min(100, Math.round((xpIntoLvl / xpNeededForNext) * 100));

    let rankObj = RPG_RANKS[0];
    for (const r of RPG_RANKS) {
        if (level >= r.minLvl) rankObj = r;
    }

    return {
        totalXP,
        level,
        xpIntoLvl,
        xpNeededForNext,
        progressPct,
        rankObj,
        pillars: {
            focusLvl: Math.max(1, Math.floor(focusXP / 600) + 1),
            memoryLvl: Math.max(1, Math.floor(memoryXP / 500) + 1),
            polymathLvl: Math.max(1, Math.floor(polymathXP / 500) + 1),
            deenLvl: Math.max(1, Math.floor(deenXP / 500) + 1),
            precisionPct: totalMcqAtt > 0 ? Math.round((totalMcqCor / totalMcqAtt) * 100) : 100
        }
    };
};

function generateProDeveloperTacticalSuggestions(rpg) {
    const today = getLocalTodayString();
    const m = getDayMetrics(today);
    const tips = [];

    if (m.salahDone < 5) {
        tips.push(`🕌 **Spiritual Anchor:** Log all 5 daily Fard prayers (${m.salahDone}/5 today) to activate the +250 XP Imaan Barakah Shield.`);
    }
    if (m.sMins < 100) {
        tips.push(`🔥 **Deep Work Sprint:** You've logged ${m.sMins}m of study today. Launch two 50m Pomodoro cycles to deal +1,000 Boss Raid damage.`);
    }
    const vaultDue = JSON.parse(safeGet('pages_pomodoro_tasks_v8', '[]')).filter(v => !v.completed && v.nextRev && v.nextRev <= today).length;
    if (vaultDue > 0) {
        tips.push(`🧠 **FSRS-5 Memory Alert:** ${vaultDue} Study Vault chapter(s) are due for spaced recall today. Review them before decay sets in!`);
    }
    if (m.rMins < 20) {
        tips.push(`📚 **Polymath Reading:** Open PomoReader Pro for 20+ minutes of active book reading with bionic mode or highlights.`);
    }
    if (tips.length === 0) {
        tips.push(`👑 **Peak Execution:** All daily study, FSRS recall, reading, and Salah metrics are firing at Grandmaster pace!`);
    }
    return tips;
}

window.updateTopBarRpgBadge = function() {
    const rpg = window.calculateLifetimeRPGStats();
    const iconEl = document.getElementById('top-rpg-icon');
    const txtEl = document.getElementById('top-rpg-lvl');
    if (iconEl) iconEl.textContent = rpg.rankObj.icon;
    if (txtEl) txtEl.textContent = `LVL ${rpg.level}`;
};

window.renderRpgArena = function() {
    const rpg = window.calculateLifetimeRPGStats();
    window.updateTopBarRpgBadge();

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('rpg-avatar-emoji', rpg.rankObj.icon);
    setEl('rpg-lvl-pill', `LVL ${rpg.level}`);
    setEl('rpg-rank-badge', `RANK #${rpg.level}`);
    setEl('rpg-class-sub', `⚡ ${rpg.rankObj.perks}`);
    setEl('rpg-title-name', rpg.rankObj.title);
    setEl('rpg-xp-fraction', `${rpg.xpIntoLvl.toLocaleString()} / ${rpg.xpNeededForNext.toLocaleString()} XP`);
    setEl('rpg-next-unlock', `Next Rank Tier • Total Lifetime XP: ${rpg.totalXP.toLocaleString()}`);

    const xpBar = document.getElementById('rpg-xp-bar');
    if (xpBar) xpBar.style.width = `${rpg.progressPct}%`;

    // Weekly Boss Raid calculation
    let weeklyDmg = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dm = getDayMetrics(iso);
        weeklyDmg += (dm.sMins * 10) + (dm.dMins * 12) + (dm.rMins * 10) + (dm.salahDone * 60) + (dm.mcq.correct * 8);
    }
    const maxBossHp = Math.max(5000, rpg.level * 1200);
    const remBossHp = Math.max(0, maxBossHp - weeklyDmg);
    const bossPct = Math.round((remBossHp / maxBossHp) * 100);

    setEl('rpg-boss-name', remBossHp === 0 ? '🏆 Boss Vanquished: Lethargy Defeated!' : '🐉 Weekly Boss: The procrastination Leviathan');
    setEl('rpg-boss-hp-text', `${remBossHp.toLocaleString()} / ${maxBossHp.toLocaleString()} HP`);
    const bossBar = document.getElementById('rpg-boss-bar');
    if (bossBar) bossBar.style.width = `${bossPct}%`;
    setEl('rpg-boss-status', `Dealt ${weeklyDmg.toLocaleString()} DMG this week via Study, Reading, Salah & MCQs!`);

    // 5-Pillar Skill Tree & Tactical Suggestions
    const arenaCont = document.getElementById('vault-view-rpg');
    if (!arenaCont) return;

    let treeSec = document.getElementById('rpg-skill-tree-and-quests');
    if (!treeSec) {
        treeSec = document.createElement('div');
        treeSec.id = 'rpg-skill-tree-and-quests';
        treeSec.className = "flex flex-col gap-4";
        arenaCont.appendChild(treeSec);
    }

    const tips = generateProDeveloperTacticalSuggestions(rpg);
    treeSec.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div class="bg-slate-900 border border-tomato/30 rounded-2xl p-3 text-center">
                <span class="text-lg">🔥</span>
                <p class="text-[10px] font-bold uppercase text-slate-400 mt-1">Deep Focus</p>
                <p class="text-sm font-extrabold font-mono text-tomato">LVL ${rpg.pillars.focusLvl}</p>
            </div>
            <div class="bg-slate-900 border border-purple-500/30 rounded-2xl p-3 text-center">
                <span class="text-lg">🧠</span>
                <p class="text-[10px] font-bold uppercase text-slate-400 mt-1">Memory Beast</p>
                <p class="text-sm font-extrabold font-mono text-purple-400">LVL ${rpg.pillars.memoryLvl}</p>
            </div>
            <div class="bg-slate-900 border border-amber-500/30 rounded-2xl p-3 text-center">
                <span class="text-lg">📚</span>
                <p class="text-[10px] font-bold uppercase text-slate-400 mt-1">Polymath Reader</p>
                <p class="text-sm font-extrabold font-mono text-amber-400">LVL ${rpg.pillars.polymathLvl}</p>
            </div>
            <div class="bg-slate-900 border border-emerald-500/30 rounded-2xl p-3 text-center">
                <span class="text-lg">🕌</span>
                <p class="text-[10px] font-bold uppercase text-slate-400 mt-1">Imaan & Salah</p>
                <p class="text-sm font-extrabold font-mono text-emerald-400">LVL ${rpg.pillars.deenLvl}</p>
            </div>
            <div class="bg-slate-900 border border-blue-500/30 rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
                <span class="text-lg">🎯</span>
                <p class="text-[10px] font-bold uppercase text-slate-400 mt-1">MCQ Precision</p>
                <p class="text-sm font-extrabold font-mono text-blue-400">${rpg.pillars.precisionPct}%</p>
            </div>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <h4 class="text-xs font-extrabold uppercase tracking-wider text-amber-400">⚡ Tactical Polymath Quests & AI Coach Directives</h4>
            <div class="flex flex-col gap-1.5">
                ${tips.map(t => `<div class="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 text-xs text-slate-300">${t.replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>')}</div>`).join('')}
            </div>
        </div>
    `;
};

document.getElementById('top-rpg-badge')?.addEventListener('click', () => {
    window.switchPage('page-tasks');
    activateVaultSubview('rpg');
});

// EventBus Hooks & Bootstrap
PomoEventBus.on('stats:updated', () => {
    window.updateTopBarRpgBadge();
    window.renderOmniBentoStrip();
    window.renderAdvancedProfileTelemetry();
});
PomoEventBus.on('vault:updated', () => {
    window.updateTopBarRpgBadge();
    window.renderOmniBentoStrip();
    window.renderAdvancedProfileTelemetry();
});
PomoEventBus.on('todos:updated', () => {
    window.renderOmniBentoStrip();
    window.renderAdvancedProfileTelemetry();
});
PomoEventBus.on('salah:updated', () => {
    window.updateTopBarRpgBadge();
    window.renderOmniBentoStrip();
});

(function initVaultAndRpgModule() {
    loadMCQInputs();
    renderCompassView();
    renderTasks();
    renderRpgArena();
    renderOmniBentoStrip();
    renderAdvancedProfileTelemetry();
    activateVaultSubview(activeVaultSubmode || 'neet');
})();
