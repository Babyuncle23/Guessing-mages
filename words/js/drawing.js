// js/drawing.js — Финальное исправление ластика и тач-координат
(function() {
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = "draw";
    
    let canvas, ctx, overlay;

    const resizeCanvas = () => {
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        // Сохраняем текущий рисунок во временную память перед изменением размеров
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0);
        }

        canvas.width = rect.width;
        canvas.height = rect.height;

        updateBrushSettings();

        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height);
        }
    };

    // НАСТОЯЩИЙ ИДЕАЛЬНЫЙ ЛАСТИК БЕЗ ЦВЕТНЫХ ПЯТЕН
    const updateBrushSettings = () => {
        if (!ctx) return;
        if (currentTool === "erase") {
            // Режим 'destination-out' заставляет кисть стирать нарисованное до полной прозрачности!
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 28; // Делаем ластик пошире для удобства
        } else {
            // Режим 'source-over' возвращает стандартное рисование поверх холста
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#e5c158'; // Магический золотой цвет
            ctx.lineWidth = 4;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

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
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e) => {
        isDrawing = true;
        const coords = getCoords(e);
        lastX = coords.x;
        lastY = coords.y;
    };

    const draw = (e) => {
        if (!isDrawing) return;
        if (e.cancelable) e.preventDefault(); 
        
        const coords = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        
        lastX = coords.x;
        lastY = coords.y;
    };

    const stopDrawing = () => { isDrawing = false; };

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
        
        currentTool = "draw";
        const btnDraw = document.getElementById('btnToolDraw');
        const btnErase = document.getElementById('btnToolErase');
        if (btnDraw && btnErase) {
            btnDraw.style.background = "var(--gold)"; btnDraw.style.color = "#000";
            btnErase.style.background = "rgba(255,255,255,0.06)"; btnErase.style.color = "#fff";
        }

        ctx = canvas.getContext('2d');
        
        resizeCanvas();
        setTimeout(resizeCanvas, 50);
    };

    window.clearGameCanvas = () => {
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
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

        const btnDraw = document.getElementById('btnToolDraw');
        const btnErase = document.getElementById('btnToolErase');

        if (btnDraw && btnErase) {
            btnDraw.addEventListener('click', () => {
                currentTool = "draw";
                btnDraw.style.background = "var(--gold)"; btnDraw.style.color = "#000";
                btnErase.style.background = "rgba(255,255,255,0.06)"; btnErase.style.color = "#fff";
                updateBrushSettings();
                if (typeof playClickSound === 'function') playClickSound();
            });

            btnErase.addEventListener('click', () => {
                currentTool = "erase";
                btnErase.style.background = "var(--gold)"; btnErase.style.color = "#000";
                btnDraw.style.background = "rgba(255,255,255,0.06)"; btnDraw.style.color = "#fff";
                updateBrushSettings();
                if (typeof playClickSound === 'function') playClickSound();
            });
        }

        const clearBtn = document.getElementById('btnClearModalCanvas');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (typeof playClickSound === 'function') playClickSound();
            });
        }

        const closeBtnX = document.getElementById('btnCloseModalCanvasX');
        if (closeBtnX) {
            closeBtnX.addEventListener('click', () => {
                if (typeof playClickSound === 'function') playClickSound();
                if (overlay) overlay.style.display = 'none';
            });
        }

        const modalGuessed = document.getElementById('btnModalGuessed');
        if (modalGuessed) {
            modalGuessed.addEventListener('click', () => {
                if (typeof playClickSound === 'function') playClickSound();
                if (overlay) overlay.style.display = 'none';
                const mainGuessedBtn = document.getElementById('btnGuessed');
                if (mainGuessedBtn) mainGuessedBtn.click();
            });
        }

        const modalGiveUp = document.getElementById('btnModalGiveUp');
        if (modalGiveUp) {
            modalGiveUp.addEventListener('click', () => {
                if (typeof playClickSound === 'function') playClickSound();
                if (overlay) overlay.style.display = 'none';
                const mainGiveUpBtn = document.getElementById('btnGiveUp');
                if (mainGiveUpBtn) mainGiveUpBtn.click();
            });
        }
    });

    window.addEventListener('resize', () => {
        if (overlay && overlay.style.display === 'flex') {
            resizeCanvas();
        }
    });
})();