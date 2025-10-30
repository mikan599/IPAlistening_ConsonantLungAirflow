// netlify/functions/audio.js
// 注意: 音源の再配信は利用規約に従って行ってください。教育目的での最小限の転送を想定しています。
const TUFS_BASE = process.env.TUFS_AUDIO_BASE || "https://www.coelang.tufs.ac.jp/ipa/sounds/";
const TUFS_REFERER = process.env.TUFS_AUDIO_REFERER || "https://www.coelang.tufs.ac.jp/ipa/";

exports.handler = async (event) => {
  try {
    const method = event.httpMethod || "GET";
    const file = event.queryStringParameters?.file || "";

    if (!file || /[^A-Za-z0-9._-]/.test(file)) {
      return { statusCode: 400, body: "Bad file" };
    }

    const upstreamUrl = new URL(file, TUFS_BASE).toString();
    const headers = { "user-agent": "ipalistening-proxy" };
    if (TUFS_REFERER) {
      headers["referer"] = TUFS_REFERER;
    }
    const range = event.headers?.range || event.headers?.Range;
    if (range) headers["range"] = range;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: method === "HEAD" ? "HEAD" : "GET",
      headers,
      redirect: "follow"
    });

    const keepHeaders = [
      "content-type",
      "content-length",
      "accept-ranges",
      "content-range",
      "cache-control",
      "etag",
      "last-modified"
    ];

    const outgoingHeaders = {
      "access-control-allow-origin": "*",
      "x-ipalistening-upstream": upstreamUrl
    };
    keepHeaders.forEach((key) => {
      const value = upstreamResponse.headers.get(key);
      if (value) {
        outgoingHeaders[key] = value;
      }
    });

    if (method === "HEAD") {
      return {
        statusCode: upstreamResponse.status,
        headers: outgoingHeaders,
        body: ""
      };
    }

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    return {
      statusCode: upstreamResponse.status,
      headers: outgoingHeaders,
      body: buffer.toString("base64"),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error("音声プロキシでエラーが発生しました", error);
    return { statusCode: 502, body: "Upstream fetch failed" };
  }
};
