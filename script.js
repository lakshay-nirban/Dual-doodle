document.addEventListener('DOMContentLoaded', () => {

    // --- Get View Elements ---
    const loginView = document.getElementById('login-view');
    const lobbyView = document.getElementById('lobby-view');
    const drawingView = document.getElementById('drawing-view');

    // --- Get Navigation Elements ---
    const loginForm = document.getElementById('login-form');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const startDrawingBtn = document.getElementById('start-drawing-btn');

    // --- Get Drawing Elements ---
    const canvas = document.getElementById('player1-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const canvas2 = document.getElementById('player2-canvas');
    const ctx2 = canvas2.getContext('2d');

    // Tool Palette buttons
    const toolBtns = document.querySelectorAll('.tool-palette .tool');
    
    // Top Bar controls
    const colorPicker = document.getElementById('color-picker');
    const colorSwatches = document.querySelectorAll('.swatch');
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');
    const saveBtn = document.getElementById('save-btn');
    const undoBtn = document.getElementById('undo-btn'); // Now a separate button

    // --- View Navigation ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loginView.classList.add('hidden');
        lobbyView.classList.remove('hidden');
    });

    copyLinkBtn.addEventListener('click', () => {
        copyLinkBtn.textContent = 'Copied!';
        setTimeout(() => { copyLinkBtn.textContent = 'Copy'; }, 2000);
    });

    startDrawingBtn.addEventListener('click', () => {
        lobbyView.classList.add('hidden');
        drawingView.classList.remove('hidden');
        resizeAllCanvases();
    });

    // --- Drawing Logic ---
    let isDrawing = false;
    let currentTool = 'pen';
    let drawSize = 5;
    let drawColor = '#000000';
    let canvasBgColor = '#ffffff';

    // --- Shape-Drawing State ---
    let startPos = { x: 0, y: 0 };
    let shapePreviewSnapshot = null;

    // --- Undo History ---
    let historyStack = [];
    const historyLimit = 20;

    // --- Canvas Sizing ---
    function resizeAllCanvases() {
        // Player 1
        const wrapper1 = document.getElementById('your-half');
        canvas.width = wrapper1.clientWidth;
        canvas.height = wrapper1.clientHeight;
        ctx.fillStyle = canvasBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Player 2
        const wrapper2 = document.getElementById('other-half');
        canvas2.width = wrapper2.clientWidth;
        canvas2.height = wrapper2.clientHeight;
        ctx2.fillStyle = '#f8f9fa'; // Locked background
        ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
        
        saveState(); // Save the initial blank state
    }
    window.addEventListener('resize', resizeAllCanvases);

    // --- Drawing Functions ---
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function resetCanvasStyles(context) {
        context.shadowBlur = 0;
        context.globalAlpha = 1.0;
        context.setLineDash([]);
    }

    function isShapeTool() {
        return currentTool === 'circle' || currentTool === 'square' || currentTool === 'rectangle' ||
               currentTool === 'line' || currentTool === 'triangle' || currentTool === 'oval';
    }

    function startDrawing(e) {
        if (currentTool === 'bucket') return;
        
        saveState();
        isDrawing = true;
        const { x, y } = getMousePos(e);
        
        startPos = { x, y };

        resetCanvasStyles(ctx);

        if (isShapeTool()) {
            shapePreviewSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } else {
            ctx.beginPath();
            ctx.moveTo(x, y);

            resetCanvasStyles(ctx2);
            ctx2.beginPath();
            ctx2.moveTo(x + 10, y + 10);
        }
    }

    function draw(e) {
        if (!isDrawing) return;
        
        const { x, y } = getMousePos(e);

        if (isShapeTool()) {
            if (shapePreviewSnapshot) {
                ctx.putImageData(shapePreviewSnapshot, 0, 0);
            }
            drawShapePreview(startPos.x, startPos.y, x, y, currentTool, ctx);

        } else {
            ctx.lineWidth = drawSize;
            ctx.lineCap = 'round';

            if (currentTool === 'pen') {
                ctx.strokeStyle = drawColor;
            } else if (currentTool === 'eraser') {
                ctx.strokeStyle = canvasBgColor;
            } else if (currentTool === 'brush') {
                ctx.strokeStyle = drawColor;
                ctx.shadowBlur = drawSize;
                ctx.shadowColor = drawColor;
            }
            ctx.lineTo(x, y);
            ctx.stroke();

            ctx2.lineWidth = 5;
            ctx2.lineCap = 'round';
            ctx2.strokeStyle = '#e63946';
            ctx2.lineTo(x + 10, y + 10);
            ctx2.stroke();
        }
    }

    function stopDrawing(e) {
        if (!isDrawing) return;
        isDrawing = false;
        
        const { x, y } = getMousePos(e);

        if (isShapeTool()) {
            if (shapePreviewSnapshot) {
                ctx.putImageData(shapePreviewSnapshot, 0, 0);
            }
            drawShapeFinal(startPos.x, startPos.y, x, y, currentTool, ctx);
            drawShapeFinal(startPos.x + 10, startPos.y + 10, x + 10, y + 10, currentTool, ctx2, true);
            shapePreviewSnapshot = null;
        }

        resetCanvasStyles(ctx);
        resetCanvasStyles(ctx2);
    }

    // --- Shape Drawing Functions ---
    function drawShapePreview(startX, startY, endX, endY, tool, context) {
        context.strokeStyle = drawColor;
        context.lineWidth = drawSize;
        context.setLineDash([5, 5]);

        context.beginPath();
        drawShapeLogic(startX, startY, endX, endY, tool, context);
        context.stroke();
        
        context.setLineDash([]);
    }

    function drawShapeFinal(startX, startY, endX, endY, tool, context, isSimulation = false) {
        if (isSimulation) {
            context.strokeStyle = '#e63946';
            context.lineWidth = 5;
        } else {
            context.strokeStyle = drawColor;
            context.lineWidth = drawSize;
        }
        
        context.beginPath();
        drawShapeLogic(startX, startY, endX, endY, tool, context);
        context.stroke();
    }
    
    function drawShapeLogic(startX, startY, endX, endY, tool, context) {
        let width = endX - startX;
        let height = endY - startY;

        switch (tool) {
            case 'line':
                context.moveTo(startX, startY);
                context.lineTo(endX, endY);
                break;
            case 'triangle':
                context.moveTo(startX, startY);
                context.lineTo(startX, endY);
                context.lineTo(endX, endY);
                context.closePath();
                break;
            case 'rectangle':
                context.rect(startX, startY, width, height);
                break;
            case 'square':
                let side = Math.max(Math.abs(width), Math.abs(height));
                let signX = width < 0 ? -1 : 1;
                let signY = height < 0 ? -1 : 1;
                context.rect(startX, startY, side * signX, side * signY);
                break;
            case 'circle':
                let c_side = Math.max(Math.abs(width), Math.abs(height));
                let c_signX = width < 0 ? -1 : 1;
                let c_signY = height < 0 ? -1 : 1;
                let c_width = c_side * c_signX;
                let c_height = c_side * c_signY;
                context.ellipse(startX + c_width / 2, startY + c_height / 2, Math.abs(c_width / 2), Math.abs(c_height / 2), 0, 0, 2 * Math.PI);
                break;
            case 'oval':
                context.ellipse(startX + width / 2, startY + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, 2 * Math.PI);
                break;
        }
    }
    
    // --- Handle Bucket Click ---
    function handleBucketClick(e) {
        if (currentTool !== 'bucket') return;
        
        const { x, y } = getMousePos(e);
        const startX = Math.floor(x);
        const startY = Math.floor(y);

        const targetColor = getPixelColor(startX, startY);
        const fillColor = hexToRgba(drawColor);

        if (colorsMatch(targetColor, fillColor)) return;
        
        saveState();
        floodFill(startX, startY, fillColor);
    }

    // --- Flood Fill Algorithm ---
    function hexToRgba(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length == 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length == 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }
        return { r, g, b, a: 255 };
    }

    function getPixelColor(x, y) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
    }

    function colorsMatch(c1, c2, tolerance = 0) {
        if (tolerance > 0) {
            return Math.abs(c1.r - c2.r) <= tolerance &&
                   Math.abs(c1.g - c2.g) <= tolerance &&
                   Math.abs(c1.b - c2.b) <= tolerance &&
                   Math.abs(c1.a - c2.a) <= tolerance;
        }
        return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
    }

    function floodFill(startX, startY, fillColor) {
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const data = imageData.data;
        
        const targetColor = getPixelColor(startX, startY);

        if (colorsMatch(targetColor, fillColor)) {
            return;
        }

        const queue = [[startX, startY]];
        const visited = new Set();
        
        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const pixelKey = `${x},${y}`;

            if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight || visited.has(pixelKey)) {
                continue;
            }

            const index = (y * canvasWidth + x) * 4;
            const currentColor = { r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] };

            if (colorsMatch(currentColor, targetColor, 10)) { // 10 = tolerance
                data[index] = fillColor.r;
                data[index + 1] = fillColor.g;
                data[index + 2] = fillColor.b;
                data[index + 3] = fillColor.a;

                visited.add(pixelKey);

                queue.push([x + 1, y]);
                queue.push([x - 1, y]);
                queue.push([x, y + 1]);
                queue.push([x, y - 1]);
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    // --- Undo Functions ---
    function saveState() {
        if (historyStack.length >= historyLimit) {
            historyStack.shift();
        }
        historyStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    function undoLast() {
        if (historyStack.length > 1) { 
            historyStack.pop();
            const prevState = historyStack[historyStack.length - 1];
            ctx.putImageData(prevState, 0, 0);
        } else if (historyStack.length === 1) {
            const prevState = historyStack[0];
            ctx.putImageData(prevState, 0, 0);
        }
    }

    // --- Event Listeners (Updated for new layout) ---
    
    // Canvas Listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousedown', handleBucketClick);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Tool Palette Listeners
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.tool.active').classList.remove('active');
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
            
            canvas.style.cursor = (currentTool === 'bucket') ? 'pointer' : 'crosshair';
        });
    });

    // Top Bar Listeners
    colorPicker.addEventListener('input', (e) => {
        drawColor = e.target.value;
    });

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            drawColor = swatch.dataset.color;
            colorPicker.value = drawColor; 
        });
    });

    sizeSlider.addEventListener('input', (e) => {
        drawSize = e.target.value;
        sizeValue.textContent = drawSize;
    });

    saveBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'dual-doodle.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
    
    // Separate listener for the Undo button
    undoBtn.addEventListener('click', undoLast);
});