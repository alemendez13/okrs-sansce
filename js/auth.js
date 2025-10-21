// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    // ---- FIN DE LA MODIFICACIÓN ----

    loginForm.addEventListener('submit', async (event) => {
        // Evita que la página se recargue al enviar el formulario
        event.preventDefault();
        
        // Oculta mensajes de error previos
        errorMessage.style.display = 'none';

        // 1. Toma el email del campo de texto
        const email = document.getElementById('email').value;

        try {
            // 2. Llama a la función login.js con fetch
            const response = await fetch('/.netlify/functions/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email }), // Envía el email en el cuerpo de la petición
            });

            const result = await response.json();

            // Si la respuesta no es exitosa (ej. 404, 500), muestra el error
            if (!response.ok) {
                errorMessage.textContent = result.message || 'Ocurrió un error.';
                errorMessage.style.display = 'block';
                return;
            }

            // 3. Si el login es exitoso, guarda los datos en localStorage
            localStorage.setItem('user', JSON.stringify(result));
            
            // 4. Redirige al usuario al dashboard
            window.location.href = '/dashboard.html';

        } catch (error) {
            errorMessage.textContent = 'No se pudo conectar con el servidor. Intenta de nuevo.';
            errorMessage.style.display = 'block';
            console.error('Error en el proceso de login:', error);
        }
    });
});