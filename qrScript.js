
"use strict";
import { spawnQR } from "./qr.js";

// ── DOM references ────────────────────────────────────────────────────────────
const canvas  = document.getElementById("qr-canvas");
const ctx     = canvas.getContext("2d");
const input   = document.getElementById("qr-input");
const btn     = document.getElementById("qr-btn");

// ── QR render constants ───────────────────────────────────────────────────────
const QR_SIZE   = 33;          // modules per side (QR v4)
const QUIET     = 4;           // quiet-zone modules on each side (spec requires 4)
const TOTAL     = QR_SIZE + QUIET * 2;   // total modules including quiet zone

// Canvas is 2145 px → each module = 2145 / TOTAL ≈ 52 px (plenty of resolution)
const MODULE_PX = canvas.width / TOTAL;

// ── Drawing helpers ───────────────────────────────────────────────────────────
function clearCanvas() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvas.setAttribute("data-empty", "");
}

function drawModule(row, col, dark) {
    const x = (col + QUIET) * MODULE_PX;
    const y = (row + QUIET) * MODULE_PX;
    ctx.fillStyle = dark ? "#000000" : "#ffffff";
    ctx.fillRect(x, y, MODULE_PX, MODULE_PX);
}

// ── Render a QR matrix onto the canvas ───────────────────────────────────────
function renderMatrix(matrix) {
    clearCanvas();
    for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
            drawModule(r, c, matrix[r][c] === 1 || matrix[r][c] === true);
        }
    }
    canvas.removeAttribute("data-empty");
}

// ── Status / error display ────────────────────────────────────────────────────
const STATUS_ID = "qr-status";
function setStatus(msg, isError = false) {
    let el = document.getElementById(STATUS_ID);
    if (!el) {
        el = document.createElement("p");
        el.id = STATUS_ID;
        el.style.cssText = `
            margin-top: 14px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            min-height: 20px;
            transition: color 0.2s;
        `;
        btn.insertAdjacentElement("afterend", el);
    }
    el.textContent  = msg;
    el.style.color  = isError ? "#f87171" : "#34d399";
}

// ── Core: generate + render ───────────────────────────────────────────────────
function generate(txt) {
    if (!txt || txt.trim() === "") {
        clearCanvas();
        setStatus("");
        return;
    }

    // QR v4-L byte-mode capacity = 80 bytes
    const byteLen = new TextEncoder().encode(txt).length;
    if (byteLen > 80) {
        setStatus(`⚠ Too long — ${byteLen}/80 bytes. QR v4-L max is 80 bytes.`, true);
        return;
    }

    try {
        const matrix = spawnQR(txt, 33);
        renderMatrix(matrix);
        setStatus(`✓ QR generated — ${byteLen} byte${byteLen !== 1 ? "s" : ""} encoded`);
    } catch (err) {
        setStatus(`✗ ${err.message}`, true);
        console.error(err);
    }
}

// ── Event listeners ───────────────────────────────────────────────────────────

// Real-time: regenerate on every keystroke (debounced slightly for perf)
let debounceTimer = null;
input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => generate(input.value), 120);
});

// Button click
btn.addEventListener("click", () => generate(input.value));

// Enter key in input
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") generate(input.value);
});

// ── Initial render ────────────────────────────────────────────────────────────
clearCanvas();
setStatus("Type something to generate your QR code.");
