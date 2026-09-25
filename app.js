// VERSION: 2024-BGP
const $ = id => document.getElementById(id);

/* ========== 工具 ========== */
function b64decode(str) {
  str = String(str).trim().replace(/\s+/g, '');
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  try { return decodeURIComponent(escape(bin)); } catch { return bin; }
}

window.addEventListener('error', e => {
  const el = $('status'); if (el) el.textContent = '运行错误: ' + (e.message || e.error);
});
window.addEventListener('unhandledrejection', e => {
  const el = $('status'); if (el) el.textContent = 'Promise 错误: ' + (e.reason?.message || e.reason);
});

/* ========== 中文映射表 ========== */
const ASN_MAP = {
  'AS16509':'亚马逊','AS31898':'甲骨文','AS4760':'香港电讯','AS3462':'中华电信',
  'AS4134':'中国电信','AS4837':'中国联通','AS9808':'中国移动','AS15169':'谷歌',
  'AS13335':'Cloudflare','AS8075':'微软','AS20940':'Akamai','AS32934':'Facebook',
  'AS2906':'Netflix','AS63949':'Linode','AS14061':'DigitalOcean','AS20473':'Vultr',
  'AS24940':'Hetzner','AS16276':'OVH','AS37963':'阿里云','AS45090':'腾讯云',
  'AS55990':'华为云','AS58519':'百度云','AS38365':'百度云',
  'AS3491':'PCCW','AS12956':'Telxius','AS7018':'AT&T','AS6830':'Liberty',
  'AS6762':'Sparkle','AS6461':'Zayo','AS6453':'TATA','AS5511':'Orange',
  'AS3356':'Lumen','AS3320':'DTAG','AS3257':'GTT','AS2914':'NTT',
  'AS1299':'Arelion','AS701':'Verizon','AS174':'Cogent','AS6939':'Hurricane',
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
  'Osaka':'大阪','Nagoya':'名古屋','Zurich':'苏黎世','Geneva':'日内瓦',
  'Stockholm':'斯德哥尔摩','Oslo':'奥斯陆','Copenhagen':'哥本哈根',
  'Helsinki':'赫尔辛基','Dublin':'都柏林','Brussels':'布鲁塞尔',
  'Vienna':'维也纳','Prague':'布拉格','Warsaw':'华沙','Lisbon':'里斯本',
  'Barcelona':'巴塞罗那','Rome':'罗马','Munich':'慕尼黑',
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
  'Tencent Cloud':'腾讯云','Huawei Cloud':'华为云','Baidu':'百度云',
  'Chunghwa Telecom Co. Ltd.':'中华电信',
  'Hong Kong Telecommunications (HKT) Limited':'香港电讯',
  'Netvigator':'网上行','Facebook':'Facebook','Netflix':'Netflix',
  'PCCW Limited':'PCCW','PCCW Global':'PCCW',
};

/* ========== 1. 订阅解析 ========== */
function parseSubscription(text) {
  text = text.trim(); if (!text) return [];
  if (/^proxies\s*:/m.test(text) || /^Proxy\s*:/m.test(text) || /^proxy-groups\s*:/m.test(text))
    return parseClashYaml(text);
  let decoded = text;
  if (!/^(vmess|vless|ss|trojan|hysteria2?|tuic|socks|http):\/\//im.test(text)) {
    try { decoded = b64decode(text); } catch { decoded = text; }
  }
  if (/^proxies\s*:/m.test(decoded) || /^Proxy\s*:/m.test(decoded))
    return parseClashYaml(decoded);
  const nodes = [];
  for (const line of decoded.split(/\r?\n/)) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    const node = parseUri(t); if (node) nodes.push(node);
  }
  return nodes;
}

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
      const ci = hostPort.indexOf(']');
      host = hostPort.slice(1, ci); port = hostPort.slice(ci + 2);
    } else {
      const ci = hostPort.lastIndexOf(':');
      if (ci >= 0) { host = hostPort.slice(0, ci); port = hostPort.slice(ci + 1); }
      else host = hostPort;
    }
    return { name: name || `${host}:${port}`, server: host, port: String(port), type: scheme };
  } catch { return null; }
}

function parseVmess(uri) {
  try {
    const json = JSON.parse(b64decode(uri.slice('vmess://'.length)));
    return {
      name: json.ps || json.remarks || `${json.add}:${json.port}`,
      server: json.add || json.host, port: String(json.port || ''), type: 'vmess',
    };
  } catch { return null; }
}

function parseClashYaml(text) {
  const proxies = [];
  let inProxies = false, current = null;
  const flush = () => { if (current && current.server) proxies.push(current); current = null; };
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r/g, '');
    if (/^proxies\s*:/.test(line)) { inProxies = true; continue; }
    if (!inProxies) continue;
    if (/^\S/.test(line) && !/^\s/.test(line) && !/^proxies/.test(line)) { flush(); inProxies = false; continue; }
    const item = line.match(/^\s*-\s*(.*)$/);
    if (item) {
      flush(); current = {};
      const kv = item[1].match(/([\w-]+)\s*:\s*(.+)/);
      if (kv) current[kv[1]] = stripQuote(kv[2]);
      continue;
    }
    const sub = line.match(/^\s+([\w-]+)\s*:\s*(.+)$/);
    if (sub && current) current[sub[1]] = stripQuote(sub[2]);
  }
  flush();
  return proxies.filter(p => p.server).map(p => ({
    name: p.name || `${p.server}:${p.port}`,
    server: p.server, port: String(p.port || ''), type: p.type || 'unknown',
  }));
}
const stripQuote = s => s.trim().replace(/^["']|["']$/g, '');

/* ========== 2. DNS ========== */
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
      const res = await fetch(`${url}?name=${encodeURIComponent(host)}&type=A`,
        { headers: { accept: 'application/dns-json' } });
      if (!res.ok) continue;
      const data = await res.json();
      const a = (data.Answer || []).find(x => x.type === 1);
      if (a && a.data) return a.data;
    } catch {}
  }
  return '';
}

/* ========== 3. GeoIP ========== */
const GEO_APIS = [
  { url: ip => `https://ipwho.is/${ip}`, parse: (d, ip) => ({
      ip: d.ip || ip, asn: d.connection?.asn || '',
      org: d.connection?.isp || d.connection?.org || '',
      country_code: d.country_code || '', region: d.region || '',
      city: d.city || '', lat: d.latitude || 0, lon: d.longitude || 0 }) },
  { url: ip => `https://ipapi.co/${ip}/json/`, parse: (d, ip) => ({
      ip: d.ip || ip, asn: String(d.asn || '').replace('AS', ''), org: d.org || '',
      country_code: d.country_code || '', region: d.region || '',
      city: d.city || '', lat: d.latitude || 0, lon: d.longitude || 0 }) },
  { url: ip => `https://api.ip.sb/geoip/${ip}`, parse: (d, ip) => ({
      ip: d.ip || ip, asn: d.asn || '', org: d.isp || d.organization || '',
      country_code: d.country_code || '', region: d.region || '',
      city: d.city || '', lat: d.latitude || 0, lon: d.longitude || 0 }) },
];
async function queryGeoIP(ip) {
  for (const api of GEO_APIS) {
    try {
      const res = await fetch(api.url(ip)); if (!res.ok) continue;
      const data = await res.json(); const parsed = api.parse(data, ip);
      if (parsed.country_code) return parsed;
    } catch {}
  }
  return null;
}

/* ========== 4. 中文本地化 ========== */
function localizeOrg(asn, org) {
  const key = `AS${String(asn).replace(/^AS/i, '')}`;
  if (ASN_MAP[key]) return ASN_MAP[key];
  const raw = (org || '').trim();
  if (ORG_MAP[raw]) return ORG_MAP[raw];
  let s = raw;
  const rules = [
    [/Amazon\.com,? Inc\.?/gi, '亚马逊'],[/Amazon\.com/gi, '亚马逊'],
    [/Amazon Data Services/gi, '亚马逊云'],[/\bAWS\b/gi, '亚马逊云'],
    [/Google LLC/gi, '谷歌'],[/Google Cloud/gi, '谷歌云'],
    [/Microsoft Corporation/gi, '微软'],[/Oracle Corporation/gi, '甲骨文'],
    [/Oracle Cloud/gi, '甲骨文云'],[/Cloudflare,? Inc\.?/gi, 'Cloudflare'],
    [/DigitalOcean,? LLC/gi, 'DigitalOcean'],[/Linode,? LLC/gi, 'Linode'],
    [/Vultr Holdings,? LLC/gi, 'Vultr'],[/Hetzner Online GmbH/gi, 'Hetzner'],
    [/OVH SAS/gi, 'OVH'],[/Alibaba.*?Technology.*/gi, '阿里云'],
    [/Tencent Cloud/gi, '腾讯云'],[/Huawei Cloud/gi, '华为云'],
    [/Chunghwa Telecom.*/gi, '中华电信'],
    [/Hong Kong Telecommunications.*/gi, '香港电讯'],[/Netvigator/gi, '网上行'],
  ];
  for (const [re, zh] of rules) s = s.replace(re, zh);
  return s || '未知';
}
const localizeRegion = code => REGION_MAP[code] || code || '未知';
function localizeCity(city, region) {
  if (CITY_MAP[city]) return CITY_MAP[city];
  if (CITY_MAP[region]) return CITY_MAP[region];
  if (city && /[\u4e00-\u9fa5]/.test(city)) return city;
  if (region && /[\u4e00-\u9fa5]/.test(region)) return region;
  return city || region || '未知';
}

/* ========== 5. 节点分析 ========== */
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
      id: idx + 1, name: n.name, server: n.server, port: n.port,
      protocol: String(n.type || 'unknown').toLowerCase(),
      ip: ip || '-', region: localizeRegion(geo.country_code),
      country_code: geo.country_code || '', asn: 'AS' + asn,
      org: localizeOrg(asn, geo.org), operator: geo.org || '',
      detail: localizeCity(geo.city, geo.region),
      stack: ip.includes(':') ? 6 : 4, lat: geo.lat || 0, lon: geo.lon || 0,
    };
  });
}

/* ========== 6. 表格 ========== */
function renderTable(rows) {
  const tbody = document.querySelector('#resultTable tbody');
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</td>
      <td><span class="proto">${escapeHtml(r.protocol)}</span></td>
      <td>${escapeHtml(r.region)}</td>
      <td>${escapeHtml(r.asn)}</td>
      <td title="${escapeHtml(r.operator || r.org)}">${escapeHtml(r.org)}</td>
      <td><span class="stack-${r.stack}">IPv${r.stack}</span></td>
      <td>${renderIpCell(r.ip)}</td>
      <td>${escapeHtml(r.detail)}</td>
    </tr>`).join('');
}
const isIPv6 = ip => typeof ip === 'string' && ip.includes(':') && ip !== '-';
const shortenIPv6 = ip => !ip || ip.length <= 16 ? ip : ip.slice(0, 8) + '…' + ip.slice(-5);
function renderIpCell(ip) {
  if (!ip || ip === '-') return '-';
  if (isIPv6(ip)) return `<span class="ipv6-chip" data-full="${escapeHtml(ip)}">${escapeHtml(shortenIPv6(ip))}</span>`;
  return `<span class="ipv4-text">${escapeHtml(ip)}</span>`;
}

/* ========== 7. IPv6 浮层 ========== */
let ipPopoverEl = null;
function getIpPopover() {
  if (!ipPopoverEl) {
    ipPopoverEl = document.createElement('div');
    ipPopoverEl.className = 'ip-popover';
    document.body.appendChild(ipPopoverEl);
  }
  return ipPopoverEl;
}
function showIpPopover(target, text) {
  const el = getIpPopover();
  el.textContent = text;
  el.style.top = '-9999px'; el.style.left = '-9999px';
  el.classList.add('show');
  const er = el.getBoundingClientRect(), rc = target.getBoundingClientRect();
  let top = rc.top - er.height - 8, left = rc.left;
  if (top < 8) top = rc.bottom + 8;
  if (left + er.width > window.innerWidth - 8) left = window.innerWidth - er.width - 8;
  if (left < 8) left = 8;
  el.style.top = top + 'px'; el.style.left = left + 'px';
}
const hideIpPopover = () => { if (ipPopoverEl) ipPopoverEl.classList.remove('show'); };
document.addEventListener('click', e => {
  const chip = e.target.closest('.ipv6-chip');
  if (chip) { e.stopPropagation(); showIpPopover(chip, chip.dataset.full); return; }
  hideIpPopover();
});
window.addEventListener('scroll', hideIpPopover, true);

/* ========== 8. 个人画像 ========== */
function renderProfile(rows) {
  const total = rows.length;
  const ipv4 = rows.filter(r => r.stack === 4).length;
  const ipv6 = rows.filter(r => r.stack === 6).length;
  const protocolCount = {}, regionCount = {}, orgCount = {};
  rows.forEach(r => {
    protocolCount[r.protocol] = (protocolCount[r.protocol] || 0) + 1;
    regionCount[r.region] = (regionCount[r.region] || 0) + 1;
    orgCount[r.org] = (orgCount[r.org] || 0) + 1;
  });
  const topOrg = Object.entries(orgCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const tags = [
    `节点总数: ${total}`, `IPv4: ${ipv4}`, `IPv6: ${ipv6}`,
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
  const el = $(id); if (!el) return;
  const chart = echarts.getInstanceByDom(el) || echarts.init(el);
  chart.setOption({
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    series: [{ type: 'pie', radius: '60%', data: Object.entries(dataMap).map(([name, value]) => ({ name, value })), label: { formatter: '{b}: {c}' } }],
  }, true);
}
function renderBar(id, dataMap, title) {
  const el = $(id); if (!el) return;
  const chart = echarts.getInstanceByDom(el) || echarts.init(el);
  const entries = Object.entries(dataMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
  chart.setOption({
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: entries.map(x => x[0]), axisLabel: { fontSize: 10, rotate: 30 } },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: entries.map(x => x[1]), itemStyle: { color: '#3b82f6' } }],
  }, true);
}

/* ========== 9. 拓扑图 ========== */
let currentTopoRows = null;
let topoResizeTimer = null;
window.addEventListener('resize', () => {
  if (!currentTopoRows) return;
  clearTimeout(topoResizeTimer);
  topoResizeTimer = setTimeout(() => renderTopo(currentTopoRows), 250);
});

function renderTopo(rows) {
  const el = $('topoChart'); if (!el) return;
  currentTopoRows = rows;
  const chart = echarts.getInstanceByDom(el) || echarts.init(el);
  chart.clear();

  if (!rows || !rows.length) { el.style.height = '120px'; chart.resize(); return; }

  const groups = {};
  rows.forEach(r => {
    const key = r.org || '未知';
    (groups[key] = groups[key] || []).push(r);
  });
  const orgNames = Object.keys(groups);

  const containerW = Math.max(600, el.clientWidth || 1000);
  const padL = 24, padT = 24, padR = 24, padB = 24;
  const orgW = 132, orgH = 40;
  const gapOrgIp = 32;
  const ipW = 168, ipH = 44;
  const ipGapX = 10, ipGapY = 10;
  const rowGap = 18;

  const ipStartX = padL + orgW + gapOrgIp;
  const ipAreaW = containerW - ipStartX - padR;
  const ipsPerRow = Math.max(1, Math.floor((ipAreaW + ipGapX) / (ipW + ipGapX)));

  const nodes = [], links = [];
  let cursorY = padT;

  orgNames.forEach((name, i) => {
    const color = palette(i);
    const items = groups[name];
    const ipRowCount = Math.ceil(items.length / ipsPerRow);
    const ipAreaH = ipRowCount * ipH + Math.max(0, ipRowCount - 1) * ipGapY;
    const rowH = Math.max(orgH, ipAreaH);

    nodes.push({
      id: `org-${i}`, name,
      x: padL + orgW / 2, y: cursorY + rowH / 2,
      symbol: 'roundRect', symbolSize: [orgW, orgH],
      itemStyle: {
        color: hexToRgba(color, 0.14), borderColor: color, borderWidth: 2,
        shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.06)',
      },
      label: {
        show: true,
        formatter: name.length > 9 ? name.slice(0, 9) + '…' : name,
        fontSize: 12, fontWeight: 600, color: '#1f2937', position: 'inside',
      },
      z: 3,
    });

    items.forEach((r, j) => {
      const rr = Math.floor(j / ipsPerRow), cc = j % ipsPerRow;
      const ipCx = ipStartX + cc * (ipW + ipGapX) + ipW / 2;
      const ipCy = cursorY + rr * (ipH + ipGapY) + ipH / 2;
      const ipId = `ip-${i}-${j}`;

      nodes.push({
        id: ipId, name: r.ip,
        x: ipCx, y: ipCy,
        symbol: 'roundRect', symbolSize: [ipW, ipH],
        itemStyle: {
          color: hexToRgba(color, 0.08),
          borderColor: hexToRgba(color, 0.55), borderWidth: 1,
        },
        label: {
          show: true,
          formatter: `{ip|${shortenTopoIP(r.ip)}}\n{org|${shortOrgLabel(r.org)} · ${r.asn}}`,
          rich: {
            ip: { fontSize: 11, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', color, lineHeight: 16, fontWeight: 600 },
            org: { fontSize: 9, color: '#6b7280', lineHeight: 14 },
          },
          position: 'inside',
        },
        value: r,
      });

      links.push({
        source: `org-${i}`, target: ipId,
        lineStyle: { color: hexToRgba(color, 0.42), width: 1, curveness: 0 },
      });
    });
    cursorY += rowH + rowGap;
  });

  const totalH = cursorY - rowGap + padB;
  el.style.height = totalH + 'px';
  chart.resize();

  chart.setOption({
    animationDuration: 400, animationEasing: 'cubicOut',
    tooltip: {
      backgroundColor: 'rgba(255,255,255,0.98)', borderColor: '#e5e7eb', borderWidth: 1,
      padding: [10, 14], textStyle: { color: '#374151', fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 16px rgba(0,0,0,0.08); border-radius: 8px;',
      formatter: p => {
        if (p.dataType === 'node' && p.data.value) {
          const r = p.data.value;
          return `<b style="color:#111">${r.name}</b><br/>
            <span style="color:#6b7280">协议</span> ${r.protocol}<br/>
            <span style="color:#6b7280">IP</span> ${r.ip}<br/>
            <span style="color:#6b7280">组织</span> ${r.org}<br/>
            <span style="color:#6b7280">ASN</span> ${r.asn}<br/>
            <span style="color:#6b7280">地区</span> ${r.region} · ${r.detail}<br/>
            <span style="color:#6b7280">栈</span> IPv${r.stack}<br/>
            <span style="color:#3b82f6;font-size:11px">👉 点击查看 BGP 路由详情</span>`;
        }
        return p.name;
      },
    },
    series: [{
      type: 'graph', layout: 'none', roam: false,
      data: nodes, links,
      edgeSymbol: ['none', 'arrow'], edgeSymbolSize: 5,
      lineStyle: { color: 'source', opacity: 0.4, width: 1, curveness: 0 },
      emphasis: { focus: 'adjacency', scale: 1.06, lineStyle: { width: 2, opacity: 0.9 } },
    }],
  }, true);

  chart.off('click');
  chart.on('click', p => {
    if (p.dataType === 'node' && p.data.value && p.data.value.ip && p.data.value.ip !== '-') {
      openBgpDrawer(p.data.value);
    }
  });
}

const shortenTopoIP = ip => !ip || ip === '-' ? '—' : ip.length <= 15 ? ip : ip.slice(0, 11) + '…' + ip.slice(-3);
const shortOrgLabel = org => !org ? '未知' : org.length > 6 ? org.slice(0, 6) + '…' : org;
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function palette(i) {
  return ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6',
    '#2dd4bf','#fb923c','#818cf8','#a3e635','#22d3ee','#c084fc'][i % 12];
}

/* ========== 10. RIPEstat BGP 查询 ========== */
const bgpCache = new Map();
async function ripestat(call, resource) {
  const key = `${call}:${resource}`;
  if (bgpCache.has(key)) return bgpCache.get(key);
  const url = `https://stat.ripe.net/data/${call}/data.json?resource=${encodeURIComponent(resource)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RIPEstat ${call} 失败`);
  const json = await res.json();
  bgpCache.set(key, json.data);
  return json.data;
}

async function fetchBGPForIP(ip) {
  const out = { ip };
  const tasks = [
    ripestat('prefix-overview', ip).then(d => out.prefix = d).catch(() => {}),
    ripestat('routing-status', ip).then(d => out.routing = d).catch(() => {}),
    ripestat('reverse-dns', ip).then(d => out.reverse = d).catch(() => {}),
  ];
  await Promise.all(tasks);
  return out;
}

async function fetchASForASN(asn) {
  const out = { asn };
  await Promise.all([
    ripestat('as-overview', asn).then(d => out.overview = d).catch(() => {}),
    ripestat('asn-neighbours', asn).then(d => out.neighbours = d).catch(() => {}),
  ]);
  return out;
}

/* ========== 11. BGP 抽屉 ========== */
let drawerOpen = false;
function openBgpDrawer(node) {
  const drawer = $('bgpDrawer'), mask = $('drawerMask'), body = $('drawerBody');
  $('drawerIp').textContent = node.ip;
  $('drawerSub').textContent = `${node.org} · ${node.asn}`;

  body.innerHTML = `
    <div class="bgp-section">
      <div class="bgp-row"><span>位置</span><b>${escapeHtml(node.region)} · ${escapeHtml(node.detail)}</b></div>
      <div class="bgp-row"><span>组织</span><b>${escapeHtml(node.org)}</b></div>
      <div class="bgp-row"><span>ASN</span><b>${escapeHtml(node.asn)}</b></div>
      <div class="bgp-row"><span>运营商</span><b>${escapeHtml(node.operator || '—')}</b></div>
      <div class="bgp-row"><span>协议</span><b>${escapeHtml(node.protocol)}</b></div>
      <div class="bgp-row"><span>栈</span><b>IPv${node.stack}</b></div>
    </div>
    <div class="bgp-section" id="bgpIpExt"><div class="bgp-loading">正在查询 BGP 路由信息…</div></div>
    <div class="bgp-section" id="bgpAsExt"><div class="bgp-loading">正在查询 AS 信息…</div></div>
    <div class="bgp-foot">数据来源：RIPEstat (RIPE NCC)</div>`;

  drawer.classList.add('show'); mask.classList.add('show');
  drawerOpen = true;

  const ipTask = fetchBGPForIP(node.ip).then(d => renderBgpIpExt(d)).catch(e => {
    $('bgpIpExt').innerHTML = `<div class="bgp-error">BGP 查询失败：${escapeHtml(e.message)}</div>`;
  });

  const asnTask = node.asn && node.asn !== 'AS0'
    ? fetchASForASN(node.asn).then(d => renderBgpAsExt(d)).catch(e => {
        $('bgpAsExt').innerHTML = `<div class="bgp-error">AS 查询失败：${escapeHtml(e.message)}</div>`;
      })
    : Promise.resolve($('bgpAsExt').innerHTML = '<div class="bgp-empty">无 ASN 信息</div>');

  Promise.all([ipTask, asnTask]);
}

function renderBgpIpExt(d) {
  const el = $('bgpIpExt'); if (!el) return;
  const rows = [];
  if (d.prefix) {
    const prefix = d.prefix.resource || d.prefix.prefix || '—';
    const announced = d.prefix.announced ? '<span class="ok">已宣告</span>' : '<span class="no">未宣告</span>';
    rows.push(`<div class="bgp-row"><span>前缀</span><b>${escapeHtml(prefix)}</b></div>`);
    rows.push(`<div class="bgp-row"><span>宣告状态</span><b>${announced}</b></div>`);
    if (d.prefix.asns && d.prefix.asns.length) {
      const asns = d.prefix.asns.slice(0, 5).map(a => `${a.asn} ${escapeHtml(a.holder || '')}`).join('<br>');
      rows.push(`<div class="bgp-row"><span>归属 AS</span><b style="text-align:right;font-weight:500;font-size:12px">${asns}</b></div>`);
    }
  }
  if (d.routing) {
    const first = d.routing.first_seen?.time || '—';
    const last = d.routing.last_seen?.time || '—';
    rows.push(`<div class="bgp-row"><span>首次可见</span><b style="font-weight:500;font-size:12px">${escapeHtml(first)}</b></div>`);
    rows.push(`<div class="bgp-row"><span>最后可见</span><b style="font-weight:500;font-size:12px">${escapeHtml(last)}</b></div>`);
  }
  if (d.reverse && d.reverse.result && d.reverse.result.length) {
    const r = d.reverse.result[0];
    if (r.reverse_dns) rows.push(`<div class="bgp-row"><span>反向 DNS</span><b>${escapeHtml(r.reverse_dns)}</b></div>`);
  }
  el.innerHTML = rows.length
    ? `<div class="bgp-title">路由信息</div>${rows.join('')}`
    : `<div class="bgp-empty">未获取到 BGP 路由信息</div>`;
}

function renderBgpAsExt(d) {
  const el = $('bgpAsExt'); if (!el) return;
  const rows = [];
  if (d.overview) {
    rows.push(`<div class="bgp-row"><span>AS 名称</span><b>${escapeHtml(d.overview.holder || '—')}</b></div>`);
    rows.push(`<div class="bgp-row"><span>宣告状态</span><b>${d.overview.announced ? '<span class="ok">已宣告</span>' : '<span class="no">未宣告</span>'}</b></div>`);
  }
  if (d.neighbours && d.neighbours.neighbours) {
    const left = d.neighbours.neighbours.filter(n => n.type === 'left').slice(0, 8);
    const right = d.neighbours.neighbours.filter(n => n.type === 'right').slice(0, 8);
    if (left.length) {
      const html = left.map(n => `<span class="chip">AS${n.asn}</span>`).join('');
      rows.push(`<div class="bgp-row"><span>上游</span><b class="chips">${html}</b></div>`);
    }
    if (right.length) {
      const html = right.map(n => `<span class="chip">AS${n.asn}</span>`).join('');
      rows.push(`<div class="bgp-row"><span>下游</span><b class="chips">${html}</b></div>`);
    }
  }
  el.innerHTML = rows.length
    ? `<div class="bgp-title">AS 信息</div>${rows.join('')}`
    : `<div class="bgp-empty">未获取到 AS 信息</div>`;
}

function closeBgpDrawer() {
  $('bgpDrawer').classList.remove('show');
  $('drawerMask').classList.remove('show');
  drawerOpen = false;
}
$('drawerClose').onclick = closeBgpDrawer;
$('drawerMask').onclick = closeBgpDrawer;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawerOpen) closeBgpDrawer(); });

/* ========== 12. 独立 IP / ASN 查询 ========== */
$('queryBtn').onclick = async () => {
  const q = $('queryInput').value.trim();
  if (!q) return;
  const el = $('queryResult');
  el.innerHTML = '<div class="bgp-loading">查询中…</div>';
  try {
    if (/^AS\d+$/i.test(q)) {
      const d = await fetchASForASN(q.toUpperCase());
      el.innerHTML = `<div class="query-card" id="queryAsCard"></div>`;
      // 直接复用一个临时节点
      const tmp = { ip: q.toUpperCase(), org: d.overview?.holder || '—', asn: q.toUpperCase(),
        region: '—', detail: '—', operator: '', protocol: '—', stack: 4 };
      openBgpDrawer(tmp);
      // 同时把结果留在面板
      el.querySelector('.query-card').innerHTML = renderQueryAsHTML(d);
      closeBgpDrawer();
    } else {
      const d = await fetchBGPForIP(q);
      el.innerHTML = `<div class="query-card">${renderQueryIpHTML(q, d)}</div>`;
    }
  } catch (e) {
    el.innerHTML = `<div class="bgp-error">查询失败：${escapeHtml(e.message)}</div>`;
  }
};

function renderQueryIpHTML(ip, d) {
  const rows = [`<div class="bgp-row"><span>IP</span><b>${escapeHtml(ip)}</b></div>`];
  if (d.prefix) {
    rows.push(`<div class="bgp-row"><span>前缀</span><b>${escapeHtml(d.prefix.resource || '—')}</b></div>`);
    rows.push(`<div class="bgp-row"><span>宣告</span><b>${d.prefix.announced ? '<span class="ok">是</span>' : '<span class="no">否</span>'}</b></div>`);
  }
  if (d.routing) {
    rows.push(`<div class="bgp-row"><span>首次可见</span><b style="font-weight:500;font-size:12px">${escapeHtml(d.routing.first_seen?.time || '—')}</b></div>`);
    rows.push(`<div class="bgp-row"><span>最后可见</span><b style="font-weight:500;font-size:12px">${escapeHtml(d.routing.last_seen?.time || '—')}</b></div>`);
  }
  if (d.reverse?.result?.[0]?.reverse_dns) {
    rows.push(`<div class="bgp-row"><span>反向 DNS</span><b>${escapeHtml(d.reverse.result[0].reverse_dns)}</b></div>`);
  }
  return `<div class="bgp-title">BGP 路由</div>${rows.join('')}`;
}

function renderQueryAsHTML(d) {
  const rows = [];
  if (d.overview) {
    rows.push(`<div class="bgp-row"><span>AS 名称</span><b>${escapeHtml(d.overview.holder || '—')}</b></div>`);
  }
  if (d.neighbours?.neighbours) {
    const left = d.neighbours.neighbours.filter(n => n.type === 'left').slice(0, 10);
    const right = d.neighbours.neighbours.filter(n => n.type === 'right').slice(0, 10);
    if (left.length) rows.push(`<div class="bgp-row"><span>上游</span><b class="chips">${left.map(n => `<span class="chip">AS${n.asn}</span>`).join('')}</b></div>`);
    if (right.length) rows.push(`<div class="bgp-row"><span>下游</span><b class="chips">${right.map(n => `<span class="chip">AS${n.asn}</span>`).join('')}</b></div>`);
  }
  return `<div class="bgp-title">AS 信息</div>${rows.join('')}`;
}

/* ========== 13. WebRTC 泄漏检测 ========== */
$('diagWebrtc').onclick = async () => {
  const el = $('diagResult');
  el.innerHTML = '<div class="bgp-loading">正在收集 ICE candidates…</div>';
  const ips = await detectWebRTC();
  if (!ips.length) {
    el.innerHTML = `<div class="diag-card"><div class="diag-title">WebRTC 泄漏检测</div>
      <div class="diag-row-item"><span>结果</span><b class="ok">未发现泄漏（无公网 IP 暴露）</b></div>
      <div class="diag-note">说明：浏览器已启用 mDNS 或代理已完全拦截 WebRTC。</div></div>`;
    return;
  }
  const classified = ips.map(ip => ({
    ip,
    type: ip.includes(':') ? 'IPv6' : (isPrivate(ip) ? '内网' : '公网'),
  }));
  const publicLeak = classified.filter(x => x.type === '公网');
  el.innerHTML = `<div class="diag-card">
    <div class="diag-title">WebRTC 泄漏检测</div>
    ${classified.map(x => `<div class="diag-row-item"><span>${x.type}</span><b>${escapeHtml(x.ip)}</b></div>`).join('')}
    ${publicLeak.length
      ? `<div class="diag-note warn">⚠ 检测到 ${publicLeak.length} 个公网 IP 暴露。若使用代理，说明存在 WebRTC 泄漏风险。</div>`
      : `<div class="diag-note ok">仅收集到内网 / 本地地址，未泄漏公网 IP。</div>`}
  </div>`;
};

function detectWebRTC() {
  return new Promise(resolve => {
    const ips = new Set();
    let pc;
    try {
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    } catch { resolve([]); return; }
    pc.createDataChannel('');
    pc.onicecandidate = e => {
      if (!e.candidate) return;
      const cand = e.candidate.candidate || '';
      const m = cand.match(/(\d{1,3}(?:\.\d{1,3}){3})|([0-9a-f]{1,4}(?::[0-9a-f]{1,4}){2,7})/i);
      if (m && m[0] && !m[0].endsWith('.local')) ips.add(m[0]);
    };
    pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => {});
    setTimeout(() => {
      try { pc.close(); } catch {}
      resolve([...ips]);
    }, 3500);
  });
}
function isPrivate(ip) {
  return /^10\./.test(ip) || /^192\.168\./.test(ip) ||
         /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
         /^169\.254\./.test(ip) || /^127\./.test(ip) ||
         /^(fe80|fc|fd)/i.test(ip);
}

/* ========== 14. 出口 IP 一致性 ========== */
$('diagEgress').onclick = async () => {
  const el = $('diagResult');
  el.innerHTML = '<div class="bgp-loading">正在通过多个来源测试出口 IP…</div>';
  const apis = [
    { name: 'ipify', url: 'https://api.ipify.org?format=json', pick: d => d.ip },
    { name: 'ip.sb', url: 'https://api.ip.sb/ip', pick: d => String(d).trim() },
    { name: 'ipinfo', url: 'https://ipinfo.io/ip', pick: d => String(d).trim() },
  ];
  const results = await Promise.all(apis.map(async a => {
    try {
      const r = await fetch(a.url);
      if (!r.ok) throw new Error();
      const ct = r.headers.get('content-type') || '';
      const data = ct.includes('json') ? await r.json() : await r.text();
      return { name: a.name, ip: a.pick(data) || '—' };
    } catch { return { name: a.name, ip: '失败' }; }
  }));
  const validIps = results.filter(r => r.ip && r.ip !== '失败' && r.ip !== '—').map(r => r.ip);
  const unique = [...new Set(validIps)];
  const consistent = unique.length === 1;
  el.innerHTML = `<div class="diag-card">
    <div class="diag-title">出口 IP 一致性</div>
    ${results.map(r => `<div class="diag-row-item"><span>${escapeHtml(r.name)}</span><b>${escapeHtml(r.ip)}</b></div>`).join('')}
    <div class="diag-note ${consistent ? 'ok' : 'warn'}">
      ${consistent
        ? `✅ 所有来源返回同一出口 IP：<b>${escapeHtml(unique[0])}</b>`
        : `⚠ 检测到 ${unique.length} 个不同的出口 IP：${unique.map(i => escapeHtml(i)).join(' / ')}`}
    </div>
  </div>`;
};

/* ========== 15. DNS 解析器检查（纯前端版） ========== */
$('diagDns').onclick = async () => {
  const el = $('diagResult');
  el.innerHTML = '<div class="bgp-loading">正在通过 DoH 与本地 DNS 对比解析…</div>';
  // 用一批域名，比对 DoH 返回的解析器归属
  const testDomains = ['google.com', 'cloudflare.com', 'github.com'];
  const rows = [];
  for (const d of testDomains) {
    const t0 = performance.now();
    let dohIps = [], ok = false;
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${d}&type=A`,
        { headers: { accept: 'application/dns-json' } });
      const j = await r.json();
      dohIps = (j.Answer || []).filter(a => a.type === 1).map(a => a.data);
      ok = true;
    } catch {}
    const ms = Math.round(performance.now() - t0);
    rows.push(`<div class="diag-row-item">
      <span>${escapeHtml(d)}</span>
      <b style="font-weight:500;font-size:12px">${ok ? dohIps.slice(0, 2).join(', ') : '失败'} · ${ms}ms</b>
    </div>`);
  }
  el.innerHTML = `<div class="diag-card">
    <div class="diag-title">DNS 解析器检查</div>
    ${rows.join('')}
    <div class="diag-note">
      说明：纯前端无法探测你的本地 DNS 出口，这里只验证 DoH 连通性。
      如需检测 DNS 泄漏，请访问 <a href="https://browserleaks.com/dns" target="_blank" rel="noopener">browserleaks.com/dns</a>。
    </div>
  </div>`;
};

/* ========== 16. 主流程 ========== */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function setStatus(msg) { $('status').textContent = msg; }

async function runWithNodes(nodes) {
  if (!nodes.length) { setStatus('没有解析到任何节点'); return; }
  try {
    const results = await analyzeNodes(nodes);
    renderTable(results);
    renderTopo(results);
    renderProfile(results);
    setStatus(`检测完成，共 ${results.length} 个节点（点击拓扑图 IP 卡片可查看 BGP）`);
  } catch (e) { setStatus('检测失败: ' + e.message); }
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
  } catch (e) { setStatus('拉取失败（可能是 CORS）: ' + e.message); }
};

$('loadText').onclick = async () => {
  const text = $('subText').value.trim();
  if (!text) return setStatus('请粘贴订阅内容');
  setStatus('解析中...');
  const nodes = parseSubscription(text);
  await runWithNodes(nodes);
};

$('clearBtn').onclick = () => {
  $('subText').value = ''; $('subUrl').value = '';
  document.querySelector('#resultTable tbody').innerHTML = '';
  $('profileTags').innerHTML = ''; $('diagResult').innerHTML = ''; $('queryResult').innerHTML = '';
  ['protocolChart','regionChart','orgChart','topoChart'].forEach(id => {
    const el = $(id); if (el) { const c = echarts.getInstanceByDom(el); if (c) c.clear(); }
  });
  currentTopoRows = null; closeBgpDrawer(); hideIpPopover();
  setStatus('等待输入...');
};