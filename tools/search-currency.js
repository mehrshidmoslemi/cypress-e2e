async function main() {
  const html = await fetch('https://app.aihomedesign.com/pricing').then((r) => r.text())
  const chunks = [...new Set([...html.matchAll(/\/_nuxt\/[^"']+\.js/g)].map((m) => m[0]))]
  for (const chunk of chunks) {
    const js = await fetch(`https://app.aihomedesign.com${chunk}`).then((r) => r.text())
    if (js.includes('Upgrade Summary') || js.includes('upgrade_summary')) {
      console.log('FILE', chunk)
      const idx = js.indexOf('Upgrade')
      console.log(js.slice(Math.max(0, idx - 100), idx + 400))
    }
  }
}

main()
