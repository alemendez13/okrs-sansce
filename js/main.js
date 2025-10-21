window.addEventListener('DOMContentLoaded', () => {
    // 1. Obtiene los datos del usuario guardados en el login
    const user = JSON.parse(localStorage.getItem('user'));

    // 2. Si no hay un usuario, redirige a la página de inicio de sesión
    if (!user) {
        window.location.href = '/index.html';
        return; // Detiene la ejecución del resto del código
    }

    // 3. Llama a la función getData ENVIANDO el rol y el ID del usuario
    fetch(`/.netlify/functions/getData?rol=${user.Rol}&userID=${user.UserID}`)
    .then(response => response.json())
    .then(data => {
      // Muestra los datos crudos en la etiqueta <pre>
      const dataContainer = document.getElementById('rawData');
      dataContainer.textContent = JSON.stringify(data, null, 2);
      const ctx = document.getElementById('myChart').getContext('2d');

        // Suponiendo que la primera fila son los encabezados, la ignoramos con slice(1)
        const labels = data.slice(1).map(row => row[2]); // Columna C: Periodo
        const values = data.slice(1).map(row => row[4]); // Columna E: Valor

        new Chart(ctx, {
        type: 'bar', // Tipo de gráfica
        data: {
            labels: labels,
            datasets: [{
            label: 'Mi KPI Operativo',
            data: values,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
            }]
        }
        });
            })
    .catch(error => console.error('Error al cargar datos:', error));
});