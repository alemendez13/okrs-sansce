// netlify/functions/getData.js

const { google } = require('googleapis');
const jwt = require('jsonwebtoken'); // <-- 1. Importar la biblioteca

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

  // --- 2. INICIO DE LA VERIFICACIÓN DEL TOKEN ---
  const authHeader = event.headers.authorization;
  let verifiedPayload;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { 
      statusCode: 401, 
      body: JSON.stringify({ error: 'Acceso no autorizado. Token no proporcionado.' }) 
    };
  }

  const token = authHeader.split(' ')[1]; // Extrae el token "Bearer <token>"
  
  try {
    // Verifica el token usando la clave secreta
    verifiedPayload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Token inválido o expirado.' }) };
  }
  // --- FIN DE LA VERIFICACIÓN DEL TOKEN ---

  try {
    // --- 3. OBTENER DATOS DEL TOKEN, NO DE LA URL ---
    // ¡BORRA!) const { rol, userID } = event.queryStringParameters;
    const { Rol, UserID } = verifiedPayload; // <-- Usamos los datos verificados del token

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

    // --- INICIO DE LA MODIFICACIÓN (Lógica de Roles) ---

    // --- 4. USAR LAS VARIABLES VERIFICADAS ---
    // Busca al usuario usando el UserID del token
    const currentUser = allUsers.find(u => u.UserID === UserID); // <-- Usa UserID
    if (!currentUser) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Usuario de sesión no encontrado' }) };
    }
    
    // Obtenemos los NOMBRES COMPLETOS de los miembros del equipo del usuario actual
    const userTeam = allUsers
      .filter(u => u.EquipoID === currentUser.EquipoID)
      .map(u => u.NombreCompleto); 

    let allowedKpiIDs = [];

    // Filtra KPIs basado en el Rol del token
    if (Rol === 'admin') { // <-- Usa Rol
        allowedKpiIDs = kpiCatalog.map(kpi => kpi.KPI_ID);
    } else if (Rol === 'coordinador') { // <-- Usa Rol
        allowedKpiIDs = kpiCatalog
            .filter(kpi => userTeam.includes(kpi.Responsable))
            .map(kpi => kpi.KPI_ID);
    } else { // 'general'
        allowedKpiIDs = kpiCatalog
            .filter(kpi => kpi.Responsable === currentUser.NombreCompleto)
            .map(kpi => kpi.KPI_ID);
    }

    // 4. Filtrar los resultados basado en los KPIs permitidos
    const userVisibleResults = allResults.filter(result => allowedKpiIDs.includes(result.KPI_ID));
    
    // --- FIN DE LA MODIFICACIÓN ---

    // 5. Agrupar los resultados visibles por KPI_ID
    const groupedData = {};
    for (const result of userVisibleResults) {
      if (!groupedData[result.KPI_ID]) {
        const kpiInfo = kpiCatalog.find(k => k.KPI_ID === result.KPI_ID);
        groupedData[result.KPI_ID] = {
          kpi_id: result.KPI_ID,
          kpi_name: kpiInfo ? kpiInfo.NombreKPI : 'Unknown KPI',
          kpi_type: kpiInfo ? kpiInfo.Tipo : 'N/A',
          kpi_owner: kpiInfo ? kpiInfo.Responsable : 'N/A', 
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