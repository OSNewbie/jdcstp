const $ = id => document.getElementById(id);

// ============================================================
// 工具：URL-safe base64 + UTF-8 安全解码
// ============================================================
function b64decode(str) {
  str = String(str).trim().replace(/\s+/g, '');
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  try { return decodeURIComponent(escape(bin)); } catch { return bin; }
}

// 全局错误提示
window.addEventListener('error', e => {
  const el = document.getElementById('status');
  if (el) el.textContent = '运行错误: ' + (e.message || e.error);
});
window.addEventListener('unhandledrejection', e => {
  const el = document.getElementById('status');
  if (el) el.textContent = 'Promise 错误: ' + (e.reason?.message || e.reason);
});

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
  'IE':'爱尔兰','FI':'芬兰','NO':'挪威','DK':'丹麦','PL':'波兰','PT':'葡萄牙',
  'MX':'墨西哥','AR':'阿根廷','CL':'智利','ZA':'南非','EG':'埃及','SA':'沙特',
  'IL':'以色列','NZ':'新西兰','AT':'奥地利','BE':'比利时','CZ':'捷克',
};

const CITY_MAP = {
  'Hong Kong':'香港','Milan':'米兰','Frankfurt':'法兰克福','Ashburn':'阿什本',
  'Tokyo':'东京','Singapore':'新加坡','Taipei':'台北','Amsterdam':'阿姆斯特丹',
  'London':'伦敦','San Jose':'圣何塞','Seoul':'首尔','Los Angeles':'洛杉矶',
  'New York':'纽约','Sydney':'悉尼','Mumbai':'孟买','Paris':'巴黎',
  'Madrid':'马德里','Berlin':'柏林','Moscow':'莫斯科','Toronto':'多伦多',
  'Dubai':'迪拜','Bangkok':'曼谷','Hanoi':'河内','Jakarta':'雅加达',
  'Manila':'马尼拉','Kuala Lumpur':'吉隆坡','Chicago':'芝加哥','Dallas':'达拉斯',
  'Seattle':'西雅图','Miami':'迈阿密','Atlanta':'亚特兰大','Denver':'丹佛',
  'Phoenix':'凤凰城','Portland':'波特兰','Vancouver':'温哥华','Montreal':'蒙特利尔',
  'Sao Paulo':'圣保罗','Buenos Aires':'布宜诺斯艾利斯','Santiago':'圣地亚哥',
  'Johannesburg':'约翰内斯堡','Cairo':'开罗','Istanbul':'伊斯坦布尔',
  'Tel Aviv':'特拉维夫','Riyadh':'利雅得','Osaka':'大阪','Nagoya':'名古屋',
  'Busan':'釜山','Kyoto':'京都','Fukuoka':'福冈','Zurich':'苏黎世',
  'Geneva':'日内瓦','Stockholm':'斯德哥尔摩','Oslo':'奥斯陆',
  'Copenhagen':'哥本哈根','Helsinki':'赫尔辛基','Dublin':'都柏林',
  'Brussels':'布鲁塞尔','Vienna':'维也纳','Prague':'布拉格','Warsaw':'华沙',
  'Lisbon':'里斯本','Barcelona':'巴塞罗那','Rome':'罗马','Munich':'慕尼黑',
};

const ORG_MAP = {
  'Amazon.com, Inc.':'亚马逊','Amazon.com':'亚马逊','Amazon Data Services':'亚马逊云',
  'Amazon Web Services':'亚马逊云','Amazon':'亚马逊','AWS':'亚马逊云',
  'Google LLC':'谷歌','Google Cloud':'谷歌云','Google':'谷歌',
  'Microsoft Corporation':'微软','Microsoft':'微软','Microsoft Azure':'微软云',
  'Oracle Corporation':'甲骨文','Oracle Cloud':'甲骨文云','Oracle':'甲骨文',
  'Cloudflare, Inc.':'Cloudflare','Cloudflare':'Cloudflare',
  'DigitalOcean, LLC':'DigitalOcean','DigitalOcean':'DigitalOcean',
  'Linode, LLC':'Linode','Linode':'Linode','Akamai':'Akamai',
  'Vultr Holdings, LLC':'Vultr','Vultr':'Vultr',
  'Hetzner Online GmbH':'Hetzner','Hetzner':'Hetzner',
  'OVH SAS':'OVH','OVH':'OVH',
  'Alibaba (US) Technology Co., Ltd.':'阿里云',
  'Alibaba.com Singapore E-Commerce Private Limited':'阿里云',
  'Tencent Cloud':'腾讯云','Huawei Cloud':'华为云','Baidu':'百度云',
  'Chunghwa Telecom Co. Ltd.':'中华电信',
  'Hong Kong Telecommunications (HKT) Limited':'香港电讯',
  'Netvigator':'网上行','Facebook':'Facebook','Netflix':'Netflix',
};

// ============================================================
// 1. 解析订阅内容
// ============================================================
function parseSubscription(text) {
  text = text.trim();
  if (!text) return [];

  if (/^proxies\s*:/m.test(text) || /^Proxy\s*:/m.test(text) || /^proxy-groups\s*:/m.test(text)) {
    return parseClashYaml(text);
  }

  let decoded = text;
  if (!/^(vmess|vless|ss|trojan|hysteria2?|tuic|socks|http):\/\//im.test(text)) {
    try { decoded = b64decode(text); } catch { decoded = text; }
  }

  if (/^proxies\s*:/m.test(decoded) || /^Proxy\s*:/m.test(decoded)) {
    return parseClashYaml(decoded);
  }

  const nodes = [];
  for (const line of decoded.split(/\r?\n/)) {
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
    if (scheme === 'vmess') return parseVmess(uri);

    const rest = uri.slice(scheme.length + 3);
    const hashIdx = rest.lastIndexOf('#');
    const name = hashIdx >= 0 ? decodeURIComponent(rest.slice(hashIdx + 1)) : '';
    const main = hashIdx >= 0 ? rest.slice(0, hashIdx) : rest;

    const qIdx = main.indexOf('?');
    const beforeQuery = qIdx >= 0 ? main.slice(0, qIdx) : main;

    const atIdx = beforeQuery.lastIndexOf('@');
    const hostPort = atIdx >= 0 ? beforeQuery.slice(atIdx + 1) : beforeQuery;

    let host = '', port = '';
    if (hostPort.startsWith('[')) {
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
      port: String(port),
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
    const json = JSON.parse(b64decode(uri.slice('vmess://'.length)));
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
// 5. DNS 解析（多 DoH 端点）
// ============================================================
const DOH_ENDPOINTS = [
  'https://cloudflare-dns.com/dns-query',
  'https://dns.google/resolve',
  'https://1.1.1.1/dns-query',
];

async function resolveIP(host) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return host;
  if (host.includes(':')) return host;
  for (const url of DOH_ENDPOINTS) {
    try {
      const res = await fetch(
        `${url}?name=${encodeURIComponent(host)}&type=A`,
        { headers: { accept: 'application/dns-json' } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const a = (data.Answer || []).find(x => x.type === 1);
      if (a && a.data) return a.data;
    } catch {}
  }
  return '';
}

// ============================================================
// 6. GeoIP 查询
// ============================================================
const GEO_APIS = [
  {
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
  const raw = (org || '').trim();
  if (ORG_MAP[raw]) return ORG_MAP[raw];

  let s = raw;
  s = s.replace(/Amazon\.com,? Inc\.?/gi, '亚马逊');
  s = s.replace(/Amazon\.com/gi, '亚马逊');
  s = s.replace(/Amazon Data Services/gi, '亚马逊云');
  s = s.replace(/\bAWS\b/gi, '亚马逊云');
  s = s.replace(/Google LLC/gi, '谷歌');
  s = s.replace(/Google Cloud/gi, '谷歌云');
  s = s.replace(/Microsoft Corporation/gi, '微软');
  s = s.replace(/Oracle Corporation/gi, '甲骨文');
  s = s.replace(/Oracle Cloud/gi, '甲骨文云');
  s = s.replace(/Cloudflare,? Inc\.?/gi, 'Cloudflare');
  s = s.replace(/DigitalOcean,? LLC/gi, 'DigitalOcean');
  s = s.replace(/Linode,? LLC/gi, 'Linode');
  s = s.replace(/Vultr Holdings,? LLC/gi, 'Vultr');
  s = s.replace(/Hetzner Online GmbH/gi, 'Hetzner');
  s = s.replace(/OVH SAS/gi, 'OVH');
  s = s.replace(/Alibaba.*?Technology.*/gi, '阿里云');
  s = s.replace(/Tencent Cloud/gi, '腾讯云');
  s = s.replace(/Huawei Cloud/gi, '华为云');
  s = s.replace(/Chunghwa Telecom.*/gi, '中华电信');
  s = s.replace(/Hong Kong Telecommunications.*/gi, '香港电讯');
  s = s.replace(/Netvigator/gi, '网上行');
  return s || '未知';
}

function localizeRegion(code) {
  return REGION_MAP[code] || code || '未知';
}

function localizeCity(city, region) {
  if (CITY_MAP[city]) return CITY_MAP[city];
  if (CITY_MAP[region]) return CITY_MAP[region];
  if (city && /[\u4e00-\u9fa5]/.test(city)) return city;
  if (region && /[\u4e00-\u9fa5]/.test(region)) return region;

  let c = city || '';
  const pairs = [
    [/Hong Kong/gi,'香港'],[/Singapore/gi,'新加坡'],[/Tokyo/gi,'东京'],
    [/Seoul/gi,'首尔'],[/Taipei/gi,'台北'],[/London/gi,'伦敦'],
    [/Frankfurt/gi,'法兰克福'],[/Amsterdam/gi,'阿姆斯特丹'],[/Paris/gi,'巴黎'],
    [/Milan/gi,'米兰'],[/Madrid/gi,'马德里'],[/Berlin/gi,'柏林'],
    [/Moscow/gi,'莫斯科'],[/Toronto/gi,'多伦多'],[/Sydney/gi,'悉尼'],
    [/Mumbai/gi,'孟买'],[/Dubai/gi,'迪拜'],[/Bangkok/gi,'曼谷'],
    [/Hanoi/gi,'河内'],[/Jakarta/gi,'雅加达'],[/Manila/gi,'马尼拉'],
    [/Kuala Lumpur/gi,'吉隆坡'],
  ];
  for (const [re, zh] of pairs) c = c.replace(re, zh);
  return c || region || '未知';
}

// ============================================================
// 8. 分析节点
// ============================================================
async function analyzeNodes(nodes) {
  setStatus(`共 ${nodes.length} 个节点，正在解析 DNS...`);
  const ipMap = {};
  const uniqueServers = [...new Set(nodes.map(n => n.server).filter(Boolean))];

  for (let i = 0; i < uniqueServers.length; i++) {
    const host = uniqueServers[i];
    ipMap[host] = await resolveIP(host);
    setStatus(`DNS 解析 ${i + 1}/${uniqueServers.length}: ${host} → ${ipMap[host] || '失败'}`);
  }

  const uniqueIPs = [...new Set(Object.values(ipMap).filter(Boolean))];
  const geoMap = {};

  for (let i = 0; i < uniqueIPs.length; i++) {
    const ip = uniqueIPs[i];
    setStatus(`GeoIP 检测 ${i + 1}/${uniqueIPs.length}: ${ip}`);
    const geo = await queryGeoIP(ip);
    if (geo) geoMap[ip] = geo;
  }

  return nodes.map((n, idx) => {
    const ip = ipMap[n.server] || '';
    const geo = geoMap[ip] || {};
    const asn = geo.asn || '0';
    return {
      id: idx + 1,
      name: n.name,
      server: n.server,
      port: n.port,
      protocol: String(n.type || 'unknown').toLowerCase(),
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
}

// ============================================================
// 9. 渲染表格
// ============================================================
function renderTable(rows) {
  const tbody = document.querySelector('#resultTable tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</td>
      <td><span class="proto">${escapeHtml(r.protocol)}</span></td>
      <td>${escapeHtml(r.region)}</td>
      <td>${escapeHtml(r.asn)}</td>
      <td title="${escapeHtml(r.org)}">${escapeHtml(r.org)}</td>
      <td><span class="stack-${r.stack}">IPv${r.stack}</span></td>
      <td>${escapeHtml(r.ip)}</td>
      <td>${escapeHtml(r.detail)}</td>
    </tr>
  `).join('');
}

// ============================================================
// 10. 个人画像
// ============================================================
function renderProfile(rows) {
  const total = rows.length;
  const ipv4 = rows.filter(r => r.stack === 4).length;
  const ipv6 = rows.filter(r => r.stack === 6).length;

  const protocolCount = {};
  const regionCount = {};
  const orgCount = {};
  rows.forEach(r => {
    protocolCount[r.protocol] = (protocolCount[r.protocol] || 0) + 1;
    regionCount[r.region] = (regionCount[r.region] || 0) + 1;
    orgCount[r.org] = (orgCount[r.org] || 0) + 1;
  });

  const topOrg = Object.entries(orgCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const tags = [
    `节点总数: ${total}`,
    `IPv4: ${ipv4}`,
    `IPv6: ${ipv6}`,
    `协议种类: ${Object.keys(protocolCount).length}`,
    `地区数: ${Object.keys(regionCount).length}`,
    `组织数: ${Object.keys(orgCount).length}`,
    `主要组织: ${topOrg}`,
  ];
  $('profileTags').innerHTML = tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

  renderPie('protocolChart', protocolCount, '协议分布');
  renderBar('regionChart', regionCount, '地区分布');
  renderBar('orgChart', orgCount, '组织分布');
}

function renderPie(id, dataMap, title) {
  const el = $(id);
  if (!el) return;
  let chart = echarts.getInstanceByDom(el) || echarts.init(el);
  const data = Object.entries(dataMap).map(([name, value]) => ({ name, value }));
  chart.setOption({
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    series: [{ type: 'pie', radius: '60%', data, label: { formatter: '{b}: {c}' } }],
  }, true);
}

function renderBar(id, dataMap, title) {
  const el = $(id);
  if (!el) return;
  let chart = echarts.getInstanceByDom(el) || echarts.init(el);
  const entries = Object.entries(dataMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
  chart.setOption({
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: entries.map(x => x[0]), axisLabel: { fontSize: 10, rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: entries.map(x => x[1]), itemStyle: { color: '#3b82f6' } }],
  }, true);
}

// ============================================================
// 11. 拓扑图
// ============================================================
function renderTopo(rows) {
  const el = $('topoChart');
  if (!el) return;
  let chart = echarts.getInstanceByDom(el) || echarts.init(el);

  const groups = {};
  rows.forEach(r => {
    const key = r.org || '未知';
    (groups[key] = groups[key] || []).push(r);
  });

  const orgNames = Object.keys(groups);
  const categories = orgNames.map(name => ({ name }));
  const nodes = [];
  const links = [];

  orgNames.forEach((name, i) => {
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
    const orgIdx = orgNames.indexOf(r.org || '未知');
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
          return `<b>${r.name}</b><br/>协议: ${r.protocol}<br/>IP: ${r.ip}<br/>组织: ${r.org}<br/>ASN: ${r.asn}<br/>地区: ${r.region} / ${r.detail}<br/>栈: IPv${r.stack}`;
        }
        return p.name;
      },
    },
    legend: [{ data: orgNames, orient: 'vertical', left: 0, top: 20, textStyle: { fontSize: 12 } }],
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
  }, true);

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
// 12. 主流程
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
    renderProfile(results);
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
  $('profileTags').innerHTML = '';
  ['protocolChart','regionChart','orgChart','topoChart'].forEach(id => {
    const el = $(id);
    if (el) {
      const chart = echarts.getInstanceByDom(el);
      if (chart) chart.clear();
    }
  });
  setStatus('等待输入...');
};