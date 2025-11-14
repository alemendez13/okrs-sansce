// js/empresa.js
// --- INICIO DE LA MODIFICACIÓN (Fase 5 - Lógica de Modal) ---
// (Reescritura completa del archivo)

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    // 1. GUARDA DE SEGURIDAD (CONSERVADA)
    // Solo admins ven esta página
    if (!user || user.Rol !== 'admin') {
        window.location.href = '/index.html';
        return;
    }

    const headerTitle = document.getElementById('header-title');
    
    Chart.register(ChartDataLabels);
    Chart.defaults.plugins.datalabels.display = false;

    // Cargar navegación
    if (typeof buildNavigation === 'function') {
        buildNavigation(user.Rol);
    } else {
        console.error('Error: buildNavigation no está definida. Asegúrate de que shared.js esté cargado.');
    }

    headerTitle.textContent = 'Resultados de la Empresa';

    // --- Lógica de renderizado de OKRs ---
    
    const okrContainer = document.getElementById('okr-container');
    
    // --- NUEVO: Elementos del Modal ---
    const kpiModal = document.getElementById('kpi-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalPanel = document.getElementById('modal-panel');
    let allOkrData = []; // Almacenará los datos para que el Modal los use
    
    // --- NUEVO: Función para buscar un KPI en los datos ---
    function findKpiById(kpiId) {
        for (const objetivo of allOkrData) {
            for (const kr of objetivo.ResultadosClave) {
                // FILTRO: Solo buscar KPIs 'estratégico'
                const kpi = kr.KPIs.find(k => k.kpi_id === kpiId && k.kpi_type === 'estratégico');
                if (kpi) return kpi;
            }
        }
        return null; // No encontrado
    }

    // --- NUEVO: Función para renderizar las 3 gráficas ---
    function renderKpiCharts(kpi) {
        if (kpi.latestPeriod.Meta === 'N/A') return;

        const meta = kpi.latestPeriod.MetaNum;
        const valor = kpi.latestPeriod.ValorNum;
        const achievement = meta > 0 ? (valor / meta) * 100 : 0;
        const remaining = Math.max(0, 100 - achievement);

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
    }

    // --- NUEVO: Función para MOSTRAR el Modal ---
    function showKpiModal(kpiId) {
        const kpi = findKpiById(kpiId);
        if (!kpi) return;

        const periodo = kpi.latestPeriod.Periodo ? new Date(kpi.latestPeriod.Periodo).toLocaleDateString('es-ES', { year: 'numeric', month: 'short' }) : 'N/A';
        const meta = kpi.latestPeriod.Meta || 'N/A';
        const resultado = kpi.latestPeriod.Valor || 'N/A';
        const kpiTypeClass = 'bg-blue-100 text-blue-800'; // Siempre estratégico

        const modalHtml = `
            <div class="bg-white p-6">
                <!-- Encabezado de la Tarjeta (en el Modal) -->
                <div class="pb-4 border-b border-slate-200">
                    <h3 id="modal-title" class="text-lg font-semibold text-slate-900">${kpi.kpi_name}</h3>
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full ${kpiTypeClass}">${kpi.kpi_type}</span>
                    <p class="text-sm font-medium text-slate-500 mt-1">Resp: ${kpi.kpi_owner || 'N/A'}</p>
                </div>
                
                <!-- Cuerpo de la Tarjeta (Gráficas y Stats) -->
                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Columna 1: Dona y Stats -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-medium text-slate-600">Desempeño del Periodo (${periodo})</h4>
                        <div class="flex items-center justify-between mt-1">
                            <div class="gauge-container" style="width: 100px; height: 100px;">
                                <canvas id="gauge-chart-${kpi.kpi_id}"></canvas>
                            </div>
                            <div class="text-right flex-1">
                                <dl>
                                    <dt class="text-xs text-slate-500">Resultado</dt>
                                    <dd class="text-2xl font-bold text-blue-600">${resultado}</dd>
                                    <dt class="text-xs text-slate-500 mt-1">Meta</dt>
                                    <dd class="text-lg text-slate-600">${meta}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <!-- Columna 2: Barra Anual -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-medium text-slate-600">Progreso vs Meta Anual</h4>
                        <div class="chart-container mt-2" style="height: 100px;">
                            <canvas id="annual-chart-${kpi.kpi_id}"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Fila 2: Histórico (ocupa todo el ancho) -->
                <div class="mt-6">
                    <h4 class="text-sm font-medium text-slate-600">Acumulado Histórico</h4>
                    <div class="chart-container mt-2" style="height: 200px;">
                        <canvas id="historical-chart-${kpi.kpi_id}"></canvas>
                    </div>
                </div>
            </div>
            <!-- Pie de página del Modal (Botón de Cierre) -->
            <div class="bg-slate-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button id="modal-close-btn" type="button" class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">
                    Cerrar
                </button>
            </div>
        `;

        modalPanel.innerHTML = modalHtml;
        kpiModal.classList.remove('hidden');
        renderKpiCharts(kpi);
        document.getElementById('modal-close-btn').addEventListener('click', hideKpiModal);
    }

    // --- NUEVO: Función para OCULTAR el Modal ---
    function hideKpiModal() {
        kpiModal.classList.add('hidden');
        modalPanel.innerHTML = ''; // Limpiar el contenido
    }


    fetch(`/.netlify/functions/getData?rol=${user.Rol}&userID=${user.UserID}`)
        .then(response => response.json())
        .then(data => {
            allOkrData = data; // Guardar datos para el Modal
            
            if (!data || data.length === 0) {
                okrContainer.innerHTML = '<p>No se encontraron OKRs.</p>';
                return;
            }

            let finalHtml = '';
            
            // Bucle 1: Objetivos
            data.forEach(objetivo => {
                // El atributo 'open' ha sido eliminado para que inicie cerrado
                finalHtml += `<details class="bg-white shadow rounded-lg">`;
                
                // Encabezado del Objetivo (CON PROMEDIO)
                finalHtml += `
                    <summary class="p-4 cursor-pointer flex justify-between items-center rounded-t-lg" style="background-color: ${objetivo.Color_Primario}; color: white; font-weight: bold;">
                        <span class="text-lg">${objetivo.Nombre_Objetivo}</span>
                        <div class="flex items-center space-x-2">
                            <span class="text-2xl font-bold">${objetivo.Objective_Average.toFixed(0)}%</span>
                            <svg class="w-6 h-6 transition-transform duration-200" style="color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </summary>
                `;

                // Contenedor para los KRs
                finalHtml += `<div class="p-4 space-y-4">`;

                // Bucle 2: Resultados Clave
                objetivo.ResultadosClave.forEach(kr => {
                    // 2. FILTRO (CONSERVADO)
                    // Esta página solo muestra KPIs 'estratégico'
                    const strategicKpis = kr.KPIs.filter(kpi => kpi.kpi_type === 'estratégico');
                    
                    if (strategicKpis.length === 0) return;

                    finalHtml += `<div class="p-4 rounded-md" style="background-color: ${objetivo.Color_Secundario};">`;
                    
                    // Encabezado del KR (CON PROMEDIO)
                    finalHtml += `
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold" style="color: ${objetivo.Color_Primario};">${kr.Nombre_KR}</h3>
                            <span class="text-lg font-bold" style="color: ${objetivo.Color_Primario};">${kr.KR_Average.toFixed(0)}%</span>
                        </div>
                    `;
                    
                    finalHtml += `<div class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">`;
                    
                    // --- MODIFICACIÓN: Bucle 3 (KPIs) ---
                    // Renderizar solo botones
                    strategicKpis.forEach(kpi => {
                        const kpiTypeClass = 'bg-blue-100 text-blue-800'; // Siempre estratégico

                        finalHtml += `
                            <button data-kpi-id="${kpi.kpi_id}" class="kpi-button text-left p-4 rounded-lg bg-white shadow-md hover:shadow-lg hover:bg-slate-50 transition-all duration-200 cursor-pointer">
                                <h4 class="font-semibold text-slate-900 truncate">${kpi.kpi_name}</h4>
                                <span class="text-xs font-medium px-2 py-0.5 rounded-full ${kpiTypeClass}">${kpi.kpi_type}</span>
                                <p class="text-sm font-medium text-slate-500 mt-1 truncate">Resp: ${kpi.kpi_owner || 'N/A'}</p>
                            </button>
                        `;
                    });
                    // --- FIN DE LA MODIFICACIÓN (Bucle 3) ---
                    
                    finalHtml += `</div></div>`; // Cierre de grid y div de KR
                });

                finalHtml += `</div></details>`; // Cierre de p-4 y details
            });

            // Insertar todo el HTML construido
            okrContainer.innerHTML = finalHtml;

            // --- ELIMINADO ---
            // El bloque 'data.forEach... new Chart(...)' que estaba aquí
            // ha sido movido a la función 'renderKpiCharts'.
            // --- FIN DE ELIMINADO ---
        })
        .catch(error => {
            okrContainer.innerHTML = `<p class="text-red-600">Ocurrió un error al cargar los datos: ${error.message}</p>`;
            console.error('Error al cargar datos:', error);
        });

    // --- NUEVO: Listeners para el Modal ---
    
    okrContainer.addEventListener('click', (event) => {
        const kpiButton = event.target.closest('.kpi-button');
        if (kpiButton) {
            const kpiId = kpiButton.dataset.kpiId;
            showKpiModal(kpiId);
        }
    });

    modalBackdrop.addEventListener('click', hideKpiModal);
});
// --- FIN DE LA MODIFICACIÓN (Fase 5 - Lógica de Modal) ---