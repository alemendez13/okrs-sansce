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

    const catalogData = catalogResponse.data.values;
    if (!catalogData || catalogData.length < 2) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const headers = catalogData[0];
    const dataRows = catalogData.slice(1);

    // 1. Encontrar el índice de la columna "Responsable"
    const responsableIndex = headers.indexOf('Responsable');

    // 2. Iterar y reemplazar el UserID por el NombreCompleto
    let finalRows = dataRows.map(row => {
      const newRow = [...row];
      if (responsableIndex !== -1) {
        const responsableId = newRow[responsableIndex]; // ej: "Admon-01"
        const responsableNombre = userMap.get(responsableId) || responsableId; // ej: "Teresa Vazquez"
        newRow[responsableIndex] = responsableNombre;
      }
      return newRow;
    });

    let finalHeaders = [...headers];

    // =======================================================================
    // MODIFICACIÓN 5: Ocultar la columna "EsFinanciero"
    // =======================================================================
    
    // 1. Encontrar el índice de la columna a ocultar
    const financieroIndex = finalHeaders.indexOf('EsFinanciero');

    if (financieroIndex > -1) {
      // 2. Filtrar los headers
      finalHeaders = finalHeaders.filter((header, index) => index !== financieroIndex);

      // 3. Filtrar cada fila de datos
      finalRows = finalRows.map(row => {
        // Devuelve una nueva fila sin el elemento en esa posición
        return row.filter((cell, index) => index !== financieroIndex);
      });
    }

    // 3. Volver a armar el array con los headers y filas finales
    const finalData = [finalHeaders, ...finalRows];

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