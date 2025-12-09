export const mouse = {
    x: 0,
    y: 0,
    clicked: false
};

// Vi gemmer kun taster, der skal holdes nede eller tjekkes i gameloopet
export const keys = {
    d: false  // NYT: Vi lytter efter D
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
        if (e.code === 'KeyD') keys.d = true; // Hvis man trykker D
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyD') keys.d = false;
    });
}