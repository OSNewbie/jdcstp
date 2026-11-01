export async function onRequestGet({ request }) {
  const ip = request.headers.get("CF-Connecting-IP");

  if (!ip) {
    return Response.json(
      { error: "无法读取访问者 IP" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }

  try {
    const url = `https://ipwho.is/${encodeURIComponent(ip)}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error("IP 信息源暂时不可用");
    }

    const info = await response.json();

    if (!info.success) {
      throw new Error("没有查询到 IP 信息");
    }

    return Response.json(
      {
        ip: info.ip || ip,
        city: info.city || "",
        region: info.region || "",
        country: info.country || "",
        org: info.connection?.org || info.connection?.isp || "",
        asn: info.connection?.asn
          ? `AS${info.connection.asn}`
          : ""
      },
      {
        headers: { "Cache-Control": "no-store" }
      }
    );
  } catch {
    return Response.json(
      { error: "IP 信息源暂时不可用" },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}
