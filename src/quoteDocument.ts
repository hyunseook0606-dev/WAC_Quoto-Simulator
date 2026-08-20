function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function inlineLocalImages(html: string): Promise<string> {
  const matches = [...html.matchAll(/\bsrc="([^"]+)"/g)]
  const unique = [...new Set(matches.map((m) => m[1]))]
  let out = html
  for (const src of unique) {
    if (!src || src.startsWith('data:')) continue
    try {
      const url = /^https?:\/\//i.test(src)
        ? src
        : `${window.location.origin}${src.startsWith('/') ? src : `/${src}`}`
      const res = await fetch(url)
      if (!res.ok) continue
      const dataUrl = await blobToDataUrl(await res.blob())
      out = out.split(`src="${src}"`).join(`src="${dataUrl}"`)
    } catch {
      // keep original src if inlining fails
    }
  }
  return out
}

/** Print quotation HTML. Inlines images and hides browser URL footer. */
export function printQuotation(html: string) {
  void (async () => {
    const printable = (await inlineLocalImages(html)).replace(
      '</head>',
      `<style>@page{size:A4 portrait;margin:0}</style></head>`,
    )
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.setAttribute('title', 'AIR FREIGHT QUOTATION')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument
    if (!doc) {
      iframe.remove()
      return
    }
    doc.open()
    doc.write(printable)
    doc.close()
    if (doc.title) doc.title = 'AIR FREIGHT QUOTATION'

    const run = async () => {
      const win = iframe.contentWindow
      const idoc = iframe.contentDocument
      if (!win || !idoc) {
        iframe.remove()
        return
      }
      try {
        if (idoc.fonts?.ready) await idoc.fonts.ready
      } catch {
        // keep going with system fallback fonts
      }
      const images = Array.from(idoc.images)
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve()
                img.onerror = () => resolve()
              }),
        ),
      )
      await new Promise((r) => window.setTimeout(r, 80))
      win.focus()
      win.print()
      window.setTimeout(() => iframe.remove(), 1500)
    }

    if (iframe.contentDocument?.readyState === 'complete') {
      await run()
    } else {
      iframe.onload = () => {
        void run()
      }
    }
  })()
}
