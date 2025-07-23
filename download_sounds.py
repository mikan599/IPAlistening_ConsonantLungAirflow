import os
import requests

# 保存先のフォルダ（存在しなければ自動で作成）
save_folder = "ipa_sounds"
os.makedirs(save_folder, exist_ok=True)

# ベースURL
base_url = "https://www.coelang.tufs.ac.jp/ipa/sounds/"

# s101 ～ s152 をループで処理
for i in range(101, 159):
    filename = f"s{i}.mp3"
    url = base_url + filename
    save_path = os.path.join(save_folder, filename)

    try:
        response = requests.get(url)
        response.raise_for_status()  # 失敗したらエラーを出す

        # 音声ファイルを保存
        with open(save_path, "wb") as f:
            f.write(response.content)

        print(f"✅ ダウンロード成功: {filename}")

    except requests.exceptions.RequestException as e:
        print(f"❌ ダウンロード失敗: {filename} → {e}")