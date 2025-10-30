// TUFS の音源は直接参照すると 403 になるため、同一オリジンの Netlify Functions 経由で配信する。
const AUDIO_PROXY_ENDPOINT = "/.netlify/functions/audio";

export const TUFS_AUDIO_BASE = "https://www.coelang.tufs.ac.jp/ipa/sounds/";

function buildProxyUrl(filename) {
  const safeName = encodeURIComponent(filename);

  if (typeof window !== "undefined" && window.location) {
    const url = new URL(AUDIO_PROXY_ENDPOINT, window.location.origin);
    url.searchParams.set("file", filename);
    return url.href;
  }

  return `${AUDIO_PROXY_ENDPOINT}?file=${safeName}`;
}

export function buildAudioSrc(filename) {
  return buildProxyUrl(filename);
}

export function buildAudioSrcById(soundID) {
  return buildAudioSrc(`${soundID}.mp3`);
}

export async function reportAudioError(url, originalError) {
  try {
    let resolvedUrl;
    let sameOrigin = false;

    if (typeof window !== "undefined" && window.location) {
      resolvedUrl = new URL(url, window.location.href);
      sameOrigin = resolvedUrl.origin === window.location.origin;
    }

    if (!sameOrigin) {
      console.error("音声リソースの状態を確認できません (クロスオリジン)", {
        url,
        originalError
      });
      return null;
    }

    const response = await fetch(resolvedUrl, { method: "HEAD" });
    const upstream = response.headers.get("x-ipalistening-upstream") || undefined;

    if (!response.ok) {
      console.error("音声リソースの取得に失敗しました", {
        url: resolvedUrl.href,
        upstream,
        status: response.status,
        statusText: response.statusText,
        originalError
      });
      return { status: response.status, statusText: response.statusText, upstream };
    }

    console.error("音声再生中にエラーが発生しました", {
      url: resolvedUrl.href,
      upstream,
      status: response.status,
      statusText: response.statusText,
      originalError
    });
    return { status: response.status, statusText: response.statusText, upstream };
  } catch (fetchError) {
    console.error("音声リソースの取得に失敗しました", {
      url,
      status: null,
      errorName: fetchError?.name,
      message: fetchError?.message,
      originalError,
      fetchError
    });
    return { status: null, error: fetchError };
  }
}
