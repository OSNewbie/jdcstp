const $ = (id) => document.getElementById(id);

async function checkIp() {
  $("overall-status").textContent = "正在读取公网 IP…";

  try {
    const response = await fetch("/api/check", { cache: "no-store" });
    if (!response.ok) throw new Error("IP 查询失败");

    const data = await response.json();
    $("ip-address").textContent = data.ip || "未能读取";
    $("location").textContent =
      `地区：${[data.city, data.region, data.country].filter(Boolean).join(", ") || "暂无数据"}`;
    $("provider").textContent =
      `运营商 / ASN：${[data.org, data.asn].filter(Boolean).join(" / ") || "暂无数据"}`;
    $("overall-status").textContent = "公网 IP 已读取";
  } catch {
    $("ip-address").textContent = "检测失败，请稍后重试";
    $("location").textContent = "地区：暂无数据";
    $("provider").textContent = "运营商 / ASN：暂无数据";
    $("overall-status").textContent = "IP 信息暂时不可用";
  }
}

async function checkIpv6() {
  try {
    const response = await fetch("https://api6.ipify.org?format=json", {
      signal: AbortSignal.timeout(6000),
      cache: "no-store"
    });
    if (!response.ok) throw new Error();

    const data = await response.json();
    $("ipv6-result").textContent = `IPv6 可用：${data.ip}`;
    $("ipv6-badge").textContent = "可用";
    $("ipv6-badge").className = "badge ok";
  } catch {
    $("ipv6-result").textContent = "未检测到 IPv6 连通性，或测试端点不可达";
    $("ipv6-badge").textContent = "未检测到";
    $("ipv6-badge").className = "badge warn";
  }
}

async function checkWebrtc() {
  if (!window.RTCPeerConnection) {
    $("webrtc-result").textContent = "当前浏览器不支持 WebRTC 检测";
    $("webrtc-badge").textContent = "不支持";
    $("webrtc-badge").className = "badge warn";
    return;
  }

  const addresses = new Set();
  let pc;

  try {
    pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.createDataChannel("diagnostic");
    await pc.setLocalDescription(await pc.createOffer());

    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 5000);

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          clearTimeout(timeout);
          resolve();
          return;
        }

        const parts = event.candidate.candidate.split(" ");
        const address = parts[4];

        if (address && !address.endsWith(".local")) {
          addresses.add(address);
        }
      };
    });

    const found = [...addresses];
    $("webrtc-result").textContent = found.length
      ? `发现候选网络地址：${found.join(", ")}`
      : "浏览器未提供可显示的地址；这不等同于确认安全";

    $("webrtc-badge").textContent = found.length ? "已检测" : "信息有限";
    $("webrtc-badge").className = `badge ${found.length ? "ok" : "warn"}`;
  } catch {
    $("webrtc-result").textContent = "检测受浏览器或网络设置限制";
    $("webrtc-badge").textContent = "受限";
    $("webrtc-badge").className = "badge warn";
  } finally {
    if (pc) pc.close();
  }
}

async function runChecks() {
  await checkIp();
  checkIpv6();
  checkWebrtc();
}

$("refresh").addEventListener("click", runChecks);
runChecks();
