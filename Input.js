export const mouse = {
    x: 0,
    y: 0,
    clicked: false
};

export const keys = {
    d: false,  // Deling
    i: false,  // Inspektion
    s: false,  // Cheat
    m: false   // Cheat
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
        if (e.code === 'KeyD') keys.d = true;
        if (e.code === 'KeyS') keys.s = true;
        if (e.code === 'KeyM') keys.m = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyD') keys.d = false;
        if (e.code === 'KeyS') keys.s = false;
        if (e.code === 'KeyM') keys.m = false;
    });
}