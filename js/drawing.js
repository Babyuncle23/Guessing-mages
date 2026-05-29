// js/drawing.js — Финальная версия: исправление тач-скрина и размеров холста
(function() {
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    let canvas, ctx, overlay;

    const resizeCanvas = () => {
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Считываем точные CSS размеры элемента на экране смартфона/ПК
        const rect = canvas.getBoundingClientRect();
        
        // Жестко прописываем внутреннее пиксельное разрешение холста
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Настройки кисти (присваиваются строго после изменения width/height)
        ctx.strokeStyle = '#e5c158'; 
        ctx.lineWidth = 4;           
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    // Умный расчет координат для мобильных тач-скринов (исправляет проблему F12/телефонов)
    const getCoords = (e) => {
        const rect = canvas.getBoundingClientRect();
        
        // Масштабные коэффициенты на случай, если внутреннее разрешение отличается от CSS-размеров
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

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
        if (e.cancelable) e.preventDefault(); // Запрещаем скролл страницы пальцем во время рисования
        
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

        // Прячем слова в игре, чтобы не подглядывали
        if (typeof wordList !== 'undefined' && typeof btnDisplayWords !== 'undefined') {
            wordList.classList.add("hidden-words");
            btnDisplayWords.textContent = "👁️ Näytä sanat (vain selittäjälle)";
            isWordListHidden = true; 
        }

        // Показываем окно
        overlay.style.display = 'flex';
        
        // Мгновенный пересчет пикселей, чтобы тач-скрин сразу начал рисовать
        resizeCanvas();
        
        // Страховочный микро-таймаут для медленных мобильных процессоров
        setTimeout(resizeCanvas, 30);
    };

    window.clearGameCanvas = () => {
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Подключение прослушивателей событий (один раз при старте приложения)
    document.addEventListener('DOMContentLoaded', () => {
        canvas = document.getElementById('drawingModalCanvas');
        overlay = document.getElementById('drawingModalOverlay');
        
        if (canvas) {
            // Обычная мышь
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);

            // Тач-события для смартфонов и F12 эмулятора
            canvas.addEventListener('touchstart', startDrawing, { passive: false });
            canvas.addEventListener('touchmove', draw, { passive: false });
            canvas.addEventListener('touchend', stopDrawing);
            canvas.addEventListener('touchcancel', stopDrawing);
        }

        const clearBtn = document.getElementById('btnClearModalCanvas');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (typeof playClickSound === 'function') playClickSound();
            });
        }

        const closeBtn = document.getElementById('btnCloseModalCanvas');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (typeof playClickSound === 'function') playClickSound();
                if (overlay) overlay.style.display = 'none';
            });
        }
    });

    window.addEventListener('resize', () => {
        if (overlay && overlay.style.display === 'flex') {
            resizeCanvas();
        }
    });
})();