/**
 * PDF proxy for GitHub Release assets.
 * Deploy this file as a Cloudflare Worker.
 */
export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Expose-Headers": "Accept-Ranges, Content-Length, Content-Range, Content-Type",
      "Access-Control-Max-Age": "86400"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", {status:405,headers:cors});
    const target = new URL(request.url).searchParams.get("url");
    if (!target) return new Response("Missing url parameter", {status:400,headers:cors});
    let url;
    try { url = new URL(target); } catch { return new Response("Invalid URL", {status:400,headers:cors}); }
    if (url.protocol !== "https:" || !(url.hostname === "github.com" || url.hostname.endsWith(".githubusercontent.com"))) {
      return new Response("Host not allowed", {status:403,headers:cors});
    }
    const headers = new Headers();
    const range = request.headers.get("Range");
    if (range) headers.set("Range",range);
    const upstream = await fetch(url.toString(), {method:request.method, headers, redirect:"follow"});
    const outHeaders = new Headers(cors);
    for (const h of ["Content-Type","Content-Length","Content-Range","Accept-Ranges","ETag","Last-Modified"]) {
      const v=upstream.headers.get(h); if(v) outHeaders.set(h,v);
    }
    outHeaders.set("Content-Disposition","inline");
    return new Response(request.method==="HEAD" ? null : upstream.body, {status:upstream.status,statusText:upstream.statusText,headers:outHeaders});
  }
};