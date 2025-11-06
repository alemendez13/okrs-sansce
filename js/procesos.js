document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtiene y verifica los datos del usuario
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('authToken');

    // --- INICIO DE CORRECCIÓN ---
    // Redirige si no está logueado O SI ES ROL 'general'
    if (!user || !token || user.Rol === 'general') {
        window.location.href = '/index.html';
        return;
    }
    // --- FIN DE CORRECCIÓN ---

    // 2. Elementos del DOM para la navegación
    const navContainer = document.getElementById('nav-container');
    const headerTitle = document.getElementById('header-title');

    // 3. Función para construir el menú dinámico
    function buildNavigation(role) {
        let navLinks = `
                <a href="/catalogo.html" class="rounded-md bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Catálogo</a>
                <a href="/dashboard.html" class="rounded-md bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Mi Desempeño</a>
        `;

        if (role === 'coordinador') {
            navLinks += `<a href="/procesos.html" class="rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500">Resultados de Procesos</a>`;
        }

        if (role === 'admin') {
            navLinks += `
                <a href="/procesos.html" class="rounded-md bg-blue-600 px-2 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500">Resultados de Procesos</a>
                <a href="/empresa.html" class="rounded-md bg-white px-2 py-2 text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Resultados de la Empresa</a>
            `;
        }
        
        navLinks += `<button id="logout-btn" class="rounded-md bg-red-600 px-2 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500">Cerrar Sesión</button>`;

        navContainer.innerHTML = navLinks;

        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('user');
            localStorage.removeItem('authToken'); // <-- AÑADIDO
            window.location.href = '/index.html';
        });
    }

    // 4. Llama a la función para construir el menú y actualiza el título
    buildNavigation(user.Rol);
    headerTitle.textContent = 'Resultados de Procesos';

    // --- 3. MODIFICAR EL FETCH ---
    fetch('/.netlify/functions/getData', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}` // <-- AÑADIDO
        }
    })
    .then(response => {
        // --- 4. AÑADIR MANEJO DE ERROR 401 ---
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
            
            // --- INICIO DE CORRECCIÓN ---
            // El 'data' que llega ya está procesado por getData.js
            // Filtramos los KPIs por el 'kpi_type' que añadimos.
            const tacticosKpis = data.filter(kpi => kpi.kpi_type === 'táctico');
            // --- FIN DE CORRECCIÓN ---

            const dataContainer = document.getElementById('rawData');
            dataContainer.textContent = JSON.stringify(tacticosKpis, null, 2);
            
            if (tacticosKpis.length === 0) {
                 document.getElementById('myChart').innerHTML = '<p>No se encontraron KPIs tácticos.</p>';
                 return;
            }

            const ctx = document.getElementById('myChart').getContext('2d');
            
            // --- INICIO DE CORRECCIÓN ---
            // Mapeamos desde el objeto 'kpi' procesado
            const labels = tacticosKpis.map(kpi => kpi.kpi_name);
            const values = tacticosKpis.map(kpi => kpi.latestPeriod.ValorNum); // Usamos el valor numérico
            // --- FIN DE CORRECCIÓN ---

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Desempeño de Procesos (Tácticos)',
                        data: values,
                        backgroundColor: 'rgba(234, 179, 8, 0.2)', // Amarillo
                        borderColor: 'rgba(234, 179, 8, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                    }
                }
            });

            // Placeholder si aún no tienes la lógica del gráfico:
        console.log("Datos recibidos para el gráfico de Procesos:", data);
        })
        .catch(error => console.error('Error al cargar datos de procesos:', error));
});