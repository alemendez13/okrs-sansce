// js/empresa.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtiene y verifica los datos del usuario
    const user = JSON.parse(localStorage.getItem('user'));

    // Redirige si no está logueado o si no es admin
    if (!user || user.Rol !== 'admin') {
        window.location.href = '/index.html';
        return;
    }

    // 2. Elementos del DOM para la navegación
    const navContainer = document.getElementById('nav-container');
    const headerTitle = document.getElementById('header-title');

    // 3. Función para construir el menú dinámico
    function buildNavigation(role) {
        // El rol siempre será 'admin' en esta página, pero mantenemos la lógica por consistencia
        let navLinks = `
            <a href="/dashboard.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Mi Desempeño</a>
            <a href="/catalogo.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Catálogo</a>
            <a href="/procesos.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Resultados de Procesos</a>
            <a href="/empresa.html" class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">Resultados de la Empresa</a>
        `;
        
        navLinks += `<button id="logout-btn" class="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500">Cerrar Sesión</button>`;

        navContainer.innerHTML = navLinks;

        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    }

    // 4. Llama a la función para construir el menú y actualiza el título
    buildNavigation(user.Rol);
    headerTitle.textContent = 'Resultados de la Empresa';

    // 5. Llama a la función getData para obtener todos los datos (como admin)
    fetch(`/.netlify/functions/getData?rol=${user.Rol}&userID=${user.UserID}`)
        .then(response => response.json())
        .then(data => {
            if (!data || data.length < 2) {
                document.getElementById('rawData').textContent = 'No se encontraron datos.';
                return;
            }
            
            // Filtra solo los KPIs Estratégicos
            const strategicKpis = data.slice(1).filter(row => row[3] && row[3].toLowerCase() === 'estratégico');
            
            const dataContainer = document.getElementById('rawData');
            dataContainer.textContent = JSON.stringify(strategicKpis, null, 2);
            
            const ctx = document.getElementById('myChart').getContext('2d');
            
            // Mapea los datos para la gráfica
            const labels = strategicKpis.map(row => row[1]); // Columna B: NombreKPI
            const values = strategicKpis.map(row => {
                // Limpia el valor para asegurarse de que es un número (ej. quita '$', ',', etc.)
                const cleanValue = String(row[4]).replace(/[^0-9.-]+/g,"");
                return parseFloat(cleanValue) || 0;
            });

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Desempeño Estratégico',
                        data: values,
                        backgroundColor: 'rgba(79, 70, 229, 0.2)',
                        borderColor: 'rgba(79, 70, 229, 1)',
                        borderWidth: 1
                    }]
                }
            });
        })
        .catch(error => console.error('Error al cargar datos de la empresa:', error));
});