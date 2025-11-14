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
    
    // --- INICIO DE LA MODIFICACIÓN (Eliminar Lógica de Modal) ---
    // 1. ELIMINAMOS las constantes del Modal
    /*
    const kpiModal = document.getElementById('kpi-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalPanel = document.getElementById('modal-panel');
    */
    let allOkrData = []; // Esto se conserva para 'findKpiById'
    
    // 2. ELIMINAMOS todas las funciones del Modal
    /*
    function findKpiById(kpiId) { ... }
    function renderKpiCharts(kpi) { ... }
    function showKpiModal(kpiId) { ... }
    function hideKpiModal() { ... }
    */
    // --- FIN DE LA MODIFICACIÓN (Eliminar Lógica de Modal) ---


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

                // --- INICIO DE LA MODIFICACIÓN (Simplificar Bucle 2) ---
                // REEMPLAZAMOS todo el bloque "Bucle 2: Resultados Clave"
                /*
                (El bloque original desde la línea 285 hasta la 322 se elimina)
                */
                // CON ESTE NUEVO BLOQUE (más simple):
                
                // Bucle 2: Resultados Clave
                objetivo.ResultadosClave.forEach(kr => {
                    
                    // Ya no filtramos por 'estratégico', simplemente mostramos el KR
                    // si el backend nos lo envió (lo que significa que tiene KPIs visibles
                    // para este usuario, según la lógica de getData.js)
                    
                    finalHtml += `<div class="p-4 rounded-md" style="background-color: ${objetivo.Color_Secundario};">`;
                    
                    // Encabezado del KR (CON PROMEDIO)
                    finalHtml += `
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold" style="color: ${objetivo.Color_Primario};">${kr.Nombre_KR}</h3>
                            <span class="text-lg font-bold" style="color: ${objetivo.Color_Primario};">${kr.KR_Average.toFixed(0)}%</span>
                        </div>
                    `;
                    
                    // ELIMINAMOS el 'Bucle 3: KPIs' y la cuadrícula
                    
                    finalHtml += `</div>`; // Cierre de div de KR
                });
                // --- FIN DE LA MODIFICACIÓN (Simplificar Bucle 2) ---

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

    // --- INICIO DE LA MODIFICACIÓN (Eliminar Listeners de Modal) ---
    // 3. ELIMINAMOS los listeners del Modal
    /*
    okrContainer.addEventListener('click', (event) => {
        const kpiButton = event.target.closest('.kpi-button');
        if (kpiButton) {
            const kpiId = kpiButton.dataset.kpiId;
            showKpiModal(kpiId);
        }
    });

    modalBackdrop.addEventListener('click', hideKpiModal);
    */
    // --- FIN DE LA MODIFICACIÓN (Eliminar Listeners de Modal) ---
});
// --- FIN DE LA MODIFICACIÓN (Fase 5 - Lógica de Modal) ---