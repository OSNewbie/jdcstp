export async function onRequest({ request }) {
  const ip = request.headers.get("CF-Connecting-IP");

  if (!ip) {
    return Response.json(
      {
        success: false,
        error: "没有收到 CF-Connecting-IP。请确认站点已部署在 Cloudflare Pages。"
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" }
      }
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

    const rawBody = await upstream.text();

    let result;
    try {
      result = JSON.parse(rawBody);
    } catch {
      throw new Error(
        `ipwho.is 返回了无效 JSON（HTTP ${upstream.status}）。`
      );
    }

    if (!upstream.ok) {
      throw new Error(`ipwho.is 请求失败（HTTP ${upstream.status}）。`);
    }

    if (result.success !== true) {
      throw new Error(result.message || "ipwho.is 未能查询该 IP。");
    }

    const connection = result.connection || {};
    const location = [
      result.city,
      result.region,
      result.country
    ].filter(Boolean).join("，");

    return Response.json(
      {
        success: true,
        ip: result.ip || ip,
        location: location || null,
        isp: connection.isp || connection.org || null,
        asn: connection.asn
          ? `AS${String(connection.asn).replace(/^AS/i, "")}`
          : null
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" }
      }
    );
  } catch (error) {
    const message =
      error?.name === "TimeoutError" || error?.name === "AbortError"
        ? "查询 IP 信息超时，请稍后重试。"
        : error?.message || "查询 IP 信息时发生未知错误。";

    return Response.json(
      { success: false, error: message },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}
