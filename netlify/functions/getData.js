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
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'CatalogoKPIs!A:G' }), // Lee hasta la Col G (Responsable)
    ]);

    const allResults = sheetDataToObject(resultsResponse.data.values);
    const allUsers = sheetDataToObject(usersResponse.data.values);
    const kpiCatalog = sheetDataToObject(catalogResponse.data.values);

    // --- INICIO DE LA MODIFICACIÓN (Fase 2 - Lógica de Roles) ---

    // =======================================================================
    // MODIFICACIÓN 1: Crear un Mapa de Búsqueda de Usuarios
    // Esto nos permite encontrar un NombreCompleto (para la UI) usando un UserID.
    // Ej: userMap.get('jmendez') -> 'Jorge Méndez Pérez'
    // =======================================================================
    const userMap = new Map(allUsers.map(user => [user.UserID, user.NombreCompleto]));

    const currentUser = allUsers.find(u => u.UserID === userID);
    if (!currentUser) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Usuario de sesión no encontrado' }) };
    }
    
    // =======================================================================
    // MODIFICACIÓN 2: Lógica de 'coordinador' robusta
    // Obtenemos los UserID (no los Nombres) de los miembros del equipo.
    // =======================================================================

    const userTeamIDs = allUsers
      .filter(u => u.EquipoID === currentUser.EquipoID)
      .map(u => u.UserID); // Obtenemos IDs en lugar de NombresCompletos 

    let allowedKpiIDs = [];

    // 3. Filtrar KPIs basado en el Rol (Propiedad/Responsabilidad, no quién reportó)
    if (rol === 'admin') {
        // Admin ve todos los KPIs
        allowedKpiIDs = kpiCatalog.map(kpi => kpi.KPI_ID);
    // =======================================================================
    // MODIFICACIÓN 3: Lógica de filtrado robusta (Paso 2.2 del plan)
    // Comparamos UserID con UserID, asumiendo que la Col G (Responsable)
    // en la hoja 'CatalogoKPIs' AHORA contiene UserIDs (ej. 'jmendez').
    // =======================================================================
    } else if (rol === 'coordinador') {
        // Coordinador ve los KPIs donde el Responsable (UserID) es alguien de su equipo (Array de UserIDs)
        allowedKpiIDs = kpiCatalog
            .filter(kpi => userTeamIDs.includes(kpi.Responsable)) // Compara UserID en Array[UserID]
            .map(kpi => kpi.KPI_ID);
    } else { // 'general'
        // General ve solo los KPIs donde el Responsable (UserID) es él mismo (UserID)
        allowedKpiIDs = kpiCatalog
            .filter(kpi => kpi.Responsable === currentUser.UserID) // Compara UserID === UserID
            .map(kpi => kpi.KPI_ID);
    }
    // =======================================================================
    // --- FIN DE LA MODIFICACIÓN (Fase 2) ---
    // =======================================================================

    // 4. Filtrar los resultados basado en los KPIs permitidos
    const userVisibleResults = allResults.filter(result => allowedKpiIDs.includes(result.KPI_ID));
    
    // --- FIN DE LA MODIFICACIÓN ---

    // 5. Agrupar los resultados visibles por KPI_ID
    const groupedData = {};
    for (const result of userVisibleResults) {
      if (!groupedData[result.KPI_ID]) {
        const kpiInfo = kpiCatalog.find(k => k.KPI_ID === result.KPI_ID);

        // =======================================================================
        // MODIFICACIÓN 4: Mapeo de UserID a NombreCompleto (Paso 2.2 del plan)
        // kpiInfo.Responsable AHORA es un UserID (ej. 'jmendez')
        // Usamos el 'userMap' para encontrar el nombre legible (ej. 'Jorge Méndez Pérez')
        // =======================================================================
        const responsableId = kpiInfo ? kpiInfo.Responsable : null;
        const responsableNombre = userMap.get(responsableId) || 'Responsable no asignado';

        groupedData[result.KPI_ID] = {
          kpi_id: result.KPI_ID,
          kpi_name: kpiInfo ? kpiInfo.NombreKPI : 'Unknown KPI',
          kpi_type: kpiInfo ? kpiInfo.Tipo : 'N/A',
          kpi_owner: responsableNombre, // <-- CORRECCIÓN: Asigna el Nombre Completo (ej. 'Jorge Méndez Pérez')
          is_financial: kpiInfo && (kpiInfo.EsFinanciero === 'TRUE' || kpiInfo.EsFinanciero === 'SI'),
          results: []
        };
      }
      groupedData[result.KPI_ID].results.push(result);
    }

    // 6. Procesar cada grupo de KPIs (Cálculos)
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
        kpi_type: kpiGroup.kpi_type,
        kpi_owner: kpiGroup.kpi_owner, 
        
        latestPeriod: {
          Periodo: latestResult.Periodo,
          Meta: latestResult.Meta,
          Valor: displayValor,
          MetaNum: latestMeta,
          ValorNum: latestValor
        },
        historicalData: sortedResults.map(r => ({
          Periodo: r.Periodo,
          Valor: parseFloat(String(r.Valor).replace(/[^0-9.-]+/g, "")) || 0
        })).reverse(), 
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