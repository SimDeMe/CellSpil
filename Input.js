export const mouse = {
    x: 0,
    y: 0
};

// Vi gemmer status for taster
export const keys = {
    space: false
};

export function initInput() {
    // Musens bevægelse
    window.addEventListener('mousemove', (event) => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    });

    // Når en tast trykkes NED
    window.addEventListener('keydown', (event) => {
        if (event.code === 'Space') {
            keys.space = true;
        }
    });

    // Når en tast slippes OP
    window.addEventListener('keyup', (event) => {
        if (event.code === 'Space') {
            keys.space = false;
        }
    });
}