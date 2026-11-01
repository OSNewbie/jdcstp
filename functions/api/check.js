function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequestGet({ request }) {
  const ip = request.headers.get("CF-Connecting-IP");

  if (!ip) {
    return json(
      {
        success: false,
        error: "未收到 Cloudflare 访客 IP 请求头。请确认请求经过 Cloudflare Pages。"
      },
      400
    );
  }

  try {
    const upstream = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000)
      }
    );

    const text = await upstream.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      return json(
        {
          success: false,
          error: `IP 查询服务返回非 JSON 内容（HTTP ${upstream.status}）。`
        },
        502
      );
    }

    if (!upstream.ok) {
      return json(
        {
          success: false,
          error: `IP 查询服务请求失败（HTTP ${upstream.status}）。`
        },
        502
      );
    }

    if (result.success !== true) {
      return json(
        {
          success: false,
          error: result.message || "IP 查询服务未能查询该地址。"
        },
        502
      );
    }

    const connection = result.connection || {};
    const location = [
      result.city,
      result.region,
      result.country
    ].filter(Boolean).join("，");

    return json({
      success: true,
      ip: result.ip || ip,
      location: location || "暂无位置数据",
      isp: connection.isp || connection.org || "暂无 ISP 数据",
      asn: connection.asn
        ? `AS${String(connection.asn).replace(/^AS/i, "")}`
        : "暂无 ASN 数据"
    });
  } catch (error) {
    const message =
      error?.name === "TimeoutError" || error?.name === "AbortError"
        ? "查询 IP 信息超时，请稍后重试。"
        : error?.message || "服务器查询 IP 信息时发生错误。";

    return json({ success: false, error: message }, 502);
  }
}

// 方便确认 Pages Function 是否已部署：打开 /api/check?health=1
export async function onRequest({ request, next }) {
  const url = new URL(request.url);

  if (url.pathname === "/api/check" && url.searchParams.get("health") === "1") {
    return json({ success: true, function: "api/check", status: "online" });
  }

  if (request.method !== "GET") {
    return json({ success: false, error: "仅支持 GET 请求。" }, 405);
  }

  return onRequestGet({ request });
}
