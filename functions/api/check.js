export async function onRequest({ request }) {
  const ip = request.headers.get("CF-Connecting-IP");

  if (!ip) {
    return Response.json(
      { success: false, error: "Cloudflare 未提供访客 IP。" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const response = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}`,
      { headers: { Accept: "application/json" } }
    );

    if (!response.ok) {
      throw new Error("IP 信息服务暂时不可用。");
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "IP 信息查询失败。");
    }

    const connection = result.connection || {};
    const locationParts = [
      result.city,
      result.region,
      result.country
    ].filter(Boolean);

    return Response.json(
      {
        success: true,
        ip: result.ip || ip,
        location: locationParts.join("，") || null,
        isp: connection.isp || connection.org || null,
        asn: connection.asn ? `AS${connection.asn}` : null
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message || "查询网络信息时发生错误。"
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
