// netlify/functions/getCatalog.js

const { google } = require('googleapis');
const jwt = require('jsonwebtoken'); // <-- 1. Importar la biblioteca

exports.handler = async function (event, context) {

  // --- 2. INICIO DE LA VERIFICACIÓN DEL TOKEN ---
  const authHeader = event.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { 
      statusCode: 401, 
      body: JSON.stringify({ error: 'Acceso no autorizado. Token no proporcionado.' }) 
    };
  }

  const token = authHeader.split(' ')[1];
  
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Token inválido o expirado.' }) };
  }
  // --- FIN DE LA VERIFICACIÓN DEL TOKEN ---

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'CatalogoKPIs!A:G', // Lee todas las columnas de la hoja CatalogoKPIs
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data.values),
    };

  } catch (error) {
    console.error('Error en getCatalog:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al obtener el catálogo' }),
    };
  }
};