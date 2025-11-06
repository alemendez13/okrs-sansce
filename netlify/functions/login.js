// netlify/functions/login.js (CON LOGS DE DEBUGGING)

const { google } = require('googleapis');
const jwt = require('jsonwebtoken');

// --- INICIO DEL LOG DE DEBUGGING ---
console.log('Función login.js iniciada.');

// 1. Verificación de Variables de Entorno
// (Esto nos dirá si las claves están cargadas en Netlify)
console.log(`¿Existe JWT_SECRET? ${process.env.JWT_SECRET ? 'Sí' : '¡NO!'}`);
console.log(`¿Existe GOOGLE_SHEET_ID? ${process.env.GOOGLE_SHEET_ID ? 'Sí' : '¡NO!'}`);
console.log(`¿Existe GOOGLE_CLIENT_EMAIL? ${process.env.GOOGLE_CLIENT_EMAIL ? 'Sí' : '¡NO!'}`);
console.log(`¿Existe GOOGLE_PRIVATE_KEY? ${process.env.GOOGLE_PRIVATE_KEY ? 'Sí, existe' : '¡NO!'}`);
// --- FIN DEL LOG DE DEBUGGING ---

// Función auxiliar (sin cambios)
const sheetDataToObject = (data) => {
  const headers = data[0];
  const objects = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
  return objects;
};

exports.handler = async function (event, context) {
  // --- INICIO DEL LOG DE DEBUGGING ---
  console.log('--- Nueva Solicitud de Login Recibida ---');
  console.log(`Método HTTP: ${event.httpMethod}`);
  // --- FIN DEL LOG DE DEBUGGING ---

  if (event.httpMethod !== 'POST') {
    console.log('Error: Método no permitido.');
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // --- INICIO DEL LOG DE DEBUGGING ---
    console.log('Iniciando bloque try...');
    
    const { email } = JSON.parse(event.body);
    if (!email) {
      console.log('Error: Email no proporcionado en el body.');
      return { statusCode: 400, body: 'Email es requerido' };
    }
    console.log(`Email recibido: ${email}`);

    // Checkpoint 1: Autenticación con Google
    console.log('Checkpoint 1: Creando GoogleAuth...');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    console.log('GoogleAuth creado.');

    // Checkpoint 2: Conectando a Sheets
    console.log('Checkpoint 2: Creando cliente de Google Sheets...');
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('Cliente de Sheets creado.');

    // Checkpoint 3: Obteniendo datos de la hoja
    console.log('Checkpoint 3: Obteniendo datos de Usuarios...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Usuarios!A:E',
    });
    console.log('Datos de Usuarios obtenidos.');

    // Checkpoint 4: Procesando usuarios
    console.log('Checkpoint 4: Buscando al usuario en los datos...');
    const users = sheetDataToObject(response.data.values);
    const foundUser = users.find(user => user.Email && user.Email.toLowerCase() === email.toLowerCase());

    if (foundUser) {
      console.log(`Usuario encontrado: ${foundUser.NombreCompleto}`);
      
      const userPayload = {
        UserID: foundUser.UserID,
        Rol: foundUser.Rol,
        NombreCompleto: foundUser.NombreCompleto
      };

      // Checkpoint 5: Creando el Token
      console.log('Checkpoint 5: Firmando el token JWT...');
      const token = jwt.sign(
        { UserID: userPayload.UserID, Rol: userPayload.Rol },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      console.log('Token JWT firmado con éxito.');

      // Checkpoint 6: Enviando respuesta exitosa
      console.log('Checkpoint 6: Enviando respuesta 200 al cliente.');
      return {
        statusCode: 200,
        body: JSON.stringify({
          token: token,
          user: userPayload 
        }),
      };
      
    } else {
      console.log('Error: Usuario no encontrado en la hoja.');
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Usuario no encontrado' }),
      };
    }

  } catch (error) {
    // --- ¡ESTE ES EL LOG MÁS IMPORTANTE! ---
    console.error('!!! ERROR CATASTRÓFICO EN EL BLOQUE try...catch !!!');
    console.error(error.message);
    console.error(error.stack);
    // --- FIN DEL LOG DE DEBUGGING ---
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error interno del servidor.',
        error: error.message // Devuelve el mensaje de error
      }),
    };
  }
};