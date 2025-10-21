// netlify/functions/login.js

const { google } = require('googleapis');

// Helper function to convert sheet data to an array of objects
const sheetDataToObject = (rows) => {
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const userObject = {};
    headers.forEach((header, index) => {
      userObject[header] = row[index];
    });
    return userObject;
  });
};

exports.handler = async function (event, context) {
  // Solo permite peticiones POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1. Obtiene el email enviado desde el frontend
    const { email } = JSON.parse(event.body);
        if (!email) {
      return { statusCode: 400, body: 'Email es requerido' };
    }

    // 2. Autenticación con Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 3. Lee la hoja de 'Usuarios'
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Usuarios!A:E', // Asegúrate que el rango cubra tus columnas
    });

    const users = sheetDataToObject(response.data.values);

    // 4. Busca al usuario por su email
    const foundUser = users.find(user => user.Email && user.Email.toLowerCase() === email.toLowerCase());

    if (foundUser) {
      // 5. Si lo encuentra, devuelve sus datos esenciales
      return {
        statusCode: 200,
        body: JSON.stringify({
          UserID: foundUser.UserID,
          Rol: foundUser.Rol,
          NombreCompleto: foundUser.NombreCompleto
        }),
      };
    } else {
      // 6. Si no lo encuentra, devuelve un error
      return {
        statusCode: 404, // Not Found
        body: JSON.stringify({ message: 'Usuario no encontrado' }),
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};