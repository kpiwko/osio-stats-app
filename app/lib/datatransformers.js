'use strict'

const flat = require('flat')

const AC_REGEX = RegExp(/acceptance criteria/, 'i')

/**
 * Generic data transformed of data from WIT able to do map / reduce operations.
 * This class is abstract and you need to implement method reduce
 */
class DataTransformer {
  /**
   * 
   * @param {*} id Identification of the transformer
   * @param {*} title Title used when transformed data are visualized to user
   * @param {*} description Description of the transformer
   */
  constructor(id, title, description) {
    this._id = id
    this._title = title
    this._description = description
  }

  reduce(acc, iteration, workitems) {
    throw new Error('This is an abstract method that needs to be implemented')
  }

  aggregate(iteration) {
    return null
  }

  link(space, iteration, itemTypes) {
    return null
  }

  isSimple() {
    return typeof this.reduce === 'function' && this.reduce.length <= 2
  }

  get id() {
    return this._id
  }

  get title() {
    return this._title
  }

  get description() {
    return this._description
  }

}

class IterationId extends DataTransformer {
  constructor() {
    super('id', 'ID', 'ID of iteration')
  }

  reduce(acc, iteration) {
    acc.id = iteration.id
    return acc
  }
}

class IterationParentId extends DataTransformer {
  constructor() {
    super('pid', 'Parent ID', 'ID of iteration parent, if it exists')
  }

  reduce(acc, iteration) {
    acc.pid = iteration.pid || iteration['relationships.parent.data.id']
    return acc
  }
}

class IterationName extends DataTransformer {
  constructor() {
    super('name', 'Name', 'Name of iteration')
  }

  reduce(acc, iteration) {
    acc.name = iteration.name || iteration['attributes.name']
    return acc
  }
}

class IterationTotalWorkItems extends DataTransformer {
  constructor() {
    super('total', '# Total WIs (including child iterations)', 'Number of total workitems in iteration (including children and all workitem types)')
  }

  reduce(acc, iteration) {
    acc.total = iteration.total !== undefined ? iteration.total : iteration['relationships.workitems.meta.total']
    return acc
  }
}

class IterationWorkItems extends DataTransformer {
  constructor() {
    super('wis', '# WIs in iteration of given type(s)', 'Number of workitems in iteration (direct items only and filtered by work item type)')
  }

  reduce(acc, iteration, workitems) {
    acc.wis = 0
    return workitems.reduce((innerAcc) => {
      innerAcc.wis++
      return innerAcc
    }, acc)
  }

  link(space, iteration, itemTypes) {
    const iterationId = iteration[new IterationId().id]
    // FIXME include space and itemType to the query
    const query=`(typegroup.name:Execution%20$AND%20iteration:${iterationId}%20$AND%20workitemtype:6ff83406-caa7-47a9-9200-4ca796be11bb)&showCompleted=true` 
    return `https://openshift.io/openshiftio/Openshift_io/plan?q=${query}`
  }
}

class IterationStoryPoints extends DataTransformer {
  constructor() {
    super('withSPs', '# WIs with Story points', 'Number of workitems of given type(s) in iteration with story points')
  }

  reduce(acc, iteration, workitems) {
    acc.withSPs = 0
    return workitems.reduce((innerAcc, wi) => {
      wi = flat.flatten(wi)
      const sp = wi['attributes.storypoints']
      if(sp) {
        innerAcc.withSPs++
      }
      return innerAcc
    }, acc)
  }

  aggregate(iteration) {
    if(!iteration[new IterationWorkItems().id]) {
      return '0%'
    }
    return `${Math.round((iteration[this.id] * 1.0 / iteration[new IterationWorkItems().id])*100).toFixed(0)}%`
  }
}

class IterationAcceptanceCriteria extends DataTransformer {
  constructor() {
    super('withACs', '# WIs with Acceptance Criteria', 'Number of workitems of given type(s) in iteration with acceptance criteria')
  }

  reduce(acc, iteration, workitems) {
    acc.withACs = 0
    return workitems.reduce((innerAcc, wi) => {
      wi = flat.flatten(wi)
      const description = wi['attributes.system.description']
      if(description && AC_REGEX.test(description)) {
        innerAcc.withACs++
      }
      return innerAcc
    }, acc)
  }

  aggregate(iteration) {
    if(!iteration[new IterationWorkItems().id]) {
      return '0%'
    }
    return `${Math.round((iteration[this.id] * 1.0 / iteration[new IterationWorkItems().id])*100).toFixed(0)}%`
  }
}

class IterationCompleteStoryPoints extends DataTransformer {
  constructor() {
    super('spCom', 'Story Points completed', 'Total story points completed (marked as Closed) in the iteration')
  }

  reduce(acc, iteration, workitems) {
    acc.spCom = 0
    return workitems.reduce((innerAcc, wi) => {
      wi = flat.flatten(wi)
      const sp = wi['attributes.storypoints']
      if(sp && wi['attributes.system.state'] === 'Closed') {
        acc.spCom += sp  
      }
      return innerAcc
    }, acc)
  }

  aggregate(iteration) {
    if(!iteration[new IterationTotalStoryPoints().id]) {
      return '0%'
    }
    return `${Math.round((iteration[this.id] * 1.0 / iteration[new IterationTotalStoryPoints().id])*100).toFixed(0)}%`
  }
}

class IterationTotalStoryPoints extends DataTransformer {
  constructor() {
    super('spTot', 'Story Points Total', 'Total story points estimated in the iteration')
  }

  reduce(acc, iteration, workitems) {
    acc.spTot = 0
    return workitems.reduce((innerAcc, wi) => {
      wi = flat.flatten(wi)
      const sp = wi['attributes.storypoints']
      if(sp) {
        acc.spTot += sp  
      }
      return innerAcc
    }, acc)
  }
}

const all = [
  new IterationId(), new IterationParentId(), new IterationName(), 
  new IterationTotalWorkItems(), new IterationWorkItems(), 
  new IterationStoryPoints(), new IterationAcceptanceCriteria(),
  new IterationCompleteStoryPoints(), new IterationTotalStoryPoints()
]

module.exports = {
  DataTransformer,
  all,
  simple: all.filter(dt => dt.isSimple()) 
}