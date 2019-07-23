const React = require('react')
const { HelmetProvider } = require('react-helmet-async')
const { Provider } = require('react-redux')
const { renderToString } = require('react-dom/server')
const { renderStylesToString } = require('emotion-server')
const Loadable = require('react-loadable')
const { getBundles } = require('react-loadable-ssr-addon')
const serialize = require('serialize-javascript')
const { StaticRouter } = require('react-router')

const renderHtml = data => {
  const {
    req,
    store,
    context,
    helmetCtx,
    manifest,
    Layout
  } = data

  const modules = new Set()
  const root = renderStylesToString(renderToString(
    <Loadable.Capture report={moduleName => modules.add(moduleName)}>
      <HelmetProvider context={helmetCtx}>
        <Provider store={store}>
          <StaticRouter location={req.url} context={context}>
            <Layout />
          </StaticRouter>
        </Provider>
      </HelmetProvider>
    </Loadable.Capture>
  ))

  const bundles = getBundles(manifest, [...manifest.entrypoints, ...Array.=(require(modules)])

  const styles = bundles.css || []
  const scripts = bundles.js || []

  const { helmet } = helmetCtx

  let helmetTitle = helmet.title.toString()
  let helmetMeta = helmet.meta.toString()
  let helmetLink = helmet.link.toString()
  let helmetScript = helmet.script.toString()
  let initScript = `<script type="text/javascript">window.INITIAL_STATE = ${serialize(
    store.getState()
  )};</script>`

  const html = `<!doctype html>
    <html lang="en">
      <head>
        ${helmetTitle}
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        ${[helmetMeta, helmetLink, helmetScript]
        .filter(s => s !== '')
        .join('\n')}
        ${styles.map(style => {
          return `<link href="/dist/${style.file}" rel="stylesheet" />`
        }).join('\n')}
      </head>
      <body>
        <div id="root">${root}</div>
        ${initScript}
        ${scripts.map(script => {
          return `<script src="/dist/${script.file}"></script>`
        }).join('\n')}
      </body>
    </html>`
  return { html, context }
}

module.exports = ctx => {
  const {
    routes,
    Layout,
    manifest,
    store,
    getInitialData,
    req, res
  } = ctx

  let helmetCtx = {}, context, res
  const promises = getInitialData({ req, routes, store })
  return Promise.all(promises)
    .then(() => {
      context = {}
      res = renderHtml({
        req,
        store,
        context,
        helmetCtx,
        manifest,
        Layout
      })
      return res
    })
    .catch(err => console.error('Error getInitialData:\n', err))
}

export default render
