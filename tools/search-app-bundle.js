async function main() {
  const html = await fetch('https://app.aihomedesign.com/pricing').then((r) => r.text())
  const chunks = [...new Set([...html.matchAll(/\/_nuxt\/[^"']+\.js/g)].map((m) => m[0]))]
  for (const chunk of chunks) {
    const js = await fetch(`https://app.aihomedesign.com${chunk}`).then((r) => r.text())
    if (/Downgrade/.test(js) && /dialog|Modal/.test(js)) {
      const idx = js.indexOf('Downgrade')
      if (js.slice(idx, idx + 300).includes('button') || js.includes('confirm')) {
        console.log(chunk, js.match(/Downgrade[\s\S]{0,200}/)?.[0]?.slice(0, 200))
      }
    }
  }
}

main()
