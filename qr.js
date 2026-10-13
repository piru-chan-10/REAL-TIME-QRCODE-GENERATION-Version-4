

import { getFinalCodeWords } from "./qrDataEncoder.js";

// QR Version 4: 33 x 33, Error Correction Level L
export function spawnQR(txt, size = 33) {
    if (size !== 33) {
        throw new Error(
            "This implementation supports QR Version 4 (33x33) only."
        );
    }

    const res = getEmptyMatrix(size);
    const innerMat = getEmptyMatrix(size, true);

    // 1. Finder patterns
    drawFinderPattern(res, innerMat, 0, 0);
    drawFinderPattern(res, innerMat, 0, size - 7);
    drawFinderPattern(res, innerMat, size - 7, 0);

    // 2. Separators
    drawSeparators(res, innerMat, 0, 0);
    drawSeparators(res, innerMat, 0, size - 7);
    drawSeparators(res, innerMat, size - 7, 0);

    // 3. Timing and alignment patterns
    drawTimingPatterns(res, innerMat);
    drawAlignmentPattern(res, innerMat);

    // 4. Format information: Level L, Mask 0
    formatInformation(res, innerMat);

    // Save function-pattern reservations before placing data
    const funcMat = innerMat.map(row => [...row]);

    // 5. Place encoded data and error-correction bits
    placeDataBits(txt, res, innerMat);

    // 6. Apply mask 0 to data and remainder modules only
    applyMask(0, res, funcMat);

    return res;
}


// Applies one of the eight QR mask patterns
function applyMask(maskNumber, mat, funcMat) {
    const maskPatterns = [
        (r, c) => (r + c) % 2 === 0,
        (r, c) => r % 2 === 0,
        (r, c) => c % 3 === 0,
        (r, c) => (r + c) % 3 === 0,
        (r, c) =>
            (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
        (r, c) =>
            ((r * c) % 2 + (r * c) % 3) === 0,
        (r, c) =>
            ((r * c) % 2 + (r * c) % 3) % 2 === 0,
        (r, c) =>
            ((r + c) % 2 + (r * c) % 3) % 2 === 0,
    ];

    if (!Number.isInteger(maskNumber) ||
        maskNumber < 0 || maskNumber > 7) {
        throw new RangeError("Mask number must be an integer from 0 to 7.");
    }

    const maskFunc = maskPatterns[maskNumber];

    for (let r = 0; r < mat.length; r++) {
        for (let c = 0; c < mat[r].length; c++) {
            if (!funcMat[r][c] && maskFunc(r, c)) {
                mat[r][c] = mat[r][c] ? 0 : 1;
            }
        }
    }
}


// Places the complete encoded bitstream in QR zigzag order
function placeDataBits(txt, mat, innerMat) {
    const bits = Array.from(getFinalCodeWords(txt), Number);
    const size = mat.length;

    if (bits.some(bit => bit !== 0 && bit !== 1)) {
        throw new Error("Encoded data must contain only 0 and 1.");
    }

    // Version 4-L contains 100 codewords = 800 bits
    if (bits.length !== 800) {
        throw new Error(
            `Expected 800 encoded bits for Version 4-L; received ${bits.length}.`
        );
    }

    let count = 0;
    let row = size - 1;
    let col = size - 1;
    let upward = true;

    while (col > 0) {
        // Column 6 is reserved for the timing pattern
        if (col === 6) col--;

        while (row >= 0 && row < size) {
            for (let offset = 0; offset < 2; offset++) {
                const c = col - offset;

                if (!innerMat[row][c] && count < bits.length) {
                    mat[row][c] = bits[count];
                    innerMat[row][c] = true;
                    count++;
                }
            }

            row += upward ? -1 : 1;
        }

        upward = !upward;
        col -= 2;
        row = upward ? size - 1 : 0;
    }

    if (count !== bits.length) {
        throw new Error(
            `Placed ${count}/${bits.length} bits. Data placement failed.`
        );
    }

    console.log(`Placed ${count}/${bits.length} data bits.`);
}



function formatInformation(mat, innerMat) {
    // Error correction L + mask 0
    // BCH-protected format word = 0x77C4
    const bits = "111011111000100"
        .split("")
        .reverse()
        .map(Number);

    // First copy: top-left
    const copy1 = [
        [0, 8], [1, 8], [2, 8], [3, 8],
        [4, 8], [5, 8], [7, 8], [8, 8],
        [8, 7], [8, 5], [8, 4], [8, 3],
        [8, 2], [8, 1], [8, 0]
    ];

    // Second copy: top-right, then bottom-left
    const copy2 = [
        [8, 32], [8, 31], [8, 30], [8, 29],
        [8, 28], [8, 27], [8, 26], [8, 25],
        [26, 8], [27, 8], [28, 8], [29, 8],
        [30, 8], [31, 8], [32, 8]
    ];

    for (let i = 0; i < 15; i++) {
        for (const [r, c] of [copy1[i], copy2[i]]) {
            mat[r][c] = bits[i];
            innerMat[r][c] = true;
        }
    }

    // Fixed dark module
    mat[25][8] = 1;
    innerMat[25][8] = true;
}


// Draws white separator modules around a finder pattern
function drawSeparators(mat, innerMat, row, col) {
    const candidates = [];

    if (row === 0 && col === 0) {
        for (let c = 0; c <= 7; c++) candidates.push([7, c]);
        for (let r = 0; r <= 7; r++) candidates.push([r, 7]);
    } else if (row === 0) {
        for (let c = col - 1; c <= col + 6; c++) {
            candidates.push([7, c]);
        }

        for (let r = 0; r <= 7; r++) {
            candidates.push([r, col - 1]);
        }
    } else {
        for (let c = 0; c <= 7; c++) {
            candidates.push([row - 1, c]);
        }

        for (let r = row - 1; r <= row + 6; r++) {
            candidates.push([r, 7]);
        }
    }

    for (const [r, c] of candidates) {
        if (
            r >= 0 && r < mat.length &&
            c >= 0 && c < mat[r].length
        ) {
            mat[r][c] = 0;
            innerMat[r][c] = true;
        }
    }
}


// Timing patterns
function drawTimingPatterns(mat, innerMat) {
    for (let i = 8; i <= 24; i++) {
        const value = i % 2 === 0 ? 1 : 0;

        mat[6][i] = value;
        innerMat[6][i] = true;

        mat[i][6] = value;
        innerMat[i][6] = true;
    }
}


// Alignment pattern centered at (26, 26)
function drawAlignmentPattern(mat, innerMat) {
    for (let r = 24; r <= 28; r++) {
        for (let c = 24; c <= 28; c++) {
            const dr = Math.abs(r - 26);
            const dc = Math.abs(c - 26);
            const distance = Math.max(dr, dc);

            const isBlack = distance === 2 || distance === 0;

            mat[r][c] = isBlack ? 1 : 0;
            innerMat[r][c] = true;
        }
    }
}


// Finder pattern: 7 x 7
function drawFinderPattern(mat, innerMat, startRow, startCol) {
    for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
            const isOuter =
                r === 0 || r === 6 || c === 0 || c === 6;

            const isCenter =
                r >= 2 && r <= 4 && c >= 2 && c <= 4;

            const isBlack = isOuter || isCenter;

            mat[startRow + r][startCol + c] =
                isBlack ? 1 : 0;

            innerMat[startRow + r][startCol + c] = true;
        }
    }
}


// Creates an empty square matrix
function getEmptyMatrix(size, bool = false) {
    const initialValue = bool ? false : 0;

    return Array.from(
        { length: size },
        () => Array(size).fill(initialValue)
    );
}
