window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        window.location.href = '/index.html';
        return;
    }

    const navContainer = document.getElementById('nav-container');
    const headerTitle = document.getElementById('header-title');
    
    function buildNavigation(role) {
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

        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    }

    buildNavigation(user.Rol);
    headerTitle.textContent = `Bienvenido, ${user.NombreCompleto}`;

    // --- START OF MAJOR MODIFICATION ---
    const kpiContainer = document.getElementById('kpi-container');
    const rawDataContainer = document.getElementById('rawData');

fetch(`/.netlify/functions/getData?rol=${user.Rol}&userID=${user.UserID}`)
    .then(response => response.json())
    .then(data => {
        rawDataContainer.textContent = JSON.stringify(data, null, 2);

        if (!data || data.length === 0) {
            kpiContainer.innerHTML = '<p>No hay datos de desempeño para mostrar.</p>';
            return;
        }

        let allKpisHtml = '';
        data.forEach(kpi => {
            allKpisHtml += `
                <div class="rounded-lg bg-white p-6 shadow">
                    <h2 class="text-lg font-semibold leading-6 text-slate-900 mb-4">${kpi.kpi_name}</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div class="rounded-lg border border-slate-200 p-4">
                            <h3 class="font-semibold text-slate-800">Desempeño del Periodo</h3>
                            <dl class="mt-2 space-y-2">
                                <div class="flex justify-between text-sm"><dt class="text-slate-500">Periodo:</dt><dd class="font-medium text-slate-700">${new Date(kpi.latestPeriod.Periodo).toLocaleDateString()}</dd></div>
                                <div class="flex justify-between text-sm"><dt class="text-slate-500">Meta:</dt><dd class="font-medium text-slate-700">${kpi.latestPeriod.Meta}</dd></div>
                                <div class="flex justify-between text-sm"><dt class="text-slate-500">Resultado:</dt><dd class="font-bold text-lg text-blue-600">${kpi.latestPeriod.Valor}</dd></div>
                            </dl>
                        </div>

                        <div class="rounded-lg border border-slate-200 p-4">
                            <h3 class="font-semibold text-slate-800">Acumulado</h3>
                            <canvas id="historical-chart-${kpi.kpi_id}"></canvas>
                        </div>

                        <div class="rounded-lg border border-slate-200 p-4">
                            <h3 class="font-semibold text-slate-800">Progreso vs Meta Anual</h3>
                            <canvas id="annual-chart-${kpi.kpi_id}"></canvas>
                        </div>

                    </div>
                </div>
            `;
        });

        kpiContainer.innerHTML = allKpisHtml;

        // NOW that the HTML is in the DOM, initialize the charts
        data.forEach(kpi => {
            // Chart for Column 2 (Historical)
            const historicalCtx = document.getElementById(`historical-chart-${kpi.kpi_id}`).getContext('2d');
            new Chart(historicalCtx, {
                type: 'line',
                data: {
                    labels: kpi.historicalData.map(d => new Date(d.Periodo).toLocaleDateString('es-ES', { month: 'short' })),
                    datasets: [{
                        label: 'Resultado por Periodo',
                        data: kpi.historicalData.map(d => parseFloat(String(d.Valor).replace(/[^0-9.-]+/g, "")) || 0),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

            // Chart for Column 3 (Annual Progress)
            const annualCtx = document.getElementById(`annual-chart-${kpi.kpi_id}`).getContext('2d');
            new Chart(annualCtx, {
                type: 'bar',
                data: {
                    labels: ['Progreso Anual'],
                    datasets: [
                        {
                            label: 'Meta Anual',
                            data: [kpi.annualProgress.Meta],
                            backgroundColor: 'rgba(203, 213, 225, 1)', // gray
                        },
                        {
                            label: 'Acumulado Anual',
                            data: [kpi.annualProgress.Acumulado],
                            backgroundColor: 'rgba(37, 99, 235, 1)', // blue
                        }
                    ]
                },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
            });
        });

    })
    .catch(error => {
        kpiContainer.innerHTML = `<p class="text-red-600">Ocurrió un error al cargar los datos: ${error.message}</p>`;
        console.error('Error al cargar datos:', error);
    });
    // --- END OF MAJOR MODIFICATION ---
});