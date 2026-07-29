exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token     = process.env.META_ADS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !accountId) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Meta Ads não configurado no servidor.' }) };
  }

  let since, until, level;
  try {
    ({ since, until, level } = JSON.parse(event.body || '{}'));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido.' }) };
  }
  if (!since || !until) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Parâmetros since/until obrigatórios (YYYY-MM-DD).' }) };
  }

  const baseFields = ['spend', 'impressions', 'clicks', 'cpc', 'cpm', 'ctr', 'actions', 'action_values'];
  const fields = level === 'ad' ? ['ad_id', 'ad_name', ...baseFields] : baseFields;
  const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
  const levelParam = level === 'ad' ? '&level=ad&limit=500' : '';
  const url = `https://graph.facebook.com/v21.0/act_${accountId}/insights?fields=${fields.join(',')}&time_range=${timeRange}${levelParam}&access_token=${token}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return { statusCode: 502, body: JSON.stringify({ error: data.error.message }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
