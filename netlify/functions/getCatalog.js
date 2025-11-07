// netlify/functions/getCatalog.js

const { google } = require('googleapis');

// =======================================================================
// MODIFICACIÓN 1: Añadir el "helper" (copiado de getData.js)
// =======================================================================
const sheetDataToObject = (rows) => {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const dataObject = {};
    headers.forEach((header, index) => {
      dataObject[header] = row[index] || null;
    });
    return dataObject;
  });
};

exports.handler = async function (event, context) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // =======================================================================
    // MODIFICACIÓN 2: Obtener AMBAS hojas (Catálogo y Usuarios)
    // =======================================================================
    const [catalogResponse, usersResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'CatalogoKPIs!A:G', // Lee todas las columnas de la hoja CatalogoKPIs
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Usuarios!A:E', // Necesitamos los usuarios
      })
    ]);

    // =======================================================================
    // MODIFICACIÓN 3: Crear el Mapa de Usuarios
    // =======================================================================
    const allUsers = sheetDataToObject(usersResponse.data.values);
    const userMap = new Map(allUsers.map(user => [user.UserID, user.NombreCompleto]));

    // =======================================================================
    // MODIFICACIÓN 4: Transformar los datos del catálogo
    // =======================================================================

    // Obtenemos los datos crudos del catálogo
    const catalogData = catalogResponse.data.values;
    if (!catalogData || catalogData.length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) }; // Devuelve vacío si no hay datos
    }

    // 1. Encontrar el índice de la columna "Responsable"
    const headers = catalogData[0];
    const responsableIndex = headers.indexOf('Responsable');

    if (responsableIndex === -1) {
      // Si no hay columna 'Responsable', devuelve los datos tal cual
      return { statusCode: 200, body: JSON.stringify(catalogData) };
    }

    // 2. Iterar SOLO las filas de datos (saltar los headers) y reemplazar el UserID
    const dataRows = catalogData.slice(1);
    const transformedRows = dataRows.map(row => {
      // Hacemos una copia para no modificar el original (buena práctica)
      const newRow = [...row]; 
      
      const responsableId = newRow[responsableIndex]; // ej: "Admon-01"
      const responsableNombre = userMap.get(responsableId) || responsableId; // ej: "Teresa Vazquez" o "Admon-01" si no se encuentra
      
      // Reemplaza el ID con el Nombre en la fila
      newRow[responsableIndex] = responsableNombre;
      
      return newRow;
    });

    // 3. Volver a armar el array con los headers originales y las filas transformadas
    const finalData = [headers, ...transformedRows];

    return {
      statusCode: 200,
      body: JSON.stringify(finalData), // Devuelve los datos en el formato que espera catalogo.js
    };

  } catch (error) {
    console.error('Error en getCatalog:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al obtener el catálogo' }),
    };
  }
};