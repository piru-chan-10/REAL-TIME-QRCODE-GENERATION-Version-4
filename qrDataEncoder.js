
// gets a string of binary from a message string
function getBinaryText(txt) {
    let res = [...new TextEncoder().encode(txt)]
        .map(i => i.toString(2).padStart(8, "0"))
        .join("");
    return res;

}

function getErrorCorrection(dataCodeWords,gen){
    let res=[...dataCodeWords,...new Array(20).fill(0)];
    const ecCount=gen.length-1;
    for(let i=0;i<dataCodeWords.length;i++){
        const factor=res[i];
        if(factor!==0){
            for(let j=0;j<gen.length;j++){
                res[i+j]^=galoiFieldMult(factor,gen[j]);
            }
        }
    }
    return res.slice(dataCodeWords.length);
}

function getGeneratorPoly(n){
    let gen=[1];
    let root=1;
    for(let i=0;i<n;i++){
        gen=polyMult(gen,[1,root]);
        root=galoiFieldMult(root,2);
    }
    return gen;
}

function polyMult(p,q){
    let r=new Array(p.length+q.length-1).fill(0);
    for(let i=0;i<p.length;i++){
        for(let j=0;j<q.length;j++){
            r[i+j]^=galoiFieldMult(p[i],q[j]);
        }
    }
    return r;
}


export function galoiFieldMult(a,b){
    let res=0;
    while(b>0){
        if(b%2!==0) res^=a;
        a<<=1;
        if(a>=256) a^=0x11D;
        b>>=1;
    }
    return res;
}


function getDataBits(txt){
    const mode="0100";
    const payLoad=getBinaryText(txt);
    const count=new TextEncoder().encode(txt).length.toString(2).padStart(8,"0");
    return mode+count+payLoad;

}
function QRv4Encoder(txt){
    const capacity=640;
    let step1=getDataBits(txt);
    const remaining=capacity-step1.length;
    if (remaining < 0) { throw new Error("Data exceeds QR V4-L capacity"); }
    step1+="0".repeat(Math.min(4,remaining));
    while(step1.length%8!==0){
        step1+="0";
    }
    let altcodeWords=["11101100","00010001"] // [0xEC,0x11]
    let altIndx=0;
    while(step1.length!==capacity){
        step1+=altcodeWords[altIndx];
        altIndx=1-altIndx;
    }
    return step1;
}

function bitsToCodewords(bits) {
    const codewords = [];

    for (let i = 0; i < bits.length; i += 8) {
        codewords.push(parseInt(bits.slice(i, i + 8), 2));
    }

    return codewords;
}
export function getFinalCodeWords(txt){
    const gen = getGeneratorPoly(20);
    const dataCodeWords = bitsToCodewords(QRv4Encoder(txt));
    const ec = getErrorCorrection(dataCodeWords, gen);
    const finalCodeWords=[...dataCodeWords,...ec];
    return finalCodeWords.map(i=>i.toString(2).padStart(8,"0"))
                        .join("");
}