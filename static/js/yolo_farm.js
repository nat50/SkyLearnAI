/**
 * YOLO Farm – Interactive Code Runner with Virtual Yolo:Bit Board
 *
 * Transforms static code blocks inside lessons into interactive editors
 * with a visual hardware simulator (5x5 LED matrix, buttons, sensors, LCD).
 * Code is executed in the browser via Pyodide (Python → WebAssembly).
 */

(function () {
    "use strict";

    // ── Pyodide Singleton ────────────────────────────────────────────────

    let pyodideInstance = null;
    let pyodideLoading = false;
    const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js";

    function getOrCreateLoadingOverlay() {
        let overlay = document.getElementById("pyodideLoadingOverlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "pyodideLoadingOverlay";
            overlay.className = "pyodide-loading-overlay";
            overlay.innerHTML =
                '<div class="pyodide-loading-spinner"></div>' +
                '<div class="pyodide-loading-text">Đang khởi tạo Python Runtime...</div>' +
                '<div class="pyodide-loading-subtext">Tải xuống lần đầu (~11 MB), các lần sau sẽ nhanh hơn</div>';
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    function showLoadingOverlay() {
        const o = getOrCreateLoadingOverlay();
        requestAnimationFrame(() => o.classList.add("visible"));
    }

    function hideLoadingOverlay() {
        const o = document.getElementById("pyodideLoadingOverlay");
        if (o) o.classList.remove("visible");
    }

    async function ensurePyodide() {
        if (pyodideInstance) return pyodideInstance;
        if (pyodideLoading) {
            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (pyodideInstance) {
                        clearInterval(interval);
                        resolve(pyodideInstance);
                    }
                }, 200);
            });
        }

        pyodideLoading = true;
        showLoadingOverlay();

        try {
            await new Promise((resolve, reject) => {
                if (window.loadPyodide) { resolve(); return; }
                const script = document.createElement("script");
                script.src = PYODIDE_CDN;
                script.onload = resolve;
                script.onerror = () => reject(new Error("Failed to load Pyodide CDN"));
                document.head.appendChild(script);
            });
            pyodideInstance = await window.loadPyodide();
            console.log("[YoloFarm] Pyodide initialised");
        } catch (err) {
            console.error("[YoloFarm] Pyodide init error:", err);
            throw err;
        } finally {
            pyodideLoading = false;
            hideLoadingOverlay();
        }
        return pyodideInstance;
    }

    // ── Virtual Board Builder ────────────────────────────────────────────

    /**
     * Build the Yolo:Bit simulator HTML and return the DOM element plus
     * references to interactive parts (LEDs, LCD, buttons, sliders).
     */
    function createBoardElement(dataset) {
        const col = document.createElement("div");
        col.className = "yolo-sim-board-col";

        // Build LED cells
        let ledCells = "";
        for (let i = 0; i < 25; i++) {
            ledCells += '<div class="yolo-led" data-led="' + i + '"></div>';
        }

        // --- Parse Dynamic Configuration ---
        let sensors = [];
        if (dataset && dataset.sensors) {
            try { sensors = JSON.parse(dataset.sensors); } catch (e) { console.warn("YoloFarm JSON parse error (sensors)"); }
        }
        if (sensors.length === 0) {
            // Default sensors if AI didn't provide any
            sensors = [
                { pin: 0, name: "Ánh sáng", min: 0, max: 4095, val: 450 },
                { pin: 1, name: "Độ ẩm đất", min: 0, max: 4095, val: 120 },
                { pin: 2, name: "Nhiệt độ", min: 0, max: 4095, val: 300 }
            ];
        }

        let actuators = [];
        if (dataset && dataset.actuators) {
            try { actuators = JSON.parse(dataset.actuators); } catch (e) { console.warn("YoloFarm JSON parse error (actuators)"); }
        }

        // --- Build Sensors UI ---
        let sensorsHtml = '<div class="yolo-sensors"><div class="yolo-sensor-help">💡 Kéo thanh trượt rồi nhấn <strong>Run</strong> để thay đổi giá trị</div>';
        sensors.forEach(s => {
            const min = s.min !== undefined ? s.min : 0;
            const max = s.max !== undefined ? s.max : 4095;
            const val = s.val !== undefined ? s.val : (s.value !== undefined ? s.value : Math.floor((min + max) / 2));
            sensorsHtml += `
                <div class="yolo-sensor-row">
                    <span class="yolo-sensor-label">P${s.pin}</span>
                    <span class="yolo-sensor-desc" title="${s.name}">${s.name}</span>
                    <input type="range" class="yolo-sensor-slider" data-sensor="${s.pin}" min="${min}" max="${max}" value="${val}">
                    <span class="yolo-sensor-value" data-sensor-val="${s.pin}">${val}</span>
                </div>
            `;
        });
        sensorsHtml += '</div>';

        // --- Build Actuators UI ---
        let actuatorsHtml = '';
        if (actuators.length > 0) {
            actuatorsHtml = '<div class="yolo-actuators"><div class="yolo-actuator-title">Thiết bị ngoại vi</div>';
            actuators.forEach(a => {
                let icon = '⚡';
                if (a.type === 'fan' || a.name.toLowerCase().includes('quạt')) icon = '🌪️';
                else if (a.type === 'pump' || a.name.toLowerCase().includes('bơm') || a.name.toLowerCase().includes('tưới')) icon = '💧';
                else if (a.type === 'light' || a.type === 'led' || a.name.toLowerCase().includes('đèn')) icon = '💡';
                else if (a.type === 'servo' || a.name.toLowerCase().includes('servo')) icon = '🔄';

                actuatorsHtml += `
                    <div class="yolo-actuator-item" data-actuator-pin="${a.pin}" data-actuator-type="${a.type || 'generic'}">
                        <div class="yolo-actuator-icon">${icon}</div>
                        <div class="yolo-actuator-info">
                            <div class="yolo-actuator-name">${a.name} (P${a.pin})</div>
                            <div class="yolo-actuator-status" data-actuator-status="${a.pin}">OFF</div>
                        </div>
                    </div>
                `;
            });
            actuatorsHtml += '</div>';
        }

        col.innerHTML =
            '<div class="yolo-board">' +
            '  <div class="yolo-board-label">Yolo:Bit Simulator</div>' +
            '  <div class="yolo-board-chip">' +
            '    <div class="yolo-led-matrix">' + ledCells + '</div>' +
            '    <div class="yolo-buttons-row">' +
            '      <div class="yolo-hw-btn" data-btn="a" title="Nhấn giữ rồi click Run để mô phỏng nhấn nút A">A</div>' +
            '      <div class="yolo-board-usb"></div>' +
            '      <div class="yolo-hw-btn" data-btn="b" title="Nhấn giữ rồi click Run để mô phỏng nhấn nút B">B</div>' +
            '    </div>' +
            '    <div class="yolo-lcd" data-lcd></div>' +
            '    <div class="yolo-pin-indicators">' +
            '      <div class="yolo-pin-dot"><div class="yolo-pin-dot-light" data-pin="0"></div><span>P0</span></div>' +
            '      <div class="yolo-pin-dot"><div class="yolo-pin-dot-light" data-pin="1"></div><span>P1</span></div>' +
            '      <div class="yolo-pin-dot"><div class="yolo-pin-dot-light" data-pin="2"></div><span>P2</span></div>' +
            '    </div>' +
            '  </div>' +
            sensorsHtml +
            actuatorsHtml +
            '</div>';

        // Wire slider labels
        col.querySelectorAll(".yolo-sensor-slider").forEach(function (sl) {
            const idx = sl.dataset.sensor;
            const valEl = col.querySelector('[data-sensor-val="' + idx + '"]');
            sl.addEventListener("input", function () {
                if (valEl) valEl.textContent = sl.value;
            });
        });

        // Wire button press state
        col.querySelectorAll(".yolo-hw-btn").forEach(function (btn) {
            btn.addEventListener("click", function () {
                btn.classList.toggle("pressed");
            });
        });

        return col;
    }

    /**
     * Collect the current UI state of a board element so we can inject
     * the values into Pyodide before executing user code.
     */
    function getBoardState(boardEl) {
        let sensorVals = {};
        boardEl.querySelectorAll(".yolo-sensor-slider").forEach(function (sl) {
            sensorVals[sl.dataset.sensor] = parseFloat(sl.value);
        });

        const btnA = boardEl.querySelector('[data-btn="a"]');
        const btnB = boardEl.querySelector('[data-btn="b"]');
        
        return {
            sensors: sensorVals,
            btnA: btnA ? btnA.classList.contains("pressed") : false,
            btnB: btnB ? btnB.classList.contains("pressed") : false,
        };
    }

    /**
     * Push execution results back into the visual board.
     * Called after Pyodide finishes running user code.
     */
    function updateBoardVisuals(boardEl, pyodide) {
        try {
            // LED matrix state
            const ledData = pyodide.runPython(
                "_yolo_board_state.get('leds', [0]*25)"
            );
            const leds = boardEl.querySelectorAll(".yolo-led");
            const ledArray = ledData.toJs ? ledData.toJs() : [];
            leds.forEach(function (el, i) {
                const v = ledArray[i] || 0;
                el.classList.remove("on", "on-green", "on-blue");
                if (v > 0) el.classList.add("on");
            });

            // LCD text
            const lcdText = pyodide.runPython(
                "_yolo_board_state.get('lcd', '')"
            );
            const lcd = boardEl.querySelector("[data-lcd]");
            if (lcd) lcd.textContent = lcdText || "";

            // Pin write indicators
            const pinWrites = pyodide.runPython(
                "_yolo_board_state.get('pin_writes', {})"
            );
            const pinMap = pinWrites.toJs ? Object.fromEntries(pinWrites.toJs()) : {};
            boardEl.querySelectorAll(".yolo-pin-dot-light").forEach(function (el) {
                const pin = el.dataset.pin;
                if (pin in pinMap) {
                    el.classList.add("active");
                } else {
                    el.classList.remove("active");
                }
            });

            // Update Dynamic Actuators
            boardEl.querySelectorAll(".yolo-actuator-item").forEach(function (el) {
                const pin = el.dataset.actuatorPin;
                const statusEl = el.querySelector(".yolo-actuator-status");
                if (pin in pinMap) {
                    const v = pinMap[pin];
                    if (v > 0) {
                        el.classList.add("active");
                        if (statusEl) statusEl.textContent = "ON";
                    } else {
                        el.classList.remove("active");
                        if (statusEl) statusEl.textContent = "OFF";
                    }
                }
            });
        } catch (e) {
            console.warn("[YoloFarm] Board visual update skipped:", e);
        }
    }

    function resetBoardVisuals(boardEl) {
        boardEl.querySelectorAll(".yolo-led").forEach(function (el) {
            el.classList.remove("on", "on-green", "on-blue");
        });
        const lcd = boardEl.querySelector("[data-lcd]");
        if (lcd) lcd.textContent = "";
        boardEl.querySelectorAll(".yolo-pin-dot-light").forEach(function (el) {
            el.classList.remove("active");
        });
        boardEl.querySelectorAll(".yolo-actuator-item").forEach(function (el) {
            el.classList.remove("active");
            const statusEl = el.querySelector(".yolo-actuator-status");
            if (statusEl) statusEl.textContent = "OFF";
        });
    }

    // ── Code Execution ───────────────────────────────────────────────────

    /**
     * Execute Python code with mock Yolo:Bit environment.
     * boardState contains sensor slider values and button states from the UI.
     */
    async function runPythonCode(code, boardState) {
        const pyodide = await ensurePyodide();
        const st = boardState || {};
        const sensorsJson = JSON.stringify(st.sensors || {});
        const btn_a_val = st.btnA ? "True" : "False";
        const btn_b_val = st.btnB ? "True" : "False";

        const py_setup = `
import sys, io, types, time, random

# ── Board state bridge (Python ↔ JS UI) ──
_yolo_board_state = {
    'leds': [0] * 25,
    'lcd': '',
    'pin_writes': {},
}

# ── Custom exception to break infinite loops ──
class _YoloLoopBreak(Exception):
    pass

# ── LED Image patterns (5x5 bitmaps) ──
_IMAGE_PATTERNS = {
    'HAPPY':    [0,0,0,0,0,
                 0,1,0,1,0,
                 0,0,0,0,0,
                 1,0,0,0,1,
                 0,1,1,1,0],
    'SAD':      [0,0,0,0,0,
                 0,1,0,1,0,
                 0,0,0,0,0,
                 0,1,1,1,0,
                 1,0,0,0,1],
    'HEART':    [0,1,0,1,0,
                 1,1,1,1,1,
                 1,1,1,1,1,
                 0,1,1,1,0,
                 0,0,1,0,0],
    'SMILE':    [0,0,0,0,0,
                 0,1,0,1,0,
                 0,0,0,0,0,
                 1,0,0,0,1,
                 0,1,1,1,0],
    'ANGRY':    [1,0,0,0,1,
                 0,1,0,1,0,
                 0,0,0,0,0,
                 1,1,1,1,1,
                 1,0,1,0,1],
    'CONFUSED': [0,0,0,0,0,
                 0,1,0,1,0,
                 0,0,0,0,0,
                 0,1,0,1,0,
                 1,0,1,0,1],
    'ASLEEP':   [0,0,0,0,0,
                 1,1,0,1,1,
                 0,0,0,0,0,
                 0,1,1,1,0,
                 0,0,0,0,0],
    'SURPRISED':[0,1,0,1,0,
                 0,0,0,0,0,
                 0,0,1,0,0,
                 0,1,0,1,0,
                 0,0,1,0,0],
    'SKULL':    [0,1,1,1,0,
                 1,0,1,0,1,
                 1,1,1,1,1,
                 0,1,0,1,0,
                 0,1,1,1,0],
    'DIAMOND':  [0,0,1,0,0,
                 0,1,0,1,0,
                 1,0,0,0,1,
                 0,1,0,1,0,
                 0,0,1,0,0],
    'DUCK':     [0,1,1,0,0,
                 1,1,1,0,0,
                 0,1,1,1,1,
                 0,1,1,1,0,
                 0,0,0,0,0],
    'ARROW_N':  [0,0,1,0,0,
                 0,1,1,1,0,
                 1,0,1,0,1,
                 0,0,1,0,0,
                 0,0,1,0,0],
    'ARROW_S':  [0,0,1,0,0,
                 0,0,1,0,0,
                 1,0,1,0,1,
                 0,1,1,1,0,
                 0,0,1,0,0],
    'ARROW_E':  [0,0,1,0,0,
                 0,0,0,1,0,
                 1,1,1,1,1,
                 0,0,0,1,0,
                 0,0,1,0,0],
    'ARROW_W':  [0,0,1,0,0,
                 0,1,0,0,0,
                 1,1,1,1,1,
                 0,1,0,0,0,
                 0,0,1,0,0],
    'YES':      [0,0,0,0,0,
                 0,0,0,0,1,
                 0,0,0,1,0,
                 1,0,1,0,0,
                 0,1,0,0,0],
    'NO':       [1,0,0,0,1,
                 0,1,0,1,0,
                 0,0,1,0,0,
                 0,1,0,1,0,
                 1,0,0,0,1],
}

# ── Mock Yolo:Bit modules ──
# Always recreate module internals so slider values are fresh
if 'yolobit' not in sys.modules:
    _mock_yolobit = types.ModuleType('yolobit')
    sys.modules['yolobit'] = _mock_yolobit
else:
    _mock_yolobit = sys.modules['yolobit']

class _MockPin:
    def __init__(self, name, analog_val):
        self._name = name
        self._analog = analog_val
    def read_analog(self):
        return self._analog
    def read_digital(self):
        return 1 if self._analog > 500 else 0
    def write_analog(self, v):
        _yolo_board_state['pin_writes'][self._name.replace('P', '')] = v
        print(f"[PIN] {self._name} ← analog {v}")
    def write_digital(self, v):
        _yolo_board_state['pin_writes'][self._name.replace('P', '')] = v
        print(f"[PIN] {self._name} ← digital {v}")

# Load dynamic sensors mapping
import json
try:
    _sensor_vals = json.loads('${sensorsJson}')
except:
    _sensor_vals = {}

# Map ALL pins to slider values based on real Yolo:Bit usage + dynamic mapping
_pin_slider_map = {
    0: _sensor_vals.get("0", 450),
    1: _sensor_vals.get("1", 120),
    2: _sensor_vals.get("2", 300),
    4: _sensor_vals.get("4", _sensor_vals.get("0", 450)),
    5: _sensor_vals.get("5", _sensor_vals.get("1", 120)),
    6: _sensor_vals.get("6", _sensor_vals.get("2", 300)),
    10: _sensor_vals.get("10", _sensor_vals.get("0", 450)),
    13: _sensor_vals.get("13", _sensor_vals.get("1", 120)),
    14: _sensor_vals.get("14", _sensor_vals.get("2", 300)),
    15: _sensor_vals.get("15", _sensor_vals.get("0", 450)),
    16: _sensor_vals.get("16", _sensor_vals.get("1", 120)),
}

for _i in range(0, 21):
    _val = _sensor_vals.get(str(_i), None)
    if _val is None:
        _val = _pin_slider_map.get(_i, random.randint(0, 4095))
    setattr(_mock_yolobit, f'pin{_i}', _MockPin(f'P{_i}', int(_val)))

class _MockDisplay:
    def scroll(self, text):
        _yolo_board_state['lcd'] = str(text)
        print(f"[LCD] ← {text}")
    def show(self, img=None):
        if img is not None:
            name = str(img)
            if name in _IMAGE_PATTERNS:
                _yolo_board_state['leds'] = list(_IMAGE_PATTERNS[name])
            else:
                _yolo_board_state['leds'] = [1] * 25
            _yolo_board_state['lcd'] = name
            print(f"[LED] Hiển thị hình: {name}")
        else:
            _yolo_board_state['leds'] = [1] * 25
    def set_pixel(self, x, y, val=9):
        idx = y * 5 + x
        if 0 <= idx < 25:
            _yolo_board_state['leds'][idx] = val
    def clear(self):
        _yolo_board_state['leds'] = [0] * 25
        _yolo_board_state['lcd'] = ''
        print("[LED] Đã tắt toàn bộ LED")

_mock_yolobit.display = _MockDisplay()

class _MockButton:
    def __init__(self, pressed):
        self._pressed = pressed
    def is_pressed(self):
        return self._pressed
    def was_pressed(self):
        return self._pressed

_mock_yolobit.button_a = _MockButton(${btn_a_val})
_mock_yolobit.button_b = _MockButton(${btn_b_val})

class Image:
    HAPPY = "HAPPY"
    SAD = "SAD"
    HEART = "HEART"
    ARROW_N = "ARROW_N"
    ARROW_S = "ARROW_S"
    ARROW_E = "ARROW_E"
    ARROW_W = "ARROW_W"
    YES = "YES"
    NO = "NO"
    SMILE = "SMILE"
    CONFUSED = "CONFUSED"
    ANGRY = "ANGRY"
    ASLEEP = "ASLEEP"
    SURPRISED = "SURPRISED"
    SKULL = "SKULL"
    DIAMOND = "DIAMOND"
    DUCK = "DUCK"
_mock_yolobit.Image = Image

_mock_yolobit.__all__ = [k for k in dir(_mock_yolobit) if not k.startswith('_')]

# ── Mock MQTT / IoT ──
if 'mqtt' not in sys.modules:
    _mock_mqtt = types.ModuleType('mqtt')
    sys.modules['mqtt'] = _mock_mqtt
else:
    _mock_mqtt = sys.modules['mqtt']

class _MockMQTTClient:
    def __init__(self, *a, **kw): pass
    def connect(self):
        print("[MQTT] Đã kết nối broker")
    def publish(self, topic, msg):
        print(f"[MQTT] Gửi → {topic}: {msg}")
    def check_msg(self): pass
    def subscribe(self, topic):
        print(f"[MQTT] Đăng ký topic: {topic}")
_mock_mqtt.MQTTClient = _MockMQTTClient

if 'iot_client' not in sys.modules:
    _mock_iot = types.ModuleType('iot_client')
    sys.modules['iot_client'] = _mock_iot
else:
    _mock_iot = sys.modules['iot_client']
_mock_iot.mqtt = _MockMQTTClient()
_mock_iot.MQTTClient = _MockMQTTClient

# ── Mock DHT20 sensor (values driven by slider P2) ──
if 'dht' not in sys.modules:
    _mock_dht = types.ModuleType('dht')
    sys.modules['dht'] = _mock_dht
else:
    _mock_dht = sys.modules['dht']

class _MockDHT20:
    def __init__(self, *a, **kw):
        p2_val = _pin_slider_map.get(2, 300)
        p1_val = _pin_slider_map.get(1, 120)
        self._temp = round(15.0 + (int(p2_val) / 4095.0) * 30.0, 1)
        self._hum = round(30.0 + (int(p1_val) / 4095.0) * 60.0, 1)
    def measure(self): pass
    def temperature(self):
        return self._temp
    def humidity(self):
        return self._hum
_mock_dht.DHT20 = _MockDHT20

# ── Mock relay / actuator module ──
if 'actuator' not in sys.modules:
    _mock_act = types.ModuleType('actuator')
    sys.modules['actuator'] = _mock_act
else:
    _mock_act = sys.modules['actuator']

class _MockRelay:
    def __init__(self, pin):
        self._pin = pin
        self._state = False
    def on(self):
        self._state = True
        _yolo_board_state['pin_writes'][f'relay_{self._pin}'] = 1
        print(f"[RELAY] Pin {self._pin}: BẬT ⚡")
    def off(self):
        self._state = False
        _yolo_board_state['pin_writes'][f'relay_{self._pin}'] = 0
        print(f"[RELAY] Pin {self._pin}: TẮT")
    def toggle(self):
        if self._state:
            self.off()
        else:
            self.on()
_mock_act.Relay = _MockRelay

# ── Prevent infinite loops (reset counter every run) ──
_yolo_loop_count = 0
_yolo_max_loops = 5

def _safe_sleep(x):
    global _yolo_loop_count
    _yolo_loop_count += 1
    if _yolo_loop_count > _yolo_max_loops:
        raise _YoloLoopBreak("Vòng lặp đã dừng sớm để tránh đơ web!")

time.sleep = _safe_sleep

# ── Capture stdout/stderr ──
_yolo_stdout = io.StringIO()
_yolo_stderr = io.StringIO()
sys.stdout = _yolo_stdout
sys.stderr = _yolo_stderr
`;

        let error = false;
        let output = "";

        // Combine setup + user code into a single runPython call so that
        // `from yolobit import *` correctly injects names into the same
        // global namespace where the user code executes.
        const combinedCode = py_setup + "\n" + code;

        try {
            const result = pyodide.runPython(combinedCode);
            output = pyodide.runPython("_yolo_stdout.getvalue()");
            const errOutput = pyodide.runPython("_yolo_stderr.getvalue()");
            if (errOutput) output += (output ? "\n" : "") + errOutput;
            if (!output && result !== undefined && result !== null) {
                const repr = String(result);
                if (repr !== "None") output = repr;
            }
        } catch (err) {
            console.error("[YoloFarm] Run code error:", err);
            const errStr = (err.message || String(err)).replace(/^PythonError:\s*/i, "");

            if (errStr.includes("_YoloLoopBreak") || errStr.includes("Vòng lặp")) {
                try {
                    const partialOutput = pyodide.runPython("_yolo_stdout.getvalue()");
                    output = partialOutput || "";
                } catch (pe) { output = ""; }
                output += "\n⏹ Đã dừng vòng lặp sau vài lần chạy thử.";
            } else {
                error = true;
                output = errStr;
            }
        } finally {
            try {
                pyodide.runPython("sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__");
            } catch (fe) {}
        }

        return { output: output || "(Không có output)", error };
    }

    // ── Code Block Transformer ───────────────────────────────────────────

    function transformCodeBlocks(container) {
        if (!container) return;
        const blocks = container.querySelectorAll(".yolo-code-block");
        if (!blocks.length) return;

        blocks.forEach(function (block) {
            if (block.dataset.transformed === "true") return;
            block.dataset.transformed = "true";

            const codeEl = block.querySelector("pre code") || block.querySelector("pre");
            if (!codeEl) return;

            const originalCode = codeEl.textContent.trim();
            const codeId = block.dataset.codeId || "block_" + Math.random().toString(36).slice(2, 8);

            // ── Clear and rebuild ────────────────────────────────────────
            block.innerHTML = "";

            // Toolbar
            const toolbar = document.createElement("div");
            toolbar.className = "code-toolbar";
            toolbar.innerHTML =
                '<span class="code-lang-label">Python · Yolo:Bit</span>' +
                '<span class="code-actions">' +
                '  <button class="btn-reset-code" title="Khôi phục code gốc">↺ Reset</button>' +
                '  <button class="btn-run-code" title="Chạy code">▶ Run</button>' +
                "</span>";
            block.appendChild(toolbar);

            // Editor textarea
            const editorWrapper = document.createElement("div");
            editorWrapper.className = "code-editor-wrapper";
            const textarea = document.createElement("textarea");
            textarea.className = "code-editor";
            textarea.spellcheck = false;
            textarea.value = originalCode;
            textarea.rows = Math.max(4, originalCode.split("\n").length);
            textarea.addEventListener("keydown", function (e) {
                if (e.key === "Tab") {
                    e.preventDefault();
                    const s = this.selectionStart, end = this.selectionEnd;
                    this.value = this.value.substring(0, s) + "    " + this.value.substring(end);
                    this.selectionStart = this.selectionEnd = s + 4;
                }
            });
            editorWrapper.appendChild(textarea);
            block.appendChild(editorWrapper);

            // ── Simulator container (output + board side by side) ────────
            const simContainer = document.createElement("div");
            simContainer.className = "yolo-sim-container";
            simContainer.style.display = "none";

            // Output column
            const outputCol = document.createElement("div");
            outputCol.className = "yolo-sim-output-col";
            const outputPanel = document.createElement("div");
            outputPanel.className = "code-output";
            outputPanel.style.borderTop = "none"; // container handles border
            outputPanel.innerHTML =
                '<div class="output-header">' +
                '  <span class="output-label">Output</span>' +
                '  <span class="output-status"></span>' +
                "</div>" +
                '<pre class="output-content"></pre>';
            outputCol.appendChild(outputPanel);
            simContainer.appendChild(outputCol);

            // Board column
            const boardEl = createBoardElement(block.dataset);
            simContainer.appendChild(boardEl);

            block.appendChild(simContainer);

            // ── Event Listeners ──────────────────────────────────────────
            const btnRun = toolbar.querySelector(".btn-run-code");
            const btnReset = toolbar.querySelector(".btn-reset-code");
            const outputContent = outputPanel.querySelector(".output-content");
            const outputStatus = outputPanel.querySelector(".output-status");

            let isRunning = false;
            let runTimeout = null;

            async function executeUserCode(isAuto = false) {
                if (isRunning) return;
                const code = textarea.value.trim();
                if (!code) return;

                isRunning = true;
                btnRun.classList.add("running");
                btnRun.innerHTML = "⏳ " + (isAuto ? "Auto..." : "Running...");
                simContainer.style.display = "flex";
                if (!isAuto) {
                    outputContent.textContent = "Đang chạy...";
                    outputContent.className = "output-content";
                    outputStatus.textContent = "";
                    outputStatus.className = "output-status";
                }
                resetBoardVisuals(boardEl);

                try {
                    const boardState = getBoardState(boardEl);
                    const result = await runPythonCode(code, boardState);

                    outputContent.textContent = result.output;
                    if (result.error) {
                        outputContent.classList.add("error");
                        outputStatus.textContent = "Error";
                        outputStatus.classList.add("error");
                        outputStatus.classList.remove("success");
                    } else {
                        outputContent.classList.remove("error");
                        outputStatus.textContent = "Success";
                        outputStatus.classList.add("success");
                        outputStatus.classList.remove("error");
                    }

                    // Push state to visual board
                    const pyodide = await ensurePyodide();
                    updateBoardVisuals(boardEl, pyodide);
                } catch (err) {
                    outputContent.textContent = "Lỗi: Không thể khởi tạo Python runtime.\n" + String(err);
                    outputContent.classList.add("error");
                    outputStatus.textContent = "Error";
                    outputStatus.classList.add("error");
                    outputStatus.classList.remove("success");
                } finally {
                    btnRun.classList.remove("running");
                    btnRun.innerHTML = "▶ Run";
                    isRunning = false;
                }
            }

            btnRun.addEventListener("click", () => executeUserCode(false));

            function scheduleAutoRun() {
                // If code is empty or has not been run at least once manually, don't auto-run to avoid spam
                if (!textarea.value.trim() || simContainer.style.display === "none") return;
                if (runTimeout) clearTimeout(runTimeout);
                runTimeout = setTimeout(() => { executeUserCode(true); }, 250);
            }

            // Bind slider auto-run
            boardEl.querySelectorAll(".yolo-sensor-slider").forEach(sl => {
                sl.addEventListener("change", scheduleAutoRun); // Run immediately on stop drag
                sl.addEventListener("input", scheduleAutoRun);  // And also Run debounced during drag
            });
            
            // Bind hardware buttons auto-run
            boardEl.querySelectorAll(".yolo-hw-btn").forEach(btn => {
                btn.addEventListener("click", scheduleAutoRun);
            });

            btnReset.addEventListener("click", function () {
                textarea.value = originalCode;
                textarea.rows = Math.max(4, originalCode.split("\n").length);
                simContainer.style.display = "none";
                resetBoardVisuals(boardEl);
            });
        });
    }

    // ── Public API ───────────────────────────────────────────────────────

    window.YoloFarm = {
        transformCodeBlocks: transformCodeBlocks,
        runPythonCode: runPythonCode,
    };
})();
