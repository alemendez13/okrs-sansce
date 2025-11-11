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

    //const navContainer = document.getElementById('nav-container'); // Ya no es necesario aquí
    const headerTitle = document.getElementById('header-title');
    
    // ===================================
    // ***** SECCIÓN ELIMINADA (Paso 1.3) *****
    //
    // La función buildNavigation(role) { ... } (aprox. 30 líneas)
    // ha sido eliminada de este archivo.
    //
    // ***** FIN DE LA SECCIÓN ELIMINADA *****
    // ===================================

    // La función AHORA es global, cargada desde /js/shared.js
    if (typeof buildNavigation === 'function') {
        buildNavigation(user.Rol); // Se mantiene la *llamada*
    } else {
        console.error('Error: buildNavigation no está definida. Asegúrate de que shared.js esté cargado.');
    }

    headerTitle.textContent = `Bienvenido, ${user.NombreCompleto}`;

    // --- FIN DE LA MODIFICACIÓN ---

    // Toda la lógica 'fetch' debe estar DENTRO de este listener
    fetch('/.netlify/functions/getCatalog')
        .then(response => {
            // ... (El resto del código de fetch y renderizado de la tabla permanece idéntico) ...
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

            const headers = data[0]; // Ahora tiene 7 headers (incl. Frecuencia, MetodoAgregacion)
            const rows = data.slice(1);

            // --- INICIO DE LA MODIFICACIÓN ---
            // const visibleHeaders = headers.slice(0, -1); // Eliminamos esta línea
            const visibleHeaders = headers; // Ahora usamos todos los headers
            // --- FIN DE LA MODIFICACIÓN ---

            let headerHtml = '<tr>';
            visibleHeaders.forEach(header => {
                headerHtml += `<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">${header}</th>`;
            });
            headerHtml += '</tr>';
            thead.innerHTML = headerHtml;

            let bodyHtml = '';
            rows.forEach(row => {
                bodyHtml += '<tr>';
                
                // --- INICIO DE LA MODIFICACIÓN ---
                // const visibleCells = row.slice(0, -1); // Eliminamos esta línea
                const visibleCells = row; // Ahora usamos todas las celdas
                // --- FIN DE LA MODIFICACIÓN ---

                visibleCells.forEach((cell, index) => {
                    let cellClass = '';

                    // --- INICIO DE LA CORRECCIÓN ---
                    // Reemplaza tu switch/case con este.
                    // Este SÍ coincide con las 7 columnas que envía el backend.
                    switch (index) {
                        case 0: // KPI_ID
                            cellClass = 'whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6 w-24';
                            break;
                        case 1: // NombreKPI
                            cellClass = 'py-4 px-3 text-sm text-slate-700 whitespace-normal w-1/5';
                            break;
                        case 2: // Descripcion
                            cellClass = 'py-4 px-3 text-sm text-slate-600 whitespace-normal w-2/5';
                            break;
                        case 3: // Tipo
                            cellClass = 'whitespace-nowrap px-3 py-4 text-sm text-slate-500 w-24';
                            break;
                        case 4: // Frecuencia
                            cellClass = 'whitespace-nowrap px-3 py-4 text-sm text-slate-500 w-24';
                            break;
                        case 5: // Responsable (índice 5)
                            cellClass = 'py-4 px-3 text-sm text-slate-700 whitespace-normal w-1/5';
                            break;
                        case 6: // MetodoAgregacion (índice 6)
                            cellClass = 'whitespace-nowrap px-3 py-4 text-sm text-slate-500 w-24';
                            break;
                        default: 
                            cellClass = 'whitespace-nowrap px-3 py-4 text-sm text-slate-500';
                    }
                    // --- FIN DE LA CORRECCIÓN ---

                    
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