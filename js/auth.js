// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const errorMessage = document.getElementById('error-message');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    // ---- FIN DE LA MODIFICACIÓN ----

    // Revisar si ya está logueado
    if (localStorage.getItem('user') && localStorage.getItem('authToken')) {
        window.location.href = '/dashboard.html';
        }

    loginForm.addEventListener('submit', async (event) => {
        // Evita que la página se recargue al enviar el formulario
        event.preventDefault();
        
        // Oculta mensajes de error previos
        errorMessage.style.display = 'none';
        submitButton.disabled = true;
        submitButton.textContent = 'Ingresando...';

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
                // Si la respuesta no es OK (ej. 404, 500), muestra el mensaje
                errorMessage.textContent = result.message || 'Error en el servidor.';
                submitButton.disabled = false;
                submitButton.textContent = 'Ingresar';
                return;
            }

            // --- INICIO DE LA MODIFICACIÓN ---
            // 'result' ahora es { token: "...", user: {...} }

            // 1. Guardamos los datos del usuario (para la UI, ej. "Bienvenido, Juan")
            localStorage.setItem('user', JSON.stringify(result.user));
            
            // 2. Guardamos el token por separado (para las solicitudes de API)
            localStorage.setItem('authToken', result.token);
            // --- FIN DE LA MODIFICACIÓN ---
            
            // 4. Redirige al usuario al dashboard
            window.location.href = '/dashboard.html';

        } catch (error) {
            errorMessage.textContent = 'Error de conexión. Intente de nuevo.';
            submitButton.disabled = false;
            submitButton.textContent = 'Ingresar';
            console.error('Error en el login:', error);
        }
    });
});