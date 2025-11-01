from pathlib import Path
from typing import Iterable

import requests

SAVE_FOLDER = Path("ipa_sounds")
BASE_URL = "https://www.coelang.tufs.ac.jp/ipa/sounds/"

PULMONIC_FILES = [f"s{i}.mp3" for i in range(101, 159)]
VOWEL_FILES = [f"v{i}.mp3" for i in range(101, 131)]

SOUND_GROUPS = {
    "pulmonic": PULMONIC_FILES,
    "vowels": VOWEL_FILES,
}


def download_file(filename: str, destination: Path) -> None:
    url = BASE_URL + filename
    dest_path = destination / filename

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        dest_path.write_bytes(response.content)
        print(f"✅ ダウンロード成功: {filename}")
    except requests.exceptions.RequestException as exc:  # pragma: no cover - utility script
        print(f"❌ ダウンロード失敗: {filename} → {exc}")


def download_group(group: str, files: Iterable[str]) -> None:
    target_dir = SAVE_FOLDER / group
    target_dir.mkdir(parents=True, exist_ok=True)

    for filename in files:
        download_file(filename, target_dir)


def main() -> None:
    SAVE_FOLDER.mkdir(exist_ok=True)
    for group, files in SOUND_GROUPS.items():
        print(f"=== {group} ===")
        download_group(group, files)


if __name__ == "__main__":
    main()
