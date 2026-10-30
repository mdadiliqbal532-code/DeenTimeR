/* ==========================================================================
   MODULE 04: POMOREADER PRO ENGINE (src/04-pomo-reader.js)
   100% Complete & Uncut + Plug-and-Play Module Coordinator:
   - Exposes `window.PomoReaderCore` Registry so `05-pomo-doc.js` and `06-pomo-note.js`
     can attach/detach cleanly without breaking any core reader or shelf feature
   - Customizable 3D Wooden Bookshelf (Wood Themes, Books/Row, Shelf Height, Card Scale)
   - CRDT Wireless Sync, PDF vs .TXT Cloud Format Chooser & Real PDF-Lib Binary Baking
   - Full-Screen PDF/Book Reader, Pencil Studio, Image Occlusion, Bionic Reading,
     Dual-Book Split Viewer, Feynman Blur Recall, TTS Read Aloud & A1–A10 Control Center
   ========================================================================== */

if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/* ==========================================================================
   1. UNIFIED READER STATE, POLYMATH GENRES & PLUG-AND-PLAY MODULE BRIDGE
   ========================================================================== */
const POLYMATH_GENRES = [
    { id: 'medical', icon: '🩺', label: 'Medical & Biology' },
    { id: 'physics', icon: '⚡', label: 'Physics & Engineering' },
    { id: 'coding', icon: '💻', label: 'CS, AI & Coding' },
    { id: 'deen', icon: '🕌', label: 'Quran, Tafsir & Hadith' },
    { id: 'math', icon: '📐', label: 'Mathematics & Logic' },
    { id: 'philosophy', icon: '🏛️', label: 'History & Philosophy' },
    { id: 'literature', icon: '📜', label: 'Literature & Language' },
    { id: 'general', icon: '📘', label: 'General Non-Fiction' }
];

window.readerLibrary = [];
try {
    const rawLib = JSON.parse(safeGet('pomo_reader_library_v1', '[]'));
    if (Array.isArray(rawLib)) window.readerLibrary = rawLib;
} catch (e) { window.readerLibrary = []; }

window.customShelves = [];
try {
    const rawSh = JSON.parse(safeGet('pomo_reader_shelves_v1', 'null'));
    if (Array.isArray(rawSh) && rawSh.length > 0) window.customShelves = rawSh;
} catch (e) {}
if (!window.customShelves || window.customShelves.length === 0) {
    window.customShelves = [
        { id: 'all', name: 'All Books', icon: '📚', system: true },
        { id: 'reading', name: 'Currently Reading', icon: '🔥', system: true },
        { id: 'medical', name: 'Medical & Science', icon: '🧬', system: false },
        { id: 'deen', name: 'Deen & Hikmah', icon: '🕌', system: false },
        { id: 'completed', name: 'Finished Vault', icon: '🏆', system: true }
    ];
}

window.activeShelfId = safeGet('pomo_active_shelf_id_v1', 'all');
window.activeBook = null;
window.activePdfDoc = null;
window.activeTool = 'pan';
window.activeColor = '#facc15';
window.activeSize = 4;
window.readerZoom = 1.0;
window.activeBookTheme = safeGet('pomo_book_reading_theme_v1', 'night');
window.bionicReadingEnabled = safeGet('pomo_bionic_reading_v1', 'false') === 'true';
window.scannedInvertEnabled = false;
window.revealAllOcclusionsOnPage = false;
window.isOfficialTextSelectMode = true;
window.pomoMaxPageBufferWindow = parseInt(safeGet('pomo_ram_page_buffer_v1', '10')) || 10;

window.readerSettings = {
    booksPerRow: parseInt(safeGet('pomo_shelf_books_per_row', '4')) || 4,
    shelfHeightPx: parseInt(safeGet('pomo_shelf_height_px', '220')) || 220,
    cardScalePct: parseInt(safeGet('pomo_shelf_card_scale', '100')) || 100,
    woodTheme: safeGet('pomo_shelf_wood_theme', 'walnut'),
    pageTurnAnim: safeGet('pomo_reader_page_anim', 'moon'),
    pageTurnSound: safeGet('pomo_reader_page_sound', 'on') === 'on',
    preferredCloudFormat: safeGet('pomo_preferred_cloud_format_v1', 'ask')
};

window.readerDailyMins = {};
try {
    window.readerDailyMins = JSON.parse(safeGet('pomo_reader_daily_mins_v1', '{}')) || {};
} catch (e) { window.readerDailyMins = {}; }

let renderedCanvasPages = new Set();
let pageScrollObserver = null;
let undoAnnotationStack = [];
let activeSelectionContext = null;
let activeMainFolderHandle = null;

// Plug-and-Play Coordinator Registry for Detachable Modules (05-pomo-doc.js & 06-pomo-note.js)
window.PomoReaderCore = {
    modules: {},
    registerModule(name, apiObj) {
        this.modules[name] = apiObj || {};
        PomoEventBus.emit(`module:registered:${name}`, apiObj);
    },
    isModuleLoaded(name) {
        return !!this.modules[name];
    },
    getLibrary: () => window.readerLibrary,
    getActiveBook: () => window.activeBook,
    getActivePdfDoc: () => window.activePdfDoc,
    getActiveSelectionContext: () => activeSelectionContext,
    clearActiveSelectionContext: () => { activeSelectionContext = null; },
    getActiveTool: () => window.activeTool,
    setActiveTool: (t) => { window.activeTool = t; },
    getActiveColor: () => window.activeColor,
    getActiveSize: () => window.activeSize,
    pushUndoAction: (entry) => undoAnnotationStack.push(entry),
    saveReaderMeta: () => window.saveReaderMeta(),
    renderWoodenShelf: () => window.renderWoodenShelf(),
    openBookInReader: (id, p) => window.openBookInReader(id, p),
    jumpToReaderPage: (p, anim) => window.jumpToReaderPage(p, anim),
    updateSinglePageSvg: (p) => window.updateSinglePageSvg(p),
    syncSingleBookToAllSources: (b, silent) => window.syncSingleBookToAllSources(b, silent),
    importBookFileObject: (file, handle, opts) => window.importBookFileObject(file, handle, opts),
    computeBookFingerprint: (name, size, pages) => window.computeBookFingerprint(name, size, pages),
    classifyHeadingHierarchyLevel: (line, avgH, h) => window.classifyHeadingHierarchyLevel(line, avgH, h)
};

// Cross-Window BroadcastChannel Studio Bridge
window.PomoStudioBridge = {
    channel: (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('pomo_studio_bridge_v1') : null,
    sendSelectionToExternalStudio(payload) {
        if (this.channel) {
            try { this.channel.postMessage({ type: 'STUDIO_CLIP', payload, ts: Date.now() }); } catch (e) {}
        }
    }
};

window.saveReaderMeta = function() {
    const cleanLib = window.readerLibrary.map(b => {
        const copy = { ...b };
        delete copy.fileHandle;
        delete copy.runtimeBlobUrl;
        return copy;
    });
    safeSet('pomo_reader_library_v1', JSON.stringify(cleanLib));
    safeSet('pomo_reader_shelves_v1', JSON.stringify(window.customShelves));
    PomoEventBus.emit('reader:updated');
};

async function hydrateBookCoversAndHandles() {
    for (const book of window.readerLibrary) {
        try {
            const cov = await idbGet('covers', book.id);
            if (cov) book.coverDataUrl = cov;
            const fh = await idbGet('handles', 'book_handle_' + book.id);
            if (fh) book.fileHandle = fh;
        } catch (e) {}
    }
    const mainFh = await idbGet('handles', 'main_folder_handle');
    if (mainFh) {
        activeMainFolderHandle = mainFh;
        updateMainFolderUI(mainFh.name);
    }
    renderCustomShelvesBar();
    renderWoodenShelf();
    renderHomeReaderWidget();
}

function updateMainFolderUI(folderName) {
    const badge = document.getElementById('main-folder-status-badge');
    const txt = document.getElementById('main-folder-name-text');
    if (badge && txt && folderName) {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
        txt.textContent = folderName;
    }
}

/* ==========================================================================
   2. CRDT WIRELESS SYNC & LIGHTWEIGHT .TXT / PDF CLOUD LEDGER
   ========================================================================== */
window.setPreferredCloudUploadFormat = function(fmt) {
    window.readerSettings.preferredCloudFormat = fmt;
    safeSet('pomo_preferred_cloud_format_v1', fmt);
    showToast(`☁️ Cloud Upload Format set to: ${fmt.toUpperCase()}`);
};

window.buildLightweightBookTxtBuffer = function(book) {
    const header = {
        pomoTxtVersion: '17.2',
        id: book.id,
        title: book.title,
        totalPages: book.totalPages || 1,
        currentPage: book.currentPage || 1,
        genre: book.genre || 'general',
        chapters: book.chapters || [],
        bookmarks: book.bookmarks || [],
        annotations: book.annotations || {},
        pbookPages: book.pbookPages || []
    };
    const jsonStr = JSON.stringify(header, null, 2);
    return new Blob([`/* POMOREADER_STRUCTURED_TXT_V17 */\n` + jsonStr], { type: 'text/plain;charset=utf-8' });
};

window.parseLightweightBookTxtBuffer = async function(blobOrText) {
    const txt = typeof blobOrText === 'string' ? blobOrText : await blobOrText.text();
    const cleaned = txt.replace(/^\/\* POMOREADER_STRUCTURED_TXT_V17 \*\/\s*/, '');
    return JSON.parse(cleaned);
};

window.offloadBookBinaryToSaveLocalSpace = async function(bookId) {
    const book = window.readerLibrary.find(b => b.id === bookId);
    if (!book) return;
    await idbDelete('books', book.id);
    book.binaryOffloaded = true;
    saveReaderMeta();
    renderWoodenShelf();
    showToast(`🧹 Offloaded heavy PDF binary for "${book.title}". All highlights, notes & bookmarks are safely retained!`);
};

/* ==========================================================================
   3. HOME CONTINUE-READING WIDGET & INTERACTIVE DOCUMENT PIP MINI-COCKPIT
   ========================================================================== */
window.renderHomeReaderWidget = function() {
    const rightCol = document.querySelector('#page-timer .cockpit-right');
    if (!rightCol) return;

    let card = document.getElementById('home-reader-widget-card');
    if (!card) {
        card = document.createElement('div');
        card.id = 'home-reader-widget-card';
        card.className = "bg-slate-950/90 p-3 rounded-2xl border border-amber-500/30 shadow-lg flex items-center justify-between gap-3";
        rightCol.appendChild(card);
    }

    const recentBook = [...window.readerLibrary].sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))[0];
    if (!recentBook) {
        card.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-xl">📚</span>
                <div class="min-w-0">
                    <h4 class="text-xs font-extrabold text-amber-400 uppercase tracking-wider">PomoReader Pro Library</h4>
                    <p class="text-[11px] text-slate-400 truncate">Import PDFs or folders to track pages alongside your study timer.</p>
                </div>
            </div>
            <button type="button" onclick="window.switchPage('page-books')" class="bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs shrink-0">Open Shelf</button>
        `;
        return;
    }

    const pct = Math.min(100, Math.round(((recentBook.currentPage || 1) / Math.max(1, recentBook.totalPages || 1)) * 100));
    card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-9 h-12 rounded-lg bg-slate-900 border border-amber-500/40 overflow-hidden shrink-0 flex items-center justify-center text-sm">
                ${recentBook.coverDataUrl ? `<img src="${recentBook.coverDataUrl}" class="w-full h-full object-cover">` : '📖'}
            </div>
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                    <span class="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-extrabold">🔥 Continue Reading (${pct}%)</span>
                </div>
                <h4 class="text-xs font-extrabold text-white truncate">${escapeHtml(recentBook.title)}</h4>
                <span class="text-[10px] font-mono text-slate-400">Page ${recentBook.currentPage || 1} of ${recentBook.totalPages || 1}</span>
            </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="window.switchPage('page-books'); window.openBookInReader('${recentBook.id}', ${recentBook.currentPage || 1});" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs shadow">📖 Resume</button>
        </div>
    `;
};

window.launchPipMiniCockpitWidget = async function() {
    if ('documentPictureInPicture' in window) {
        try {
            const pipWin = await window.documentPictureInPicture.requestWindow({ width: 320, height: 170 });
            pipWin.document.body.style.cssText = 'margin:0;background:#020617;color:#f8fafc;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;text-align:center;';
            const renderPip = () => {
                if (pipWin.closed) return;
                const tStr = document.getElementById('time-display')?.textContent || '25:00';
                const sTitle = document.getElementById('session-type')?.textContent || 'Focus Session';
                pipWin.document.body.innerHTML = `
                    <div style="font-size:11px;color:#38bdf8;font-weight:bold;margin-bottom:4px;max-width:95%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(sTitle)}</div>
                    <div style="font-size:40px;font-weight:900;color:#10b981;line-height:1;">${tStr}</div>
                    <div style="display:flex;gap:8px;margin-top:10px;">
                        <button id="pip-toggle" style="background:#2563eb;color:#fff;border:none;padding:5px 12px;border-radius:8px;font-weight:bold;cursor:pointer;">${window.isRunning ? '⏸ Pause' : '▶ Start'}</button>
                        <button id="pip-done" style="background:#059669;color:#fff;border:none;padding:5px 12px;border-radius:8px;font-weight:bold;cursor:pointer;">✓ Done</button>
                    </div>
                `;
                pipWin.document.getElementById('pip-toggle').onclick = () => {
                    if (window.isRunning) window.stopTimer(); else window.startTimer();
                    renderPip();
                };
                pipWin.document.getElementById('pip-done').onclick = () => {
                    window.completeSession();
                    renderPip();
                };
            };
            renderPip();
            const iv = setInterval(() => { if (pipWin.closed) clearInterval(iv); else renderPip(); }, 1000);
            return;
        } catch (e) {}
    }
    showToast("📌 Mini Timer HUD stays pinned at the top-right while reading!");
};

/* ==========================================================================
   4. SMART BOOK IMPORT + 3-TIER CHAPTER/TOPIC/SUBTOPIC AUTO-DETECTOR
   ========================================================================== */
window.computeBookFingerprint = function(name, size, totalPages) {
    const clean = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `fp_${clean}_${size || 0}_${totalPages || 0}`;
};

window.classifyHeadingHierarchyLevel = function(lineText, avgFontHeight = 11, lineFontHeight = 14) {
    const clean = String(lineText || '').trim();
    if (!clean || clean.length > 130) return null;
    if (/^(chapter|unit|part|module|section|book)\s+(\d+|[ivxlcdm]+|[a-z])\b/i.test(clean)) return 1;
    if (/^\d+\.\s+[A-Z]/.test(clean) && lineFontHeight >= avgFontHeight * 1.22) return 1;
    if (/^\d+\.\d+\s+\S/.test(clean) || lineFontHeight >= avgFontHeight * 1.15) return 2;
    if (/^\d+\.\d+\.\d+\s+\S/.test(clean) || /^[A-Z][A-Za-z0-9\s\-:]{3,55}$/.test(clean) && lineFontHeight >= avgFontHeight * 1.08) return 3;
    return null;
};

async function generatePdfCoverAndMeta(arrayBuffer) {
    if (!window.pdfjsLib) return { totalPages: 1, coverDataUrl: null, autoChapters: [] };
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
    const totalPages = pdf.numPages || 1;
    let coverDataUrl = null;
    const autoChapters = [];

    try {
        const page1 = await pdf.getPage(1);
        const vp = page1.getViewport({ scale: 0.45 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page1.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        coverDataUrl = canvas.toDataURL('image/jpeg', 0.72);
    } catch (e) {}

    try {
        const outline = await pdf.getOutline();
        if (Array.isArray(outline) && outline.length > 0) {
            for (const item of outline.slice(0, 80)) {
                let pageNum = 1;
                try {
                    if (item.dest) {
                        const dest = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest;
                        if (Array.isArray(dest) && dest[0]) {
                            pageNum = (await pdf.getPageIndex(dest[0])) + 1;
                        }
                    }
                } catch (e) {}
                autoChapters.push({ title: item.title || 'Section', page: pageNum, level: 1 });
            }
        }
    } catch (e) {}

    return { totalPages, coverDataUrl, autoChapters };
}

window.importBookFileObject = async function(file, fileHandle = null, options = {}) {
    if (!file) return null;
    const isPbook = file.name.toLowerCase().endsWith('.pbook') || file.name.toLowerCase().endsWith('.txt');

    if (isPbook && !file.name.toLowerCase().endsWith('.pdf')) {
        try {
            const parsed = await window.parseLightweightBookTxtBuffer(file);
            if (parsed && parsed.title) {
                const existing = window.readerLibrary.find(b => b.id === parsed.id || b.title === parsed.title);
                if (existing) {
                    existing.annotations = { ...existing.annotations, ...(parsed.annotations || {}) };
                    existing.bookmarks = parsed.bookmarks || existing.bookmarks;
                    existing.chapters = parsed.chapters || existing.chapters;
                    if (Array.isArray(parsed.pbookPages) && parsed.pbookPages.length > 0) {
                        existing.isConvertedPbook = true;
                        existing.pbookPages = parsed.pbookPages;
                    }
                    saveReaderMeta();
                    renderWoodenShelf();
                    showToast(`🔄 Merged .PBOOK/TXT data into "${existing.title}"!`);
                    return existing;
                }
            }
        } catch (e) {}
    }

    const buf = await file.arrayBuffer();
    const { totalPages, coverDataUrl, autoChapters } = await generatePdfCoverAndMeta(buf);
    const fp = window.computeBookFingerprint(file.name, file.size, totalPages);

    const existingDup = window.readerLibrary.find(b => b.fingerprint === fp || (b.title === file.name.replace(/\.pdf$/i, '') && b.totalPages === totalPages));
    if (existingDup) {
        await idbPut('books', existingDup.id, buf);
        existingDup.binaryOffloaded = false;
        if (fileHandle) {
            existingDup.fileHandle = fileHandle;
            await idbPut('handles', 'book_handle_' + existingDup.id, fileHandle);
        }
        saveReaderMeta();
        renderWoodenShelf();
        showToast(`📚 Linked local PDF binary to existing book "${existingDup.title}" (0 duplicates created).`);
        return existingDup;
    }

    const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const cleanTitle = file.name.replace(/\.(pdf|pbook|txt)$/i, '');
    const newBook = {
        id: bookId,
        title: cleanTitle,
        fileName: file.name,
        fileSize: file.size || buf.byteLength,
        fingerprint: fp,
        totalPages,
        currentPage: 1,
        shelfId: (window.activeShelfId && window.activeShelfId !== 'all') ? window.activeShelfId : 'reading',
        genre: options.genre || 'general',
        priority: options.priority || 1,
        sequenceOrder: window.readerLibrary.length + 1,
        dateAdded: getLocalTodayString(),
        lastOpened: Date.now(),
        coverDataUrl,
        chapters: autoChapters,
        bookmarks: [],
        annotations: {},
        notes: []
    };

    await idbPut('books', bookId, buf);
    if (coverDataUrl) await idbPut('covers', bookId, coverDataUrl);
    if (fileHandle) {
        newBook.fileHandle = fileHandle;
        await idbPut('handles', 'book_handle_' + bookId, fileHandle);
    }

    window.readerLibrary.unshift(newBook);
    saveReaderMeta();
    renderCustomShelvesBar();
    renderWoodenShelf();
    renderHomeReaderWidget();
    return newBook;
};

async function handleMultipleBookImport(fileList) {
    const files = Array.from(fileList || []).filter(f => /\.(pdf|pbook|txt)$/i.test(f.name));
    if (files.length === 0) return showToast("Please select valid .PDF or .PBOOK files.", true);
    showToast(`📥 Importing ${files.length} book(s) into 3D Wooden Shelf...`);
    for (const f of files) {
        await window.importBookFileObject(f);
    }
    showToast(`✅ Imported ${files.length} book(s) onto your Wooden Bookshelf!`);
}

document.getElementById('import-book-btn')?.addEventListener('click', () => {
    document.getElementById('pdf-file-input')?.click();
});
document.getElementById('pdf-file-input')?.addEventListener('change', (e) => {
    if (e.target.files?.length) handleMultipleBookImport(e.target.files);
    e.target.value = '';
});
document.getElementById('pdf-folder-input')?.addEventListener('change', (e) => {
    if (e.target.files?.length) handleMultipleBookImport(e.target.files);
    e.target.value = '';
});

window.pickAndScanMainFolder = async function() {
    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            activeMainFolderHandle = dirHandle;
            await idbPut('handles', 'main_folder_handle', dirHandle);
            updateMainFolderUI(dirHandle.name);
            let count = 0;
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && /\.pdf$/i.test(entry.name)) {
                    const file = await entry.getFile();
                    await window.importBookFileObject(file, entry);
                    count++;
                }
            }
            showToast(`📁 Synced "${dirHandle.name}" (${count} PDFs linked)!`);
            return;
        } catch (e) {}
    }
    document.getElementById('pdf-folder-input')?.click();
};

document.getElementById('set-main-folder-btn')?.addEventListener('click', window.pickAndScanMainFolder);
document.getElementById('rescan-folder-btn')?.addEventListener('click', window.pickAndScanMainFolder);

/* ==========================================================================
   5. CUSTOMIZABLE 3D WOODEN BOOKSHELF CONTROLLER
   ========================================================================== */
function applyShelfCapacityCssVariables() {
    document.documentElement.style.setProperty('--shelf-books-per-row', window.readerSettings.booksPerRow || 4);
    document.documentElement.style.setProperty('--shelf-row-min-height', (window.readerSettings.shelfHeightPx || 220) + 'px');
    document.documentElement.style.setProperty('--shelf-card-scale', ((window.readerSettings.cardScalePct || 100) / 100).toFixed(2));
}

window.updateShelfGridCapacity = function(field, val) {
    const num = parseInt(val) || 4;
    if (field === 'cols') {
        window.readerSettings.booksPerRow = Math.max(2, Math.min(8, num));
        safeSet('pomo_shelf_books_per_row', window.readerSettings.booksPerRow);
    } else if (field === 'height') {
        window.readerSettings.shelfHeightPx = Math.max(150, Math.min(340, num));
        safeSet('pomo_shelf_height_px', window.readerSettings.shelfHeightPx);
    } else if (field === 'scale') {
        window.readerSettings.cardScalePct = Math.max(75, Math.min(125, num));
        safeSet('pomo_shelf_card_scale', window.readerSettings.cardScalePct);
    }
    applyShelfCapacityCssVariables();
    renderWoodenShelf();
};

window.applyWoodThemeStyle = function(themeId) {
    window.readerSettings.woodTheme = themeId;
    safeSet('pomo_shelf_wood_theme', themeId);
    renderWoodenShelf();
};

window.renderCustomShelvesBar = function() {
    const bar = document.getElementById('custom-shelves-bar');
    if (!bar) return;
    bar.innerHTML = '';

    window.customShelves.forEach(sh => {
        let count = 0;
        if (sh.id === 'all') count = window.readerLibrary.length;
        else if (sh.id === 'reading') count = window.readerLibrary.filter(b => b.shelfId === 'reading' || (b.currentPage > 1 && b.currentPage < b.totalPages)).length;
        else if (sh.id === 'completed') count = window.readerLibrary.filter(b => b.shelfId === 'completed' || (b.totalPages > 1 && b.currentPage >= b.totalPages)).length;
        else count = window.readerLibrary.filter(b => b.shelfId === sh.id).length;

        const isAct = window.activeShelfId === sh.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 border transition-all ${
            isAct
                ? 'bg-amber-600 text-slate-950 border-amber-400 shadow-md'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border-slate-800'
        }`;
        btn.innerHTML = `<span>${sh.icon || '📚'}</span><span>${escapeHtml(sh.name)}</span><span class="text-[10px] font-mono px-1.5 rounded-full ${isAct ? 'bg-amber-950/60 text-amber-200' : 'bg-slate-950 text-slate-400'}">${count}</span>`;
        btn.onclick = () => {
            window.activeShelfId = sh.id;
            safeSet('pomo_active_shelf_id_v1', sh.id);
            renderCustomShelvesBar();
            renderWoodenShelf();
        };
        bar.appendChild(btn);
    });
};

window.renderWoodenShelf = function() {
    applyShelfCapacityCssVariables();
    const cabinet = document.getElementById('wooden-bookshelf-cabinet');
    if (!cabinet) return;

    cabinet.className = `wooden-cabinet wood-theme-${window.readerSettings.woodTheme || 'walnut'} rounded-2xl p-3 sm:p-5 shadow-2xl border-4 border-[#3e2415] min-h-[380px] flex flex-col justify-between gap-6`;

    const query = (document.getElementById('book-shelf-search')?.value || '').trim().toLowerCase();
    const sortMode = document.getElementById('shelf-sort-select')?.value || 'priority';

    let books = window.readerLibrary.filter(b => {
        if (query && !b.title.toLowerCase().includes(query)) return false;
        if (window.activeShelfId === 'all') return true;
        if (window.activeShelfId === 'reading') return b.shelfId === 'reading' || (b.currentPage > 1 && b.currentPage < b.totalPages);
        if (window.activeShelfId === 'completed') return b.shelfId === 'completed' || (b.totalPages > 1 && b.currentPage >= b.totalPages);
        return b.shelfId === window.activeShelfId;
    });

    if (sortMode === 'priority') books.sort((a, b) => (a.sequenceOrder || 999) - (b.sequenceOrder || 999));
    else if (sortMode === 'recent') books.sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
    else if (sortMode === 'progress') books.sort((a, b) => ((b.currentPage || 1) / (b.totalPages || 1)) - ((a.currentPage || 1) / (a.totalPages || 1)));
    else if (sortMode === 'alpha') books.sort((a, b) => a.title.localeCompare(b.title));

    const statCount = document.getElementById('shelf-stat-count');
    const statPages = document.getElementById('shelf-stat-pages');
    if (statCount) statCount.textContent = `${window.readerLibrary.length} Books`;
    if (statPages) {
        const totalRead = window.readerLibrary.reduce((acc, b) => acc + Math.max(0, (b.currentPage || 1) - 1), 0);
        statPages.textContent = `${totalRead} Pages Read`;
    }

    cabinet.innerHTML = '';
    const perRow = Math.max(2, window.readerSettings.booksPerRow || 4);

    if (books.length === 0) {
        cabinet.innerHTML = `
            <div class="wooden-plank relative pt-6 pb-4 px-4 flex flex-col items-center justify-center text-center min-h-[220px]">
                <span class="text-4xl mb-2">📚</span>
                <p class="text-sm font-extrabold text-amber-200">This Wooden Shelf is Empty</p>
                <p class="text-xs text-amber-100/70 max-w-md mt-1">Click "+ Add Books" or "📁 Set Main Folder" above to populate your 3D library with PDFs or .PBOOK files.</p>
            </div>
        `;
        return;
    }

    for (let i = 0; i < books.length; i += perRow) {
        const chunk = books.slice(i, i + perRow);
        const plank = document.createElement('div');
        plank.className = "wooden-plank relative pt-4 pb-3 px-3 sm:px-5";
        const grid = document.createElement('div');
        grid.className = "shelf-plank-books-grid";

        chunk.forEach((book, idxInChunk) => {
            const globalSeq = i + idxInChunk + 1;
            const pct = Math.min(100, Math.round(((book.currentPage || 1) / Math.max(1, book.totalPages || 1)) * 100));
            const card = document.createElement('div');
            card.className = "book-3d-card group relative flex flex-col items-center cursor-pointer select-none";
            card.innerHTML = `
                <div class="relative w-28 sm:w-32 aspect-[3/4] rounded-r-lg rounded-l-sm bg-slate-900 border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col justify-between transition-transform group-hover:-translate-y-2">
                    ${book.coverDataUrl
                        ? `<img src="${book.coverDataUrl}" alt="${escapeHtml(book.title)}" class="w-full h-full object-cover">`
                        : `<div class="p-3 flex flex-col justify-between h-full bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 text-center">
                            <span class="text-[9px] font-mono text-amber-400 uppercase tracking-widest">PomoReader</span>
                            <h5 class="text-xs font-extrabold text-white line-clamp-3">${escapeHtml(book.title)}</h5>
                            <span class="text-[9px] font-mono text-slate-400">${book.totalPages || 1}p</span>
                          </div>`
                    }
                    <div class="absolute top-1.5 left-1.5 bg-slate-950/85 border border-amber-500/40 text-amber-300 text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded">#${globalSeq}</div>
                    ${book.isConvertedPbook ? `<div class="absolute top-1.5 right-1.5 bg-purple-600/90 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded">⚡ PBOOK</div>` : ''}
                    <div class="absolute inset-x-0 bottom-0 bg-slate-950/90 backdrop-blur-xs p-1.5 border-t border-slate-800">
                        <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
                            <div class="bg-gradient-to-r from-amber-500 to-emerald-400 h-full" style="width:${pct}%"></div>
                        </div>
                        <div class="flex justify-between items-center text-[9px] font-mono text-slate-300">
                            <span>p.${book.currentPage || 1}/${book.totalPages || 1}</span>
                            <span class="text-amber-400 font-bold">${pct}%</span>
                        </div>
                    </div>
                </div>
                <p class="mt-2 text-[11px] font-extrabold text-amber-100 text-center line-clamp-1 max-w-[130px]">${escapeHtml(book.title)}</p>
                <div class="flex items-center gap-1 mt-1 opacity-90 group-hover:opacity-100">
                    <button type="button" class="bk-focus-btn bg-slate-950/90 hover:bg-blue-600 text-blue-300 hover:text-white border border-slate-700 px-2 py-0.5 rounded text-[9px] font-bold">⚡ Focus</button>
                    <button type="button" class="bk-menu-btn bg-slate-950/90 hover:bg-amber-600 text-amber-300 hover:text-slate-950 border border-slate-700 px-2 py-0.5 rounded text-[9px] font-bold">⋯</button>
                </div>
            `;
            card.onclick = (e) => {
                if (e.target.closest('.bk-focus-btn')) {
                    e.stopPropagation();
                    window.startBookFocusSession(book.id);
                    return;
                }
                if (e.target.closest('.bk-menu-btn')) {
                    e.stopPropagation();
                    window.openBookCornerModal(book.id);
                    return;
                }
                window.openBookInReader(book.id, book.currentPage || 1);
            };
            grid.appendChild(card);
        });

        plank.appendChild(grid);
        cabinet.appendChild(plank);
    }
};

document.getElementById('book-shelf-search')?.addEventListener('input', window.renderWoodenShelf);
document.getElementById('shelf-sort-select')?.addEventListener('change', window.renderWoodenShelf);

window.startBookFocusSession = function(bookId) {
    const book = window.readerLibrary.find(b => b.id === bookId);
    if (!book) return;
    const workBlock = {
        id: Date.now(),
        type: 'work',
        category: book.genre === 'deen' ? 'deen' : 'study',
        title: `📖 Read: ${book.title} (p.${book.currentPage || 1})`,
        duration: 50 * 60
    };
    window.ensureProtocolBlockSyncedToTodo(workBlock);
    stopTimer(true, true);
    const insertIdx = Math.min(currentStepIndex, schedule.length);
    schedule.splice(insertIdx, 0, workBlock);
    safeSet('pages_pomodoro_schedule_v8', JSON.stringify(schedule));
    loadStep(insertIdx, false);
    startTimer();
    window.openBookInReader(book.id, book.currentPage || 1);
    showToast(`🚀 50m Focus Timer started for "${book.title}"!`);
};

window.openBookCornerModal = function(bookId) {
    const book = window.readerLibrary.find(b => b.id === bookId);
    if (!book) return;
    let modal = document.getElementById('book-corner-action-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'book-corner-action-modal';
        modal.className = "hidden fixed inset-0 z-[10060] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 w-full max-w-md shadow-2xl flex flex-col gap-3">
            <div class="flex justify-between items-start border-b border-slate-800 pb-2.5">
                <div>
                    <span class="text-[9px] font-mono uppercase text-amber-400 font-bold">📚 Book Actions & Shelf Assignment</span>
                    <h3 class="text-sm font-extrabold text-white mt-0.5">${escapeHtml(book.title)}</h3>
                </div>
                <button type="button" onclick="document.getElementById('book-corner-action-modal').classList.add('hidden')" class="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold">✕</button>
            </div>
            <div class="flex flex-col gap-2">
                <label class="text-[10px] font-bold uppercase text-slate-400">Move to Wooden Shelf Category</label>
                <select id="bk-modal-shelf-sel" class="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white">
                    ${window.customShelves.filter(s => s.id !== 'all').map(s => `<option value="${s.id}" ${book.shelfId === s.id ? 'selected' : ''}>${s.icon} ${escapeHtml(s.name)}</option>`).join('')}
                </select>
                <div class="grid grid-cols-2 gap-2 mt-1">
                    <button type="button" onclick="window.offloadBookBinaryToSaveLocalSpace('${book.id}'); document.getElementById('book-corner-action-modal').classList.add('hidden');" class="bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30 py-2.5 rounded-xl text-xs font-bold">🧹 Offload PDF Binary</button>
                    <button type="button" onclick="window.deleteBookFromLibrary('${book.id}'); document.getElementById('book-corner-action-modal').classList.add('hidden');" class="bg-red-950/40 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/50 py-2.5 rounded-xl text-xs font-bold">🗑️ Remove Book</button>
                </div>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
    document.getElementById('bk-modal-shelf-sel').onchange = (e) => {
        book.shelfId = e.target.value;
        saveReaderMeta();
        renderCustomShelvesBar();
        renderWoodenShelf();
        showToast("Updated book shelf assignment!");
    };
};

window.deleteBookFromLibrary = async function(bookId) {
    window.readerLibrary = window.readerLibrary.filter(b => b.id !== bookId);
    await idbDelete('books', bookId);
    await idbDelete('covers', bookId);
    saveReaderMeta();
    renderCustomShelvesBar();
    renderWoodenShelf();
    renderHomeReaderWidget();
    showToast("Book removed from library.");
};

document.getElementById('manage-shelves-btn')?.addEventListener('click', () => {
    document.getElementById('manage-shelves-modal')?.classList.remove('hidden');
    renderCustomShelvesModalList();
});
document.getElementById('close-shelves-modal-btn')?.addEventListener('click', () => {
    document.getElementById('manage-shelves-modal')?.classList.add('hidden');
});

function renderCustomShelvesModalList() {
    const list = document.getElementById('custom-shelves-list');
    if (!list) return;
    list.innerHTML = '';
    window.customShelves.forEach((sh, idx) => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs";
        div.innerHTML = `
            <span class="font-bold text-white">${sh.icon || '📚'} ${escapeHtml(sh.name)}</span>
            ${sh.system ? `<span class="text-[9px] font-mono text-slate-500">System</span>` : `<button type="button" onclick="window.removeCustomShelf(${idx})" class="text-red-400 hover:text-white px-2 py-0.5 rounded bg-slate-900">✕</button>`}
        `;
        list.appendChild(div);
    });
}

window.removeCustomShelf = function(idx) {
    const sh = window.customShelves[idx];
    if (!sh || sh.system) return;
    window.customShelves.splice(idx, 1);
    saveReaderMeta();
    renderCustomShelvesBar();
    renderCustomShelvesModalList();
};

document.getElementById('create-shelf-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('new-shelf-name-input');
    const name = inp?.value.trim();
    const icon = document.getElementById('new-shelf-icon-select')?.value || '📚';
    if (!name) return;
    window.customShelves.push({ id: 'shelf_' + Date.now(), name, icon, system: false });
    inp.value = '';
    saveReaderMeta();
    renderCustomShelvesBar();
    renderCustomShelvesModalList();
});

document.getElementById('sync-shelf-todo-btn')?.addEventListener('click', () => {
    const today = getLocalTodayString();
    let added = 0;
    window.readerLibrary.slice(0, 5).forEach(b => {
        const title = `📖 Read ${b.title} (from p.${b.currentPage || 1})`;
        if (!todos.some(t => !t.completed && t.title === title)) {
            todos.unshift({
                id: 'todo_bk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
                title,
                listId: 'myday',
                myDayDate: today,
                important: true,
                completed: false,
                dueDate: today,
                repeat: 'none',
                plannedDurationMins: 50,
                steps: [],
                createdAt: Date.now()
            });
            added++;
        }
    });
    saveTodos();
    renderTodoListsBar();
    renderTodos();
    showToast(`☑️ Synced ${added} active book reading block(s) to My Day!`);
});
/* ==========================================================================
   6. REAL PDF-LIB BINARY BAKING & MULTI-SOURCE SYNC
   ========================================================================== */
async function bakeAnnotationsIntoPdfBytes(rawArrayBuffer, book) {
    if (!window.PDFLib || !rawArrayBuffer) return rawArrayBuffer;
    try {
        const { PDFDocument, rgb } = window.PDFLib;
        const pdfDoc = await PDFDocument.load(rawArrayBuffer);
        const pages = pdfDoc.getPages();
        const annMap = book.annotations || {};

        const hexToRgb01 = (hex) => {
            const clean = String(hex || '#facc15').replace('#', '');
            const num = parseInt(clean, 16) || 0xfacc15;
            return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
        };

        for (const [pageStr, list] of Object.entries(annMap)) {
            const pIdx = parseInt(pageStr) - 1;
            if (pIdx < 0 || pIdx >= pages.length || !Array.isArray(list)) continue;
            const pdfPage = pages[pIdx];
            const { width, height } = pdfPage.getSize();

            for (const item of list) {
                const col = hexToRgb01(item.color || '#facc15');
                if ((item.type === 'rect' || item.type === 'dom_highlight' || item.type === 'occlusion') && item.w && item.h) {
                    const rx = (item.x / 1000) * width;
                    const ry = height - ((item.y + item.h) / 1000) * height;
                    const rw = (item.w / 1000) * width;
                    const rh = (item.h / 1000) * height;
                    pdfPage.drawRectangle({
                        x: rx,
                        y: ry,
                        width: rw,
                        height: rh,
                        color: col,
                        opacity: item.type === 'occlusion' ? 0.85 : 0.32
                    });
                } else if (item.type === 'note' && item.text) {
                    const nx = ((item.x || 80) / 1000) * width;
                    const ny = height - (((item.y || 80) / 1000) * height);
                    pdfPage.drawText(`Note: ${String(item.text).slice(0, 120)}`, {
                        x: Math.max(12, Math.min(width - 140, nx)),
                        y: Math.max(12, Math.min(height - 20, ny)),
                        size: 9,
                        color: rgb(0.95, 0.2, 0.2)
                    });
                }
            }
        }
        return await pdfDoc.save();
    } catch (e) {
        return rawArrayBuffer;
    }
}

window.syncSingleBookToAllSources = async function(book, silent = false) {
    if (!book) return;
    book.lastModified = Date.now();
    saveReaderMeta();

    try {
        const rawBytes = await idbGet('books', book.id);
        if (rawBytes && book.fileHandle && typeof book.fileHandle.createWritable === 'function') {
            const baked = await bakeAnnotationsIntoPdfBytes(rawBytes, book);
            const writable = await book.fileHandle.createWritable();
            await writable.write(baked);
            await writable.close();
        }
    } catch (e) {}

    if (!silent) showToast(`💾 Saved "${book.title}" annotations & reading progress!`);
};

/* ==========================================================================
   7. FULL-SCREEN READER, READING THEMES, STUDIO TOOLS & MEMORY GUARD
   ========================================================================== */
// SURGICAL FIX #1: Space between `const` and `ALL_READING_THEMES`
const ALL_READING_THEMES = ['night', 'amoled', 'sepia', 'day', 'muddy-light', 'muddy-dark', 'eink', 'dusk'];

window.applyBookReadingTheme = function(themeId) {
    window.activeBookTheme = ALL_READING_THEMES.includes(themeId) ? themeId : 'night';
    safeSet('pomo_book_reading_theme_v1', window.activeBookTheme);
    const stage = document.getElementById('reader-scroll-stage');
    if (stage) {
        ALL_READING_THEMES.forEach(t => stage.classList.remove(`theme-${t}`));
        stage.classList.add(`theme-${window.activeBookTheme}`);
    }
    const sel = document.getElementById('reader-theme-select');
    if (sel && sel.value !== window.activeBookTheme) sel.value = window.activeBookTheme;
};

document.getElementById('reader-theme-select')?.addEventListener('change', (e) => {
    window.applyBookReadingTheme(e.target.value);
});

function playPaperPageTurnSound() {
    if (!window.readerSettings.pageTurnSound) return;
    try {
        if (!window.fallbackCtx) window.fallbackCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window.fallbackCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1100;
        const gain = ctx.createGain();
        gain.gain.value = 0.08;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    } catch (e) {}
}

function triggerMoonPageTurnAnimation(dir = 'next') {
    if (window.readerSettings.pageTurnAnim === 'none') return;
    const stage = document.getElementById('reader-scroll-stage');
    if (!stage) return;
    const cls = dir === 'prev' ? 'moon-page-flip-prev' : 'moon-page-flip-next';
    stage.classList.remove('moon-page-flip-next', 'moon-page-flip-prev');
    void stage.offsetWidth;
    stage.classList.add(cls);
    setTimeout(() => stage.classList.remove(cls), 360);
}

window.openBookInReader = async function(bookId, startPage = null) {
    const book = window.readerLibrary.find(b => b.id === bookId);
    if (!book) return;

    window.activeBook = book;
    book.lastOpened = Date.now();
    if (startPage !== null) book.currentPage = Math.max(1, Math.min(book.totalPages || 1, parseInt(startPage) || 1));
    saveReaderMeta();

    const modal = document.getElementById('full-screen-book-reader');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('reader-book-title').textContent = book.title;
    document.getElementById('reader-total-pages').textContent = `/ ${book.totalPages || 1}`;
    document.getElementById('reader-page-input').value = book.currentPage || 1;
    window.applyBookReadingTheme(window.activeBookTheme);

    buildStudioToolbarAndTopUndo();
    mountReaderBottomSymbolDock();

    if (book.isConvertedPbook && Array.isArray(book.pbookPages) && book.pbookPages.length > 0) {
        window.activePdfDoc = null;
        buildBookStageAndObserver(book.pbookPages.length, true);
        setTimeout(() => window.jumpToReaderPage(book.currentPage || 1, false), 60);
        return;
    }

    const rawBytes = await idbGet('books', book.id);
    if (!rawBytes) {
        if (book.fileHandle && typeof book.fileHandle.getFile === 'function') {
            try {
                const f = await book.fileHandle.getFile();
                const ab = await f.arrayBuffer();
                await idbPut('books', book.id, ab);
                return window.openBookInReader(book.id, book.currentPage);
            } catch (e) {}
        }
        showToast("PDF binary was offloaded. Re-import the PDF file to view full pages.", true);
        return;
    }

    try {
        window.activePdfDoc = await pdfjsLib.getDocument({ data: rawBytes.slice(0) }).promise;
        book.totalPages = window.activePdfDoc.numPages || book.totalPages || 1;
        document.getElementById('reader-total-pages').textContent = `/ ${book.totalPages}`;
        buildBookStageAndObserver(book.totalPages, false);
        setTimeout(() => window.jumpToReaderPage(book.currentPage || 1, false), 80);
    } catch (e) {
        showToast("Failed to render PDF document.", true);
    }
};

window.closeActiveBookReader = async function() {
    if (window.activeBook) {
        await window.syncSingleBookToAllSources(window.activeBook, true);
    }
    if (pageScrollObserver) {
        pageScrollObserver.disconnect();
        pageScrollObserver = null;
    }
    renderedCanvasPages.clear();
    const stage = document.getElementById('reader-scroll-stage');
    if (stage) stage.innerHTML = '';
    const modal = document.getElementById('full-screen-book-reader');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    renderWoodenShelf();
    renderHomeReaderWidget();
};

document.getElementById('close-reader-btn')?.addEventListener('click', window.closeActiveBookReader);

function renderStructuredPbookSheet(sheet, pageNum) {
    const pData = window.activeBook?.pbookPages?.[pageNum - 1];
    if (!pData) return;
    const contentDiv = document.createElement('div');
    contentDiv.className = "pbook-structured-sheet w-full max-w-[780px] min-h-[960px] p-8 sm:p-12 rounded-2xl shadow-xl leading-relaxed text-sm sm:text-base select-text";
    contentDiv.innerHTML = pData.html || `<p>${escapeHtml(pData.text || '')}</p>`;
    sheet.appendChild(contentDiv);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1000 1000');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.className = "reader-annotation-svg absolute inset-0 w-full h-full pointer-events-none";
    sheet.appendChild(svg);
    bindPageInteractiveSvg(sheet, svg, pageNum);
    window.updateSinglePageSvg(pageNum);
}

// SURGICAL FIX #5: Off-Screen PDF Canvas Memory Recycling inside `pageScrollObserver`
function buildBookStageAndObserver(totalPages, isPbookMode = false) {
    const stage = document.getElementById('reader-scroll-stage');
    if (!stage) return;
    if (pageScrollObserver) pageScrollObserver.disconnect();
    renderedCanvasPages.clear();
    stage.innerHTML = '';

    for (let p = 1; p <= totalPages; p++) {
        const sheet = document.createElement('div');
        sheet.className = "reader-page-sheet relative my-2 bg-slate-900/90 rounded-lg shadow-2xl overflow-hidden flex items-center justify-center transition-all";
        sheet.dataset.page = p;
        sheet.style.minHeight = '840px';
        sheet.style.width = `${Math.round(760 * (window.readerZoom || 1))}px`;
        sheet.style.maxWidth = '98%';

        if (isPbookMode) {
            renderStructuredPbookSheet(sheet, p);
        } else {
            sheet.innerHTML = `
                <div class="page-loading-placeholder text-xs font-mono text-slate-500 py-24">Loading Page ${p}...</div>
                <canvas class="pdf-page-canvas block w-full h-auto"></canvas>
                <div class="pdf-text-layer absolute inset-0 select-text"></div>
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" class="reader-annotation-svg absolute inset-0 w-full h-full pointer-events-none"></svg>
            `;
            const svg = sheet.querySelector('.reader-annotation-svg');
            bindPageInteractiveSvg(sheet, svg, p);
        }
        stage.appendChild(sheet);
    }

    pageScrollObserver = new IntersectionObserver((entries) => {
        const curP = window.activeBook?.currentPage || 1;
        entries.forEach(entry => {
            const pageNum = parseInt(entry.target.dataset.page);
            if (!pageNum) return;

            if (entry.isIntersecting) {
                if (!isPbookMode) ensurePdfPageRendered(entry.target, pageNum);
                if (entry.intersectionRatio >= 0.45 && window.activeBook) {
                    window.activeBook.currentPage = pageNum;
                    const inp = document.getElementById('reader-page-input');
                    if (inp && document.activeElement !== inp) inp.value = pageNum;
                    const pct = Math.min(100, Math.round((pageNum / Math.max(1, window.activeBook.totalPages || 1)) * 100));
                    const pBar = document.getElementById('reader-bottom-progress-bar');
                    const pTxt = document.getElementById('reader-progress-pct');
                    if (pBar) pBar.style.width = `${pct}%`;
                    if (pTxt) pTxt.textContent = `${pct}%`;
                }
            } else if (!isPbookMode) {
                // SURGICAL FIX #5: Recycle off-screen <canvas> bitmap buffers beyond buffer window
                const bufferLimit = window.pomoMaxPageBufferWindow || 10;
                if (renderedCanvasPages.has(pageNum) && Math.abs(pageNum - curP) > bufferLimit) {
                    if (entry.target.offsetHeight > 100) {
                        entry.target.style.minHeight = entry.target.offsetHeight + 'px';
                    }
                    const c = entry.target.querySelector('.pdf-page-canvas');
                    if (c) {
                        c.width = 1;
                        c.height = 1;
                    }
                    const tl = entry.target.querySelector('.pdf-text-layer');
                    if (tl) tl.innerHTML = '';
                    renderedCanvasPages.delete(pageNum);
                }
            }
        });
    }, {
        root: stage,
        rootMargin: '600px 0px',
        threshold: [0.05, 0.5]
    });

    stage.querySelectorAll('.reader-page-sheet').forEach(sh => pageScrollObserver.observe(sh));
}

async function ensurePdfPageRendered(sheet, pageNum) {
    if (renderedCanvasPages.has(pageNum) || !window.activePdfDoc) return;
    renderedCanvasPages.add(pageNum);

    try {
        const pdfPage = await window.activePdfDoc.getPage(pageNum);
        const scale = 1.45 * (window.readerZoom || 1);
        const viewport = pdfPage.getViewport({ scale });

        const canvas = sheet.querySelector('.pdf-page-canvas');
        const placeholder = sheet.querySelector('.page-loading-placeholder');
        const textLayerDiv = sheet.querySelector('.pdf-text-layer');
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        sheet.style.minHeight = 'auto';
        if (placeholder) placeholder.classList.add('hidden');

        const ctx = canvas.getContext('2d');
        await pdfPage.render({ canvasContext: ctx, viewport }).promise;

        if (textLayerDiv) {
            textLayerDiv.innerHTML = '';
            const textContent = await pdfPage.getTextContent();
            textContent.items.forEach(item => {
                if (!item.str || !item.str.trim()) return;
                const span = document.createElement('span');
                span.className = "pdf-Selectable-span absolute text-transparent selection:bg-amber-400/40 cursor-text leading-none whitespace-pre";
                const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
                const fontHeight = Math.hypot(tx[2], tx[3]);
                span.style.left = `${(tx[4] / viewport.width) * 100}%`;
                span.style.top = `${((tx[5] - fontHeight) / viewport.height) * 100}%`;
                span.style.fontSize = `${Math.max(9, fontHeight * 0.85)}px`;
                if (window.bionicReadingEnabled) {
                    span.classList.remove('text-transparent');
                    span.classList.add('text-slate-100', 'bg-slate-950/85', 'px-0.5', 'rounded');
                    span.innerHTML = item.str.split(/(\s+)/).map(w => {
                        if (w.trim().length <= 2) return escapeHtml(w);
                        const bLen = Math.ceil(w.length * 0.45);
                        return `<b class="font-extrabold text-amber-300">${escapeHtml(w.slice(0, bLen))}</b>${escapeHtml(w.slice(bLen))}`;
                    }).join('');
                } else {
                    span.textContent = item.str;
                }
                textLayerDiv.appendChild(span);
            });
        }

        window.updateSinglePageSvg(pageNum);
    } catch (e) {
        renderedCanvasPages.delete(pageNum);
    }
}

window.jumpToReaderPage = function(targetPage, animate = true) {
    if (!window.activeBook) return;
    const total = window.activeBook.totalPages || 1;
    const safeP = Math.max(1, Math.min(total, parseInt(targetPage) || 1));
    const prevP = window.activeBook.currentPage || 1;
    window.activeBook.currentPage = safeP;

    const inp = document.getElementById('reader-page-input');
    if (inp) inp.value = safeP;

    const stage = document.getElementById('reader-scroll-stage');
    const sheet = stage?.querySelector(`.reader-page-sheet[data-page="${safeP}"]`);
    if (sheet) {
        if (animate && safeP !== prevP) {
            playPaperPageTurnSound();
            triggerMoonPageTurnAnimation(safeP > prevP ? 'next' : 'prev');
        }
        sheet.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'start' });
    }
    saveReaderMeta();
};

document.getElementById('reader-prev-page-btn')?.addEventListener('click', () => {
    if (window.activeBook) window.jumpToReaderPage((window.activeBook.currentPage || 1) - 1, true);
});
document.getElementById('reader-next-page-btn')?.addEventListener('click', () => {
    if (window.activeBook) window.jumpToReaderPage((window.activeBook.currentPage || 1) + 1, true);
});
document.getElementById('reader-page-input')?.addEventListener('change', (e) => {
    window.jumpToReaderPage(parseInt(e.target.value) || 1, true);
});

window.applyIsolatedPageZoom = function(delta) {
    window.readerZoom = Math.max(0.65, Math.min(2.2, Math.round(((window.readerZoom || 1) + delta) * 100) / 100));
    const zTxt = document.getElementById('reader-zoom-pct');
    if (zTxt) zTxt.textContent = `${Math.round(window.readerZoom * 100)}%`;
    const stage = document.getElementById('reader-scroll-stage');
    stage?.querySelectorAll('.reader-page-sheet').forEach(sh => {
        sh.style.width = `${Math.round(760 * window.readerZoom)}px`;
    });
};

document.getElementById('reader-zoom-in-btn')?.addEventListener('click', () => window.applyIsolatedPageZoom(0.15));
document.getElementById('reader-zoom-out-btn')?.addEventListener('click', () => window.applyIsolatedPageZoom(-0.15));

function buildStudioToolbarAndTopUndo() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.onclick = () => {
            window.activeTool = btn.dataset.tool || 'pan';
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active-tool', 'bg-amber-600/30', 'text-amber-300', 'border', 'border-amber-500/40'));
            btn.classList.add('active-tool', 'bg-amber-600/30', 'text-amber-300', 'border', 'border-amber-500/40');
            const stage = document.getElementById('reader-scroll-stage');
            stage?.querySelectorAll('.reader-annotation-svg').forEach(svg => {
                svg.style.pointerEvents = window.activeTool === 'pan' ? 'none' : 'auto';
            });
        };
    });

    document.querySelectorAll('.color-swatch').forEach(sw => {
        sw.onclick = () => {
            window.activeColor = sw.dataset.color || '#facc15';
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active-swatch', 'border-white'));
            sw.classList.add('active-swatch', 'border-white');
        };
    });

    const szSel = document.getElementById('pen-size-select');
    if (szSel) szSel.onchange = (e) => { window.activeSize = parseInt(e.target.value) || 4; };
}

window.undoLastReaderAnnotation = function() {
    if (!window.activeBook || undoAnnotationStack.length === 0) return showToast("Nothing to undo.");
    const last = undoAnnotationStack.pop();
    const list = window.activeBook.annotations?.[last.page];
    if (Array.isArray(list)) {
        window.activeBook.annotations[last.page] = list.filter(a => a.id !== last.id);
        window.updateSinglePageSvg(last.page);
        saveReaderMeta();
        showToast("↩️ Undid annotation.");
    }
};

document.getElementById('clear-page-ink-btn')?.addEventListener('click', () => {
    if (!window.activeBook) return;
    const p = window.activeBook.currentPage || 1;
    if (window.activeBook.annotations && window.activeBook.annotations[p]) {
        window.activeBook.annotations[p] = [];
        window.updateSinglePageSvg(p);
        saveReaderMeta();
        showToast(`🗑️ Cleared annotations on Page ${p}.`);
    }
});

document.getElementById('reader-save-sync-btn')?.addEventListener('click', () => {
    if (window.activeBook) window.syncSingleBookToAllSources(window.activeBook, false);
});

window.updateSinglePageSvg = function(pageNum) {
    if (!window.activeBook) return;
    const stage = document.getElementById('reader-scroll-stage');
    const sheet = stage?.querySelector(`.reader-page-sheet[data-page="${pageNum}"]`);
    const svg = sheet?.querySelector('.reader-annotation-svg');
    if (!svg) return;

    svg.innerHTML = '';
    const anns = window.activeBook.annotations?.[pageNum] || [];

    anns.forEach(item => {
        if (item.type === 'pen' || item.type === 'highlight' || item.type === 'underline') {
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            poly.setAttribute('fill', 'none');
            poly.setAttribute('stroke', item.color || '#facc15');
            poly.setAttribute('stroke-width', item.type === 'highlight' ? (item.size || 6) * 3.2 : (item.size || 4));
            poly.setAttribute('stroke-linecap', 'round');
            poly.setAttribute('stroke-linejoin', 'round');
            if (item.type === 'highlight') poly.setAttribute('stroke-opacity', '0.38');
            poly.setAttribute('points', (item.points || []).map(pt => `${pt.x},${pt.y}`).join(' '));
            svg.appendChild(poly);
        } else if (item.type === 'rect' || item.type === 'dom_highlight' || item.type === 'occlusion') {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', item.x);
            rect.setAttribute('y', item.y);
            rect.setAttribute('width', item.w);
            rect.setAttribute('height', item.h);
            rect.setAttribute('rx', '6');
            if (item.type === 'occlusion') {
                const isRevealed = window.revealAllOcclusionsOnPage || item._revealed;
                rect.setAttribute('fill', isRevealed ? 'rgba(16, 185, 129, 0.12)' : (item.color || '#0f172a'));
                rect.setAttribute('stroke', '#f59e0b');
                rect.setAttribute('stroke-width', '2.5');
                rect.style.pointerEvents = 'auto';
                rect.style.cursor = 'pointer';
                rect.onclick = (e) => {
                    e.stopPropagation();
                    item._revealed = !item._revealed;
                    window.updateSinglePageSvg(pageNum);
                };
            } else {
                rect.setAttribute('fill', item.color || '#facc15');
                rect.setAttribute('fill-opacity', item.type === 'dom_highlight' ? '0.35' : '0.18');
                if (item.type === 'rect') {
                    rect.setAttribute('stroke', item.color || '#facc15');
                    rect.setAttribute('stroke-width', '2.5');
                }
            }
            svg.appendChild(rect);
        } else if (item.type === 'note' || item.type === 'symbol') {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('transform', `translate(${item.x || 80}, ${item.y || 80})`);
            g.style.pointerEvents = 'auto';
            g.style.cursor = 'pointer';
            const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            txt.setAttribute('font-size', item.type === 'symbol' ? '28' : '24');
            txt.textContent = item.symbol || '📌';
            g.appendChild(txt);
            if (item.text) {
                g.onclick = (e) => {
                    e.stopPropagation();
                    showToast(`📌 Note: ${item.text}`);
                };
            }
            svg.appendChild(g);
        }
    });

    // Render Bookmark Pin if Page or Line is Bookmarked
    const bms = (window.activeBook.bookmarks || []).filter(b => b.page === pageNum);
    bms.forEach(bm => {
        const pin = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        pin.setAttribute('x', bm.x || 24);
        pin.setAttribute('y', bm.y || 42);
        pin.setAttribute('font-size', '26');
        pin.textContent = '🔖';
        svg.appendChild(pin);
    });
};

function bindPageInteractiveSvg(sheet, svg, pageNum) {
    let drawing = false;
    let currentPts = [];
    let startPt = null;

    const getCoords = (ev) => {
        const r = sheet.getBoundingClientRect();
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
        return {
            x: Math.round(((clientX - r.left) / Math.max(1, r.width)) * 1000),
            y: Math.round(((clientY - r.top) / Math.max(1, r.height)) * 1000)
        };
    };

    svg.addEventListener('pointerdown', (ev) => {
        if (window.activeTool === 'pan' || !window.activeBook) return;
        const pt = getCoords(ev);

        if (window.activeTool === 'eraser') {
            const list = window.activeBook.annotations?.[pageNum] || [];
            window.activeBook.annotations[pageNum] = list.filter(a => {
                if (a.x !== undefined && a.y !== undefined) {
                    return Math.hypot((a.x || 0) - pt.x, (a.y || 0) - pt.y) > 65;
                }
                if (Array.isArray(a.points) && a.points.length > 0) {
                    return !a.points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) < 45);
                }
                return true;
            });
            window.updateSinglePageSvg(pageNum);
            saveReaderMeta();
            return;
        }

        if (window.activeTool === 'note') {
            if (window.PomoNote && typeof window.PomoNote.openStickyNoteCreator === 'function') {
                window.PomoNote.openStickyNoteCreator(pageNum, pt.x, pt.y);
            }
            return;
        }

        drawing = true;
        startPt = pt;
        currentPts = [pt];
    });

    svg.addEventListener('pointermove', (ev) => {
        if (!drawing || !startPt) return;
        const pt = getCoords(ev);
        if (window.activeTool === 'underline') {
            currentPts = [startPt, { x: pt.x, y: startPt.y }];
        } else {
            currentPts.push(pt);
        }
    });

    svg.addEventListener('pointerup', () => {
        if (!drawing || !window.activeBook || !startPt) return;
        drawing = false;
        if (!window.activeBook.annotations) window.activeBook.annotations = {};
        if (!Array.isArray(window.activeBook.annotations[pageNum])) window.activeBook.annotations[pageNum] = [];

        const lastPt = currentPts[currentPts.length - 1] || startPt;
        const annId = 'ann_' + Date.now();

        if (window.activeTool === 'rect' || window.activeTool === 'occlusion') {
            const x = Math.min(startPt.x, lastPt.x);
            const y = Math.min(startPt.y, lastPt.y);
            const w = Math.max(25, Math.abs(lastPt.x - startPt.x));
            const h = Math.max(18, Math.abs(lastPt.y - startPt.y));
            window.activeBook.annotations[pageNum].push({
                id: annId,
                type: window.activeTool === 'occlusion' ? 'occlusion' : 'rect',
                x, y, w, h,
                color: window.activeColor
            });
            undoAnnotationStack.push({ page: pageNum, id: annId });
        } else if (currentPts.length > 1) {
            window.activeBook.annotations[pageNum].push({
                id: annId,
                type: window.activeTool,
                color: window.activeColor,
                size: window.activeSize,
                points: currentPts
            });
            undoAnnotationStack.push({ page: pageNum, id: annId });
        }

        startPt = null;
        currentPts = [];
        window.updateSinglePageSvg(pageNum);
        saveReaderMeta();
    });
}

// Native DOM Text Selection Handler inside Reader Stage
document.getElementById('reader-scroll-stage')?.addEventListener('mouseup', (e) => {
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : '';
    const pop = document.getElementById('reader-selection-popover');
    if (!text || text.length < 2 || !window.activeBook) {
        pop?.classList.add('hidden');
        return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const sheet = range.startContainer.parentElement?.closest('.reader-page-sheet');
    const pageNum = sheet ? parseInt(sheet.dataset.page) : (window.activeBook.currentPage || 1);
    const sheetRect = sheet ? sheet.getBoundingClientRect() : rect;

    activeSelectionContext = {
        text,
        page: pageNum,
        x: Math.round(((rect.left - sheetRect.left) / Math.max(1, sheetRect.width)) * 1000),
        y: Math.round(((rect.top - sheetRect.top) / Math.max(1, sheetRect.height)) * 1000),
        w: Math.max(30, Math.round((rect.width / Math.max(1, sheetRect.width)) * 1000)),
        h: Math.max(16, Math.round((rect.height / Math.max(1, sheetRect.height)) * 1000))
    };

    if (pop) {
        pop.style.left = `${Math.max(12, Math.min(window.innerWidth - 320, rect.left))}px`;
        pop.style.top = `${Math.max(12, rect.top - 48)}px`;
        pop.classList.remove('hidden');
        pop.classList.add('flex');
    }
});

function applySelectionFormatting(colorHex, styleType = 'dom_highlight') {
    if (!activeSelectionContext || !window.activeBook) return;
    const { page, x, y, w, h, text } = activeSelectionContext;
    if (!window.activeBook.annotations) window.activeBook.annotations = {};
    if (!Array.isArray(window.activeBook.annotations[page])) window.activeBook.annotations[page] = [];
    const id = 'sel_' + Date.now();
    window.activeBook.annotations[page].push({
        id,
        type: styleType === 'underline' ? 'underline' : 'dom_highlight',
        x, y, w, h,
        points: styleType === 'underline' ? [{ x, y: y + h }, { x: x + w, y: y + h }] : undefined,
        color: colorHex,
        text
    });
    undoAnnotationStack.push({ page, id });
    window.updateSinglePageSvg(page);
    saveReaderMeta();
    document.getElementById('reader-selection-popover')?.classList.add('hidden');
    window.getSelection()?.removeAllRanges();
}

document.getElementById('sel-hl-yellow')?.addEventListener('click', () => applySelectionFormatting('#facc15', 'dom_highlight'));
document.getElementById('sel-hl-green')?.addEventListener('click', () => applySelectionFormatting('#4ade80', 'dom_highlight'));
document.getElementById('sel-hl-pink')?.addEventListener('click', () => applySelectionFormatting('#f472b6', 'dom_highlight'));
document.getElementById('sel-hl-blue')?.addEventListener('click', () => applySelectionFormatting('#38bdf8', 'dom_highlight'));
document.getElementById('sel-ul-btn')?.addEventListener('click', () => applySelectionFormatting('#facc15', 'underline'));

document.getElementById('sel-flashcard-btn')?.addEventListener('click', () => {
    if (!activeSelectionContext || !window.activeBook) return;
    const cards = JSON.parse(safeGet('pomo_Highlight_flashcards_v1', '[]'));
    cards.unshift({
        id: 'fc_' + Date.now(),
        bookId: window.activeBook.id,
        bookTitle: window.activeBook.title,
        page: activeSelectionContext.page,
        prompt: `Recall key concept from "${window.activeBook.title}" (p.${activeSelectionContext.page}):`,
        answer: activeSelectionContext.text,
        dueDate: getLocalTodayString(),
        intervalDays: 1,
        ease: 2.5,
        reps: 0
    });
    safeSet('pomo_Highlight_flashcards_v1', JSON.stringify(cards));
    document.getElementById('reader-selection-popover')?.classList.add('hidden');
    showToast("🃏 Saved highlight to FSRS-5 Active Recall Flashcard Deck!");
});

document.getElementById('sel-bookmark-line-btn')?.addEventListener('click', () => {
    if (!activeSelectionContext || !window.activeBook) return;
    if (!Array.isArray(window.activeBook.bookmarks)) window.activeBook.bookmarks = [];
    window.activeBook.bookmarks.push({
        id: 'bm_' + Date.now(),
        page: activeSelectionContext.page,
        x: Math.max(12, activeSelectionContext.x - 24),
        y: activeSelectionContext.y + 14,
        snippet: activeSelectionContext.text.slice(0, 90),
        createdAt: Date.now()
    });
    window.updateSinglePageSvg(activeSelectionContext.page);
    saveReaderMeta();
    document.getElementById('reader-selection-popover')?.classList.add('hidden');
    showToast(`🔖 Bookmarked exact line on Page ${activeSelectionContext.page}!`);
});

document.getElementById('sel-copy-btn')?.addEventListener('click', () => {
    if (!activeSelectionContext) return;
    navigator.clipboard?.writeText(activeSelectionContext.text);
    document.getElementById('reader-selection-popover')?.classList.add('hidden');
    showToast("📋 Copied selection to clipboard!");
});

function mountReaderBottomSymbolDock() {
    const studioBar = document.getElementById('reader-pencil-studio-bar');
    if (!studioBar || document.getElementById('reader-advanced-tools-cluster')) return;

    const cluster = document.createElement('div');
    cluster.id = 'reader-advanced-tools-cluster';
    cluster.className = "flex items-center gap-1 border-l border-slate-800 pl-2";
    cluster.innerHTML = `
        <button type="button" onclick="window.toggleImageOcclusionTool()" class="px-2 py-1 rounded-lg text-[10px] font-bold text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-700" title="Draw Image Occlusion Mask">⬛ Occlude</button>
        <button type="button" onclick="window.toggleRevealAllPageOcclusions()" class="px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-300 bg-slate-900 hover:bg-slate-800 border border-slate-700" title="Reveal/Hide Occlusion Masks">👁️ Reveal</button>
        <button type="button" onclick="window.toggleBionicReadingMode()" class="px-2 py-1 rounded-lg text-[10px] font-bold text-purple-300 bg-slate-900 hover:bg-slate-800 border border-slate-700" title="Toggle Bionic Speed Reading">⚡ Bionic</button>
        <button type="button" onclick="window.openRealFeynmanBlurTest()" class="px-2 py-1 rounded-lg text-[10px] font-bold text-blue-300 bg-slate-900 hover:bg-slate-800 border border-slate-700" title="Feynman Blur-The-Page Active Recall">🧠 Feynman</button>
        <button type="button" onclick="window.undoLastReaderAnnotation()" class="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700" title="Undo Last Stroke">↩️ Undo</button>
    `;
    studioBar.appendChild(cluster);
}

window.toggleImageOcclusionTool = function() {
    window.activeTool = window.activeTool === 'occlusion' ? 'pan' : 'occlusion';
    const stage = document.getElementById('reader-scroll-stage');
    stage?.querySelectorAll('.reader-annotation-svg').forEach(svg => {
        svg.style.pointerEvents = window.activeTool === 'pan' ? 'none' : 'auto';
    });
    showToast(window.activeTool === 'occlusion' ? "⬛ Image Occlusion active: Drag over any diagram label to mask it!" : "🖐️ Returned to Pan/Read mode.");
};

window.toggleRevealAllPageOcclusions = function() {
    window.revealAllOcclusionsOnPage = !window.revealAllOcclusionsOnPage;
    if (window.activeBook) window.updateSinglePageSvg(window.activeBook.currentPage || 1);
    showToast(window.revealAllOcclusionsOnPage ? "👁️ Revealed all occlusion masks on page!" : "🙈 Hid occlusion masks for active recall.");
};

window.toggleBionicReadingMode = function() {
    window.bionicReadingEnabled = !window.bionicReadingEnabled;
    safeSet('pomo_bionic_reading_v1', String(window.bionicReadingEnabled));
    if (window.activeBook) {
        renderedCanvasPages.clear();
        buildBookStageAndObserver(window.activeBook.totalPages || 1, !!window.activeBook.isConvertedPbook);
        window.jumpToReaderPage(window.activeBook.currentPage || 1, false);
    }
    showToast(window.bionicReadingEnabled ? "⚡ Bionic Reading Bold-Fixation Enabled!" : "Bionic Reading Disabled.");
};

window.openRealFeynmanBlurTest = function() {
    const stage = document.getElementById('reader-scroll-stage');
    if (!stage) return;
    const isBlurred = stage.classList.toggle('blur-md');
    showToast(isBlurred ? "🧠 Feynman Recall Active: Page blurred! Explain the page out loud or in PomoNote, then click 🧠 Feynman again to verify." : "✅ Page unblurred! Verify your recall accuracy.");
};
/* ==========================================================================
   8. 3-TIER CHAPTER/BOOKMARK DRAWER, TTS, FULL-BOOK RED SEARCH & A1–A10 HUB
   ========================================================================== */
window.autoDetectBookChaptersAndHeadlines = async function() {
    if (!window.activeBook || !window.activePdfDoc) return showToast("Open a PDF book first to scan chapters.", true);
    showToast("🔍 Scanning PDF pages for Chapters, Topics & Subtopics...");
    const detected = [];
    const maxScan = Math.min(window.activePdfDoc.numPages, 150);

    for (let p = 1; p <= maxScan; p++) {
        try {
            const page = await window.activePdfDoc.getPage(p);
            const tc = await page.getTextContent();
            const heights = tc.items.map(i => Math.hypot(i.transform[2], i.transform[3])).filter(h => h > 4);
            const avgH = heights.length > 0 ? heights.reduce((a, b) => a + b, 0) / heights.length : 11;

            for (const item of tc.items.slice(0, 12)) {
                const str = (item.str || '').trim();
                if (str.length < 4 || str.length > 95) continue;
                const h = Math.hypot(item.transform[2], item.transform[3]);
                const lvl = window.classifyHeadingHierarchyLevel(str, avgH, h);
                if (lvl) {
                    detected.push({ title: str, page: p, level: lvl });
                    break;
                }
            }
        } catch (e) {}
    }

    if (detected.length > 0) {
        window.activeBook.chapters = detected;
        saveReaderMeta();
        renderBookTocAndBookmarksDrawer();
        showToast(`✅ Auto-detected ${detected.length} Chapters & Topics!`);
    } else {
        showToast("No distinct headings detected; use '+ Add Entry' below to add custom chapters.");
    }
};

function renderBookTocAndBookmarksDrawer() {
    if (!window.activeBook) return;
    const chList = document.getElementById('toc-chapters-list');
    const bmList = document.getElementById('toc-bookmarks-list');
    if (chList) {
        const chs = window.activeBook.chapters || [];
        chList.innerHTML = chs.length === 0
            ? `<div class="p-4 text-center text-xs text-slate-500 italic">No chapters indexed yet. Click "🔍 Auto-Scan" or add one below.</div>`
            : chs.map((c, idx) => `
                <div onclick="window.jumpToReaderPage(${c.page}, true)" class="flex items-center justify-between p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 cursor-pointer text-xs ${c.level === 2 ? 'ml-3' : (c.level === 3 ? 'ml-6' : '')}">
                    <span class="font-bold ${c.level === 1 ? 'text-amber-300' : 'text-slate-200'} truncate">${escapeHtml(c.title)}</span>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <span class="font-mono text-[10px] text-slate-400">p.${c.page}</span>
                        <button type="button" onclick="event.stopPropagation(); window.deleteBookChapter(${idx})" class="text-slate-500 hover:text-red-400 text-[10px]">✕</button>
                    </div>
                </div>
            `).join('');
    }
    if (bmList) {
        const bms = window.activeBook.bookmarks || [];
        bmList.innerHTML = bms.length === 0
            ? `<div class="p-4 text-center text-xs text-slate-500 italic">No bookmarks yet. Click 🔖 in the top bar or select a line to bookmark.</div>`
            : bms.map((b, idx) => `
                <div onclick="window.jumpToReaderPage(${b.page}, true)" class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 cursor-pointer text-xs">
                    <div class="min-w-0 flex-1 pr-2">
                        <span class="text-[10px] font-mono text-amber-400 font-bold">🔖 Page ${b.page}</span>
                        <p class="text-slate-200 truncate text-[11px]">${escapeHtml(b.snippet || 'Bookmarked Page')}</p>
                    </div>
                    <button type="button" onclick="event.stopPropagation(); window.deleteBookBookmark(${idx})" class="text-slate-500 hover:text-red-400 text-xs">✕</button>
                </div>
            `).join('');
    }
}

window.deleteBookChapter = function(idx) {
    if (!window.activeBook?.chapters) return;
    window.activeBook.chapters.splice(idx, 1);
    saveReaderMeta();
    renderBookTocAndBookmarksDrawer();
};

window.deleteBookBookmark = function(idx) {
    if (!window.activeBook?.bookmarks) return;
    const p = window.activeBook.bookmarks[idx]?.page;
    window.activeBook.bookmarks.splice(idx, 1);
    saveReaderMeta();
    if (p) window.updateSinglePageSvg(p);
    renderBookTocAndBookmarksDrawer();
};

document.getElementById('reader-toc-drawer-btn')?.addEventListener('click', () => {
    const dr = document.getElementById('reader-toc-drawer');
    if (dr) {
        dr.classList.toggle('hidden');
        dr.classList.toggle('flex');
        renderBookTocAndBookmarksDrawer();
    }
});
document.getElementById('close-toc-drawer-btn')?.addEventListener('click', () => {
    const dr = document.getElementById('reader-toc-drawer');
    dr?.classList.add('hidden');
    dr?.classList.remove('flex');
});

document.getElementById('toc-tab-chapters')?.addEventListener('click', () => {
    document.getElementById('toc-chapters-list')?.classList.remove('hidden');
    document.getElementById('toc-bookmarks-list')?.classList.add('hidden');
});
document.getElementById('toc-tab-bookmarks')?.addEventListener('click', () => {
    document.getElementById('toc-bookmarks-list')?.classList.remove('hidden');
    document.getElementById('toc-chapters-list')?.classList.add('hidden');
});

document.getElementById('auto-detect-toc-btn')?.addEventListener('click', window.autoDetectBookChaptersAndHeadlines);

document.getElementById('add-manual-toc-btn')?.addEventListener('click', () => {
    if (!window.activeBook) return;
    const title = document.getElementById('manual-toc-title-inp')?.value.trim();
    const page = Math.max(1, parseInt(document.getElementById('manual-toc-page-inp')?.value) || (window.activeBook.currentPage || 1));
    const level = parseInt(document.getElementById('manual-toc-level-sel')?.value) || 1;
    if (!title) return;
    if (!Array.isArray(window.activeBook.chapters)) window.activeBook.chapters = [];
    window.activeBook.chapters.push({ title, page, level });
    document.getElementById('manual-toc-title-inp').value = '';
    saveReaderMeta();
    renderBookTocAndBookmarksDrawer();
});

document.getElementById('reader-bookmark-page-btn')?.addEventListener('click', () => {
    if (!window.activeBook) return;
    const p = window.activeBook.currentPage || 1;
    if (!Array.isArray(window.activeBook.bookmarks)) window.activeBook.bookmarks = [];
    const existingIdx = window.activeBook.bookmarks.findIndex(b => b.page === p && !b.snippet);
    if (existingIdx >= 0) {
        window.activeBook.bookmarks.splice(existingIdx, 1);
        showToast(`Removed bookmark from Page ${p}.`);
    } else {
        window.activeBook.bookmarks.push({ id: 'bm_' + Date.now(), page: p, x: 24, y: 42, snippet: `Page ${p} Bookmark` });
        showToast(`🔖 Bookmarked Page ${p}!`);
    }
    window.updateSinglePageSvg(p);
    saveReaderMeta();
    renderBookTocAndBookmarksDrawer();
});

// TTS Read Aloud Engine
let ttsUtterance = null;
window.startTtsReadingCurrentPage = async function() {
    if (!('speechSynthesis' in window)) return showToast("Speech Synthesis not supported in this browser.", true);
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        showToast("⏹️ Stopped TTS Read Aloud.");
        return;
    }
    if (!window.activeBook) return;
    const p = window.activeBook.currentPage || 1;
    let pageText = '';

    if (window.activeBook.isConvertedPbook && window.activeBook.pbookPages?.[p - 1]) {
        pageText = window.activeBook.pbookPages[p - 1].text || '';
    } else if (window.activePdfDoc) {
        try {
            const pdfPage = await window.activePdfDoc.getPage(p);
            const tc = await pdfPage.getTextContent();
            pageText = tc.items.map(i => i.str).join(' ');
        } catch (e) {}
    }

    if (!pageText.trim()) return showToast("No selectable text found on this page for TTS.", true);
    ttsUtterance = new SpeechSynthesisUtterance(pageText);
    ttsUtterance.rate = 1.05;
    window.speechSynthesis.speak(ttsUtterance);
    showToast(`🔊 Reading Page ${p} aloud (Click 🔊 again to stop)...`);
};

document.getElementById('reader-tts-btn')?.addEventListener('click', window.startTtsReadingCurrentPage);

// Full-Book Red Search Engine
document.getElementById('reader-search-toggle-btn')?.addEventListener('click', () => {
    const bar = document.getElementById('reader-red-search-bar');
    if (bar) {
        bar.classList.toggle('hidden');
        bar.classList.toggle('flex');
        document.getElementById('reader-search-query-inp')?.focus();
    }
});
document.getElementById('close-reader-search-btn')?.addEventListener('click', () => {
    const bar = document.getElementById('reader-red-search-bar');
    bar?.classList.add('hidden');
    bar?.classList.remove('flex');
});

window.executeFullBookRedSearch = async function() {
    const q = (document.getElementById('reader-search-query-inp')?.value || '').trim().toLowerCase();
    const resCont = document.getElementById('reader-search-results-list');
    const countBadge = document.getElementById('reader-search-match-count');
    if (!q || !window.activeBook || !resCont) return;

    resCont.classList.remove('hidden');
    resCont.innerHTML = `<div class="text-xs text-slate-400 p-2">Searching across book pages...</div>`;
    const matches = [];

    if (window.activeBook.isConvertedPbook && Array.isArray(window.activeBook.pbookPages)) {
        window.activeBook.pbookPages.forEach((pObj, idx) => {
            const txt = pObj.text || '';
            if (txt.toLowerCase().includes(q)) {
                matches.push({ page: idx + 1, snippet: txt.slice(0, 140) });
            }
        });
    } else if (window.activePdfDoc) {
        const total = Math.min(window.activePdfDoc.numPages, 250);
        for (let p = 1; p <= total; p++) {
            try {
                const page = await window.activePdfDoc.getPage(p);
                const tc = await page.getTextContent();
                const fullStr = tc.items.map(i => i.str).join(' ');
                const idx = fullStr.toLowerCase().indexOf(q);
                if (idx >= 0) {
                    const start = Math.max(0, idx - 35);
                    matches.push({ page: p, snippet: fullStr.slice(start, start + 120) });
                }
            } catch (e) {}
        }
    }

    if (countBadge) countBadge.textContent = `${matches.length} matches`;
    if (matches.length === 0) {
        resCont.innerHTML = `<div class="text-xs text-slate-500 p-2">No matches found for "${escapeHtml(q)}".</div>`;
        return;
    }
    resCont.innerHTML = matches.map(m => `
        <div onclick="window.jumpToReaderPage(${m.page}, true)" class="p-2 rounded-lg bg-slate-950 hover:bg-red-950/30 border border-slate-800 hover:border-red-500/40 cursor-pointer text-xs">
            <span class="font-mono font-extrabold text-red-400">Page ${m.page}:</span>
            <span class="text-slate-300 ml-1">${escapeHtml(m.snippet)}...</span>
        </div>
    `).join('');
};

document.getElementById('reader-search-run-btn')?.addEventListener('click', window.executeFullBookRedSearch);
document.getElementById('reader-search-query-inp')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.executeFullBookRedSearch();
});

// Reading Clock Telemetry (Increments every 60s when Full-Screen Reader is open)
setInterval(() => {
    const readerModal = document.getElementById('full-screen-book-reader');
    if (!readerModal || readerModal.classList.contains('hidden') || !window.activeBook) return;
    const today = getLocalTodayString();
    window.readerDailyMins[today] = (window.readerDailyMins[today] || 0) + 1;
    safeSet('pomo_reader_daily_mins_v1', JSON.stringify(window.readerDailyMins));
    const clk = document.getElementById('reader-live-clock');
    if (clk) {
        clk.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}, 60000);

// Three-Dot Sub-Options Modal & A1-A10 Control Center
document.getElementById('reader-more-menu-btn')?.addEventListener('click', () => {
    document.getElementById('reader-more-dropdown')?.classList.toggle('hidden');
});

document.querySelectorAll('.reader-sub-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const sub = btn.dataset.sub;
        document.getElementById('reader-more-dropdown')?.classList.add('hidden');
        openReaderSubOptionModal(sub);
    });
});

document.getElementById('close-reader-sub-modal-btn')?.addEventListener('click', () => {
    document.getElementById('reader-sub-options-modal')?.classList.add('hidden');
});

function openReaderSubOptionModal(subKey) {
    const modal = document.getElementById('reader-sub-options-modal');
    const titleEl = document.getElementById('reader-sub-modal-title');
    const bodyEl = document.getElementById('reader-sub-modal-body');
    if (!modal || !titleEl || !bodyEl) return;

    const b = window.activeBook || { title: 'No Active Book', totalPages: 1, currentPage: 1 };

    if (subKey === 'sub-pdf-options') {
        titleEl.textContent = "📄 PDF & Page Buffer Options";
        bodyEl.innerHTML = `
            <div class="flex flex-col gap-3">
                <label class="text-xs font-bold text-slate-300">RAM Canvas Buffer Window (Pages kept in memory):</label>
                <input type="number" id="sub-ram-buffer-inp" value="${window.pomoMaxPageBufferWindow || 10}" min="4" max="30" class="bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs font-mono text-emerald-400">
                <button type="button" onclick="window.pomoMaxPageBufferWindow = parseInt(document.getElementById('sub-ram-buffer-inp').value)||10; safeSet('pomo_ram_page_buffer_v1', window.pomoMaxPageBufferWindow); showToast('Updated RAM Page Buffer!');" class="bg-blue-600 text-white font-extrabold py-2 rounded-xl text-xs">Save Buffer Limit</button>
            </div>
        `;
    } else if (subKey === 'sub-themes-options') {
        titleEl.textContent = "🎨 8 Eye-Care Reading Themes";
        bodyEl.innerHTML = `
            <div class="grid grid-cols-2 gap-2">
                ${ALL_READING_THEMES.map(t => `
                    <button type="button" onclick="window.applyBookReadingTheme('${t}')" class="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold py-2.5 rounded-xl text-xs capitalize">${t}</button>
                `).join('')}
            </div>
        `;
    } else {
        titleEl.textContent = `ℹ️ Book Diagnostics — ${b.title}`;
        bodyEl.innerHTML = `
            <div class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col gap-1.5 text-xs font-mono text-slate-300">
                <div>Title: <b class="text-white">${escapeHtml(b.title)}</b></div>
                <div>Progress: <b class="text-emerald-400">Page ${b.currentPage || 1} of ${b.totalPages || 1}</b></div>
                <div>Format: <b class="text-amber-400">${b.isConvertedPbook ? 'Structured .PBOOK' : 'Native PDF'}</b></div>
                <div>Chapters Indexed: <b>${(b.chapters || []).length}</b></div>
                <div>Bookmarks: <b>${(b.bookmarks || []).length}</b></div>
            </div>
        `;
    }
    modal.classList.remove('hidden');
}

// Settings 1-10 Control Center Modal
document.getElementById('open-a10-control-btn')?.addEventListener('click', () => {
    document.getElementById('a10-control-center-modal')?.classList.remove('hidden');
    switchA10Panel('a9-stats');
});
document.getElementById('reader-open-a10-btn')?.addEventListener('click', () => {
    document.getElementById('a10-control-center-modal')?.classList.remove('hidden');
    switchA10Panel('a9-stats');
});
document.getElementById('close-a10-modal-btn')?.addEventListener('click', () => {
    document.getElementById('a10-control-center-modal')?.classList.add('hidden');
});

document.querySelectorAll('.a10-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchA10Panel(btn.dataset.panel));
});

function switchA10Panel(panelId) {
    document.querySelectorAll('.a10-nav-btn').forEach(btn => {
        const on = btn.dataset.panel === panelId;
        btn.className = on
            ? "a10-nav-btn bg-amber-600/20 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-xl text-xs font-bold text-left whitespace-nowrap"
            : "a10-nav-btn text-slate-400 hover:text-white px-3 py-2 rounded-xl text-xs font-bold text-left whitespace-nowrap";
    });

    const container = document.getElementById('a10-panel-content');
    if (!container) return;

    if (panelId === 'a9-stats') {
        const today = getLocalTodayString();
        const todayRead = window.readerDailyMins[today] || 0;
        const totalRead = Object.values(window.readerDailyMins).reduce((a, b) => a + b, 0);
        container.innerHTML = `
            <h4 class="text-sm font-extrabold text-amber-400 uppercase tracking-wider">📊 Reading Clock & Polymath Telemetry</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span class="text-[10px] font-bold uppercase text-slate-400 block">Today's Reading</span>
                    <span class="text-2xl font-extrabold font-mono text-emerald-400">${todayRead} mins</span>
                </div>
                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span class="text-[10px] font-bold uppercase text-slate-400 block">Lifetime Reading</span>
                    <span class="text-2xl font-extrabold font-mono text-amber-400">${(totalRead / 60).toFixed(1)} hrs</span>
                </div>
                <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span class="text-[10px] font-bold uppercase text-slate-400 block">Books on Shelf</span>
                    <span class="text-2xl font-extrabold font-mono text-blue-400">${window.readerLibrary.length}</span>
                </div>
            </div>
        `;
    } else if (panelId === 'a8-custom') {
        container.innerHTML = `
            <h4 class="text-sm font-extrabold text-amber-400 uppercase tracking-wider">🪵 3D Wooden Bookshelf Customizer</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                    <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">Books Per Row (2–8)</label>
                    <input type="number" min="2" max="8" value="${window.readerSettings.booksPerRow}" onchange="window.updateShelfGridCapacity('cols', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-mono text-white">
                </div>
                <div>
                    <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">Plank Height (px)</label>
                    <input type="number" min="160" max="320" step="10" value="${window.readerSettings.shelfHeightPx}" onchange="window.updateShelfGridCapacity('height', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-mono text-white">
                </div>
                <div>
                    <label class="text-[10px] font-bold uppercase text-slate-400 block mb-1">Wood Grain Theme</label>
                    <select onchange="window.applyWoodThemeStyle(this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white">
                        ${['walnut', 'mahogany', 'oak', 'ebony', 'pine', 'cyber'].map(w => `<option value="${w}" ${window.readerSettings.woodTheme === w ? 'selected' : ''}>${w.toUpperCase()}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <h4 class="text-sm font-extrabold text-amber-400 uppercase tracking-wider">☁️ Local Folder, Cloud Format & Module Status</h4>
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 text-xs text-slate-300">
                <div class="flex justify-between items-center">
                    <span>Plug-and-Play Module <b>05-pomo-doc.js (PomoDoc)</b>:</span>
                    <span class="font-mono font-bold text-emerald-400">${window.PomoReaderCore.isModuleLoaded('pomodoc') ? '✅ Attached' : '⚪ Detached'}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span>Plug-and-Play Module <b>06-pomo-note.js (PomoNote)</b>:</span>
                    <span class="font-mono font-bold text-emerald-400">${window.PomoReaderCore.isModuleLoaded('pomonote') ? '✅ Attached' : '⚪ Detached'}</span>
                </div>
            </div>
        `;
    }
}

/* ==========================================================================
   9. BOOTSTRAP POMOREADER PRO ENGINE
   ========================================================================== */
(function initPomoReaderEngine() {
    applyShelfCapacityCssVariables();
    hydrateBookCoversAndHandles();
})();
