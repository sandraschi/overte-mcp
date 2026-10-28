"""Saschirob In-World Teach Pendant UI Generator.

Generates a standalone, high-contrast, responsive HTML/CSS/JS Teach Pendant
designed specifically for Overte 3D Web entities (QtWebEngine) and VR laser pointers.
Zero external CDN dependencies (works air-gapped in local domain).
"""

def get_teach_pendant_html() -> str:
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saschirob Teach Pendant</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #0f131a;
            color: #f1f5f9;
            width: 100vw;
            height: 100vh;
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            border: 2px solid #38bdf8;
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #1e293b;
            padding-bottom: 6px;
        }
        .title {
            font-size: 15px;
            font-weight: 800;
            color: #38bdf8;
            letter-spacing: 0.5px;
        }
        .badge {
            font-size: 10px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(34, 197, 94, 0.2);
            color: #4ade80;
            border: 1px solid #22c55e;
        }
        .telemetry-card {
            background: #18202c;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 8px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            font-size: 11px;
        }
        .stat-label { color: #94a3b8; }
        .stat-val { font-weight: 700; color: #f8fafc; }
        .stat-ok { color: #4ade80; }
        .controls-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            flex-grow: 1;
        }
        button {
            background: #1e293b;
            color: #f8fafc;
            border: 1px solid #475569;
            border-radius: 6px;
            padding: 10px 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            transition: all 0.15s ease;
        }
        button:hover {
            background: #334155;
            border-color: #38bdf8;
        }
        button:active {
            transform: scale(0.97);
            background: #0284c7;
        }
        .btn-dance {
            grid-column: span 2;
            background: linear-gradient(135deg, #1e1b4b, #312e81);
            border-color: #818cf8;
            color: #e0e7ff;
            font-size: 13px;
            padding: 12px;
        }
        .btn-dance:hover {
            background: linear-gradient(135deg, #312e81, #4338ca);
            border-color: #a5b4fc;
        }
        .btn-estop {
            grid-column: span 2;
            background: #7f1d1d;
            border-color: #ef4444;
            color: #fee2e2;
            font-weight: 800;
            padding: 12px;
        }
        .btn-estop:hover { background: #991b1b; }
        .btn-estop:active { background: #b91c1c; }
        .estop-active {
            background: #ef4444 !important;
            animation: pulse 1s infinite alternate;
        }
        @keyframes pulse {
            from { opacity: 0.8; }
            to { opacity: 1; transform: scale(1.01); }
        }
        .log-box {
            background: #0b0f17;
            border: 1px solid #1e293b;
            border-radius: 4px;
            padding: 6px;
            font-family: monospace;
            font-size: 10px;
            color: #38bdf8;
            height: 48px;
            overflow-y: hidden;
            display: flex;
            align-items: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">🤖 SASCHIROB PENDANT</div>
        <div class="badge" id="busBadge">1 Mbps STS OK</div>
    </div>

    <div class="telemetry-card">
        <div><span class="stat-label">Routine: </span><span class="stat-val" id="dispRoutine">Standby</span></div>
        <div><span class="stat-label">Mast: </span><span class="stat-val" id="dispMast">0.69 m</span></div>
        <div><span class="stat-label">Reach: </span><span class="stat-val" id="dispReach">0.15 m</span></div>
        <div><span class="stat-label">VFE ΔF: </span><span class="stat-val stat-ok" id="dispVfe">0.012</span></div>
    </div>

    <div class="controls-grid">
        <button onclick="setRoutine('Standby (0.69m)', 0.69, 0.15, 0.012, 'Column stowed at 690mm. Arms in home parking posture.')">
            <span>🏠 Standby</span>
            <small style="color: #94a3b8; font-size: 9px;">Home 0.69m</small>
        </button>
        <button onclick="setRoutine('High Shelf Reach (1.65m)', 1.65, 0.52, 0.038, 'Cascaded lift elevated to 1.65m. Bimanual reach extended.')">
            <span>🥣 High Shelf</span>
            <small style="color: #94a3b8; font-size: 9px;">Reach 1.65m</small>
        </button>
        <button onclick="setRoutine('Table Clear (0.78m)', 0.78, 0.45, 0.024, 'Torso at tabletop height. Dual Robonine 84mm jaws armed.')">
            <span>🧹 Table Clear</span>
            <small style="color: #94a3b8; font-size: 9px;">Work surface</small>
        </button>
        <button onclick="setRoutine('AprilTag Docking', 0.69, 0.10, 0.015, 'Aligning to dock pad tag ID 7. Recharging contacts ready.')">
            <span>🔋 Autodock</span>
            <small style="color: #94a3b8; font-size: 9px;">AprilTag 36h11</small>
        </button>
        <button class="btn-dance" onclick="setRoutine('Active Inference Dance', 1.15, 0.40, 0.018, '50 Hz Laplace compliance dance running in MuJoCo physics.')">
            <span>🥋 ACTIVE INFERENCE COMPLIANCE DANCE</span>
            <small style="color: #c7d2fe; font-size: 9.5px;">Sinusoidal Mast Elevation & Bimanual Greeting Wave</small>
        </button>
        <button class="btn-estop" id="estopBtn" onclick="toggleEstop()">
            <span>🛑 EMERGENCY STOP (HARDWARE LATCH)</span>
        </button>
    </div>

    <div class="log-box" id="logBox">
        &gt; System online. OpenXR 3D spatial teach pendant ready.
    </div>

    <script>
        let estopLatched = false;

        function setRoutine(name, mast, reach, vfe, msg) {
            if (estopLatched) {
                document.getElementById('logBox').innerText = '> [E-STOP ACTIVE] Actuators isolated. Release E-Stop first.';
                return;
            }
            document.getElementById('dispRoutine').innerText = name;
            document.getElementById('dispMast').innerText = mast.toFixed(2) + ' m';
            document.getElementById('dispReach').innerText = reach.toFixed(2) + ' m';
            document.getElementById('dispVfe').innerText = vfe.toFixed(4);
            document.getElementById('logBox').innerText = '> ' + msg;

            // Notify parent Overte domain or local MCP if connected
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'SASCHIROB_ROUTINE', routine: name, mast: mast }, '*');
            }
        }

        function toggleEstop() {
            estopLatched = !estopLatched;
            const btn = document.getElementById('estopBtn');
            const badge = document.getElementById('busBadge');
            const log = document.getElementById('logBox');

            if (estopLatched) {
                btn.classList.add('estop-active');
                btn.innerHTML = '<span>⚡ E-STOP LATCHED — CLICK TO RESET</span>';
                badge.innerText = 'HALTED (E-STOP)';
                badge.style.background = 'rgba(239, 68, 68, 0.2)';
                badge.style.color = '#f87171';
                badge.style.borderColor = '#ef4444';
                log.innerText = '> 🛑 EMERGENCY STOP LATCHED! Hardware relay de-energized.';
            } else {
                btn.classList.remove('estop-active');
                btn.innerHTML = '<span>🛑 EMERGENCY STOP (HARDWARE LATCH)</span>';
                badge.innerText = '1 Mbps STS OK';
                badge.style.background = 'rgba(34, 197, 94, 0.2)';
                badge.style.color = '#4ade80';
                badge.style.borderColor = '#22c55e';
                log.innerText = '> E-Stop cleared. Bus re-energized. System nominal.';
            }

            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'SASCHIROB_ESTOP', latched: estopLatched }, '*');
            }
        }
    </script>
</body>
</html>
"""
