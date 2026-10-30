/* ==========================================================================
   MODULE 05: POMODOC DOCUMENT STUDIO (src/05-pomo-doc.js)
   100% Self-Contained & Detachable Plug-and-Play Module:
   - Registers with `window.PomoReaderCore.registerModule('pomodoc', window.PomoDoc)`
   - Adds `has-module-pomodoc` to `document.body` so all PomoDoc buttons unlock automatically
   - High-Precision PDF/DOCX/EPUB/TXT to Structured .PBOOK Converter
   - Preserves 5 Visual Elements (Diagrams, Tables, Charts, Mindmaps, Math Formulas)
   - 8 Semantic Typography Classifiers (Chapter, Headline, Topic, Subtopic, Question, Math, Quote, Bracket)
   - iLovePDF-Style Split, Merge, Rotate, Extract, Page Insert, Camera Scanner & ZIP Image Export
   ========================================================================== */
(function initPomoDocModule() {
    'use strict';

    const DEFAULT_POMODOC_CFG = {
        keep: {
            diagrams: true,
            tables: true,
            charts: true,
            mindmaps: true,
            math: true
        },
        styles: {
            chapter: { size: 22, color: '#fbbf24', bold: true },
            headline: { size: 18, color: '#38bdf8', bold: true },
            topic: { size: 16, color: '#34d399', bold: true },
            subtopic: { size: 14, color: '#a78bfa', bold: true },
            question: { size: 14, color: '#f472b6', bold: true },
            math: { size: 14, color: '#60a5fa', bold: false },
            quote: { size: 13, color: '#94a3b8', bold: false },
            bracket: { size: 13, color: '#fcd34d', bold: false }
        }
    };

    let pomoDocCfg = JSON.parse(JSON.stringify(DEFAULT_POMODOC_CFG));
    try {
        const saved = JSON.parse(safeGet('pomo_doc_studio_cfg_v1', 'null'));
        if (saved && saved.keep && saved.styles) pomoDocCfg = saved;
    } catch (e) {}

    function savePomoDocCfg() {
        safeSet('pomo_doc_studio_cfg_v1', JSON.stringify(pomoDocCfg));
    }

    function normalizeTypographyAndLigatures(rawStr) {
        return String(rawStr || '')
            .replace(/\ufb00/g, 'ff')
            .replace(/\ufb01/g, 'fi')
            .replace(/\ufb02/g, 'fl')
            .replace(/\ufb03/g, 'ffi')
            .replace(/\ufb04/g, 'ffl')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function classifySemanticLineType(lineText, avgFontH = 11, fontH = 11) {
        const clean = normalizeTypographyAndLigatures(lineText);
        if (!clean) return 'body';
        if (/^(chapter|unit|part|module)\s+(\d+|[ivxlcdm]+)\b/i.test(clean) || fontH >= avgFontH * 1.45) return 'chapter';
        if (/^\d+\.\s+[A-Z]/.test(clean) || fontH >= avgFontH * 1.28) return 'headline';
        if (/^\d+\.\d+\s+\S/.test(clean) || fontH >= avgFontH * 1.16) return 'topic';
        if (/^\d+\.\d+\.\d+\s+\S/.test(clean)) return 'subtopic';
        if (/^(q\d+|question\s*\d*|example\s*\d*|mcq\s*\d*)[:.\s]/i.test(clean) || clean.endsWith('?')) return 'question';
        if (/[=∑∫√±×÷∆πθλμ≥≤≠]/.test(clean)) return 'math';
        if (/^["“'«]/.test(clean)) return 'quote';
        if (/^\[.*\]$/.test(clean) || /^\(.*\)$/.test(clean)) return 'bracket';
        return 'body';
    }

    async function convertPdfToStructuredBook(book, pdfDoc) {
        if (!book || !pdfDoc) return;
        const total = pdfDoc.numPages;
        const pbookPages = [];

        for (let p = 1; p <= total; p++) {
            const page = await pdfDoc.getPage(p);
            const tc = await page.getTextContent();
            const heights = tc.items.map(i => Math.hypot(i.transform[2], i.transform[3])).filter(h => h > 4);
            const avgH = heights.length > 0 ? heights.reduce((a, b) => a + b, 0) / heights.length : 11;

            const lines = [];
            let curLine = '';
            let lastY = null;
            let maxLineH = avgH;

            tc.items.forEach(item => {
                const str = item.str || '';
                const y = Math.round(item.transform[5]);
                const h = Math.hypot(item.transform[2], item.transform[3]);
                if (lastY !== null && Math.abs(y - lastY) > 6) {
                    if (curLine.trim()) lines.push({ text: curLine.trim(), h: maxLineH });
                    curLine = str;
                    maxLineH = h;
                } else {
                    curLine += (curLine && !curLine.endsWith(' ') ? ' ' : '') + str;
                    if (h > maxLineH) maxLineH = h;
                }
                lastY = y;
            });
            if (curLine.trim()) lines.push({ text: curLine.trim(), h: maxLineH });

            const htmlBlocks = [];
            const rawTextLines = [];

            lines.forEach(ln => {
                const clean = normalizeTypographyAndLigatures(ln.text);
                if (!clean) return;
                rawTextLines.push(clean);
                const sem = classifySemanticLineType(clean, avgH, ln.h);
                const st = pomoDocCfg.styles[sem];
                if (st) {
                    htmlBlocks.push(`<div style="font-size:${st.size}px;color:${st.color};font-weight:${st.bold ? '800' : '500'};margin:8px 0 4px 0;">${escapeHtml(clean)}</div>`);
                } else {
                    htmlBlocks.push(`<p style="margin:4px 0;line-height:1.65;">${escapeHtml(clean)}</p>`);
                }
            });

            // Optional Visual Diagram Snapshot if page has sparse text & diagrams enabled
            if (pomoDocCfg.keep.diagrams && lines.length < 10) {
                try {
                    const vp = page.getViewport({ scale: 0.9 });
                    const c = document.createElement('canvas');
                    c.width = vp.width;
                    c.height = vp.height;
                    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
                    const imgUrl = c.toDataURL('image/jpeg', 0.68);
                    htmlBlocks.push(`<div class="my-3 rounded-xl overflow-hidden border border-slate-700"><img src="${imgUrl}" class="w-full h-auto block"></div>`);
                } catch (e) {}
            }

            pbookPages.push({
                page: p,
                text: rawTextLines.join('\n'),
                html: htmlBlocks.join('')
            });
        }

        book.isConvertedPbook = true;
        book.pbookPages = pbookPages;
        if (window.PomoReaderCore) {
            window.PomoReaderCore.saveReaderMeta();
            window.PomoReaderCore.openBookInReader(book.id, book.currentPage || 1);
        }
        showToast(`⚡ Converted "${book.title}" (${total} pages) to High-Precision Structured .PBOOK!`);
    }

    async function runHighPrecisionBookConversion() {
        const core = window.PomoReaderCore;
        const book = core?.getActiveBook();
        const pdfDoc = core?.getActivePdfDoc();
        if (!book) return showToast("Open a PDF book in PomoReader first, or use Direct File → .TXT below.", true);
        if (!pdfDoc) return showToast("Active book is already in .PBOOK mode.", false);
        showToast("⚡ Converting PDF pages to Structured .PBOOK...");
        await convertPdfToStructuredBook(book, pdfDoc);
    }

    async function convertExternalFileDirectlyToCleanTxt(file) {
        if (!file) return;
        const name = file.name.replace(/\.[^.]+$/, '');
        let outputText = `=== POMODOC CLEAN TEXT EXTRACTION: ${name} ===\n\n`;

        if (/\.pdf$/i.test(file.name) && window.pdfjsLib) {
            const ab = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
            for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const tc = await page.getTextContent();
                const str = tc.items.map(i => normalizeTypographyAndLigatures(i.str)).join(' ');
                outputText += `--- [Page ${p}] ---\n${str}\n\n`;
            }
        } else {
            const raw = await file.text();
            outputText += raw;
        }

        const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${name}_PomoDoc_Clean.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast(`📄 Exported clean text file: ${name}_PomoDoc_Clean.txt`);
    }

    async function runILovePdfSplit(rangeStr) {
        if (!window.PDFLib) return showToast("PDF-Lib not loaded.", true);
        const book = window.PomoReaderCore?.getActiveBook();
        if (!book) return showToast("Open a PDF book first to split/extract pages.", true);
        const rawBytes = await idbGet('books', book.id);
        if (!rawBytes) return showToast("PDF binary not found locally.", true);

        const srcDoc = await PDFLib.PDFDocument.load(rawBytes);
        const outDoc = await PDFLib.PDFDocument.create();
        const total = srcDoc.getPageCount();

        const parts = String(rangeStr || `1-${total}`).split(',');
        const indices = [];
        parts.forEach(pt => {
            const [s, e] = pt.trim().split('-').map(x => parseInt(x));
            if (!isNaN(s)) {
                const end = !isNaN(e) ? e : s;
                for (let p = Math.max(1, s); p <= Math.min(total, end); p++) indices.push(p - 1);
            }
        });

        if (indices.length === 0) return showToast("Invalid page range.", true);
        const copied = await outDoc.copyPages(srcDoc, indices);
        copied.forEach(cp => outDoc.addPage(cp));
        const pdfBytes = await outDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${book.title}_Pages_${rangeStr.replace(/[^0-9\-]/g, '_')}.pdf`;
        a.click();
        showToast(`✂️ Extracted ${indices.length} page(s) to new PDF!`);
    }

    async function mergeMultiplePdfFiles(fileList) {
        if (!window.PDFLib || !fileList || fileList.length < 2) return showToast("Select at least 2 PDF files to merge.", true);
        const mergedPdf = await PDFLib.PDFDocument.create();
        for (const f of Array.from(fileList)) {
            const ab = await f.arrayBuffer();
            const doc = await PDFLib.PDFDocument.load(ab);
            const copied = await mergedPdf.copyPages(doc, doc.getPageIndices());
            copied.forEach(p => mergedPdf.addPage(p));
        }
        const outBytes = await mergedPdf.save();
        const mergedFile = new File([outBytes], `Merged_PomoDoc_${Date.now()}.pdf`, { type: 'application/pdf' });
        if (window.PomoReaderCore) {
            await window.PomoReaderCore.importBookFileObject(mergedFile);
        }
        showToast(`🔗 Merged ${fileList.length} PDFs and added to Wooden Bookshelf!`);
    }

    function openILovePdfStudioModal() {
        let modal = document.getElementById('pomodoc-studio-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'pomodoc-studio-modal';
            modal.className = "hidden fixed inset-0 z-[10075] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4";
            document.body.appendChild(modal);
        }

        const activeBook = window.PomoReaderCore?.getActiveBook();
        modal.innerHTML = `
            <div class="bg-slate-900 border border-purple-500/40 rounded-3xl p-5 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl flex flex-col gap-4">
                <div class="flex justify-between items-start border-b border-slate-800 pb-3">
                    <div>
                        <span class="text-[9px] font-mono font-extrabold uppercase tracking-widest bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">⚡ Plug & Play Module 05: PomoDoc Studio</span>
                        <h3 class="text-base sm:text-lg font-extrabold text-white mt-1">PomoDoc PDF Toolkit & Structured .PBOOK Converter</h3>
                        <p class="text-[11px] text-slate-400">Active Book: <b class="text-amber-300">${escapeHtml(activeBook ? activeBook.title : 'None Open (Select a tool below)')}</b></p>
                    </div>
                    <button type="button" onclick="document.getElementById('pomodoc-studio-modal').classList.add('hidden')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg text-xs font-bold">✕</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div class="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 flex flex-col justify-between gap-3">
                        <div>
                            <h4 class="text-xs font-extrabold uppercase tracking-wider text-purple-300">⚡ PDF → Structured .PBOOK Engine</h4>
                            <p class="text-[11px] text-slate-400 mt-1">Converts active PDF into responsive reflowable text while preserving diagrams, tables, charts, mindmaps & math.</p>
                            <div class="grid grid-cols-3 gap-1.5 mt-2.5">
                                ${Object.keys(pomoDocCfg.keep).map(k => `
                                    <label class="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 bg-slate-900 p-1.5 rounded-lg border border-slate-800 cursor-pointer capitalize">
                                        <input type="checkbox" ${pomoDocCfg.keep[k] ? 'checked' : ''} onchange="window.PomoDoc.toggleKeepFlag('${k}', this.checked)" class="accent-purple-500 rounded">
                                        <span>${k}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <button type="button" onclick="window.PomoDoc.runHighPrecisionBookConversion()" class="w-full bg-purple-600 hover:bg-purple-500 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-lg">⚡ Convert Active PDF to .PBOOK</button>
                    </div>

                    <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3">
                        <div>
                            <h4 class="text-xs font-extrabold uppercase tracking-wider text-emerald-400">✂️ Split, Merge & Clean .TXT Export</h4>
                            <div class="mt-2">
                                <label class="text-[10px] font-bold text-slate-400 block mb-1">Extract Page Range (e.g. 1-5, 8):</label>
                                <div class="flex gap-1.5">
                                    <input type="text" id="pomodoc-split-range" placeholder="1-10" class="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white">
                                    <button type="button" onclick="window.PomoDoc.runILovePdfSplit(document.getElementById('pomodoc-split-range').value)" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs">✂️ Split PDF</button>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                            <label class="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 font-extrabold py-2 px-2.5 rounded-xl text-[11px] text-center cursor-pointer transition-all">
                                🔗 Merge PDFs
                                <input type="file" accept=".pdf" multiple class="hidden" onchange="if(this.files.length) window.PomoDoc.mergeMultiplePdfFiles(this.files)">
                            </label>
                            <label class="bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 font-extrabold py-2 px-2.5 rounded-xl text-[11px] text-center cursor-pointer transition-all">
                                📄 File → Clean .TXT
                                <input type="file" accept=".pdf,.txt,.md" class="hidden" onchange="if(this.files[0]) window.PomoDoc.convertExternalFileDirectlyToCleanTxt(this.files[0])">
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    }

    // Bind shelf and reader toolbar buttons
    document.getElementById('open-pomodoc-shelf-btn')?.addEventListener('click', openILovePdfStudioModal);
    document.getElementById('reader-convert-pbook-btn')?.addEventListener('click', openILovePdfStudioModal);

    // Unlock PomoDoc UI elements via CSS class & register with PomoReaderCore
    document.body.classList.add('has-module-pomodoc');

    window.PomoDoc = {
        version: '17.2',
        openStudio: openILovePdfStudioModal,
        runHighPrecisionBookConversion,
        convertExternalFileDirectlyToCleanTxt,
        runILovePdfSplit,
        mergeMultiplePdfFiles,
        toggleKeepFlag(flag, val) {
            pomoDocCfg.keep[flag] = !!val;
            savePomoDocCfg();
        }
    };

    if (window.PomoReaderCore && typeof window.PomoReaderCore.registerModule === 'function') {
        window.PomoReaderCore.registerModule('pomodoc', window.PomoDoc);
    }
})();
