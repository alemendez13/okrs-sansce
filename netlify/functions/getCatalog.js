// netlify/functions/getCatalog.js

const { google } = require('googleapis');

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

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'CatalogoKPIs!A:F', // Lee todas las columnas de la hoja CatalogoKPIs
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