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
  let url = `https://graph.facebook.com/v21.0/act_${accountId}/insights?fields=${fields.join(',')}&time_range=${timeRange}${levelParam}&access_token=${token}`;

  try {
    let allData = [];
    let pages = 0;
    // Segue a paginação da API (paging.next) — sem isso, contas com muitos
    // anúncios perdem linhas e o total por criativo fica menor que o real.
    while (url && pages < 20) {
      const res  = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return { statusCode: 502, body: JSON.stringify({ error: data.error.message }) };
      }

      allData = allData.concat(data.data || []);
      url = data.paging && data.paging.next ? data.paging.next : null;
      pages++;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: allData })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
