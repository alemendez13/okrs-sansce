// js/procesos.js
// --- INICIO DE LA MODIFICACIÓN (Fase 2 - OKR) ---
// (Reescritura completa del archivo)

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    // Guarda de seguridad, 'general' no ve esta página
    if (!user || user.Rol === 'general') {
        window.location.href = '/index.html';
        return;
    }

    const headerTitle = document.getElementById('header-title');

    Chart.register(ChartDataLabels);
    Chart.defaults.plugins.datalabels.display = false;

    if (typeof buildNavigation === 'function') {
        buildNavigation(user.Rol);
    } else {
        console.error('Error: buildNavigation no está definida. Asegúrate de que shared.js esté cargado.');
    }
    headerTitle.textContent = 'Resultados de Procesos'; // Título de la página

    const okrContainer = document.getElementById('okr-container');
    
    
    fetch(`/.netlify/functions/getData?rol=${user.Rol}&userID=${user.UserID}`)
        .then(response => response.json())
        .then(data => {
            
            
            if (!data || data.length === 0) {
                 okrContainer.innerHTML = '<p>No se encontraron OKRs.</p>';
                 return;
            }

            let finalHtml = '';
            
            // Bucle 1: Objetivos
            data.forEach(objetivo => {
                // --- INICIO DE LA MODIFICACIÓN (FASE 3) ---
                // REEMPLAZAMOS la siguiente línea:
                // finalHtml += `<details class="bg-white shadow rounded-lg" open>`;
                // CON ESTA LÍNEA (sin 'open'):
                finalHtml += `<details class="bg-white shadow rounded-lg">`;
                // --- FIN DE LA MODIFICACIÓN (FASE 3) ---
                finalHtml += `<summary class="p-4 cursor-pointer flex justify-between items-center rounded-t-lg" style="background-color: ${objetivo.Color_Primario}; color: white; font-weight: bold;">
                                <span>${objetivo.Nombre_Objetivo}</span>
                                <svg class="w-6 h-6 transition-transform duration-200" style="color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                             </summary>`;
                finalHtml += `<div class="p-4 space-y-4">`;

                // Bucle 2: Resultados Clave
                objetivo.ResultadosClave.forEach(kr => {
                    // FILTRO: Esta página solo muestra KPIs 'táctico'
                    const tacticosKpis = kr.KPIs.filter(kpi => kpi.kpi_type === 'táctico');
                    
                    // Si no hay KPIs tácticos en este KR, no mostramos el KR
                    if (tacticosKpis.length === 0) return;

                    finalHtml += `<div class="p-4 rounded-md" style="background-color: ${objetivo.Color_Secundario};">`;
                    finalHtml += `<h3 class="text-lg font-semibold" style="color: ${objetivo.Color_Primario};">${kr.Nombre_KR}</h3>`;
                    finalHtml += `<div class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;
                    
                    // Bucle 3: KPIs (ya filtrados)
                    tacticosKpis.forEach(kpi => {
                        const periodo = kpi.latestPeriod.Periodo ? new Date(kpi.latestPeriod.Periodo).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' }) : 'N/A';
                        const meta = kpi.latestPeriod.Meta || 'N/A';
                        const resultado = kpi.latestPeriod.Valor || 'N/A';
                        const kpiTypeClass = 'bg-yellow-100 text-yellow-800'; // Siempre táctico

                        finalHtml += `
                            <div class="flex flex-col rounded-lg bg-white shadow-lg overflow-hidden">
                                <div class="p-4 border-b border-slate-200">
                                    <h3 class="text-base font-semibold text-slate-900 truncate">${kpi.kpi_name}</h3>
                                    <span class="text-xs font-medium px-2 py-0.5 rounded-full ${kpiTypeClass}">${kpi.kpi_type}</span>
                                    <p class="text-sm font-medium text-slate-500 mt-1 truncate">Resp: ${kpi.kpi_owner || 'N/A'}</p>
                                </div>
                                <div class="p-4 space-y-4 flex-1">
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
                                    <div>
                                        <h4 class="text-sm font-medium text-slate-600">Acumulado Histórico</h4>
                                        <div class="chart-container mt-2">
                                            <canvas id="historical-chart-${kpi.kpi_id}"></canvas>
                                        </div>
                                    </div>
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
                    finalHtml += `</div></div>`;
                });
                finalHtml += `</div></details>`;
            });

            okrContainer.innerHTML = finalHtml;

            // Renderizar gráficas (con bucles anidados y filtro)
            data.forEach(objetivo => {
                objetivo.ResultadosClave.forEach(kr => {
                    const tacticosKpis = kr.KPIs.filter(kpi => kpi.kpi_type === 'táctico');
                    tacticosKpis.forEach(kpi => {
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
            console.error('Error al cargar datos de procesos:', error);
        });
});
// --- FIN DE LA MODIFICACIÓN (Fase 2 - OKR) ---