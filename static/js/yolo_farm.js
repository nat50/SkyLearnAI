/**
 * YOLO Farm – Interactive Code Runner (Pyodide)
 *
 * Transforms static code blocks inside lessons into interactive editors
 * that users can edit and execute directly in the browser using Pyodide
 * (Python compiled to WebAssembly).
 */

(function () {
    "use strict";

    // ── Pyodide Singleton ────────────────────────────────────────────────

    let pyodideInstance = null;
    let pyodideLoading = false;
    const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js";

    /**
     * Create and manage the loading overlay shown while Pyodide downloads.
     */
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

    /**
     * Lazy-load Pyodide from CDN only when the user clicks Run for the first
     * time.  Returns the cached instance on subsequent calls.
     */
    async function ensurePyodide() {
        if (pyodideInstance) return pyodideInstance;
        if (pyodideLoading) {
            // Another call is already loading – wait for it
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
            // Dynamically inject the Pyodide script tag
            await new Promise((resolve, reject) => {
                if (window.loadPyodide) {
                    resolve();
                    return;
                }
                const script = document.createElement("script");
                script.src = PYODIDE_CDN;
                script.onload = resolve;
                script.onerror = () => reject(new Error("Failed to load Pyodide CDN"));
                document.head.appendChild(script);
            });

            // Initialise Pyodide
            pyodideInstance = await window.loadPyodide();
            console.log("[YoloFarm] Pyodide initialised successfully");
        } catch (err) {
            console.error("[YoloFarm] Pyodide init error:", err);
            throw err;
        } finally {
            pyodideLoading = false;
            hideLoadingOverlay();
        }

        return pyodideInstance;
    }

    // ── Code Execution ───────────────────────────────────────────────────

    /**
     * Execute a Python code string using Pyodide and return captured output.
     */
    async function runPythonCode(code) {
        const pyodide = await ensurePyodide();

        // Set up stdout / stderr capture
        pyodide.runPython(`
import sys, io
_yolo_stdout = io.StringIO()
_yolo_stderr = io.StringIO()
sys.stdout = _yolo_stdout
sys.stderr = _yolo_stderr
`);

        let error = false;
        let output = "";

        try {
            // Execute user code
            const result = pyodide.runPython(code);

            // Grab captured output
            output = pyodide.runPython("_yolo_stdout.getvalue()");
            const errOutput = pyodide.runPython("_yolo_stderr.getvalue()");

            if (errOutput) {
                output += (output ? "\n" : "") + errOutput;
            }

            // If script produced a return value and no print output, show it
            if (!output && result !== undefined && result !== null) {
                const repr = String(result);
                if (repr !== "None") output = repr;
            }
        } catch (err) {
            error = true;
            // Extract just the meaningful error message
            output = String(err).replace(/^PythonError:\s*/i, "");
        } finally {
            // Restore default streams
            pyodide.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`);
        }

        return { output: output || "(Không có output)", error };
    }

    // ── Code Block Transformer ───────────────────────────────────────────

    /**
     * Scan a container element for `.yolo-code-block` divs and transform
     * them into interactive editors with Run / Reset buttons and an output
     * panel.
     *
     * @param {HTMLElement} container  The parent element to scan.
     */
    function transformCodeBlocks(container) {
        if (!container) return;

        const blocks = container.querySelectorAll(".yolo-code-block");
        if (!blocks.length) return;

        blocks.forEach((block) => {
            // Skip if already transformed
            if (block.dataset.transformed === "true") return;
            block.dataset.transformed = "true";

            const codeEl = block.querySelector("pre code") || block.querySelector("pre");
            if (!codeEl) return;

            const originalCode = codeEl.textContent.trim();
            const codeId = block.dataset.codeId || "block_" + Math.random().toString(36).slice(2, 8);

            // ── Build new inner HTML ─────────────────────────────────────
            block.innerHTML = "";

            // Toolbar
            const toolbar = document.createElement("div");
            toolbar.className = "code-toolbar";
            toolbar.innerHTML =
                '<span class="code-lang-label">Python</span>' +
                '<span class="code-actions">' +
                '  <button class="btn-reset-code" title="Khôi phục code gốc">↺ Reset</button>' +
                '  <button class="btn-run-code" title="Chạy code">▶ Run</button>' +
                "</span>";
            block.appendChild(toolbar);

            // Editor
            const editorWrapper = document.createElement("div");
            editorWrapper.className = "code-editor-wrapper";
            const textarea = document.createElement("textarea");
            textarea.className = "code-editor";
            textarea.spellcheck = false;
            textarea.value = originalCode;
            textarea.rows = Math.max(4, originalCode.split("\n").length);

            // Handle Tab key inside textarea
            textarea.addEventListener("keydown", function (e) {
                if (e.key === "Tab") {
                    e.preventDefault();
                    const start = this.selectionStart;
                    const end = this.selectionEnd;
                    this.value =
                        this.value.substring(0, start) +
                        "    " +
                        this.value.substring(end);
                    this.selectionStart = this.selectionEnd = start + 4;
                }
            });

            editorWrapper.appendChild(textarea);
            block.appendChild(editorWrapper);

            // Output panel (hidden by default)
            const outputPanel = document.createElement("div");
            outputPanel.className = "code-output";
            outputPanel.style.display = "none";
            outputPanel.innerHTML =
                '<div class="output-header">' +
                '  <span class="output-label">Output</span>' +
                '  <span class="output-status"></span>' +
                "</div>" +
                '<pre class="output-content"></pre>';
            block.appendChild(outputPanel);

            // ── Event Listeners ──────────────────────────────────────────

            const btnRun = toolbar.querySelector(".btn-run-code");
            const btnReset = toolbar.querySelector(".btn-reset-code");
            const outputContent = outputPanel.querySelector(".output-content");
            const outputStatus = outputPanel.querySelector(".output-status");

            btnRun.addEventListener("click", async function () {
                const code = textarea.value.trim();
                if (!code) return;

                // UI → running state
                btnRun.classList.add("running");
                btnRun.innerHTML = "⏳ Running...";
                outputPanel.style.display = "block";
                outputContent.textContent = "Đang chạy...";
                outputContent.className = "output-content";
                outputStatus.textContent = "";
                outputStatus.className = "output-status";

                try {
                    const result = await runPythonCode(code);
                    outputContent.textContent = result.output;
                    if (result.error) {
                        outputContent.classList.add("error");
                        outputStatus.textContent = "Error";
                        outputStatus.classList.add("error");
                    } else {
                        outputStatus.textContent = "Success";
                        outputStatus.classList.add("success");
                    }
                } catch (err) {
                    outputContent.textContent = "Lỗi: Không thể khởi tạo Python runtime.\n" + String(err);
                    outputContent.classList.add("error");
                    outputStatus.textContent = "Error";
                    outputStatus.classList.add("error");
                } finally {
                    btnRun.classList.remove("running");
                    btnRun.innerHTML = "▶ Run";
                }
            });

            btnReset.addEventListener("click", function () {
                textarea.value = originalCode;
                textarea.rows = Math.max(4, originalCode.split("\n").length);
                outputPanel.style.display = "none";
            });
        });
    }

    // ── Public API ───────────────────────────────────────────────────────

    window.YoloFarm = {
        transformCodeBlocks: transformCodeBlocks,
        runPythonCode: runPythonCode,
    };
})();
