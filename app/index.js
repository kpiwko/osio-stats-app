'use strict'

const express = require('express')
const Planner = require('./lib/planner')
const datatransformers = require('./lib/datatransformers')
const mcache = require('memory-cache')

const router = express.Router()

var cache = (duration) => {
  return (req, res, next) => {
    const refresh = req.query.refresh !== undefined
    const key = '__express__' + req.originalUrl || req.url
    let cachedBody = mcache.get(key)
    if (cachedBody && !refresh) {
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

// define the home page route and cache it for 1 hour
router.get('/', cache(3600), async (req, res, next) => {
  try {

    let itemTypes=req.query.items || ['Story']
    itemTypes = Array.isArray(itemTypes) ? itemTypes : [itemTypes]
    let columns = req.query.columns || ['name', 'total', 'wis', 'withSPs', 'withACs', 'spCom',  'spTot']
    columns = Array.isArray(columns) ? columns : [columns]

    const data = await iterations('e8864cfe-f65a-4351-85a4-3a585d801b45', itemTypes, columns)

    res.render('index', Object.assign(data, {
      partials: {
        iterations: 'partials/iterations'
      }})
    )
  }
  catch(err) {
    next(err)
  }
})

const iterations = async (space, includeItemTypes, columns) => {

  const planner = new Planner()
  
  columns = datatransformers.all.filter(dt => {
    return columns.includes(dt.id)
  })

  let iterations = await planner.iterationsWithDetails(space, includeItemTypes)

  // sort iterations
  iterations = iterations.sort((a, b) => {
    return a.name.localeCompare(b.name)
  })

  const iterationsHelper = (iterations, columns) => {
    const data = []
    iterations.forEach(iteration => {
      const entry = columns.reduce((acc, column) => {
        acc.push({
          key: column.id,
          value: iteration[column.id],
          aggregatedValue: column.aggregate(iteration)
        })
        return acc
      }, [])
      data.push({stats: entry})
    })
    return data
  }

  const metadata = `Columns: ${columns.map(c=>c.id).join(',')}, Items types: ${includeItemTypes.join(',')}`
  const data = iterationsHelper(iterations, columns)
  const date = new Date(Date.now()).toUTCString()

  return {
    metadata,
    data,
    date,
    columns,
    dts: datatransformers.all,
    title: 'OpenShift.io Iterations Statistics' 
  }
}

module.exports = router