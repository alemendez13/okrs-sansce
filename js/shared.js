// /js/shared.js
// Contiene la función de navegación centralizada,
// tomada del main.js original.

/**
 * Construye el menú de navegación principal basado en el rol del usuario.
 * Se inserta en el elemento con id="nav-container".
 * @param {string} role - El rol del usuario ('admin', 'coordinador', 'general').
 */
function buildNavigation(role) {
    // Esta es la lógica de navegación EXACTA de tu main.js original
    const navContainer = document.getElementById('nav-container');
    if (!navContainer) {
        console.error('Error: Elemento de navegación #nav-container no encontrado.');
        return;
    }

    let navLinks = `
        <a href="/catalogo.html" class="rounded-md bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Catálogo</a>
        <a href="/dashboard.html" class="rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500">Mi Desempeño</a>
    `;

    if (role === 'coordinador') {
        navLinks += `<a href="/procesos.html" class="rounded-md bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Resultados de Procesos</a>`;
    }

    if (role === 'admin') {
        navLinks += `
            <a href="/procesos.html" class="rounded-md bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Resultados de Procesos</a>
            <a href="/empresa.html" class="rounded-md bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Resultados de la Empresa</a>
        `;
    }
    
    navLinks += `<button id="logout-btn" class="rounded-md bg-red-600 px-2 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500">Cerrar Sesión</button>`;

    navContainer.innerHTML = navLinks;

    // La lógica del botón de logout también se mueve aquí
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    } else {
        console.error('Error: #logout-btn no encontrado después de construir la navegación.');
    }
}