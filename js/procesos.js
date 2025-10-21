document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtiene y verifica los datos del usuario
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        window.location.href = '/index.html';
        return;
    }

    // 2. Elementos del DOM para la navegación
    const navContainer = document.getElementById('nav-container');
    const headerTitle = document.getElementById('header-title');

    // 3. Función para construir el menú dinámico
    function buildNavigation(role) {
        let navLinks = `
            <a href="/dashboard.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Mi Desempeño</a>
            <a href="/catalogo.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Catálogo</a>
        `;

        if (role === 'coordinador') {
            navLinks += `<a href="/procesos.html" class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">Resultados de Procesos</a>`;
        }

        if (role === 'admin') {
            navLinks += `
                <a href="/procesos.html" class="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">Resultados de Procesos</a>
                <a href="/empresa.html" class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Resultados de la Empresa</a>
            `;
        }
        
        navLinks += `<button id="logout-btn" class="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500">Cerrar Sesión</button>`;

        navContainer.innerHTML = navLinks;

        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    }

    // 4. Llama a la función para construir el menú y actualiza el título
    buildNavigation(user.Rol);
    headerTitle.textContent = 'Resultados de Procesos';

    // 5. Llama a la función getData para obtener los datos de procesos
    fetch(`/.netlify/functions/getData?rol=${user.Rol}&userID=${user.UserID}`)
        .then(response => response.json())
        .then(data => {
            // Filtra solo los KPIs Tácticos
            const kpiCatalog = data.slice(1).filter(row => row[3] === 'táctico');
            
            const dataContainer = document.getElementById('rawData');
            dataContainer.textContent = JSON.stringify(kpiCatalog, null, 2);
            
            const ctx = document.getElementById('myChart').getContext('2d');
            
            const labels = kpiCatalog.map(row => row[1]); // Columna B: NombreKPI
            const values = kpiCatalog.map(row => parseFloat(row[5] || 0)); // Columna F: Valor (Asegurarse que es número)

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Desempeño de Procesos',
                        data: values,
                        backgroundColor: 'rgba(234, 179, 8, 0.2)',
                        borderColor: 'rgba(234, 179, 8, 1)',
                        borderWidth: 1
                    }]
                }
            });
        })
        .catch(error => console.error('Error al cargar datos de procesos:', error));
});