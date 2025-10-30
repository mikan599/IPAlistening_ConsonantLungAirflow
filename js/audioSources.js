// Netlify の Deploy Preview でも 404 にならないよう、音声ファイルは常に絶対URLで参照する。
export const TUFS_AUDIO_BASE = "https://www.coelang.tufs.ac.jp/ipa/sounds/";

export function buildAudioSrc(filename) {
  return new URL(filename, TUFS_AUDIO_BASE).href;
}

export function buildAudioSrcById(soundID) {
  return buildAudioSrc(`${soundID}.mp3`);
}

export async function reportAudioError(url, originalError) {
  try {
    const response = await fetch(url, { method: "HEAD" });

    if (!response.ok) {
      console.error("音声リソースの取得に失敗しました", {
        url,
        status: response.status,
        statusText: response.statusText,
        originalError
      });
      return { status: response.status, statusText: response.statusText };
    }

    console.error("音声再生中にエラーが発生しました", {
      url,
      status: response.status,
      statusText: response.statusText,
      originalError
    });
    return { status: response.status, statusText: response.statusText };
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
