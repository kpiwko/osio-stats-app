//  OpenShift sample Node application
const express = require('express')
const morgan  = require('morgan')
const mcache = require('memory-cache');
const osioStats = require('osio-stats')

const app = express()
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = ""

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://'
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@'
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase

  }
}
const db = null,
    dbDetails = new Object()

const initDb = function(callback) {
  if (mongoURL == null) return

  const mongodb = require('mongodb')
  if (mongodb == null) return

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err)
      return
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB'

    console.log('Connected to MongoDB at: %s', mongoURL)
  })
}

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
app.get('/', cache(3600), (req, res) => {

  const argv = {
    '_': 'iterations',
    'columns': ['name', 'total', 'wis', 'woSPs', 'woACs', 'spCom', 'spTotal'],
    'space': 'e8864cfe-f65a-4351-85a4-3a585d801b45',
    'include-item-types': []
  }

  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){})
  }
  (async () => {

    if(req.query.json !== undefined) {
      argv.json = true
    }
    else {
      argv.html = true
    }

    const output = await osioStats.iterations.executor(argv)

    if(argv.json) {
      res.type('json');
    }
    return res.send(output)
  })()
})

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){})
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}')
    })
  } else {
    res.send('{ pageCount: -1 }')
  }
})

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
})

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
})

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port)

module.exports = app
