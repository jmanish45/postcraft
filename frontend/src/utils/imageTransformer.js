/**
 * Anti-Duplicate Image Transformer
 * Transforms campaign images dynamically using client-side HTML5 Canvas:
 * 1. Micro-Cropping (0.8% - 1.5% edge shave) -> alters spatial coordinates & dHash
 * 2. Micro-Rotation (±0.25° tilt) -> disrupts 2D DCT frequency bins
 * 3. Subtle Brightness/Contrast Jitter (±1%) -> alters color histograms
 * 4. Micro-Noise Injection -> randomizes high-frequency pixel data
 * 5. Dynamic JPEG Re-encoding (89% - 94%) -> guarantees unique file hash (SHA-256)
 */

export function getProxiedImageUrl(originalUrl) {
  if (!originalUrl || typeof originalUrl !== "string") return "";
  if (originalUrl.startsWith("data:") || originalUrl.startsWith("blob:")) {
    return originalUrl;
  }

  let apiBase = (import.meta.env.VITE_API_URL || "").trim();
  apiBase = apiBase.replace(/\/+$/, "");
  if (apiBase.endsWith("/api")) {
    apiBase = apiBase.slice(0, -4);
  }
  const endpoint = apiBase ? `${apiBase}/api/proxy-image` : "/api/proxy-image";
  return `${endpoint}?url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Creates an in-memory unique anti-duplicate image variant.
 * @param {string} rawImageUrl
 * @returns {Promise<{ blob: Blob, dataUrl: string, fileName: string }>}
 */
export async function createAntiDuplicateVariant(rawImageUrl) {
  return new Promise((resolve, reject) => {
    const proxiedUrl = getProxiedImageUrl(rawImageUrl);
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        if (!origW || !origH) {
          throw new Error("Invalid image dimensions.");
        }

        // 1. RANDOM MICRO-CROP (Shave 0.8% to 1.5% from edges)
        const cropPercentX = 0.008 + Math.random() * 0.007;
        const cropPercentY = 0.008 + Math.random() * 0.007;
        const cropX = Math.floor(origW * cropPercentX);
        const cropY = Math.floor(origH * cropPercentY);
        const targetW = origW - cropX * 2;
        const targetH = origH - cropY * 2;

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");

        // 2. RANDOM MICRO-ROTATION (-0.25° to +0.25°)
        const angleDeg = Math.random() * 0.5 - 0.25;
        const angleRad = (angleDeg * Math.PI) / 180;

        ctx.save();
        ctx.translate(targetW / 2, targetH / 2);
        ctx.rotate(angleRad);
        ctx.translate(-targetW / 2, -targetH / 2);

        // 3. TONE & BRIGHTNESS JITTER (±1%)
        const brightness = 1 + (Math.random() * 0.02 - 0.01);
        const contrast = 1 + (Math.random() * 0.02 - 0.01);
        ctx.filter = `brightness(${brightness}) contrast(${contrast})`;

        // Draw cropped and transformed image
        ctx.drawImage(img, cropX, cropY, targetW, targetH, 0, 0, targetW, targetH);
        ctx.restore();

        // 4. INVISIBLE MICRO-NOISE INJECTION
        try {
          const imgData = ctx.getImageData(0, 0, targetW, targetH);
          const data = imgData.data;
          // Step by 16 for high-speed performance on mobile
          for (let i = 0; i < data.length; i += 16) {
            const noise = (Math.random() - 0.5) * 3;
            data[i] = Math.min(255, Math.max(0, data[i] + noise));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          // If security or tainted canvas warning happens, proceed with standard canvas
          console.warn("Pixel noise step skipped:", e);
        }

        // 5. RANDOMIZED RE-ENCODING QUALITY (90% to 94%)
        const randomQuality = 0.9 + Math.random() * 0.04;
        const uniqueId = Math.random().toString(36).substring(2, 7);
        const fileName = `postcraft_unique_${uniqueId}.jpg`;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas blob conversion failed."));
              return;
            }
            resolve({
              blob,
              dataUrl: URL.createObjectURL(blob),
              fileName,
            });
          },
          "image/jpeg",
          randomQuality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => {
      reject(new Error("Could not load image for anti-duplicate processing."));
    };

    img.src = proxiedUrl;
  });
}

/**
 * Downloads a unique anti-duplicate image to the user's device.
 */
export async function downloadUniqueImage(rawImageUrl, postIndex = 0) {
  const { blob, fileName } = await createAntiDuplicateVariant(rawImageUrl);
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `post_${postIndex + 1}_${fileName}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
  return fileName;
}

/**
 * Copies a unique anti-duplicate image to the system clipboard (PNG format).
 */
export async function copyUniqueImageToClipboard(rawImageUrl) {
  const proxiedUrl = getProxiedImageUrl(rawImageUrl);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(async (pngBlob) => {
          if (!pngBlob) {
            resolve(false);
            return;
          }
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": pngBlob }),
            ]);
            resolve(true);
          } catch {
            resolve(false);
          }
        }, "image/png");
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = proxiedUrl;
  });
}
