document.addEventListener('DOMContentLoaded', () => {
    const liveClock = document.querySelector('[data-live-clock]');

    if (liveClock) {
        const formatter = new Intl.DateTimeFormat('en-PH', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });

        const updateClock = () => {
            liveClock.textContent = formatter.format(new Date());
        };

        updateClock();
        window.setInterval(updateClock, 1000);
    }

    const dashboardShell = document.getElementById('dashboardShell');
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (dashboardShell && sidebarToggle) {
        const applySidebarState = (collapsed) => {
            dashboardShell.classList.toggle('sidebar-collapsed', collapsed);
            sidebarToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        };

        applySidebarState(false);

        sidebarToggle.addEventListener('click', () => {
            const collapsed = !dashboardShell.classList.contains('sidebar-collapsed');
            applySidebarState(collapsed);
        });
    }

    const flash = window.appFlash ?? null;
    const error = window.appError ?? null;
    const iconMap = {
        success: 'success',
        danger: 'error',
        warning: 'warning',
        info: 'info'
    };

    if (window.Swal && flash && flash.message) {
        Swal.fire({
            icon: iconMap[flash.type] ?? 'info',
            text: flash.message,
            confirmButtonColor: '#8f6a21'
        });
    }

    if (window.Swal && error && error.message) {
        Swal.fire({
            icon: 'error',
            text: error.message,
            confirmButtonColor: '#8f6a21'
        });
    }

    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-password-toggle');
            const input = targetId ? document.getElementById(targetId) : null;

            if (!input) {
                return;
            }

            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            button.classList.toggle('is-visible', isHidden);
            button.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
            button.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
        });
    });

});
