const { google } = require('googleapis');

// Función auxiliar para convertir los datos de la hoja en un arreglo de objetos.
// Esto hace que el código sea mucho más fácil de leer y manejar.
const sheetDataToObject = (rows) => {
  if (!rows || rows.length < 2) return []; // Si no hay datos o solo encabezados, devuelve vacío
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const dataObject = {};
    headers.forEach((header, index) => {
      dataObject[header] = row[index];
    });
    return dataObject;
  });
};

exports.handler = async function (event, context) {

try {
    // 1. Obtiene los parámetros de la URL (enviados desde el fetch)
    const { rol, userID } = event.queryStringParameters;

    // 2. Autenticación con Google Sheets

    const auth = new google.auth.GoogleAuth({
        credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

  const sheets = google.sheets({ version: 'v4', auth });

    // 3. Lee TODAS las hojas de datos necesarias a la vez
    const [resultsResponse, usersResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Resultados!A:E', // Asegúrate que el rango cubra tus columnas
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Usuarios!A:E',
      })
    ]);

    const allResults = sheetDataToObject(resultsResponse.data.values);
    const allUsers = sheetDataToObject(usersResponse.data.values);

    let filteredResults = [];

    // 4. Lógica de filtrado basada en el rol
    if (rol === 'admin') {
      // El admin ve todo
      filteredResults = allResults;
    } else if (rol === 'coordinador') {
      // El coordinador ve los suyos y los de su equipo.
      const coordinator = allUsers.find(u => u.UserID === userID);
      const teamIDs = allUsers
        .filter(u => u.EquipoID === coordinator.EquipoID)
        .map(u => u.UserID);

      filteredResults = allResults.filter(result => teamIDs.includes(result.UserID));
    } else if (rol === 'general') {
      // El usuario general solo ve sus propios resultados
      filteredResults = allResults.filter(result => result.UserID === userID);
    }

    // 5. Convierte los objetos de vuelta a un arreglo de arreglos para Chart.js
    // Mantenemos el formato original que espera el frontend (encabezados + filas)
    const headers = resultsResponse.data.values[0];
    const dataForFrontend = [headers, ...filteredResults.map(row => Object.values(row))];
    
    // 6. Devuelve los datos ya filtrados
    return {
      statusCode: 200,
      body: JSON.stringify(dataForFrontend),
    };

  } catch (error) {
    console.error('Error en getData function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor al obtener datos' }),
    };
  }
};