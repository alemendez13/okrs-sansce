// netlify/functions/getData.js

const { google } = require('googleapis');

const sheetDataToObject = (rows) => {
  if (!rows || rows.length < 2) return [];
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
    const { rol, userID } = event.queryStringParameters;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // --- INICIO DE LA MODIFICACIÓN 1: Leer también el catálogo ---
    const [resultsResponse, usersResponse, catalogResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Resultados!A:E',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Usuarios!A:E',
      }),
      // Añadimos la lectura de la hoja CatalogoKPIs
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'CatalogoKPIs!A:F',
      }),
    ]);

    const allResults = sheetDataToObject(resultsResponse.data.values);
    const allUsers = sheetDataToObject(usersResponse.data.values);
    const kpiCatalog = sheetDataToObject(catalogResponse.data.values);
    // --- FIN DE LA MODIFICACIÓN 1 ---

    let filteredResults = [];

    if (rol === 'admin' || rol === 'coordinador') {
        // La lógica para admin y coordinador no cambia, devuelven los valores numéricos.
        let resultsForRole = allResults;
        if (rol === 'coordinador') {
            const coordinator = allUsers.find(u => u.UserID === userID);
            if(coordinator) {
                const teamIDs = allUsers
                    .filter(u => u.EquipoID === coordinator.EquipoID)
                    .map(u => u.UserID);
                resultsForRole = allResults.filter(result => teamIDs.includes(result.UserID));
            } else {
                resultsForRole = [];
            }
        }
        filteredResults = resultsForRole;

    } else if (rol === 'general') {
      const userResults = allResults.filter(result => result.UserID === userID);

      // --- INICIO DE LA MODIFICACIÓN 2: Calcular porcentaje para KPIs financieros ---
      filteredResults = userResults.map(result => {
        const kpiInfo = kpiCatalog.find(kpi => kpi.KPI_ID === result.KPI_ID);
        
        // Verifica si el KPI es financiero
        if (kpiInfo && (kpiInfo.EsFinanciero === 'TRUE' || kpiInfo.EsFinanciero === 'SI')) {
          // Limpia los valores de meta y resultado para convertirlos a números
          const meta = parseFloat(String(result.Meta).replace(/[^0-9.-]+/g, ""));
          const valor = parseFloat(String(result.Valor).replace(/[^0-9.-]+/g, ""));
          
          // Calcula el porcentaje de logro
          const achievement = meta > 0 ? (valor / meta) * 100 : 0;
          
          // Crea una copia del resultado y reemplaza el 'Valor' por el porcentaje formateado
          return { ...result, Valor: achievement.toFixed(2) + '%' };
        }
        
        // Si no es financiero, devuelve el resultado sin cambios
        return result;
      });
      // --- FIN DE LA MODIFICACIÓN 2 ---
    }

    const headers = resultsResponse.data.values[0];
    const dataForFrontend = [headers, ...filteredResults.map(row => headers.map(header => row[header]))];
    
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