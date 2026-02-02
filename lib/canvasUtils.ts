export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<Blob | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  // Set width to double for high-res retention
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // Scale down if width > 1200px to reduce payload
  let outputCanvas: HTMLCanvasElement = canvas
  const maxWidth = 1200
  if (canvas.width > maxWidth) {
    const scale = maxWidth / canvas.width
    const newWidth = maxWidth
    const newHeight = Math.round(canvas.height * scale)
    const scaledCanvas = document.createElement('canvas')
    scaledCanvas.width = newWidth
    scaledCanvas.height = newHeight
    const scaledCtx = scaledCanvas.getContext('2d')
    if (scaledCtx) {
      scaledCtx.drawImage(canvas, 0, 0, newWidth, newHeight)
      outputCanvas = scaledCanvas
    }
  }

  return new Promise((resolve) => {
    outputCanvas.toBlob((blob) => {
      resolve(blob)
    }, 'image/jpeg', 0.8)
  })
}

/** Resize image file to max width (e.g. 1200px) to reduce upload size. Returns JPEG blob or null. */
export async function resizeImageToMaxWidth(
  file: File,
  maxWidth: number
): Promise<Blob | null> {
  if (!file.type.startsWith('image/')) return null
  const url = URL.createObjectURL(file)
  try {
    const image = await createImage(url)
    const w = image.naturalWidth
    const h = image.naturalHeight
    if (w <= maxWidth) return null
    const scale = maxWidth / w
    const newWidth = maxWidth
    const newHeight = Math.round(h * scale)
    const canvas = document.createElement('canvas')
    canvas.width = newWidth
    canvas.height = newHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(image, 0, 0, newWidth, newHeight)
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
