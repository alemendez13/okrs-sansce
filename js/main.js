// js/main.js
// --- INICIO DE LA MODIFICACIÓN (Fase 2 - OKR) ---
// (Reescritura completa del archivo)

window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        window.location.href = '/index.html';
        return;
    }

    const headerTitle = document.getElementById('header-title');
    
    // Registrar el plugin de datalabels globalmente
    Chart.register(ChartDataLabels);
    Chart.defaults.plugins.datalabels.display = false;

    // Cargar navegación
    if (typeof buildNavigation === 'function') {
        buildNavigation(user.Rol);
    } else {
        console.error('Error: buildNavigation no está definida. Asegúrate de que shared.js esté cargado.');
    }

    headerTitle.textContent = `Bienvenido, ${user.NombreCompleto}`;

    // --- Lógica de renderizado de OKRs ---
    
    // Apuntamos al nuevo contenedor
    const okrContainer = document.getElementById('okr-container');

    fetch(`/.netlify/functions/getData?rol=${user.Rol}&userID=${user.UserID}`)
        .then(response => response.json())
        .then(data => {
            // 'data' ahora es la estructura anidada [Objetivo [KR [KPI]]]
   

            if (!data || data.length === 0) {
                okrContainer.innerHTML = '<p>No hay datos de desempeño para mostrar.</p>';
                return;
            }

            let finalHtml = '';
            
            // Bucle 1: Objetivos
            data.forEach(objetivo => {
                // Usamos <details> para el desplegable, 'open' para que esté abierto por defecto
                finalHtml += `<details class="bg-white shadow rounded-lg" open>`;
                
                // Encabezado del Objetivo (Sumario clickeable)
                finalHtml += `
                    <summary class="p-4 cursor-pointer flex justify-between items-center rounded-t-lg" style="background-color: ${objetivo.Color_Primario}; color: white; font-weight: bold;">
                        <span>${objetivo.Nombre_Objetivo}</span>
                        <!-- Icono de flecha para el desplegable -->
                        <svg class="w-6 h-6 transition-transform duration-200" style="color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </summary>
                `;

                // Contenedor para los KRs
                finalHtml += `<div class="p-4 space-y-4">`;

                // Bucle 2: Resultados Clave
                objetivo.ResultadosClave.forEach(kr => {
                    finalHtml += `<div class="p-4 rounded-md" style="background-color: ${objetivo.Color_Secundario};">`;
                    finalHtml += `<h3 class="text-lg font-semibold" style="color: ${objetivo.Color_Primario};">${kr.Nombre_KR}</h3>`;
                    
                    // Cuadrícula para los KPIs
                    finalHtml += `<div class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;
                    
                    // Bucle 3: KPIs
                    kr.KPIs.forEach(kpi => {
                        // --- ESTE ES EL HTML DE LA TARJETA DE KPI ORIGINAL ---
                        const periodo = kpi.latestPeriod.Periodo ? new Date(kpi.latestPeriod.Periodo).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' }) : 'N/A';
                        const meta = kpi.latestPeriod.Meta || 'N/A';
                        const resultado = kpi.latestPeriod.Valor || 'N/A';
                        // Asignamos color basado en tipo
                        const kpiTypeClass = kpi.kpi_type === 'estratégico' 
                            ? 'bg-blue-100 text-blue-800' 
                            : (kpi.kpi_type === 'táctico' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800');

                        finalHtml += `
                            <div class="flex flex-col rounded-lg bg-white shadow-lg overflow-hidden">
                                <!-- Encabezado de la Tarjeta -->
                                <div class="p-4 border-b border-slate-200">
                                    <h3 class="text-base font-semibold text-slate-900 truncate">${kpi.kpi_name}</h3>
                                    <span class="text-xs font-medium px-2 py-0.5 rounded-full ${kpiTypeClass}">${kpi.kpi_type}</span>
                                    <p class="text-sm font-medium text-slate-500 mt-1 truncate">Resp: ${kpi.kpi_owner || 'N/A'}</p>
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
                        // --- FIN DEL HTML DE LA TARJETA ---
                    });
                    
                    finalHtml += `</div></div>`; // Cierre de grid y div de KR
                });

                finalHtml += `</div></details>`; // Cierre de p-4 y details
            });

            // Insertar todo el HTML construido
            okrContainer.innerHTML = finalHtml;

            // 3. Renderizar las gráficas AHORA que los canvas existen
            // (Necesitamos bucles anidados para encontrar los KPIs)
            data.forEach(objetivo => {
                objetivo.ResultadosClave.forEach(kr => {
                    kr.KPIs.forEach(kpi => {
                        // Si no hay datos, no intentar renderizar
                        if (kpi.latestPeriod.Meta === 'N/A') return;

                        const meta = kpi.latestPeriod.MetaNum;
                        const valor = kpi.latestPeriod.ValorNum;
                        const achievement = meta > 0 ? (valor / meta) * 100 : 0;
                        const remaining = Math.max(0, 100 - achievement);

                        // --- INICIO DEL CÓDIGO DE GRÁFICAS COMPLETO ---

                        // Gráfica 1: Dona
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
                                    circumference: 180, rotation: 270,
                                }]
                            },
                            options: {
                                responsive: true, maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false }, tooltip: { enabled: false },
                                    datalabels: {
                                        display: true, color: '#1e3a8a', font: { weight: 'bold', size: 20 },
                                        formatter: (value, context) => (context.dataIndex === 0) ? `${value.toFixed(0)}%` : '',
                                        translateY: -20
                                    }
                                },
                                cutout: '70%'
                            }
                        });

                        // Gráfica 2: Línea Histórica
                        const historicalCtx = document.getElementById(`historical-chart-${kpi.kpi_id}`).getContext('2d');
                        new Chart(historicalCtx, {
                            type: 'line',
                            data: {
                                labels: kpi.historicalData.map(d => new Date(d.Periodo).toLocaleDateString('es-ES', { month: 'short' })),
                                datasets: [{
                                    label: 'Resultado', data: kpi.historicalData.map(d => d.Valor),
                                    borderColor: 'rgba(54, 162, 235, 1)', backgroundColor: 'rgba(54, 162, 235, 0.1)',
                                    fill: true, tension: 0.1, pointRadius: 2
                                }]
                            },
                            options: { 
                                responsive: true, maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { ticks: { font: { size: 10 } } },
                                    x: { ticks: { font: { size: 10 } } }
                                }
                            }
                        });

                        // Gráfica 3: Barra Anual
                        const annualCtx = document.getElementById(`annual-chart-${kpi.kpi_id}`).getContext('2d');
                        new Chart(annualCtx, {
                            type: 'bar',
                            data: {
                                labels: ['Progreso Anual'],
                                datasets: [
                                    { label: 'Acumulado', data: [kpi.annualProgress.Acumulado], backgroundColor: 'rgba(37, 99, 235, 1)', barPercentage: 0.5 },
                                    { label: 'Meta', data: [kpi.annualProgress.Meta], backgroundColor: 'rgba(203, 213, 225, 1)', barPercentage: 0.5 }
                                ]
                            },
                            options: { 
                                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                                plugins: { 
                                    legend: { display: true, position: 'bottom', labels: { font: { size: 10 } } },
                                    datalabels: {
                                        display: true, color: 'white', font: { size: 10, weight: 'bold' },
                                        formatter: (value) => value.toLocaleString()
                                    }
                                },
                                scales: { x: { display: false, stacked: true }, y: { display: false, stacked: true } }
                            }
                        });
                        // --- FIN DEL CÓDIGO DE GRÁFICAS COMPLETO ---
                    });
                });
            });
        })
        .catch(error => {
            okrContainer.innerHTML = `<p class="text-red-600">Ocurrió un error al cargar los datos: ${error.message}</p>`;
            console.error('Error al cargar datos:', error);
        });
});
// --- FIN DE LA MODIFICACIÓN (Fase 2 - OKR) ---