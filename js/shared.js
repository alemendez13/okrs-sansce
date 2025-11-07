// /js/shared.js
// Contiene la función de navegación centralizada.
// VERSIÓN CORREGIDA: Ahora resalta la página activa.

/**
 * Construye el menú de navegación principal basado en el rol del usuario.
 * Se inserta en el elemento con id="nav-container".
 * @param {string} role - El rol del usuario ('admin', 'coordinador', 'general').
 */
function buildNavigation(role) {
    const navContainer = document.getElementById('nav-container');
    if (!navContainer) {
        console.error('Error: Elemento de navegación #nav-container no encontrado.');
        return;
    }

    // --- INICIO DE LA MODIFICACIÓN (Corrección de Navegación Activa) ---

    // 1. Obtener la ruta de la página actual (ej. "/dashboard.html")
    const currentPage = window.location.pathname;

    // 2. Definir las clases de estilo para los botones
    const activeClass = "rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500";
    const inactiveClass = "rounded-md bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50";

    // 3. Usar operadores ternarios (?) para asignar la clase correcta
    //    Comprueba si currentPage incluye el nombre del archivo.
    let navLinks = `
        <a href="/catalogo.html" class="${currentPage.includes('/catalogo.html') ? activeClass : inactiveClass}">Catálogo</a>
        <a href="/dashboard.html" class="${currentPage.includes('/dashboard.html') ? activeClass : inactiveClass}">Mi Desempeño</a>
    `;

    if (role === 'coordinador') {
        navLinks += `<a href="/procesos.html" class="${currentPage.includes('/procesos.html') ? activeClass : inactiveClass}">Resultados de Procesos</a>`;
    }

    if (role === 'admin') {
        navLinks += `
            <a href="/procesos.html" class="${currentPage.includes('/procesos.html') ? activeClass : inactiveClass}">Resultados de Procesos</a>
            <a href="/empresa.html" class="${currentPage.includes('/empresa.html') ? activeClass : inactiveClass}">Resultados de la Empresa</a>
        `;
    }
    // --- FIN DE LA MODIFICACIÓN ---
    
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