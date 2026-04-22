/**
 * YOLO Farm – Real MicroPython Code Editor + Web Serial Import
 *
 * Transforms static code blocks inside lessons into interactive editors
 * with two upload modes (REPL / main.py) and a live Serial Monitor.
 * Code is uploaded directly to a physical Yolo:Bit board via Web Serial API.
 */

(function () {
    "use strict";

    // ── Web Serial Manager (Singleton) ──────────────────────────────────

    const SerialManager = {
        _port: null,
        _reader: null,
        _writer: null,
        _readLoopActive: false,
        _monitorCallbacks: [],   // [{id, callback}]
        _statusCallbacks: [],    // [{id, callback}]
        _decoder: new TextDecoder(),
        _encoder: new TextEncoder(),

        /** Check browser support for Web Serial API. */
        isSupported() {
            return "serial" in navigator;
        },

        /** Whether a port is currently open. */
        isConnected() {
            return this._port !== null && this._port.readable !== null;
        },

        /** Get the underlying SerialPort. */
        getPort() {
            return this._port;
        },

        /**
         * Prompt the user to select a serial port and open it.
         * Returns true on success, false on failure/cancel.
         */
        async connect() {
            if (this.isConnected()) return true;

            try {
                this._port = await navigator.serial.requestPort();
                await this._port.open({ baudRate: 115200 });
                this._notifyStatus("connected");
                this._startReadLoop();
                return true;
            } catch (err) {
                console.error("[YoloFarm] Serial connect error:", err);
                this._port = null;
                this._notifyStatus("error", err.message);
                return false;
            }
        },

        /** Close the serial connection. */
        async disconnect() {
            this._readLoopActive = false;
            try {
                if (this._reader) {
                    await this._reader.cancel();
                    this._reader.releaseLock();
                    this._reader = null;
                }
                if (this._port) {
                    await this._port.close();
                }
            } catch (e) {
                console.warn("[YoloFarm] Disconnect warning:", e);
            }
            this._port = null;
            this._notifyStatus("disconnected");
        },

        /** Register a callback for serial data. Returns an id to unregister. */
        onData(callback) {
            const id = Math.random().toString(36).slice(2, 10);
            this._monitorCallbacks.push({ id, callback });
            return id;
        },

        /** Unregister a data callback. */
        offData(id) {
            this._monitorCallbacks = this._monitorCallbacks.filter(c => c.id !== id);
        },

        /** Register a callback for connection status changes. */
        onStatus(callback) {
            const id = Math.random().toString(36).slice(2, 10);
            this._statusCallbacks.push({ id, callback });
            return id;
        },

        /** Unregister a status callback. */
        offStatus(id) {
            this._statusCallbacks = this._statusCallbacks.filter(c => c.id !== id);
        },

        _notifyStatus(status, detail) {
            this._statusCallbacks.forEach(c => c.callback(status, detail));
        },

        _notifyData(text) {
            this._monitorCallbacks.forEach(c => c.callback(text));
        },

        /** Continuously read from the serial port and dispatch to callbacks. */
        async _startReadLoop() {
            if (!this._port || !this._port.readable) return;
            this._readLoopActive = true;

            while (this._readLoopActive && this._port && this._port.readable) {
                try {
                    this._reader = this._port.readable.getReader();
                    while (this._readLoopActive) {
                        const { value, done } = await this._reader.read();
                        if (done) break;
                        if (value) {
                            const text = this._decoder.decode(value);
                            this._notifyData(text);
                        }
                    }
                } catch (err) {
                    if (this._readLoopActive) {
                        console.warn("[YoloFarm] Read loop error:", err);
                    }
                } finally {
                    try {
                        if (this._reader) {
                            this._reader.releaseLock();
                            this._reader = null;
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        },

        /**
         * Write raw bytes to the serial port.
         * Acquires and releases the writer lock for each call.
         */
        async _write(data) {
            if (!this._port || !this._port.writable) {
                throw new Error("Serial port not writable");
            }
            const writer = this._port.writable.getWriter();
            try {
                if (typeof data === "string") {
                    await writer.write(this._encoder.encode(data));
                } else {
                    await writer.write(data);
                }
            } finally {
                writer.releaseLock();
            }
        },

        /** Small delay helper. */
        _sleep(ms) {
            return new Promise(r => setTimeout(r, ms));
        },
    };


    // ── Code Uploader ───────────────────────────────────────────────────

    /**
     * Upload code to the Yolo:Bit board via Raw REPL mode.
     *
     * Flow:
     *   1. Ctrl+C Ctrl+C – interrupt any running program
     *   2. Ctrl+A         – enter Raw REPL mode
     *   3. Send code bytes (in chunks to avoid buffer overflow)
     *   4. Ctrl+D         – execute the code
     */
    async function sendViaREPL(code) {
        if (!SerialManager.isConnected()) {
            const ok = await SerialManager.connect();
            if (!ok) throw new Error("Không thể kết nối board. Kiểm tra cáp USB và thử lại.");
        }

        // Interrupt + enter Raw REPL
        await SerialManager._write("\x03\x03");  // Ctrl+C x2
        await SerialManager._sleep(100);
        await SerialManager._write("\x01");       // Ctrl+A → raw REPL
        await SerialManager._sleep(100);

        // Send code in chunks (256 bytes each to be safe)
        const CHUNK = 256;
        for (let i = 0; i < code.length; i += CHUNK) {
            const chunk = code.slice(i, i + CHUNK);
            await SerialManager._write(chunk);
            await SerialManager._sleep(20);
        }

        // Execute
        await SerialManager._write("\x04");       // Ctrl+D → execute
        await SerialManager._sleep(50);
    }

    /**
     * Upload code as main.py to the Yolo:Bit board.
     *
     * Flow:
     *   1. Enter Raw REPL
     *   2. Send a Python script that writes the user code to main.py
     *   3. Execute the file-writing script
     *   4. Soft-reset the board so main.py runs automatically
     */
    async function sendAsMainPy(code) {
        if (!SerialManager.isConnected()) {
            const ok = await SerialManager.connect();
            if (!ok) throw new Error("Không thể kết nối board. Kiểm tra cáp USB và thử lại.");
        }

        // Escape the user code for embedding in a Python string
        const escaped = code
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/\n/g, "\\n");

        const writeScript =
            "import machine\n" +
            "f = open('main.py', 'w')\n" +
            "f.write('" + escaped + "')\n" +
            "f.close()\n" +
            "print('[YoloBit] main.py saved successfully!')\n";

        // Interrupt + enter Raw REPL
        await SerialManager._write("\x03\x03");
        await SerialManager._sleep(100);
        await SerialManager._write("\x01");
        await SerialManager._sleep(100);

        // Send the file-writing script
        const CHUNK = 256;
        for (let i = 0; i < writeScript.length; i += CHUNK) {
            const chunk = writeScript.slice(i, i + CHUNK);
            await SerialManager._write(chunk);
            await SerialManager._sleep(20);
        }

        // Execute the write script
        await SerialManager._write("\x04");
        await SerialManager._sleep(500);

        // Soft reset to run main.py
        await SerialManager._write("\x03\x03");
        await SerialManager._sleep(100);
        await SerialManager._write("\x04");       // Ctrl+D in normal REPL = soft reset
        await SerialManager._sleep(100);
    }


    // ── Code Block Transformer ──────────────────────────────────────────

    function transformCodeBlocks(container) {
        if (!container) return;
        const blocks = container.querySelectorAll(".yolo-code-block");
        if (!blocks.length) return;

        const webSerialSupported = SerialManager.isSupported();

        blocks.forEach(function (block) {
            if (block.dataset.transformed === "true") return;
            block.dataset.transformed = "true";

            const codeEl = block.querySelector("pre code") || block.querySelector("pre");
            if (!codeEl) return;

            const originalCode = codeEl.textContent.trim();

            // ── Clear and rebuild ────────────────────────────────────
            block.innerHTML = "";

            // Toolbar
            const toolbar = document.createElement("div");
            toolbar.className = "code-toolbar";

            let actionsHtml =
                '<button class="btn-copy-code" title="Sao chép code">📋 Copy</button>' +
                '<button class="btn-reset-code" title="Khôi phục code gốc">↺ Reset</button>';

            if (webSerialSupported) {
                actionsHtml +=
                    '<button class="btn-import-repl" title="Chạy code trực tiếp trên board (mất khi reset)">▶ REPL</button>' +
                    '<button class="btn-import-main" title="Ghi vào main.py (chạy tự động khi bật board)">💾 Main</button>' +
                    '<button class="btn-monitor" title="Mở/đóng Serial Monitor">📟 Monitor</button>';
            }

            toolbar.innerHTML =
                '<span class="code-lang-label">MicroPython · Yolo:Bit</span>' +
                '<span class="code-actions">' + actionsHtml + '</span>';
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

            // Upload progress bar
            const progressEl = document.createElement("div");
            progressEl.className = "upload-progress";
            progressEl.innerHTML = '<div class="progress-bar"></div>';
            block.appendChild(progressEl);

            // Web Serial unsupported banner
            if (!webSerialSupported) {
                const banner = document.createElement("div");
                banner.className = "webserial-unsupported";
                banner.innerHTML =
                    '<span class="unsupported-icon">⚠️</span>' +
                    '<span>Trình duyệt không hỗ trợ Web Serial. ' +
                    'Sử dụng <a href="https://www.google.com/chrome/" target="_blank">Chrome</a> ' +
                    'hoặc <a href="https://www.microsoft.com/edge" target="_blank">Edge</a> ' +
                    'để nạp code vào Yolo:Bit.</span>';
                block.appendChild(banner);
            }

            // Serial Terminal
            let terminalEl = null;
            let terminalContent = null;
            let statusDot = null;
            let dataCallbackId = null;
            let statusCallbackId = null;

            if (webSerialSupported) {
                terminalEl = document.createElement("div");
                terminalEl.className = "serial-terminal";
                terminalEl.innerHTML =
                    '<div class="serial-terminal-header">' +
                    '  <div class="terminal-title">' +
                    '    <div class="status-dot"></div>' +
                    '    <span>Serial Monitor</span>' +
                    '  </div>' +
                    '  <div class="terminal-actions">' +
                    '    <button class="btn-terminal-clear" title="Xóa output">Clear</button>' +
                    '    <button class="btn-terminal-disconnect" title="Ngắt kết nối">Disconnect</button>' +
                    '  </div>' +
                    '</div>' +
                    '<div class="serial-terminal-content"></div>';
                block.appendChild(terminalEl);

                terminalContent = terminalEl.querySelector(".serial-terminal-content");
                statusDot = terminalEl.querySelector(".status-dot");

                // Terminal Clear button
                terminalEl.querySelector(".btn-terminal-clear").addEventListener("click", function () {
                    terminalContent.textContent = "";
                });

                // Terminal Disconnect button
                terminalEl.querySelector(".btn-terminal-disconnect").addEventListener("click", function () {
                    SerialManager.disconnect();
                });
            }

            // ── Helper: append text to terminal ─────────────────────
            function appendToTerminal(text, className) {
                if (!terminalContent) return;
                if (className) {
                    const span = document.createElement("span");
                    span.className = className;
                    span.textContent = text;
                    terminalContent.appendChild(span);
                } else {
                    terminalContent.appendChild(document.createTextNode(text));
                }
                // Auto-scroll + limit buffer
                terminalContent.scrollTop = terminalContent.scrollHeight;
                while (terminalContent.childNodes.length > 1000) {
                    terminalContent.removeChild(terminalContent.firstChild);
                }
            }

            // ── Register serial callbacks ───────────────────────────
            if (webSerialSupported) {
                dataCallbackId = SerialManager.onData(function (text) {
                    // Only append if this terminal is visible
                    if (terminalEl.classList.contains("visible")) {
                        appendToTerminal(text);
                    }
                });

                statusCallbackId = SerialManager.onStatus(function (status, detail) {
                    if (!statusDot) return;
                    statusDot.classList.remove("connected", "error");
                    if (status === "connected") {
                        statusDot.classList.add("connected");
                        appendToTerminal("[✓] Đã kết nối board\n", "serial-success");
                    } else if (status === "disconnected") {
                        appendToTerminal("[✗] Đã ngắt kết nối\n", "serial-info");
                    } else if (status === "error") {
                        statusDot.classList.add("error");
                        appendToTerminal("[!] Lỗi: " + (detail || "Unknown") + "\n", "serial-error");
                    }
                });
            }

            // ── Event Listeners ─────────────────────────────────────
            const btnCopy = toolbar.querySelector(".btn-copy-code");
            const btnReset = toolbar.querySelector(".btn-reset-code");
            const btnREPL = toolbar.querySelector(".btn-import-repl");
            const btnMain = toolbar.querySelector(".btn-import-main");
            const btnMonitor = toolbar.querySelector(".btn-monitor");

            // Copy
            btnCopy.addEventListener("click", function () {
                navigator.clipboard.writeText(textarea.value).then(function () {
                    btnCopy.innerHTML = "✅ Copied!";
                    btnCopy.classList.add("copied");
                    setTimeout(function () {
                        btnCopy.innerHTML = "📋 Copy";
                        btnCopy.classList.remove("copied");
                    }, 2000);
                });
            });

            // Reset
            btnReset.addEventListener("click", function () {
                textarea.value = originalCode;
                textarea.rows = Math.max(4, originalCode.split("\n").length);
            });

            // Import via REPL
            if (btnREPL) {
                btnREPL.addEventListener("click", async function () {
                    const code = textarea.value.trim();
                    if (!code) return;

                    // Show monitor automatically
                    if (terminalEl && !terminalEl.classList.contains("visible")) {
                        terminalEl.classList.add("visible");
                        if (btnMonitor) btnMonitor.classList.add("active");
                    }

                    btnREPL.classList.add("uploading");
                    btnREPL.innerHTML = "⏳ Đang nạp...";
                    progressEl.classList.add("active");

                    appendToTerminal("\n[→] Nạp code qua REPL...\n", "serial-info");

                    try {
                        await sendViaREPL(code);
                        appendToTerminal("[✓] Đã nạp code thành công! (REPL mode)\n", "serial-success");
                    } catch (err) {
                        appendToTerminal("[!] Lỗi: " + err.message + "\n", "serial-error");
                    } finally {
                        btnREPL.classList.remove("uploading");
                        btnREPL.innerHTML = "▶ REPL";
                        progressEl.classList.remove("active");
                    }
                });
            }

            // Import as main.py
            if (btnMain) {
                btnMain.addEventListener("click", async function () {
                    const code = textarea.value.trim();
                    if (!code) return;

                    // Confirm with user
                    if (!confirm(
                        "Ghi code vào main.py trên board?\n\n" +
                        "Code sẽ tự động chạy mỗi khi bật board.\n" +
                        "Code cũ trong main.py sẽ bị ghi đè."
                    )) return;

                    // Show monitor automatically
                    if (terminalEl && !terminalEl.classList.contains("visible")) {
                        terminalEl.classList.add("visible");
                        if (btnMonitor) btnMonitor.classList.add("active");
                    }

                    btnMain.classList.add("uploading");
                    btnMain.innerHTML = "⏳ Đang ghi...";
                    progressEl.classList.add("active");

                    appendToTerminal("\n[→] Ghi code vào main.py...\n", "serial-info");

                    try {
                        await sendAsMainPy(code);
                        appendToTerminal("[✓] Đã ghi main.py và reset board!\n", "serial-success");
                    } catch (err) {
                        appendToTerminal("[!] Lỗi: " + err.message + "\n", "serial-error");
                    } finally {
                        btnMain.classList.remove("uploading");
                        btnMain.innerHTML = "💾 Main";
                        progressEl.classList.remove("active");
                    }
                });
            }

            // Toggle Monitor
            if (btnMonitor) {
                btnMonitor.addEventListener("click", function () {
                    if (terminalEl.classList.contains("visible")) {
                        terminalEl.classList.remove("visible");
                        btnMonitor.classList.remove("active");
                    } else {
                        terminalEl.classList.add("visible");
                        btnMonitor.classList.add("active");
                    }
                });
            }
        });
    }


    // ── Public API ──────────────────────────────────────────────────────

    window.YoloFarm = {
        transformCodeBlocks: transformCodeBlocks,
        connect: SerialManager.connect.bind(SerialManager),
        disconnect: SerialManager.disconnect.bind(SerialManager),
        isConnected: SerialManager.isConnected.bind(SerialManager),
    };
})();
