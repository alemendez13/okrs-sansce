// netlify/functions/getData.js

const { google } = require('googleapis');

// Helper para convertir datos de hoja de cálculo en objetos
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

// Función principal
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

    // 1. Obtener todos los datos en paralelo
    const [resultsResponse, usersResponse, catalogResponse] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Resultados!A:E' }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Usuarios!A:E' }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'CatalogoKPIs!A:G' }),
    ]);

    const allResults = sheetDataToObject(resultsResponse.data.values);
    const allUsers = sheetDataToObject(usersResponse.data.values);
    const kpiCatalog = sheetDataToObject(catalogResponse.data.values);

    // 2. Filtrar resultados según el rol del usuario
    let userVisibleResults = [];
    if (rol === 'admin') {
      userVisibleResults = allResults;
    } else if (rol === 'coordinador') {
      const coordinator = allUsers.find(u => u.UserID === userID);
      if (coordinator) {
        const teamIDs = allUsers.filter(u => u.EquipoID === coordinator.EquipoID).map(u => u.UserID);
        userVisibleResults = allResults.filter(result => teamIDs.includes(result.UserID));
      }
    } else { // 'general'
      userVisibleResults = allResults.filter(result => result.UserID === userID);
    }
    
    // 3. Agrupar los resultados visibles por KPI_ID
    const groupedData = {};
    for (const result of userVisibleResults) {
      if (!groupedData[result.KPI_ID]) {
        const kpiInfo = kpiCatalog.find(k => k.KPI_ID === result.KPI_ID);
        groupedData[result.KPI_ID] = {
          kpi_id: result.KPI_ID,
          kpi_name: kpiInfo ? kpiInfo.NombreKPI : 'Unknown KPI',
          // --- INICIO DE LA MODIFICACIÓN ---
          // Añadimos el Tipo y si EsFinanciero
          kpi_type: kpiInfo ? kpiInfo.Tipo : 'N/A',
          kpi_owner: kpiInfo ? kpiInfo.Responsable : 'N/A', // AÑADIDO 
          is_financial: kpiInfo && (kpiInfo.EsFinanciero === 'TRUE' || kpiInfo.EsFinanciero === 'SI'),
          // --- FIN DE LA MODIFICACIÓN ---
          results: []
        };
      }
      groupedData[result.KPI_ID].results.push(result);
    }

    // 4. Procesar cada grupo de KPIs
    const processedKpis = Object.values(groupedData).map(kpiGroup => {
      const sortedResults = kpiGroup.results.sort((a, b) => new Date(b.Periodo) - new Date(a.Periodo));
      const latestResult = sortedResults[0];

      // Calcular totales anuales
      let annualMeta = 0;
      let annualValor = 0;
      sortedResults.forEach(r => {
        annualMeta += parseFloat(String(r.Meta).replace(/[^0-9.-]+/g, "")) || 0;
        annualValor += parseFloat(String(r.Valor).replace(/[^0-9.-]+/g, "")) || 0;
      });
      
      const latestMeta = parseFloat(String(latestResult.Meta).replace(/[^0-9.-]+/g, "")) || 0;
      const latestValor = parseFloat(String(latestResult.Valor).replace(/[^0-9.-]+/g, "")) || 0;

      // Regla de Negocio: Ocultar valor financiero para rol 'general'
      let displayValor = latestResult.Valor;
      if (rol === 'general' && kpiGroup.is_financial) {
          const achievement = latestMeta > 0 ? (latestValor / latestMeta) * 100 : 0;
          displayValor = achievement.toFixed(2) + '%';
      }

      return {
        kpi_name: kpiGroup.kpi_name,
        kpi_id: kpiGroup.kpi_id,
        kpi_type: kpiGroup.kpi_type, // Devolver el tipo de KPI
        kpi_owner: kpiGroup.kpi_owner, // AÑADIDO
        
        // Datos para la "Stat Card"
        latestPeriod: {
          Periodo: latestResult.Periodo,
          Meta: latestResult.Meta,
          Valor: displayValor, // Valor original o %
          // Valores numéricos puros para gráficas
          MetaNum: latestMeta,
          ValorNum: latestValor
        },
        // Datos para la gráfica histórica
        historicalData: sortedResults.map(r => ({
          Periodo: r.Periodo,
          Valor: parseFloat(String(r.Valor).replace(/[^0-9.-]+/g, "")) || 0
        })).reverse(), // .reverse() para orden cronológico
        
        // Datos para la gráfica de progreso anual
        annualProgress: {
          Meta: annualMeta,
          Acumulado: annualValor
        }
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify(processedKpis),
    };

  } catch (error) {
    console.error('Error in getData function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor al obtener datos.' }),
    };
  }
};