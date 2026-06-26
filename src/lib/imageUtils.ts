export async function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                console.warn("Canvas conversion returned null blob, falling back to original file.");
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          console.warn("Compression canvas processing failed, falling back to original file:", err);
          resolve(file);
        }
      };
      img.onerror = (error) => {
        console.warn("Image loading for compression failed, falling back to original file:", error);
        resolve(file);
      };
    };
    reader.onerror = (error) => {
      console.warn("FileReader for compression failed, falling back to original file:", error);
      resolve(file);
    };
  });
}
