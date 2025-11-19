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

// --- INICIO DE LA MODIFICACIÓN (Fase 1 - OKR) ---

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

    // 1. Obtener TODOS los datos de las 5 hojas en paralelo
    const [
      resultsResponse, 
      usersResponse, 
      catalogResponse, 
      krResponse, 
      objectivesResponse
    ] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Resultados!A:G' }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Usuarios!A:F' }),
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'CatalogoKPIs!A:J' }), // Lee hasta la Col J (Proceso)
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'ResultadosClave!A:C' }), // NUEVA HOJA
      sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Objetivos!A:D' })  // NUEVA HOJA
    ]);

    // 2. Convertir todos los datos a objetos
    const allResults = sheetDataToObject(resultsResponse.data.values);
    const allUsers = sheetDataToObject(usersResponse.data.values);
    const kpiCatalog = sheetDataToObject(catalogResponse.data.values);
    const allKRs = sheetDataToObject(krResponse.data.values);
    const allObjectives = sheetDataToObject(objectivesResponse.data.values);

    // 3. Lógica de Roles y Mapeo (Esto se mantiene)
    const userMap = new Map(allUsers.map(user => [user.UserID, user.NombreCompleto]));
    const currentUser = allUsers.find(u => u.UserID === userID);
    if (!currentUser) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Usuario de sesión no encontrado' }) };
    }
    
    const userTeamIDs = allUsers
      .filter(u => u.EquipoID === currentUser.EquipoID)
      .map(u => u.UserID); 

    let allowedKpiIDs = [];
    if (rol === 'admin') {
        allowedKpiIDs = kpiCatalog.map(kpi => kpi.KPI_ID);
    } else if (rol === 'coordinador') {
        allowedKpiIDs = kpiCatalog
            .filter(kpi => userTeamIDs.includes(kpi.Responsable))
            .map(kpi => kpi.KPI_ID);
    } else { // 'general'
        allowedKpiIDs = kpiCatalog
            .filter(kpi => kpi.Responsable === currentUser.UserID)
            .map(kpi => kpi.KPI_ID);
    }

    // 4. Filtrar los resultados basado en los KPIs permitidos
    const userVisibleResults = allResults.filter(result => allowedKpiIDs.includes(result.KPI_ID));
    
    // 5. Agrupar los resultados visibles por KPI_ID
    const groupedData = {};
    for (const result of userVisibleResults) {
      if (!groupedData[result.KPI_ID]) {
        const kpiInfo = kpiCatalog.find(k => k.KPI_ID === result.KPI_ID);
        if (!kpiInfo) continue; // Si el KPI no está en el catálogo, ignorarlo

        const responsableId = kpiInfo.Responsable;
        const responsableNombre = userMap.get(responsableId) || 'Responsable no asignado';

        groupedData[result.KPI_ID] = {
          kpi_id: result.KPI_ID,
          kpi_name: kpiInfo.NombreKPI,
          kpi_type: kpiInfo.Tipo,
          kpi_owner: responsableNombre,
          is_financial: (kpiInfo.EsFinanciero === 'TRUE' || kpiInfo.EsFinanciero === 'SI'),
          kpi_frequency: kpiInfo.Frecuencia || 'mensual',
          kpi_aggregation: kpiInfo.MetodoAgregacion || 'SUMA',
          kpi_kr_id: kpiInfo.KR_ID, // <-- AÑADIMOS EL VÍNCULO AL KR
          // --- INICIO MODIFICACIÓN: Mapear Proceso ---
          // Asumimos que la columna se llama 'Proceso' en el Sheet
          kpi_process: kpiInfo.Proceso || 'General', 
          // --- FIN MODIFICACIÓN ---
          results: []
        };
      }
      groupedData[result.KPI_ID].results.push(result);
    }

    // 6. Procesar cada grupo de KPIs (LÓGICA DE AGREGACIÓN INTELIGENTE - SE MANTIENE)
    const processedKpis = Object.values(groupedData).map(kpiGroup => {
      
      const relevantResults = kpiGroup.results
        .filter(r => r.Frecuencia === kpiGroup.kpi_frequency)
        .map(r => {
           const metaNum = parseFloat(String(r.Meta).replace(/[^0-9.-]+/g, "")) || 0;
           const valorNum = parseFloat(String(r.Valor).replace(/[^0-9.-]+/g, "")) || 0;
           return { ...r, MetaNum: metaNum, ValorNum: valorNum };
        });

      if (relevantResults.length === 0) {
        return {
          ...kpiGroup, // Devolvemos los datos del grupo
          latestPeriod: { Periodo: 'N/A', Meta: 'N/A', Valor: 'N/A', MetaNum: 0, ValorNum: 0 },
          historicalData: [],
          annualProgress: { Meta: 0, Acumulado: 0 }
        };
      }

      const sortedResults = relevantResults.sort((a, b) => new Date(b.Periodo) - new Date(a.Periodo));
      const latestResult = sortedResults[0];

      let annualMeta = 0;
      let annualValor = 0;

      if (kpiGroup.kpi_frequency === 'anual') {
        annualMeta = latestResult.MetaNum;
        annualValor = latestResult.ValorNum;
      } else {
        switch (kpiGroup.kpi_aggregation) {
          case 'PROMEDIO':
            const sum = sortedResults.reduce((acc, r) => acc + r.ValorNum, 0);
            annualValor = sortedResults.length > 0 ? sum / sortedResults.length : 0;
            annualMeta = latestResult.MetaNum; 
            break;
          case 'ULTIMO_VALOR':
            annualValor = latestResult.ValorNum;
            annualMeta = latestResult.MetaNum;
            break;
          case 'SUMA':
          default:
            sortedResults.forEach(r => {
              annualMeta += r.MetaNum;
              annualValor += r.ValorNum;
            });
            break;
        }
      }

      // --- INICIO DE LA MODIFICACIÓN (Fase 1.1 - Promedio KPI) ---
      // Calcular el % de avance de este KPI individual
      let kpi_achievement = 0;
      if (annualMeta > 0) {
        // Asumimos que más es mejor. Si un KPI es inverso (ej. 'costos'),
        // la lógica de agregación en Google Sheets debería manejarlo (ej. 1 - (costo/meta)).
        kpi_achievement = (annualValor / annualMeta) * 100;
      } else if (annualValor > 0) {
        // Si no hay meta pero sí hay valor (ej. # de errores), contamos como 0%
        // (o 100% si es un KPI positivo sin meta)
        kpi_achievement = 100; // Asumimos 100% si la meta es 0 y hay valor
      }
      // --- FIN DE LA MODIFICACIÓN (Fase 1.1) ---

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
        kpi_kr_id: kpiGroup.kpi_kr_id, // <-- Pasamos el KR_ID
        // --- INICIO DE LA MODIFICACIÓN (Fase 1.2 - Promedio KPI) ---
        kpi_achievement: kpi_achievement, // <-- Pasamos el % de avance
        // --- FIN DE LA MODIFICACIÓN (Fase 1.2) ---
        // --- INICIO MODIFICACIÓN ---
            kpi_process: kpiGroup.kpi_process, // Pasamos el dato al frontend
            // --- FIN MODIFICACIÓN ---
        
        latestPeriod: {
          Periodo: latestResult.Periodo,
          Meta: latestResult.Meta,
          Valor: displayValor,
          MetaNum: latestResult.MetaNum,
          ValorNum: latestResult.ValorNum
        },
        historicalData: sortedResults.map(r => ({
          Periodo: r.Periodo,
          Valor: r.ValorNum
        })).reverse(), 
        annualProgress: {
          Meta: annualMeta,
          Acumulado: annualValor
        }
      };
    });

    // 7. CONSTRUCCIÓN DE JERARQUÍA (¡LÓGICA NUEVA!)
    // Anidamos la lista plana de KPIs (processedKpis) dentro de los KRs y Objetivos

    // --- INICIO DE LA MODIFICACIÓN (Fase 1.3 - Promedio KR y Objetivo) ---
    // Helper para promediar un array de números
    const calculateAverage = (arr) => {
      if (!arr || arr.length === 0) return 0;
      const sum = arr.reduce((acc, val) => acc + val, 0);
      return sum / arr.length;
    };

    // 7.1 Mapear KPIs dentro de sus KRs
    const krsWithKpis = allKRs.map(kr => {
      const childKpis = processedKpis.filter(kpi => kpi.kpi_kr_id === kr.KR_ID);

      // Calcular el promedio de este KR basado en sus KPIs hijos
      const kpiAchievements = childKpis.map(kpi => kpi.kpi_achievement);
      const krAverage = calculateAverage(kpiAchievements);

      return {
        KR_ID: kr.KR_ID,
        Nombre_KR: kr.Nombre_KR,
        Objective_ID: kr.Objective_ID,
        KR_Average: krAverage, // <-- NUEVO: Promedio del KR
        // Filtramos la lista de KPIs procesados para encontrar los que pertenecen a este KR
        KPIs: childKpis
      };
    }).filter(kr => kr.KPIs.length > 0); // Solo mostramos KRs que tengan KPIs visibles para el usuario

    // 7.2 Mapear KRs (con sus KPIs) dentro de sus Objetivos
    const finalHierarchicalData = allObjectives.map(obj => {
      const childKrs = krsWithKpis.filter(kr => kr.Objective_ID === obj.Objective_ID);

      // Calcular el promedio de este Objetivo basado en sus KRs hijos
      const krAverages = childKrs.map(kr => kr.KR_Average);
      const objectiveAverage = calculateAverage(krAverages);
      return {
        Objective_ID: obj.Objective_ID,
        Nombre_Objetivo: obj.Nombre_Objetivo,
        Color_Primario: obj.Color_Primario || '#475569', // Color por defecto
        Color_Secundario: obj.Color_Secundario || '#f1f5f9', // Color por defecto
        Objective_Average: objectiveAverage, // <-- NUEVO: Promedio del Objetivo
        // Filtramos la lista de KRs para encontrar los que pertenecen a este Objetivo
        ResultadosClave: childKrs
      };
    }).filter(obj => obj.ResultadosClave.length > 0); // Solo mostramos Objetivos que tengan KRs visibles

    // 8. Devolver la nueva estructura anidada
    return {
      statusCode: 200,
      body: JSON.stringify(finalHierarchicalData), // Devolvemos los datos jerárquicos
    };

  } catch (error) {
    console.error('Error in getData function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor al obtener datos.' }),
    };
  }
};
// --- FIN DE LA MODIFICACIÓN (Fase 1 - OKR) ---