// js/catalogo.js --- Reemplaza el bloque fetch completo con esto

fetch('/.netlify/functions/getCatalog')
    .then(response => response.json())
    .then(data => {
        const headers = data[0];
        const rows = data.slice(1);

        // 1. CREAR ENCABEZADOS VISIBLES (Sin el último)
        const visibleHeaders = headers.slice(0, -1);

        // 2. CONSTRUIR EL HEADER DE LA TABLA
        let headerHtml = '<tr>';
        // Se itera sobre los encabezados ya filtrados
        visibleHeaders.forEach(header => {
            headerHtml += `<th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">${header}</th>`;
        });
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;

        // 3. CONSTRUIR LAS FILAS DE LA TABLA
        let bodyHtml = '';
        rows.forEach(row => {
            bodyHtml += '<tr>';

            // 4. CREAR CELDAS VISIBLES (Sin la última celda de cada fila)
            const visibleCells = row.slice(0, -1);

            // 5. Se itera sobre las celdas ya filtradas
            visibleCells.forEach((cell, index) => {
                let cellClass = '';
                // Tu lógica de estilos personalizada se mantiene intacta
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
        // 6. CORREGIR EL COLSPAN
        // Ahora son 5 columnas visibles, no 6
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Error al cargar el catálogo.</td></tr>';
        console.error('Error:', error);
    });