const $ = id => document.getElementById(id);

// ============================================================
// 中文映射表
// ============================================================
const ASN_MAP = {
  'AS16509':'亚马逊','AS31898':'甲骨文','AS4760':'香港电讯','AS3462':'中华电信',
  'AS4134':'中国电信','AS4837':'中国联通','AS9808':'中国移动','AS15169':'谷歌',
  'AS13335':'Cloudflare','AS8075':'微软','AS20940':'Akamai','AS32934':'Facebook',
  'AS2906':'Netflix','AS63949':'Linode','AS14061':'DigitalOcean','AS20473':'Vultr',
  'AS24940':'Hetzner','AS16276':'OVH','AS37963':'阿里云','AS45090':'腾讯云',
  'AS55990':'华为云','AS58519':'百度云','AS38365':'百度云',
};

const REGION_MAP = {
  'HK':'香港','IT':'意大利','FR':'法国','DE':'德国','US':'美国','JP':'日本',
  'SG':'新加坡','TW':'台湾','NL':'荷兰','GB':'英国','CN':'中国','KR':'韩国',
  'CA':'加拿大','AU':'澳大利亚','RU':'俄罗斯','IN':'印度','BR':'巴西',
  'ES':'西班牙','SE':'瑞典','CH':'瑞士','AE':'阿联酋','TR':'土耳其',
  'VN':'越南','TH':'泰国','MY':'马来西亚','ID':'印尼','PH':'菲律宾',
};

const CITY_MAP = {
  'Hong Kong':'香港','Milan':'米兰','Frankfurt':'法兰克福','Ashburn':'阿什本',
  'Tokyo':'东京','Singapore':'新加坡','Taipei':'台北','Amsterdam':'阿姆斯特丹',
  'London':'伦敦','San Jose':'圣何塞','Seoul':'首尔','Los Angeles':'洛杉矶',
  'New York':'纽约','Sydney':'悉尼','Mumbai':'孟买','Paris':'巴黎',
  'Madrid':'马德里','Berlin':'柏林','Moscow':'莫斯科','Toronto':'多伦多',
  'Dubai':'迪拜','Bangkok':'曼谷','Hanoi':'河内','Jakarta':'雅加达',
  'Manila':'马尼拉','Kuala Lumpur':'吉隆坡',
};

// ============================================================
// 1. 解析订阅内容（Base64 / Clash YAML / 纯链接列表）
// ============================================================
function parseSubscription(text) {
  text = text.trim();
  if (!text) return [];

  // 1.1 尝试识别 Clash YAML
  if (/^proxies\s*:/m.test(text) || /^Proxy\s*:/m.test(text)) {
    return parseClashYaml(text);
  }

  // 1.2 尝试 Base64 解码
  let decoded = text;
  if (!/^(vmess|vless|ss|trojan|hysteria2?|tuic|socks|http):\/\//im.test(text)) {
    try {
      const b64 = text.replace(/\s+/g, '');
      decoded = atob(b64);
      // 处理 UTF-8
      try {
        decoded = decodeURIComponent(escape(decoded));
      } catch {}
    } catch {
      // 不是 Base64，继续按纯文本处理
      decoded = text;
    }
  }

  // 1.3 逐行解析 URI
  const nodes = [];
  const lines = decoded.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const node = parseUri(t);
    if (node) nodes.push(node);
  }
  return nodes;
}

// ============================================================
// 2. 解析单个 URI
// ============================================================
function parseUri(uri) {
  try {
    const scheme = (uri.match(/^([a-z0-9+]+):\/\//i) || [])[1]?.toLowerCase();
    if (!scheme) return null;

    // vmess:// 是 base64(json)
    if (scheme === 'vmess') {
      return parseVmess(uri);
    }

    // 其他都是 scheme://userinfo@host:port?query#name
    const rest = uri.slice(scheme.length + 3);
    const hashIdx = rest.lastIndexOf('#');
    const name = hashIdx >= 0 ? decodeURIComponent(rest.slice(hashIdx + 1)) : '';
    const main = hashIdx >= 0 ? rest.slice(0, hashIdx) : rest;

    // 去掉 query
    const qIdx = main.indexOf('?');
    const beforeQuery = qIdx >= 0 ? main.slice(0, qIdx) : main;

    // 去掉 userinfo
    const atIdx = beforeQuery.lastIndexOf('@');
    const hostPort = atIdx >= 0 ? beforeQuery.slice(atIdx + 1) : beforeQuery;

    // 分离 host 和 port
    let host = '', port = '';
    if (hostPort.startsWith('[')) {
      // IPv6
      const closeIdx = hostPort.indexOf(']');
      host = hostPort.slice(1, closeIdx);
      port = hostPort.slice(closeIdx + 2);
    } else {
      const colonIdx = hostPort.lastIndexOf(':');
      if (colonIdx >= 0) {
        host = hostPort.slice(0, colonIdx);
        port = hostPort.slice(colonIdx + 1);
      } else {
        host = hostPort;
      }
    }

    return {
      name: name || `${host}:${port}`,
      server: host,
      port: port,
      type: scheme,
    };
  } catch {
    return null;
  }
}

// ============================================================
// 3. 解析 vmess://
// ============================================================
function parseVmess(uri) {
  try {
    const b64 = uri.slice('vmess://'.length);
    const json = JSON.parse(atob(b64));
    return {
      name: json.ps || json.remarks || `${json.add}:${json.port}`,
      server: json.add || json.host,
      port: String(json.port || ''),
      type: 'vmess',
    };
  } catch {
    return null;
  }
}

// ============================================================
// 4. 解析 Clash YAML 的 proxies 段
// ============================================================
function parseClashYaml(text) {
  const proxies = [];
  const lines = text.split('\n');
  let inProxies = false;
  let current = null;

  const flush = () => {
    if (current && current.server) proxies.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\r/g, '');
    if (/^proxies\s*:/.test(line)) { inProxies = true; continue; }
    if (!inProxies) continue;
    if (/^\S/.test(line) && !/^\s/.test(line) && !/^proxies/.test(line)) {
      flush(); inProxies = false; continue;
    }
    const item = line.match(/^\s*-\s*(.*)$/);
    if (item) {
      flush();
      current = {};
      const kv = item[1].match(/([\w-]+)\s*:\s*(.+)/);
      if (kv) current[kv[1]] = stripQuote(kv[2]);
      continue;
    }
    const sub = line.match(/^\s+([\w-]+)\s*:\s*(.+)$/);
    if (sub && current) current[sub[1]] = stripQuote(sub[2]);
  }
  flush();

  return proxies
    .filter(p => p.server)
    .map(p => ({
      name: p.name || `${p.server}:${p.port}`,
      server: p.server,
      port: String(p.port || ''),
      type: p.type || 'unknown',
    }));
}

function stripQuote(s) {
  return s.trim().replace(/^["']|["']$/g, '');
}

// ============================================================
// 5. DNS 解析（Cloudflare DoH，支持 CORS）
// ============================================================
async function resolveIP(host) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  if (host.includes(':')) return host; // IPv6

  try {
    const res = await fetch(
      `https://1.1.1.1/dns-query?name=${encodeURIComponent(host)}&type=A`,
      { headers: { accept: 'application/dns-json' } }
    );
    const data = await res.json();
    const a = (data.Answer || []).find(x => x.type === 1);
    return a ? a.data : '';
  } catch {
    return '';
  }
}

// ============================================================
// 6. GeoIP 查询（多源 fallback，都支持 CORS）
// ============================================================
const GEO_APIS = [
  {
    name: 'ipwho.is',
    url: ip => `https://ipwho.is/${ip}`,
    parse: (d, ip) => ({
      ip: d.ip || ip,
      asn: d.connection?.asn || '',
      org: d.connection?.isp || d.connection?.org || '',
      country_code: d.country_code || '',
      region: d.region || '',
      city: d.city || '',
      lat: d.latitude || 0,
      lon: d.longitude || 0,
    }),
  },
  {
    name: 'ipapi.co',
    url: ip => `https://ipapi.co/${ip}/json/`,
    parse: (d, ip) => ({
      ip: d.ip || ip,
      asn: String(d.asn || '').replace('AS', ''),
      org: d.org || '',
      country_code: d.country_code || '',
      region: d.region || '',
      city: d.city || '',
      lat: d.latitude || 0,
      lon: d.longitude || 0,
    }),
  },
  {
    name: 'ip.sb',
    url: ip => `https://api.ip.sb/geoip/${ip}`,
    parse: (d, ip) => ({
      ip: d.ip || ip,
      asn: d.asn || '',
      org: d.isp || d.organization || '',
      country_code: d.country_code || '',
      region: d.region || '',
      city: d.city || '',
      lat: d.latitude || 0,
      lon: d.longitude || 0,
    }),
  },
];

async function queryGeoIP(ip) {
  for (const api of GEO_APIS) {
    try {
      const res = await fetch(api.url(ip));
      if (!res.ok) continue;
      const data = await res.json();
      const parsed = api.parse(data, ip);
      if (parsed.country_code) return parsed;
    } catch {}
  }
  return null;
}

// ============================================================
// 7. 中文本地化
// ============================================================
function localizeOrg(asn, org) {
  const key = `AS${String(asn).replace(/^AS/i, '')}`;
  if (ASN_MAP[key]) return ASN_MAP[key];
  return (org || '未知')
    .replace('Hong Kong Telecommunications (HKT) Limited', '香港电讯')
    .replace('Chunghwa Telecom Co. Ltd.', '中华电信')
    .replace('Amazon.com, Inc.', '亚马逊')
    .replace('Amazon.com', '亚马逊')
    .replace('Oracle Corporation', '甲骨文')
    .replace('Oracle Cloud', '甲骨文云')
    .replace('AWS EC2', '亚马逊云')
    .replace('Netvigator', '网上行')
    .replace('Google LLC', '谷歌')
    .replace('Microsoft Corporation', '微软');
}

function localizeRegion(code) {
  return REGION_MAP[code] || code || '未知';
}

function localizeCity(city, region) {
  if (CITY_MAP[city]) return CITY_MAP[city];
  if (CITY_MAP[region]) return CITY_MAP[region];
  if (city && /[\u4e00-\u9fa5]/.test(city)) return city;
  if (region && /[\u4e00-\u9fa5]/.test(region)) return region;
  return city || region || '未知';
}

// ============================================================
// 8. 分析节点（DNS + GeoIP）
// ============================================================
async function analyzeNodes(nodes) {
  // 8.1 解析 IP（按 server 去重）
  setStatus(`共 ${nodes.length} 个节点，正在解析 DNS...`);
  const ipMap = {};
  const uniqueServers = [...new Set(nodes.map(n => n.server).filter(Boolean))];

  for (let i = 0; i < uniqueServers.length; i++) {
    const host = uniqueServers[i];
    ipMap[host] = await resolveIP(host);
    setStatus(`DNS 解析 ${i + 1}/${uniqueServers.length}: ${host} → ${ipMap[host] || '失败'}`);
  }

  // 8.2 GeoIP 查询（按 IP 去重）
  const uniqueIPs = [...new Set(Object.values(ipMap).filter(Boolean))];
  const geoMap = {};

  for (let i = 0; i < uniqueIPs.length; i++) {
    const ip = uniqueIPs[i];
    setStatus(`GeoIP 检测 ${i + 1}/${uniqueIPs.length}: ${ip}`);
    const geo = await queryGeoIP(ip);
    if (geo) geoMap[ip] = geo;
  }

  // 8.3 组装结果
  const results = nodes.map((n, idx) => {
    const ip = ipMap[n.server] || '';
    const geo = geoMap[ip] || {};
    const asn = geo.asn || '0';
    return {
      id: idx + 1,
      name: n.name,
      server: n.server,
      port: n.port,
      type: n.type,
      ip: ip || '-',
      region: localizeRegion(geo.country_code),
      country_code: geo.country_code || '',
      asn: 'AS' + asn,
      org: localizeOrg(asn, geo.org),
      detail: localizeCity(geo.city, geo.region),
      stack: ip.includes(':') ? 6 : 4,
      lat: geo.lat || 0,
      lon: geo.lon || 0,
    };
  });

  return results;
}

// ============================================================
// 9. 渲染
// ============================================================
function renderTable(rows) {
  const tbody = document.querySelector('#resultTable tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${r.region}</td>
      <td>${r.asn}</td>
      <td>${escapeHtml(r.org)}</td>
      <td><span class="stack-${r.stack}">IPv${r.stack}</span></td>
      <td>${r.ip}</td>
      <td>${r.detail}</td>
    </tr>
  `).join('');
}

function renderTopo(rows) {
  const el = $('topoChart');
  const chart = echarts.init(el);

  // 按组织聚类
  const groups = {};
  rows.forEach(r => {
    const key = r.org || '未知';
    (groups[key] = groups[key] || []).push(r);
  });

  const categories = Object.keys(groups).map(name => ({ name }));
  const nodes = [];
  const links = [];

  Object.keys(groups).forEach((name, i) => {
    nodes.push({
      id: `org-${i}`,
      name,
      category: i,
      symbolSize: 44,
      itemStyle: { color: palette(i) },
      label: { show: true, formatter: name, fontSize: 13, fontWeight: 'bold' },
    });
  });

  rows.forEach((r, idx) => {
    const orgIdx = Object.keys(groups).indexOf(r.org || '未知');
    const ipId = `ip-${idx}`;
    nodes.push({
      id: ipId,
      name: r.ip,
      category: orgIdx,
      symbolSize: 14,
      itemStyle: { color: palette(orgIdx) },
      label: { show: true, formatter: r.detail, fontSize: 10, position: 'right' },
      value: r,
    });
    links.push({ source: `org-${orgIdx}`, target: ipId });
  });

  chart.setOption({
    tooltip: {
      formatter: p => {
        if (p.dataType === 'node' && p.data.value) {
          const r = p.data.value;
          return `<b>${r.name}</b><br/>IP: ${r.ip}<br/>组织: ${r.org}<br/>ASN: ${r.asn}<br/>地区: ${r.region} / ${r.detail}<br/>栈: IPv${r.stack}`;
        }
        return p.name;
      },
    },
    legend: [{ data: categories.map(c => c.name), orient: 'vertical', left: 0, top: 20, textStyle: { fontSize: 12 } }],
    series: [{
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      categories,
      data: nodes,
      links,
      force: { repulsion: 400, edgeLength: [90, 170], gravity: 0.05 },
      lineStyle: { color: 'source', curveness: 0.2, opacity: 0.5 },
      emphasis: { focus: 'adjacency' },
    }],
  });

  window.addEventListener('resize', () => chart.resize());
}

function palette(i) {
  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#06b6d4','#a855f7'];
  return colors[i % colors.length];
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function setStatus(msg) {
  $('status').textContent = msg;
}

// ============================================================
// 10. 事件
// ============================================================
async function runWithNodes(nodes) {
  if (!nodes.length) {
    setStatus('没有解析到任何节点');
    return;
  }
  try {
    const results = await analyzeNodes(nodes);
    renderTable(results);
    renderTopo(results);
    setStatus(`检测完成，共 ${results.length} 个节点`);
  } catch (e) {
    setStatus('检测失败: ' + e.message);
  }
}

$('loadUrl').onclick = async () => {
  const url = $('subUrl').value.trim();
  if (!url) return setStatus('请输入订阅 URL');
  setStatus('拉取订阅中...');
  try {
    const res = await fetch(url);
    const text = await res.text();
    const nodes = parseSubscription(text);
    await runWithNodes(nodes);
  } catch (e) {
    setStatus('拉取失败（可能是 CORS）: ' + e.message + '，请改用粘贴方式');
  }
};

$('loadText').onclick = async () => {
  const text = $('subText').value.trim();
  if (!text) return setStatus('请粘贴订阅内容');
  setStatus('解析中...');
  const nodes = parseSubscription(text);
  await runWithNodes(nodes);
};

$('clearBtn').onclick = () => {
  $('subText').value = '';
  $('subUrl').value = '';
  document.querySelector('#resultTable tbody').innerHTML = '';
  setStatus('等待输入...');
};