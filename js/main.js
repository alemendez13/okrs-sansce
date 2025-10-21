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

    fetch(`/.netlify/functions/getData?rol=${user.Rol}&userID=${user.UserID}`)
    .then(response => response.json())
    .then(data => {
      const dataContainer = document.getElementById('rawData');
      dataContainer.textContent = JSON.stringify(data, null, 2);
      
      const kpis = data.slice(1); // Solo las filas de datos
      if (kpis.length === 0) return;

      // --- INICIO DE LA MODIFICACIÓN ---
      // Separamos los KPIs en dos grupos: los que se pueden graficar y los que no.
      const graphableKpis = kpis.filter(row => !isNaN(parseFloat(row[4])) && typeof row[4] !== 'string');
      const textKpis = kpis.filter(row => typeof row[4] === 'string' && row[4].includes('%'));
      
      // 1. Mostrar KPIs textuales (financieros) en tarjetas
      const mainContent = document.querySelector('main > div'); // Selecciona el contenedor principal
      if (textKpis.length > 0) {
          let textKpisHtml = `
            <div class="mb-8 rounded-lg bg-white p-6 shadow">
              <h2 class="text-lg font-semibold leading-6 text-slate-900">Resultados Financieros (Logro)</h2>
              <dl class="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
          `;
          textKpis.forEach(row => {
              const kpiName = row[1]; // NombreKPI
              const kpiValue = row[4]; // Valor en %
              textKpisHtml += `
                <div class="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                  <dt class="truncate text-sm font-medium text-slate-500">${kpiName}</dt>
                  <dd class="mt-1 text-3xl font-semibold tracking-tight text-slate-900">${kpiValue}</dd>
                </div>
              `;
          });
          textKpisHtml += `</dl></div>`;
          mainContent.insertAdjacentHTML('afterbegin', textKpisHtml); // Inserta las tarjetas al inicio del <main>
      }

      // 2. Graficar solo los KPIs numéricos
      if (graphableKpis.length > 0) {
        const ctx = document.getElementById('myChart').getContext('2d');
        const labels = graphableKpis.map(row => row[1]); // Columna B: NombreKPI
        const values = graphableKpis.map(row => parseFloat(row[4])); // Columna E: Valor

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Mi Desempeño Operativo',
                    data: values,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            }
        });
      } else {
        // Si no hay nada que graficar, oculta el contenedor de la gráfica
        document.getElementById('myChart').closest('.mb-8').style.display = 'none';
      }
      // --- FIN DE LA MODIFICACIÓN ---
    })
    .catch(error => console.error('Error al cargar datos:', error));
});