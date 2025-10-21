// js/catalogo.js

document.addEventListener('DOMContentLoaded', () => {
    // Primero, verifica si el usuario está logueado para poder acceder a esta página
    if (!localStorage.getItem('user')) {
        window.location.href = '/index.html';
        return;
    }

    const table = document.getElementById('kpi-table');
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    fetch('/.netlify/functions/getCatalog')
        .then(response => response.json())
        .then(data => {
            const headers = data[0];
            const rows = data.slice(1);

            // Crear encabezado de la tabla
            let headerHtml = '<tr>';
            headers.forEach(header => {
                headerHtml += `<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">${header}</th>`;
            });
            headerHtml += '</tr>';
            thead.innerHTML = headerHtml;

            // Crear filas de la tabla
            let bodyHtml = '';
            rows.forEach(row => {
                bodyHtml += '<tr>';
                row.forEach((cell, index) => {
                    // Aplica un estilo diferente a la primera columna (KPI_ID)
                    const cellClass = index === 0 ? 'whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6' : 'whitespace-nowrap px-3 py-4 text-sm text-slate-500';
                    bodyHtml += `<td class="${cellClass}">${cell}</td>`;
                });
                bodyHtml += '</tr>';
            });
            tbody.innerHTML = bodyHtml;
        })
        .catch(error => {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Error al cargar el catálogo.</td></tr>';
            console.error('Error:', error);
        });
});