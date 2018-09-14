'use strict'

const express = require('express')
const Planner = require('./lib/planner')
const datatransformers = require('./lib/datatransformers')

const router = express.Router()

// define the home page route
router.get('/', async (req, res, next) => {
  try {

    const data = await iterations('e8864cfe-f65a-4351-85a4-3a585d801b45', [])

    console.log(JSON.stringify(data, null, 2))

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

const iterations = async (space, includeItemTypes) => {

  const planner = new Planner()
  
  const columns = datatransformers.all//.filter(dt => {
    //return true//argv.columns.includes(dt.id)
  //})

  let iterations = await planner.iterationsWithDetails(space, includeItemTypes)

  // sort iterations
  iterations = iterations.sort((a, b) => {
    return a.name.localeCompare(b.name)
  })

  const iterationsHelper = (iterations, columns) => {
    const data = []
    iterations.forEach(iteration => {
      const entry = columns.reduce((acc, column) => {
        acc.push(iteration[column.id])
        return acc
      }, [])
      data.push(`<td>${entry.join('</td><td>')}</td>`)
    })
    return data
  }

  const metadata = ' '
  /*
  Object.keys(argv).filter(k => k!=='_' && k!=='$0').map(k => {
    const value = argv[k]
    return `--${k} ${Array.isArray(value) ? (value.length ? value.join(' ') : '[]') : value}`
  }).join(' ')*/
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


/*
get('/', (req, res) => {

  const argv = {
    '_': 'iterations',
    'columns': ['name', 'total', 'wis', 'woSPs', 'woACs', 'spCom', 'spTotal'],
    'space': 'e8864cfe-f65a-4351-85a4-3a585d801b45',
    'include-item-types': []
  }

  
})
*/

module.exports = router