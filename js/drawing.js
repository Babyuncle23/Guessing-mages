// js/drawing.js — векторная рисовалка: история штрихов, rAF-рендер, undo, режим "näkymätön muste"
(function() {
    const GHOST_FADE_MS = 3500; // Время полного исчезновения штриха в режиме "näkymätön muste"

    let canvas, ctx, overlay;
    let isDrawing = false;
    let currentTool = "draw";
    let strokes = [];           // [{ tool: 'draw'|'erase', points: [{x,y} в долях 0..1], t: timestamp }]
    let currentStroke = null;
    let rafId = null;

    const isGhostMode = () =>
        typeof currentActiveTheme !== 'undefined' && currentActiveTheme === "näkymätön muste";

    // Координаты события в нормализованном виде (0..1) — переживают resize канваса
    const getNormCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        }

        return {
            x: (clientX - rect.left) / rect.width,
            y: (clientY - rect.top) / rect.height
        };
    };

    // Воспроизведение одного штриха сглаженной кривой (как в старой версии)
    const replayStrokePath = (s) => {
        const pts = s.points;
        if (pts.length === 0) return;

        const W = canvas.width, H = canvas.height;
        ctx.beginPath();
        ctx.moveTo(pts[0].x * W, pts[0].y * H);

        if (pts.length === 1) {
            // Точка: линия нулевой длины с круглым lineCap
            ctx.lineTo(pts[0].x * W, pts[0].y * H);
            return;
        }
        for (let i = 1; i < pts.length - 1; i++) {
            const midX = (pts[i].x + pts[i + 1].x) / 2 * W;
            const midY = (pts[i].y + pts[i + 1].y) / 2 * H;
            ctx.quadraticCurveTo(pts[i].x * W, pts[i].y * H, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x * W, pts[pts.length - 1].y * H);
    };

    // Полная перерисовка сцены из истории штрихов
    const render = (now) => {
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const ghost = isGhostMode();
        if (ghost) {
            // Выкинуть полностью исчезнувшие мазки (ластик не исчезает)
            strokes = strokes.filter(s => s.tool === 'erase' || (now - s.t) < GHOST_FADE_MS);
        }

        for (const s of strokes) {
            const alpha = (ghost && s.tool === 'draw')
                ? Math.max(0, 1 - (now - s.t) / GHOST_FADE_MS)
                : 1;
            if (alpha <= 0) continue;

            ctx.globalAlpha = alpha;
            if (s.tool === 'erase') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = 28;
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = '#e5c158';
                ctx.lineWidth = 4;
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            replayStrokePath(s);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    };

    // rAF-цикл живёт только пока открыта модалка
    const loop = (now) => {
        render(now);
        rafId = requestAnimationFrame(loop);
    };

    const startLoop = () => {
        if (rafId === null) rafId = requestAnimationFrame(loop);
    };

    // Останавливает ВСЕ фоновые задачи рисовалки. Вызывается при закрытии модалки и из endRound.
    window.stopDrawingIntervals = () => {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (window.inkFadeInterval) { // легаси-страховка
            clearInterval(window.inkFadeInterval);
            window.inkFadeInterval = null;
        }
    };

    window.clearGameCanvas = () => {
        strokes.length = 0;
        currentStroke = null;
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const resizeCanvas = () => {
        if (!canvas || !ctx) return;
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        // Штрихи хранятся в долях (0..1) — при изменении размера просто перерисуем
        canvas.width = rect.width;
        canvas.height = rect.height;
        render(performance.now());
    };

    const updateToolButtons = () => {
        const btnDraw = document.getElementById('btnToolDraw');
        const btnErase = document.getElementById('btnToolErase');
        if (!btnDraw || !btnErase) return;
        const active = { bg: 'var(--gold)', color: '#000' };
        const idle = { bg: 'rgba(255,255,255,0.06)', color: '#fff' };
        const draw = currentTool === 'draw' ? active : idle;
        const erase = currentTool === 'erase' ? active : idle;
        btnDraw.style.background = draw.bg; btnDraw.style.color = draw.color;
        btnErase.style.background = erase.bg; btnErase.style.color = erase.color;
    };

    const startDrawing = (e) => {
        if (!ctx) return;
        isDrawing = true;
        currentStroke = { tool: currentTool, points: [getNormCoords(e)], t: performance.now() };
        strokes.push(currentStroke);
    };

    // Huonepeli: livenä striimattava osittainen vedos (~80 ms välein)
    let lastLiveSend = 0;
    const draw = (e) => {
        if (!isDrawing || !currentStroke) return;
        if (e.cancelable) e.preventDefault();
        currentStroke.points.push(getNormCoords(e));
        const now = performance.now();
        if (now - lastLiveSend > 80 && typeof window.netRelayDraw === 'function') {
            lastLiveSend = now;
            window.netRelayDraw({ action: 'live', tool: currentStroke.tool, points: currentStroke.points });
        }
    };

    const stopDrawing = () => {
        if (isDrawing && currentStroke && currentStroke.points.length > 0 &&
            typeof window.netRelayDraw === 'function') {
            window.netRelayDraw({
                action: 'stroke',
                tool: currentStroke.tool,
                points: currentStroke.points,
                age: performance.now() - currentStroke.t
            });
        }
        isDrawing = false;
        currentStroke = null;
    };

    window.openDrawingModal = () => {
        overlay = document.getElementById('drawingModalOverlay');
        canvas = document.getElementById('drawingModalCanvas');
        if (!overlay || !canvas) return;

        if (typeof wordList !== 'undefined' && typeof btnDisplayWords !== 'undefined') {
            wordList.classList.add("hidden-words");
            btnDisplayWords.textContent = "👁️ Näytä sanat (vain selittäjälle)";
            isWordListHidden = true;
        }

        overlay.style.display = 'flex';
        // getBoundingClientRect pakottaa layoutin — mitat ovat jo oikeat.
        // Vieraan ruutu on eri kuvasuhteessa → lähetetään omat mitat,
        // jotta vieras voi piirtää letterboxoituna ilman vääntymistä.
        const r0 = canvas.getBoundingClientRect();
        if (typeof window.netRelayDraw === 'function') {
            window.netRelayDraw({ action: 'open', w: r0.width || 400, h: r0.height || 500 });
        }

        currentTool = "draw";
        updateToolButtons();

        ctx = canvas.getContext('2d');
        resizeCanvas();
        setTimeout(resizeCanvas, 50);

        startLoop(); // рендер-цикл: рисует штрихи и гаснущие линии в режиме näkymätön muste
    };

    const closeModal = () => {
        if (typeof playClickSound === 'function') playClickSound();
        window.stopDrawingIntervals();
        if (overlay) overlay.style.display = 'none';
        if (typeof window.restoreHiddenWords === 'function') window.restoreHiddenWords();
        if (typeof window.netRelayDraw === 'function') window.netRelayDraw({ action: 'close' });
    };

    document.addEventListener('DOMContentLoaded', () => {
        canvas = document.getElementById('drawingModalCanvas');
        overlay = document.getElementById('drawingModalOverlay');

        if (canvas) {
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);

            canvas.addEventListener('touchstart', startDrawing, { passive: false });
            canvas.addEventListener('touchmove', draw, { passive: false });
            canvas.addEventListener('touchend', stopDrawing);
            canvas.addEventListener('touchcancel', stopDrawing);
        }

        document.getElementById('btnToolDraw')?.addEventListener('click', () => {
            currentTool = "draw";
            updateToolButtons();
            if (typeof playClickSound === 'function') playClickSound();
        });

        document.getElementById('btnToolErase')?.addEventListener('click', () => {
            currentTool = "erase";
            updateToolButtons();
            if (typeof playClickSound === 'function') playClickSound();
        });

        document.getElementById('btnUndoStroke')?.addEventListener('click', () => {
            strokes.pop(); // Убираем последний штрих — перерисует rAF-цикл
            if (typeof playClickSound === 'function') playClickSound();
            if (typeof window.netRelayDraw === 'function') window.netRelayDraw({ action: 'undo' });
        });

        document.getElementById('btnClearModalCanvas')?.addEventListener('click', () => {
            window.clearGameCanvas();
            if (typeof playClickSound === 'function') playClickSound();
            if (typeof window.netRelayDraw === 'function') window.netRelayDraw({ action: 'clear' });
        });

        document.getElementById('btnCloseModalCanvasX')?.addEventListener('click', closeModal);

        document.getElementById('btnModalGuessed')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            window.stopDrawingIntervals();
            if (overlay) overlay.style.display = 'none';
            document.getElementById('btnGuessed')?.click();
        });

        document.getElementById('btnModalGiveUp')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            window.stopDrawingIntervals();
            if (overlay) overlay.style.display = 'none';
            // Tietoinen toiminta modaalista — ohitetaan pitkä painallus
            if (typeof window._devConfirmGiveUp === 'function') window._devConfirmGiveUp();
            else document.getElementById('btnGiveUp')?.click();
        });

        // Ryöstö-painike piirtomodaalissa (4+ joukkuemoodi)
        document.getElementById('btnModalStolen')?.addEventListener('click', () => {
            if (typeof playClickSound === 'function') playClickSound();
            window.stopDrawingIntervals();
            if (overlay) overlay.style.display = 'none';
            document.getElementById('btnStolen')?.click();
        });
    });

    window.addEventListener('resize', () => {
        if (overlay && overlay.style.display === 'flex') {
            resizeCanvas();
            // Piirtäjän kuvasuhde muuttui (esim. käännös) — kerro vieraalle
            setTimeout(() => {
                const r = canvas && canvas.getBoundingClientRect();
                if (r && r.width && r.height && typeof window.netRelayDraw === 'function') {
                    window.netRelayDraw({ action: 'resize', w: r.width, h: r.height });
                }
            }, 60);
        }
    });

    // ============ ARVAAJAN CANVAS (read-only live-replay huonepelissä) ============
    let ngCvs = null, ngCtx = null, ngStrokes = [], ngLive = null, ngRaf = null;
    let ngW = null, ngH = null; // lähettäjän kankaan mitat (letterbox-kartoitusta varten)

    // Pidä canvas-bufferi synkissä CSS-koon kanssa (käännös/koko muuttuu)
    const ngSyncSize = () => {
        if (!ngCvs) return;
        const r = ngCvs.getBoundingClientRect();
        const w = Math.round(r.width), h = Math.round(r.height);
        if (w && h && (ngCvs.width !== w || ngCvs.height !== h)) {
            ngCvs.width = w; ngCvs.height = h;
        }
    };

    const ngRender = (now) => {
        if (!ngCtx || !ngCvs) return;
        ngSyncSize();
        const CW = ngCvs.width, CH = ngCvs.height;
        // Yhtenäinen skaala + keskitetty letterbox: lähettäjän koordinaatit
        // (0..1 lähettäjän w×h-alueesta) säilyttävät kuvasuhteen vieraan ruudulla.
        const sw = ngW || CW, sh = ngH || CH;
        const k = Math.min(CW / sw, CH / sh);
        const ox = (CW - sw * k) / 2, oy = (CH - sh * k) / 2;
        const X = (x) => ox + x * sw * k;
        const Y = (y) => oy + y * sh * k;
        ngCtx.clearRect(0, 0, CW, CH);
        // Hienovarainen katkoviivakehys näyttää lähettäjän piirtoalueen
        ngCtx.save();
        ngCtx.strokeStyle = 'rgba(229,193,88,0.16)';
        ngCtx.setLineDash([4, 6]);
        ngCtx.lineWidth = 1;
        ngCtx.strokeRect(ox, oy, sw * k, sh * k);
        ngCtx.restore();
        const ghost = isGhostMode();
        if (ghost) {
            ngStrokes = ngStrokes.filter(s => s.tool === 'erase' || (now - s.t) < GHOST_FADE_MS);
        }
        const all = ngLive ? [...ngStrokes, ngLive] : ngStrokes;
        for (const s of all) {
            const alpha = (ghost && s.tool === 'draw')
                ? Math.max(0, 1 - (now - s.t) / GHOST_FADE_MS)
                : 1;
            if (alpha <= 0) continue;
            ngCtx.globalAlpha = alpha;
            if (s.tool === 'erase') {
                ngCtx.globalCompositeOperation = 'destination-out';
                ngCtx.lineWidth = Math.max(8, 28 * k);
            } else {
                ngCtx.globalCompositeOperation = 'source-over';
                ngCtx.strokeStyle = '#e5c158';
                ngCtx.lineWidth = Math.max(2, 4 * k);
            }
            ngCtx.lineCap = 'round';
            ngCtx.lineJoin = 'round';
            const pts = s.points;
            if (pts.length) {
                ngCtx.beginPath();
                ngCtx.moveTo(X(pts[0].x), Y(pts[0].y));
                if (pts.length === 1) ngCtx.lineTo(X(pts[0].x), Y(pts[0].y));
                for (let i = 1; i < pts.length - 1; i++) {
                    const midX = X((pts[i].x + pts[i + 1].x) / 2);
                    const midY = Y((pts[i].y + pts[i + 1].y) / 2);
                    ngCtx.quadraticCurveTo(X(pts[i].x), Y(pts[i].y), midX, midY);
                }
                ngCtx.lineTo(X(pts[pts.length - 1].x), Y(pts[pts.length - 1].y));
                ngCtx.stroke();
            }
        }
        ngCtx.globalAlpha = 1;
        ngCtx.globalCompositeOperation = 'source-over';
    };

    const ngLoop = (now) => {
        ngRender(now);
        ngRaf = requestAnimationFrame(ngLoop);
    };

    const ngStart = () => {
        ngCvs = document.getElementById('ngCanvas');
        if (!ngCvs) return;
        const rect = ngCvs.getBoundingClientRect();
        ngCvs.width = rect.width || 400;
        ngCvs.height = rect.height || 500;
        ngCtx = ngCvs.getContext('2d');
        if (ngRaf === null) ngRaf = requestAnimationFrame(ngLoop);
    };

    window.netDrawStop = () => {
        if (ngRaf !== null) { cancelAnimationFrame(ngRaf); ngRaf = null; }
        ngStrokes = [];
        ngLive = null;
        ngW = null; ngH = null;
    };

    // Käsittelee selittäjältä tulleet piirtotapahtumat
    window.netDrawEvent = (ev) => {
        // Lähettäjän kangasmitat voivat tulla missä tahansa viestissä
        // (open / resize) — päivitä aina, jotta kuvasuhde pysyy oikeana
        if (ev.w && ev.h) { ngW = ev.w; ngH = ev.h; }
        switch (ev.action) {
            case 'open': {
                const c = document.getElementById('ngCanvas');
                if (c) c.style.display = 'block';
                ngStrokes = [];
                ngLive = null;
                setTimeout(ngStart, 50);
                break;
            }
            case 'resize':
                ngRender(performance.now()); // piirrä uudella kuvasuhteella
                break;
            case 'live':
                ngLive = { tool: ev.tool, points: ev.points, t: performance.now() };
                ngRender(performance.now()); // render heti — rAF voi olla tauolla taustalla olevalta puhelimelta
                break;
            case 'stroke':
                ngLive = null;
                ngStrokes.push({ tool: ev.tool, points: ev.points, t: performance.now() - (ev.age || 0) });
                ngRender(performance.now());
                break;
            case 'undo':
                ngLive = null;
                ngStrokes.pop();
                ngRender(performance.now());
                break;
            case 'clear':
                ngLive = null;
                ngStrokes = [];
                ngRender(performance.now());
                break;
            case 'close':
                window.netDrawStop();
                break;
        }
    };
})();
