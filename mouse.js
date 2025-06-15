function setupPointerLock(canvas, onMouseMoveCallback) {
    function mouseMoveHandler(event) {
        onMouseMoveCallback(event.movementX, -event.movementY);
    }

    // Request pointer lock on click
    canvas.addEventListener('click', () => {
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock({unadjustedMovement: true});
        }
    });

    // Handler when pointer lock state changes
    document.addEventListener('pointerlockchange', () => {
        const lockedElement = document.pointerLockElement;
        if (lockedElement === canvas) {
            // Locked: listen for mousemove
            document.addEventListener('mousemove', mouseMoveHandler);
        } else {
            // Unlocked: stop listening
            document.removeEventListener('mousemove', mouseMoveHandler);
        }
    });

    document.addEventListener('pointerlockerror', () => {
        console.error('Error while attempting to lock cursor');
    });
}
