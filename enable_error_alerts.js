function enableErrorAlerts() {
    // Catch uncaught runtime errors
    window.addEventListener('error', function (e) {
        const msg = e.error
            ? `${e.error.message}\n${e.error.stack}`
            : e.message;
        alert(msg);
    });

    // Catch unhandled Promise rejections
    window.addEventListener('unhandledrejection', function (e) {
        const reason = e.reason;
        if (reason instanceof Error) {
            alert(`${reason.message}\n${reason.stack}`);
        } else {
            alert(`Unhandled promise rejection: ${JSON.stringify(reason)}`);
        }
    });
}

enableErrorAlerts();
