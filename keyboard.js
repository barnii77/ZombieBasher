/**
 * Set up keyboard listeners to track pressed keys.
 * Returns an object with methods to query the current state.
 */
function setupKeyboardInput() {
    const pressed = new Set();

    window.addEventListener('keydown', (event) => {
        pressed.add(event.code);
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) {
            event.preventDefault();
        }
    });

    window.addEventListener('keyup', (event) => {
        pressed.delete(event.code);
    });

    return {
        isDown(code) {
            return pressed.has(code);
        },
    };
}

let keyboard = setupKeyboardInput();
