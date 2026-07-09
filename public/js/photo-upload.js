/**
 * 写真アップロード共通ヘルパー
 * - カメラ撮影 or ギャラリー選択
 * - 自動リサイズ（長辺 1600px まで）
 * - Base64 データURIに変換
 */

async function pickPhoto({ camera = false } = {}) {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (camera) input.capture = "environment";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return reject(new Error("ファイルが選択されませんでした"));
      try {
        const resized = await resizeImage(file, 2000);
        resolve(resized);
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

async function resizeImage(file, maxSize = 2000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUri = canvas.toDataURL("image/jpeg", 0.85);
        resolve(dataUri);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * カメラ/ギャラリー選択ダイアログ（モーダル）
 */
function showPhotoPicker({ onSelect, onCancel } = {}) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end;justify-content:center;z-index:300;";
  overlay.innerHTML = `
    <div style="background:var(--white);border-radius:var(--radius) var(--radius) 0 0;padding:20px 16px;width:100%;max-width:430px;">
      <div style="text-align:center;font-size:14px;color:var(--gray-500);margin-bottom:12px;">写真を追加</div>
      <button class="btn btn-primary" id="pp-camera" style="margin-bottom:10px;">📷 カメラで撮る</button>
      <button class="btn btn-outline" id="pp-gallery" style="margin-bottom:10px;">🖼 ギャラリーから選ぶ</button>
      <button class="btn" id="pp-cancel" style="background:var(--gray-100);color:var(--gray-600);">キャンセル</button>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => document.body.removeChild(overlay);

  overlay.querySelector("#pp-camera").addEventListener("click", async () => {
    close();
    try {
      const data = await pickPhoto({ camera: true });
      if (onSelect) onSelect(data);
    } catch (e) {
      if (onCancel) onCancel();
    }
  });

  overlay.querySelector("#pp-gallery").addEventListener("click", async () => {
    close();
    try {
      const data = await pickPhoto({ camera: false });
      if (onSelect) onSelect(data);
    } catch (e) {
      if (onCancel) onCancel();
    }
  });

  overlay.querySelector("#pp-cancel").addEventListener("click", () => {
    close();
    if (onCancel) onCancel();
  });
}

window.pickPhoto = pickPhoto;
window.showPhotoPicker = showPhotoPicker;
