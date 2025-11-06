document.addEventListener('DOMContentLoaded', () => {
    // --- 1. OBTENER AMBOS ITEMS ---
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('authToken');

    // --- 2. VERIFICAR AMBOS (Correcto) ---
    if (!user || !token) {
        window.location.href = '/index.html';
        return;
    }

    // --- Definición de variables del DOM ---
    const navContainer = document.getElementById('nav-container');
    const headerTitle = document.getElementById('header-title');
    const kpiTable = document.getElementById('kpi-table');
    const kpiTableHead = kpiTable.querySelector('thead');
    const kpiTableBody = kpiTable.querySelector('tbody');

    // --- Lógica de Navegación (Correcta) ---
    function buildNavigation(role) {
        let navLinks = `
            <a href="/catalogo.html" class="rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500">Catálogo</a>
            <a href="/dashboard.html" class="rounded-md bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Mi Desempeño</a>
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

        document.getElementById('logout-btn').addEventListener('click', () => {
            // --- 5. CIERRE DE SESIÓN SEGURO (Correcto) ---
            localStorage.removeItem('user');
            localStorage.removeItem('authToken'); // <-- Corregido
            window.location.href = '/index.html';
        });
    }

    buildNavigation(user.Rol);
    // Usamos el título estático, que es lo correcto para esta página
    headerTitle.textContent = 'Catálogo de KPIs';

    // --- Cargar datos del catálogo ---
    
    // --- 3. FETCH SEGURO (Correcto) ---
    fetch('/.netlify/functions/getCatalog', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}` 
        }
    })
    .then(response => {
        // --- 4. MANEJO DE ERROR 401 (Correcto) ---
        if (response.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
            window.location.href = '/index.html';
            return; // Detiene la ejecución
        }
        if (!response.ok) {
            throw new Error('La respuesta de la red no fue exitosa.');
        }
        return response.json();
    })
    .then(data => {
        if (!data || !data[0]) {
            kpiTableBody.innerHTML = '<tr><td colspan="100%" class="px-3 py-4 text-sm text-slate-500 text-center">No hay datos en el catálogo.</td></tr>';
            return;
        }

        const headers = data[0];
        const rows = data.slice(1);

        // --- Construir Thead (Usando los estilos de la versión "Mejorada") ---
        let headerHtml = '<tr>';
        headers.forEach(header => {
            headerHtml += `<th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">${header}</th>`;
        });
        headerHtml += '</tr>';
        kpiTableHead.innerHTML = headerHtml;

        // --- Construir Tbody ---
        let bodyHtml = '';
        rows.forEach(row => {
            bodyHtml += '<tr>';
            
            // --- ¡INICIO DE LA RESTAURACIÓN! ---
            // Usamos la lógica de estilos de TU ARCHIVO ORIGINAL
            row.forEach((cell, index) => {
                let cellClass = '';

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
                    case 5: // EsFinanciero
                        cellClass = 'whitespace-nowrap px-3 py-4 text-sm text-slate-500 w-24';
                        break;
                    case 6: // Responsable
                        cellClass = 'py-4 px-3 text-sm text-slate-700 whitespace-normal w-1/5';
                        break;
                    default: // Fallback
                        cellClass = 'whitespace-nowrap px-3 py-4 text-sm text-slate-500';
                }
                
                bodyHtml += `<td class="${cellClass}">${cell}</td>`;
            });
            // --- ¡FIN DE LA RESTAURACIÓN! ---

            bodyHtml += '</tr>';
        });
        kpiTableBody.innerHTML = bodyHtml;

    })
    .catch(error => {
        console.error('Error al cargar el catálogo:', error);
        kpiTableBody.innerHTML = `<tr><td colspan="100%" class="px-3 py-4 text-sm text-red-500 text-center">Error al cargar el catálogo: ${error.message}</td></tr>`;
    });
});