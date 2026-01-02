export const mouse = {
    x: 0,
    y: 0,
    clicked: false
};

export const keys = {
    w: false, a: false, s: false, d: false,
    arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
    i: false,  // Inspektion
    m: false,  // Cheat
    e: false,  // Toxin
    r: false,   // Protease
    ' ': false // Space
};

export function initInput() {
    // Mus
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mousedown', () => {
        mouse.clicked = true;
    });

    window.addEventListener('mouseup', () => {
        mouse.clicked = false;
    });

    // Tastatur - Holdes nede
    window.addEventListener('keydown', (e) => {
        const code = e.code.toLowerCase();
        if (code === 'keyw') keys.w = true;
        if (code === 'keya') keys.a = true;
        if (code === 'keys') keys.s = true;
        if (code === 'keyd') keys.d = true;
        if (code === 'arrowup') keys.arrowup = true;
        if (code === 'arrowdown') keys.arrowdown = true;
        if (code === 'arrowleft') keys.arrowleft = true;
        if (code === 'arrowright') keys.arrowright = true;
        if (code === 'space') keys[' '] = true;

        if (code === 'keyi') keys.i = true;
        if (code === 'keym') keys.m = true;
        if (code === 'keye') keys.e = true;
        if (code === 'keyr') keys.r = true;
    });

    window.addEventListener('keyup', (e) => {
        const code = e.code.toLowerCase();
        if (code === 'keyw') keys.w = false;
        if (code === 'keya') keys.a = false;
        if (code === 'keys') keys.s = false;
        if (code === 'keyd') keys.d = false;
        if (code === 'arrowup') keys.arrowup = false;
        if (code === 'arrowdown') keys.arrowdown = false;
        if (code === 'arrowleft') keys.arrowleft = false;
        if (code === 'arrowright') keys.arrowright = false;
        if (code === 'space') keys[' '] = false;

        if (code === 'keyi') keys.i = false;
        if (code === 'keym') keys.m = false;
        if (code === 'keye') keys.e = false;
        if (code === 'keyr') keys.r = false;
    });
}