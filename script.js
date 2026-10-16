window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('labCanvas');
    const ctx = canvas.getContext('2d');
    const tempDisplay = document.getElementById('tempDisplay');
    const statusDisplay = document.getElementById('statusDisplay');
    const resetBtn = document.getElementById('resetBtn');

    let state = {
        glovesEquipped: false,
        zincCount: 0,
        acidVolume: 0, 
        maxAcidVolume: 100,
        temperature: 25.0,
        isReactionActive: false,
        explosionTriggered: false,
        tick: 0,
        currentStep: 0
    };

    let objects = {
        gloves: { x: 100, y: 340, width: 90, height: 50, targetX: 100, targetY: 340 },
        flask: { x: 425, y: 385, width: 150, height: 170 }, 
        zincBox: { x: 260, y: 355, width: 90, height: 70, targetX: 260, targetY: 355, angle: 0 },
        acidTube: { x: 600, y: 325, width: 35, height: 130, targetX: 600, targetY: 325, angle: 0, liquidLevel: 80 },
        matchstick: { x: 740, y: 380, width: 70, height: 10, targetX: 740, targetY: 380 }
    };

    let activeDragObject = null;
    let dragOffset = { x: 0, y: 0 };
    let bubbles = [];
    let particles = []; 

    const FLASK_MOUTH_Y = 385 - 170; // 215px
    const FLASK_MOUTH_X_MIN = 340; 
    const FLASK_MOUTH_X_MAX = 510;

    function getEventCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches.clientX : e.clientX;
        const clientY = e.touches ? e.touches.clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function checkHit(obj, coords) {
        return coords.x >= obj.x - obj.width/2 && coords.x <= obj.x + obj.width/2 &&
               coords.y >= obj.y - obj.height/2 && coords.y <= obj.y + obj.height/2;
    }

    function startDrag(e) {
        const coords = getEventCoords(e);
        
        if (!state.glovesEquipped) {
            if (checkHit(objects.gloves, coords)) {
                activeDragObject = 'gloves';
                dragOffset.x = coords.x - objects.gloves.x;
                dragOffset.y = coords.y - objects.gloves.y;
            }
            return;
        }

        const order = ['matchstick', 'acidTube', 'zincBox'];
        for (let key of order) {
            if (checkHit(objects[key], coords)) {
                activeDragObject = key;
                dragOffset.x = coords.x - objects[key].x;
                dragOffset.y = coords.y - objects[key].y;
                break;
            }
        }
    }

    function dragMove(e) {
        if (!activeDragObject) return;
        if(e.cancelable) e.preventDefault();
        const coords = getEventCoords(e);
        objects[activeDragObject].targetX = coords.x - dragOffset.x;
        objects[activeDragObject].targetY = coords.y - dragOffset.y;
    }

    function endDrag() {
        activeDragObject = null;
    }

    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', dragMove);
    window.addEventListener('mouseup', endDrag);
    canvas.addEventListener('touchstart', startDrag, { passive: false });
    canvas.addEventListener('touchmove', dragMove, { passive: false });
    window.addEventListener('touchend', endDrag);

    function triggerAudioPop() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let osc = audioCtx.createOscillator();
            let gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(160, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.7, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        } catch(e) {}
    }

    function resetExperiment() {
        state = { glovesEquipped: false, zincCount: 0, acidVolume: 0, maxAcidVolume: 100, temperature: 25.0, isReactionActive: false, explosionTriggered: false, tick: 0, currentStep: 0 };
        objects.gloves = { x: 100, y: 340, width: 90, height: 50, targetX: 100, targetY: 340 };
        objects.zincBox = { x: 260, y: 355, width: 90, height: 70, targetX: 260, targetY: 355, angle: 0 };
        objects.acidTube = { x: 600, y: 325, width: 35, height: 130, targetX: 600, targetY: 325, angle: 0, liquidLevel: 80 };
        objects.matchstick = { x: 740, y: 380, width: 70, height: 10, targetX: 740, targetY: 380 };
        bubbles = [];
        particles = [];
        tempDisplay.innerText = "25.0 °C";
        tempDisplay.className = "metric-val";
        statusDisplay.innerText = "Wear Safety Gloves";
        statusDisplay.style.color = "#0f172a";
        updateStepUI();
    }
    resetBtn.addEventListener('click', resetExperiment);

    function updateStepUI() {
        document.querySelectorAll('.step').forEach((el, index) => {
            if (index === state.currentStep) el.classList.add('active');
            else el.classList.remove('active');
        });
    }

    function drawFlame(x, y) {
        state.tick++;
        let flick = Math.sin(state.tick * 0.6) * 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.quadraticCurveTo(x - 12, y - 8 + flick, x - 24, y);
        ctx.quadraticCurveTo(x - 12, y + 8 + flick, x, y + 6);
        ctx.fillStyle = "#f97316";
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.quadraticCurveTo(x - 6, y - 4, x - 14, y);
        ctx.quadraticCurveTo(x - 6, y + 4, x, y + 3);
        ctx.fillStyle = "#fde047";
        ctx.fill();
    }

    function renderWorkEnvironment() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(0, 390, canvas.width, 60);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(0, 390, canvas.width, 4);

        for (let key in objects) {
            if (key === 'flask') continue;
            let o = objects[key];
            let speed = (activeDragObject === key) ? 0.4 : 0.18;
            o.x += (o.targetX - o.x) * speed;
            o.y += (o.targetY - o.y) * speed;
        }

        let fl = objects.flask;

        if (!state.glovesEquipped) {
            let gl = objects.gloves;
            if (gl.x > 260) {
                state.glovesEquipped = true;
                state.currentStep = 1;
                statusDisplay.innerText = "Add Zinc Granules";
                updateStepUI();
            }
        }

        let zb = objects.zincBox;
        if (state.currentStep === 1 && zb.x > FLASK_MOUTH_X_MIN && zb.x < FLASK_MOUTH_X_MAX && zb.y < FLASK_MOUTH_Y + 120) {
            zb.angle += (Math.PI / 2.5 - zb.angle) * 0.2;
            zb.targetX = fl.x - 45;
            zb.targetY = FLASK_MOUTH_Y - 10;
            if (zb.angle > 1.0 && state.zincCount < 15) {
                state.zincCount += 0.5;
                if (Math.random() < 0.3) {
                    particles.push({ x: zb.x + 30, y: zb.y, vx: 0, vy: 5 });
                }
            }
            if (state.zincCount >= 15 && activeDragObject !== 'zincBox') {
                state.currentStep = 2;
                zb.targetX = 260; zb.targetY = 355;
                statusDisplay.innerText = "Add Hydrochloric Acid";
                updateStepUI();
            }
        } else {
            zb.angle += (0 - zb.angle) * 0.15;
        }

        let at = objects.acidTube;
        if (state.currentStep === 2 && at.x > FLASK_MOUTH_X_MIN && at.x < FLASK_MOUTH_X_MAX && at.y < FLASK_MOUTH_Y + 120) {
            at.angle += (Math.PI / 2.2 - at.angle) * 0.2;
            at.targetX = fl.x - 40;
            at.targetY = FLASK_MOUTH_Y - 30;
            
            if (at.angle > 1.1 && at.liquidLevel > 0 && state.acidVolume < state.maxAcidVolume) {
                at.liquidLevel -= 0.8;
                state.acidVolume += 0.8;
                ctx.fillStyle = "rgba(186, 230, 253, 0.8)";
                ctx.fillRect(fl.x - 4, at.y + 10, 8, (fl.y - 15) - at.y);
            }
            if (at.liquidLevel <= 0 && activeDragObject !== 'acidTube') {
                state.currentStep = 3;
                state.isReactionActive = true;
                at.targetX = 600; at.targetY = 325;
                statusDisplay.innerText = "Hydrogen Gas Evolving! Bring the burning matchstick tool near the mouth";
                updateStepUI();
            }
        } else {
            at.angle += (0 - at.angle) * 0.15;
        }

        let ms = objects.matchstick;
        if (state.currentStep === 3 && state.isReactionActive && !state.explosionTriggered) {
            // Check collision using the tip (left side) of the horizontal matchstick
            let dist = Math.hypot((ms.x - ms.width/2) - fl.x, ms.y - FLASK_MOUTH_Y);
            if (dist < 45) {
                state.explosionTriggered = true;
                state.isReactionActive = false;
                triggerAudioPop();
                statusDisplay.innerText = "H₂ Exploded (Pop Test Positive!) 💥";
                statusDisplay.style.color = "#16a34a";
            }
        }

        if (state.acidVolume > 0) {
            ctx.fillStyle = "rgba(186, 230, 253, 0.65)";
            ctx.beginPath();
            let fillHeight = (state.acidVolume / state.maxAcidVolume) * 65;
            ctx.moveTo(fl.x - 48, fl.y - fillHeight);
            ctx.lineTo(fl.x + 48, fl.y - fillHeight);
            ctx.lineTo(fl.x + fl.width/2 - 5, fl.y - 5);
            ctx.lineTo(fl.x - fl.width/2 + 5, fl.y - 5);
            ctx.closePath();
            ctx.fill();
        }

        particles.forEach((p, idx) => {
            p.x += (fl.x - 30 + (idx * 4.2) - p.x) * 0.15;
if (p.y < fl.y - 12) p.y += p.vy;
ctx.fillStyle = "#64748b";
ctx.beginPath();
ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
ctx.fill();
});
if (state.zincCount >= 15 && particles.length === 0) {
for (let i = 0; i < 15; i++) {
particles.push({ x: fl.x - 30 + (i * 4.2), y: fl.y - 12, vx: 0, vy: 0 });
}
}
if (state.isReactionActive) {
if (state.temperature < 44.5) {
state.temperature += 0.04;
tempDisplay.innerText = `${state.temperature.toFixed(1)} °C`;
if (state.temperature > 35) tempDisplay.className = "metric-val hot";
}
if (Math.random() < 0.3) {
bubbles.push({
x: fl.x - 45 + Math.random() * 90,
y: fl.y - 15,
r: Math.random() * 3 + 1.2,
speed: Math.random() * 2 + 1.2
});
}
}
bubbles.forEach((b, index) => {
b.y -= b.speed;
ctx.beginPath();
ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
ctx.fillStyle = "rgba(14, 165, 233, 0.4)";
ctx.strokeStyle = "rgba(2, 132, 199, 0.7)";
ctx.lineWidth = 0.8;
ctx.fill();
ctx.stroke();
if (b.y < fl.y - 70) bubbles.splice(index, 1);
});
ctx.strokeStyle = "#0f172a";
ctx.lineWidth = 5;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.beginPath();
ctx.moveTo(fl.x - 20, fl.y - fl.height);
ctx.lineTo(fl.x - 20, fl.y - fl.height + 40);
ctx.lineTo(fl.x - fl.width/2, fl.y - 5);
ctx.lineTo(fl.x + fl.width/2, fl.y - 5);
ctx.lineTo(fl.x + 20, fl.y - fl.height + 40);
ctx.lineTo(fl.x + 20, fl.y - fl.height);
ctx.stroke();
ctx.strokeStyle = "#94a3b8";
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(fl.x + 35, fl.y - 25); ctx.lineTo(fl.x + 45, fl.y - 25);
ctx.moveTo(fl.x + 25, fl.y - 50); ctx.lineTo(fl.x + 35, fl.y - 50);
ctx.stroke();
if (!state.glovesEquipped) {
let gl = objects.gloves;
ctx.fillStyle = "#2563eb";
ctx.fillRect(gl.x - gl.width/2, gl.y - gl.height/2, gl.width, gl.height);
ctx.fillStyle = "#ffffff";
ctx.font = "bold 12px sans-serif";
ctx.fillText("🧤 GLOVES", gl.x - 30, gl.y + 4);
}
let zbObj = objects.zincBox;
ctx.save();
ctx.translate(zbObj.x, zbObj.y);
ctx.rotate(zbObj.angle);
ctx.fillStyle = "#92400e";
ctx.fillRect(-zbObj.width/2, -zbObj.height/2, zbObj.width, zbObj.height);
ctx.fillStyle = "#78350f";
ctx.fillRect(-zbObj.width/2 + 4, -zbObj.height/2 + 4, zbObj.width - 8, zbObj.height - 8);
ctx.fillStyle = "#ffffff";
ctx.font = "bold 12px sans-serif";
ctx.fillText("Zn BOX", -22, 4);
ctx.restore();
let atObj = objects.acidTube;
ctx.save();
ctx.translate(atObj.x, atObj.y);
ctx.rotate(atObj.angle);
if (atObj.liquidLevel > 0) {
ctx.fillStyle = "rgba(186, 230, 253, 0.9)";
ctx.fillRect(-atObj.width/2 + 3, atObj.height/2 - atObj.liquidLevel - 3, atObj.width - 6, atObj.liquidLevel);
}
ctx.strokeStyle = "#475569";
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(-atObj.width/2, -atObj.height/2);
ctx.lineTo(-atObj.width/2, atObj.height/2 - 10);
ctx.arc(0, atObj.height/2 - 10, atObj.width/2, Math.PI, 0, true);
ctx.lineTo(atObj.width/2, -atObj.height/2);
ctx.stroke();
ctx.restore();
// Horizontal Matchstick Draw Loop
let msObj = objects.matchstick;
ctx.fillStyle = "#b45309";
ctx.fillRect(msObj.x - msObj.width/2, msObj.y - msObj.height/2, msObj.width, msObj.height);
ctx.fillStyle = "#451a03"; // Sulfur tip
ctx.fillRect(msObj.x - msObj.width/2, msObj.y - msObj.height/2, 8, msObj.height);
if (!state.explosionTriggered) {
if (state.currentStep === 3) {
drawFlame(msObj.x - msObj.width/2, msObj.y);
}
} else {
ctx.fillStyle = "rgba(253, 224, 71, 0.65)";
ctx.beginPath();
ctx.arc(fl.x, FLASK_MOUTH_Y, 60, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = "#ef4444";
ctx.font = "bold 22px sans-serif";
ctx.fillText("💥 POP!", fl.x - 38, FLASK_MOUTH_Y - 5);
}
requestAnimationFrame(renderWorkEnvironment);
}
renderWorkEnvironment();
});