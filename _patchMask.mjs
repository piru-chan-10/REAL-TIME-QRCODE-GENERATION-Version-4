import { readFileSync, writeFileSync } from 'fs';

const file = './qr.js';
let src = readFileSync(file, 'utf8');

// Normalize to LF so the regex works regardless of CRLF
src = src.replace(/\r\n/g, '\n');

const oldFn = `function applyMask(maskNumber,mat,innerMat){
    const mask0=(r,c)=> (r+c)%2===0;
    function applyMaskIerator(maskFunc){
        for(let i=0;i<mat.length;i++){
            for(let j=0;j<mat[0].length;j++){
                if(!innerMat[i][j] && maskFunc(i,j)){
                    const flip=mat[i][j]===0?1:0;
                    setModule(mat,i,j,flip);
                    setModule(innerMat,i,j,true);
                }
                
            }
        }
    }
    switch (maskNumber){
        case 0:
            applyMaskIerator(mask0);
            break;

    }
}`;

const newFn = `/**
 * Applies one of the 8 QR-code mask patterns (ISO/IEC 18004 §7.8.2)
 * to all data/error-correction modules (cells NOT reserved in innerMat).
 *
 * Mask conditions (r = row, c = col):
 *   0: (r + c) % 2 === 0
 *   1: r % 2 === 0
 *   2: c % 3 === 0
 *   3: (r + c) % 3 === 0
 *   4: (floor(r/2) + floor(c/3)) % 2 === 0
 *   5: (r*c)%2 + (r*c)%3 === 0
 *   6: ((r*c)%2 + (r*c)%3) % 2 === 0
 *   7: ((r+c)%2 + (r*c)%3) % 2 === 0
 *
 * @param {number}      maskNumber - 0..7 mask pattern index
 * @param {number[][]}  mat        - QR module matrix (mutated in-place)
 * @param {boolean[][]} innerMat   - Reserved-cell map; true cells are skipped
 */
function applyMask(maskNumber, mat, innerMat) {
    // All 8 mask-condition functions as defined in the QR spec
    const maskPatterns = [
        (r, c) => (r + c) % 2 === 0,                                          // 0
        (r, c) => r % 2 === 0,                                                 // 1
        (r, c) => c % 3 === 0,                                                 // 2
        (r, c) => (r + c) % 3 === 0,                                           // 3
        (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,          // 4
        (r, c) => (r * c) % 2 + (r * c) % 3 === 0,                            // 5
        (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,                      // 6
        (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,                      // 7
    ];

    if (maskNumber < 0 || maskNumber > 7) {
        throw new RangeError(\`Invalid mask pattern: \${maskNumber}. Must be 0-7.\`);
    }

    const maskFunc = maskPatterns[maskNumber];

    // XOR-flip every non-reserved module where the mask condition is true.
    // innerMat is NOT mutated here — masking is a reversible transform on data modules.
    for (let r = 0; r < mat.length; r++) {
        for (let c = 0; c < mat[0].length; c++) {
            if (!innerMat[r][c] && maskFunc(r, c)) {
                setModule(mat, r, c, mat[r][c] === 0 ? 1 : 0);
            }
        }
    }
}`;

if (!src.includes(oldFn)) {
    console.error('❌ Could not find the target block. Dumping first 300 chars of file:\n', src.slice(0, 300));
    process.exit(1);
}

src = src.replace(oldFn, newFn);
// Restore CRLF
src = src.replace(/\n/g, '\r\n');
writeFileSync(file, src, 'utf8');
console.log('✅ applyMask successfully replaced in qr.js');
