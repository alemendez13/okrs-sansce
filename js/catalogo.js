// js/catalogo.js

document.addEventListener('DOMContentLoaded', () => {
    // Primero, verifica si el usuario está logueado
    if (!localStorage.getItem('user')) {
        window.location.href = '/index.html';
        return;
    }

    // Estas constantes se definen aquí, al inicio del listener
    const table = document.getElementById('kpi-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

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