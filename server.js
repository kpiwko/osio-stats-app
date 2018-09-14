//  OpenShift sample Node application
const express = require('express')
const morgan  = require('morgan')
const mcache = require('memory-cache')
const osioStats = require('osio-stats')
const path = require('path')
const cons = require('consolidate')

const app = express()
// Register '.mst' extension with Consolidate
app.engine('mst', cons.mustache)
app.set('view engine', 'mst')
app.set('views', __dirname + '/views')

app.use(morgan('combined'))

const port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080
const ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0'

var cache = (duration) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url
    let cachedBody = mcache.get(key)
    if (cachedBody) {
      res.send(cachedBody)
      return
    } else {
      res.sendResponse = res.send
      res.send = (body) => {
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body)
      }
      next()
    }
  }
}

// cache results for 1 hour
app.use('/', require('./app/index'))

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
})

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port)

module.exports = app
