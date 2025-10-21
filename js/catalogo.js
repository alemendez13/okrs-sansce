// js/catalogo.js

document.addEventListener('DOMContentLoaded', () => {
    // Primero, verifica si el usuario está logueado
    if (!localStorage.getItem('user')) {
        window.location.href = '/index.html';
        return;
    }

    // --- INICIO DE LA CORRECCIÓN ---
    // Añade esta línea para obtener los datos del usuario
    const user = JSON.parse(localStorage.getItem('user'));
    // --- FIN DE LA CORRECCIÓN ---

    // Estas constantes se definen aquí, al inicio del listener
    const table = document.getElementById('kpi-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    // --- INICIO DE LA MODIFICACIÓN ---

    const navContainer = document.getElementById('nav-container');
    const headerTitle = document.getElementById('header-title');
    
    // Función para construir el menú
    function buildNavigation(role) {
        let navLinks = `
            <a href="/dashboard.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Mi Desempeño</a>
            <a href="/catalogo.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Catálogo</a>
        `;

        if (role === 'coordinador') {
            navLinks += `<a href="/procesos.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Resultados de Procesos</a>`;
        }

        if (role === 'admin') {
            navLinks += `
                <a href="/procesos.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Resultados de Procesos</a>
                <a href="/empresa.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Resultados de la Empresa</a>
            `;
        }
        
        // Botón para cerrar sesión
        navLinks += `<button id="logout-btn" class="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500">Cerrar Sesión</button>`;

        navContainer.innerHTML = navLinks;

        // Añadir funcionalidad al botón de logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    }

    buildNavigation(user.Rol);
    headerTitle.textContent = `Bienvenido, ${user.NombreCompleto}`;

    // --- FIN DE LA MODIFICACIÓN ---

    // Toda la lógica 'fetch' debe estar DENTRO de este listener
    fetch('/.netlify/functions/getCatalog')
        .then(response => {
            if (!response.ok) {
                // Si la respuesta del servidor no es exitosa, lanza un error para que lo capture el .catch
                throw new Error(`Error del servidor: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // Verifica que data y data[0] existan antes de usarlos
            if (!data || !data[0]) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No se encontraron datos en el catálogo.</td></tr>';
                return;
            }

            const headers = data[0];
            const rows = data.slice(1);

            const visibleHeaders = headers.slice(0, -1);

            let headerHtml = '<tr>';
            visibleHeaders.forEach(header => {
                headerHtml += `<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">${header}</th>`;
            });
            headerHtml += '</tr>';
            thead.innerHTML = headerHtml;

            let bodyHtml = '';
            rows.forEach(row => {
                bodyHtml += '<tr>';
                const visibleCells = row.slice(0, -1);

                visibleCells.forEach((cell, index) => {
                    let cellClass = '';
                    switch (index) {
                        case 0: // KPI_ID
                            cellClass = 'whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6';
                            break;
                        case 2: // Descripcion
                            cellClass = 'py-4 px-3 text-sm text-slate-600 whitespace-normal max-w-md';
                            break;
                        default: // Otras columnas
                            cellClass = 'whitespace-nowrap px-3 py-4 text-sm text-slate-500';
                    }
                    bodyHtml += `<td class="${cellClass}">${cell}</td>`;
                });
                bodyHtml += '</tr>';
            });
            tbody.innerHTML = bodyHtml;
        })
        .catch(error => {
            // Ahora 'tbody' sí está definido y accesible aquí
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Error al cargar el catálogo.</td></tr>';
            console.error('Error:', error);
        });
}); // <-- Asegúrate que esta es la única llave de cierre para el 'DOMContentLoaded'