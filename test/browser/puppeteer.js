const puppeteer = require('puppeteer')

async function run () {
  let executionQueue = Promise.resolve()

  const browser = await puppeteer.launch()
  const [page] = await browser.pages()

  page.on('console', (msg) => {
    const args = []
    for (const arg of msg.args()) {
      args.push(arg.evaluate(n => n))
    }
    executionQueue = executionQueue.then(async () => {
      console.log.apply(null, await Promise.all(args))
    })
  })

  await page.goto(`file:///${__dirname}/index.html`)

  await page.evaluate(function (self) {
    return new Promise((resolve, reject) => {
      mocha.suite.afterAll('puppeteer-finish', () => { // eslint-disable-line
        setTimeout(resolve, 100)
      })
    })
  })

  await executionQueue.then(() => browser.close())
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
