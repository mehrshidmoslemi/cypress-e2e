async function main() {
  const js = await fetch('https://app.aihomedesign.com/_nuxt/LIENjJ_H.js').then((r) => r.text())
  const idx = js.indexOf('customer-retention')
  while (idx >= 0) {
    let i = js.indexOf('customer-retention')
    console.log(js.slice(i - 50, i + 120))
    break
  }
  const matches = [...js.matchAll(/customer-retention[^\"]{0,80}/g)]
  console.log('matches', matches.length)
  for (const m of matches) console.log(m[0])
}

main()
