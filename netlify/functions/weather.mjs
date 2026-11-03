import { SignJWT, importPKCS8 } from 'jose';

const API_HOST = process.env.QWEATHER_API_HOST;
const KID = process.env.QWEATHER_KID;
const SUB = process.env.QWEATHER_SUB;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// 兼容环境变量里以 \n 转义形式保存的 PEM
const rawKey = process.env.QWEATHER_PRIVATE_KEY || '';
const PRIVATE_KEY_PEM = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;

let cachedToken = null;
let tokenExp = 0;

async function getJWT() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExp - 60) return cachedToken;

  const key = await importPKCS8(PRIVATE_KEY_PEM, 'EdDSA');
  const token = await new SignJWT({ sub: SUB })
    .setProtectedHeader({ alg: 'EdDSA', kid: KID })
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);

  cachedToken = token;
  tokenExp = now + 300;
  return token;
}

export async function handler(event) {
  const cors = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const params = event.queryStringParameters || {};
  const path = params.path;

  if (!path || !/^\/(v7|airquality|geo)\//.test(path)) {
    return {
      statusCode: 403,
      headers: cors,
      body: JSON.stringify({ error: 'path not allowed' }),
    };
  }

  const target = new URL(`https://${API_HOST}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'path') target.searchParams.set(k, v);
  }

  try {
    const token = await getJWT();
    const upstream = await fetch(target.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await upstream.text();

    return {
      statusCode: upstream.status,
      headers: {
        ...cors,
        'Cache-Control': 'public, max-age=60, s-maxage=120',
      },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: cors,
      body: JSON.stringify({ error: 'upstream failed', detail: e.message }),
    };
  }
}