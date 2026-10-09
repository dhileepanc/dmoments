function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function circle(ctx, cx, cy, r, fill) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 2)
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function buildPhotoPoster({
  qrDataUrl,
  eventName,
  appName,
  photographerName,
  phone,
  email,
}) {
  const W = 1080
  const H = 1440
  const margin = 70
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const font = '"Segoe UI", "Roboto", Arial, sans-serif'

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#8b5cf6')
  bg.addColorStop(0.55, '#5b2fd9')
  bg.addColorStop(1, '#251a52')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  circle(ctx, -140, 180, 340, 'rgba(255,255,255,0.08)')
  circle(ctx, W - 130, 700, 420, 'rgba(255,255,255,0.06)')
  circle(ctx, W + 90, H - 100, 320, 'rgba(255,255,255,0.07)')
  circle(ctx, 150, H + 60, 260, 'rgba(255,255,255,0.06)')

  roundRectPath(ctx, margin, margin, W - margin * 2, H - margin * 2, 54)
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.35)'
  ctx.shadowBlur = 48
  ctx.shadowOffsetY = 22
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#7c3aed'
  ctx.font = `600 30px ${font}`
  ctx.fillText('◆  W E L C O M E  ◆', W / 2, margin + 95)

  ctx.font = `700 62px ${font}`
  const titleLines = wrapText(ctx, eventName || 'Event Gallery', W - 200)
  const titleStart = margin + 165

  ctx.fillStyle = '#1f2430'
  titleLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, titleStart + i * 82)
  })

  const subtitleY = titleStart + titleLines.length * 82 + 14
  ctx.fillStyle = '#6b7280'
  ctx.font = `28px ${font}`
  ctx.fillText('Scan the QR code to view & download event photos', W / 2, subtitleY)

  const qrImg = await loadImage(qrDataUrl)
  const qrBox = 520
  const qrPad = 36
  const qrY = subtitleY + 64

  roundRectPath(ctx, W / 2 - qrBox / 2, qrY, qrBox, qrBox, 28)
  ctx.save()
  ctx.shadowColor = 'rgba(31,36,48,0.22)'
  ctx.shadowBlur = 26
  ctx.shadowOffsetY = 10
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = '#e4e7ec'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.drawImage(qrImg, W / 2 - qrBox / 2 + qrPad, qrY + qrPad, qrBox - qrPad * 2, qrBox - qrPad * 2)

  const contactY = qrY + qrBox + 58
  ctx.fillStyle = '#1f2430'
  ctx.font = `700 42px ${font}`
  ctx.fillText(photographerName || 'Your Photographer', W / 2, contactY)

  ctx.fillStyle = '#6b7280'
  ctx.font = `30px ${font}`
  let cty = contactY + 52
  if (phone) {
    ctx.fillText(`Phone : ${phone}`, W / 2, cty)
    cty += 44
  }
  if (email) {
    ctx.fillText(`Email : ${email}`, W / 2, cty)
  }

  if (appName) {
    ctx.textAlign = 'left'
    ctx.font = `600 28px ${font}`
    ctx.fillStyle = '#8a8f98'
    ctx.fillText(appName, margin + 56, H - margin - 44)
  }
  ctx.textAlign = 'right'
  ctx.font = `600 26px ${font}`
  ctx.fillStyle = '#c4c7d0'
  ctx.fillText('Scan & Download ✦', W - margin - 56, H - margin - 44)

  return canvas.toDataURL('image/png')
}