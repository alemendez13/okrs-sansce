window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        window.location.href = '/index.html';
        return;
    }

    //const navContainer = document.getElementById('nav-container'); // Ya no es necesario aquí
    const headerTitle = document.getElementById('header-title');
    
    // Registrar el plugin de datalabels globalmente
    Chart.register(ChartDataLabels);
    Chart.defaults.plugins.datalabels.display = false; // Desactivado por defecto

    // --- LÓGICA DE NAVEGACIÓN (Refactorizada) ---
    //
    // ===================================
    // ***** SECCIÓN ELIMINADA (Paso 1.2) *****
    //
    // La función buildNavigation(role) { ... } (aprox. 28 líneas)
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

    // --- INICIO DE LA MODIFICACIÓN ---
    
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
            
            // 1. Construir el HTML para todas las tarjetas
            data.forEach(kpi => {
                const periodo = kpi.latestPeriod.Periodo ? new Date(kpi.latestPeriod.Periodo).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' }) : 'N/A';
                const meta = kpi.latestPeriod.Meta || 'N/A';
                const resultado = kpi.latestPeriod.Valor || 'N/A';
                const kpiTypeClass = kpi.kpi_type === 'estratégico' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-yellow-100 text-yellow-800';

                allKpisHtml += `
                    <div class="flex flex-col rounded-lg bg-white shadow-lg overflow-hidden">
                        <!-- Encabezado de la Tarjeta -->
                        <div class="p-4 border-b border-slate-200">
                            <h3 class="text-base font-semibold text-slate-900 truncate">${kpi.kpi_name}</h3>
                            <span class="text-xs font-medium px-2 py-0.5 rounded-full ${kpiTypeClass}">${kpi.kpi_type}</span>
                            <!-- INICIO DE LA MODIFICACIÓN -->
                            <p class="text-sm font-medium text-slate-500 mt-1 truncate">Resp: ${kpi.kpi_owner || 'N/A'}</p>
                            <!-- FIN DE LA MODIFICACIÓN -->
                        </div>
                        
                        <!-- Cuerpo de la Tarjeta (Gráficas y Stats) -->
                        <div class="p-4 space-y-4 flex-1">
                            <!-- 1. Desempeño del Periodo (Dona) -->
                            <div>
                                <h4 class="text-sm font-medium text-slate-600">Desempeño del Periodo (${periodo})</h4>
                                <div class="flex items-center justify-between mt-1">
                                    <div class="gauge-container" style="width: 100px; height: 100px;">
                                        <canvas id="gauge-chart-${kpi.kpi_id}"></canvas>
                                    </div>
                                    <div class="text-right flex-1">
                                        <dl>
                                            <dt class="text-xs text-slate-500">Resultado</dt>
                                            <dd class="text-xl font-bold text-blue-600">${resultado}</dd>
                                            <dt class="text-xs text-slate-500 mt-1">Meta</dt>
                                            <dd class="text-sm text-slate-600">${meta}</dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>

                            <!-- 2. Histórico (Línea) -->
                            <div>
                                <h4 class="text-sm font-medium text-slate-600">Acumulado Histórico</h4>
                                <div class="chart-container mt-2">
                                    <canvas id="historical-chart-${kpi.kpi_id}"></canvas>
                                </div>
                            </div>

                            <!-- 3. Progreso Anual (Barra) -->
                            <div>
                                <h4 class="text-sm font-medium text-slate-600">Progreso vs Meta Anual</h4>
                                <div class="chart-container mt-2">
                                    <canvas id="annual-chart-${kpi.kpi_id}"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            // 2. Insertar el HTML en el DOM
            kpiContainer.innerHTML = allKpisHtml;

            // 3. Renderizar las gráficas AHORA que los canvas existen
            data.forEach(kpi => {
                const meta = kpi.latestPeriod.MetaNum;
                const valor = kpi.latestPeriod.ValorNum;
                const achievement = meta > 0 ? (valor / meta) * 100 : 0;
                const remaining = Math.max(0, 100 - achievement);

                // Gráfica 1: Desempeño del Periodo (Dona)
                const gaugeCtx = document.getElementById(`gauge-chart-${kpi.kpi_id}`).getContext('2d');
                new Chart(gaugeCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Alcanzado', 'Faltante'],
                        datasets: [{
                            data: [achievement, remaining],
                            backgroundColor: ['rgba(37, 99, 235, 1)', 'rgba(226, 232, 240, 1)'],
                            borderColor: ['rgba(37, 99, 235, 1)', 'rgba(226, 232, 240, 1)'],
                            borderWidth: 1,
                            circumference: 180, // Media dona
                            rotation: 270,      // Empezar desde abajo
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: { enabled: false },
                            datalabels: { // Mostrar el porcentaje en el centro
                                display: true,
                                color: '#1e3a8a', // text-blue-800
                                font: { weight: 'bold', size: 20 },
                                formatter: (value, context) => {
                                    if (context.dataIndex === 0) {
                                        return `${value.toFixed(0)}%`;
                                    }
                                    return '';
                                },
                                translateY: -20 // Ajustar posición vertical del texto
                            }
                        },
                        cutout: '70%' // Grosor de la dona
                    }
                });

                // Gráfica 2: Histórico (Línea)
                const historicalCtx = document.getElementById(`historical-chart-${kpi.kpi_id}`).getContext('2d');
                new Chart(historicalCtx, {
                    type: 'line',
                    data: {
                        labels: kpi.historicalData.map(d => new Date(d.Periodo).toLocaleDateString('es-ES', { month: 'short' })),
                        datasets: [{
                            label: 'Resultado',
                            data: kpi.historicalData.map(d => d.Valor),
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            fill: true,
                            tension: 0.1,
                            pointRadius: 2
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { ticks: { font: { size: 10 } } },
                            x: { ticks: { font: { size: 10 } } }
                        }
                    }
                });

                // Gráfica 3: Progreso Anual (Barra)
                const annualCtx = document.getElementById(`annual-chart-${kpi.kpi_id}`).getContext('2d');
                new Chart(annualCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Progreso Anual'],
                        datasets: [
                            {
                                label: 'Acumulado',
                                data: [kpi.annualProgress.Acumulado],
                                backgroundColor: 'rgba(37, 99, 235, 1)', // azul
                                barPercentage: 0.5
                            },
                            {
                                label: 'Meta',
                                data: [kpi.annualProgress.Meta],
                                backgroundColor: 'rgba(203, 213, 225, 1)', // gris
                                barPercentage: 0.5
                            }
                        ]
                    },
                    options: { 
                        indexAxis: 'y', 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: true, position: 'bottom', labels: { font: { size: 10 } } },
                            datalabels: {
                                display: true,
                                color: 'white',
                                font: { size: 10, weight: 'bold' },
                                formatter: (value) => value.toLocaleString() // Formatear número
                            }
                        },
                        scales: {
                            x: { display: false, stacked: true },
                            y: { display: false, stacked: true }
                        }
                    }
                });
            });

        })
        .catch(error => {
            kpiContainer.innerHTML = `<p class="text-red-600">Ocurrió un error al cargar los datos: ${error.message}</p>`;
            console.error('Error al cargar datos:', error);
        });
    // --- FIN DE LA MODIFICACIÓN ---
});