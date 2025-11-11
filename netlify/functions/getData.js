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
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Resultados!A:G' }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Usuarios!A:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'CatalogoKPIs!A:H' }), // Lee hasta la Col H
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

    // Con la corrección (A:F), currentUser.EquipoID ahora tendrá "Cli"
    const userTeamIDs = allUsers
      .filter(u => u.EquipoID === currentUser.EquipoID) // Esto ahora filtrará correctamente
      .map(u => u.UserID); 

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
      // Ahora userTeamIDs solo tendrá los IDs del equipo "Cli"
        allowedKpiIDs = kpiCatalog
            .filter(kpi => userTeamIDs.includes(kpi.Responsable))
            .map(kpi => kpi.KPI_ID);
    } else { // 'general'
        allowedKpiIDs = kpiCatalog
            .filter(kpi => kpi.Responsable === currentUser.UserID)
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
          // Guardamos las reglas de negocio para usarlas después
          kpi_frequency: kpiInfo ? kpiInfo.Frecuencia : 'mensual', // default
          kpi_aggregation: kpiInfo ? kpiInfo.MetodoAgregacion : 'SUMA', // default
          
          results: []
        };
      }
      groupedData[result.KPI_ID].results.push(result);
    }

    // 6. Procesar cada grupo de KPIs (Cálculos) - ¡LA GRAN MODIFICACIÓN!
    const processedKpis = Object.values(groupedData).map(kpiGroup => {
      
      // 6.1. Filtrar resultados por la frecuencia OFICIAL del KPI
      // Esto ignora datos "sucios" (ej. ignora registros diarios de un KPI mensual)
      const relevantResults = kpiGroup.results
        .filter(r => r.Frecuencia === kpiGroup.kpi_frequency)
        .map(r => {
           // Convertir a números aquí para facilitar los cálculos
           const metaNum = parseFloat(String(r.Meta).replace(/[^0-9.-]+/g, "")) || 0;
           const valorNum = parseFloat(String(r.Valor).replace(/[^0-9.-]+/g, "")) || 0;
           return { ...r, MetaNum: metaNum, ValorNum: valorNum };
        });

      if (relevantResults.length === 0) {
        // Si no hay datos VÁLIDOS, retornar un KPI vacío para no romper la UI
        return {
          kpi_name: kpiGroup.kpi_name,
          kpi_id: kpiGroup.kpi_id,
          kpi_type: kpiGroup.kpi_type,
          kpi_owner: kpiGroup.kpi_owner,
          latestPeriod: { Periodo: 'N/A', Meta: 'N/A', Valor: 'N/A', MetaNum: 0, ValorNum: 0 },
          historicalData: [],
          annualProgress: { Meta: 0, Acumulado: 0 }
        };
      }

      const sortedResults = relevantResults.sort((a, b) => new Date(b.Periodo) - new Date(a.Periodo));
      const latestResult = sortedResults[0];

      // 6.2. Lógica de "Progreso Anual" (Gráfica de Barra)
      let annualMeta = 0;
      let annualValor = 0;

      if (kpiGroup.kpi_frequency === 'anual') {
        // Si el KPI es ANUAL, el "total" es simplemente el último valor.
        annualMeta = latestResult.MetaNum;
        annualValor = latestResult.ValorNum;
      } else {
        // Si es mensual, semanal, etc., aplicamos el método de agregación
        switch (kpiGroup.kpi_aggregation) {
          case 'PROMEDIO':
            const sum = sortedResults.reduce((acc, r) => acc + r.ValorNum, 0);
            annualValor = sortedResults.length > 0 ? sum / sortedResults.length : 0;
            // La meta para un promedio es usualmente la meta del último periodo
            annualMeta = latestResult.MetaNum; 
            break;
          
          case 'ULTIMO_VALOR':
            // El "total" es solo el valor del último periodo
            annualValor = latestResult.ValorNum;
            annualMeta = latestResult.MetaNum;
            break;
            
          case 'SUMA':
          default:
            // Esta es la lógica original de la app
            sortedResults.forEach(r => {
              annualMeta += r.MetaNum;
              annualValor += r.ValorNum;
            });
            break;
        }
      }

      // 6.3. Lógica de Regla Financiera (esto sigue igual)
      let displayValor = latestResult.Valor;
      if (rol === 'general' && kpiGroup.is_financial) {
          const achievement = latestResult.MetaNum > 0 ? (latestResult.ValorNum / latestResult.MetaNum) * 100 : 0;
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
          MetaNum: latestResult.MetaNum,
          ValorNum: latestResult.ValorNum
        },
        historicalData: sortedResults.map(r => ({ // El histórico ya está filtrado por frecuencia
          Periodo: r.Periodo,
          Valor: r.ValorNum
        })).reverse(), 
        annualProgress: {
          Meta: annualMeta,
          Acumulado: annualValor
        }
      };
    });

    // --- FIN DE LA MODIFICACIÓN (Fase 1) ---

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