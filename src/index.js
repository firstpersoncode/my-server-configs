const express = require('express')
const morgan = require('morgan')
const cors = require('cors')

const render = require('./render')

const server = express()

module.exports = (ctx, env = 'prod', config = null) => {
  const {
    serverCtx
  } = ctx

  const {
    homeUrl,
    dist,
    public,
    crossOrigin
  } = serverCtx

  const distUrl = '/'+dist+'/'
  const publicUrl = '/'+public+'/'

  const distDir = path.resolve(process.cwd(), dist)
  const publicDir = path.resolve(process.cwd(), public)

  server.use(distUrl, express.static(distDir))
  server.use(publicUrl, express.static(publicDir))

  if (env == 'dev' && config) {
    const webpack = require('webpack')
    const webpackDevMiddleware = require('webpack-dev-middleware')
    const webpackHotMiddleware = require('webpack-hot-middleware')

    const compiler = webpack(config)

    if (crossOrigin) {
      server.use((req, res, next) => {
        // res.header("Access-Control-Allow-Origin", "*")
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
        next()
      })

      server.use(cors())
      server.options('*', cors())
    }


    server.use(webpackDevMiddleware(compiler, { publicPath: config.output.publicPath }))
    server.use(webpackHotMiddleware(compiler))
    server.use(morgan('dev'))
  }

  return server.get(homeUrl + '*', (req, res) => {
    render(Object.assign({}, ctx, { req, res }))
      .then(({ html, context }) => {
        if (context.status) {
          console.log('Context status: ', context.status)
          return res.status(context.status).send(html)
        }
        if (context.url) {
          return res.redirect(302, context.url)
        }
        res.send(html)
      })
      .catch(err => {
        console.error(err)
        return res.sendStatus(500)
      })
  })
}
