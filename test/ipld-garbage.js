// based on https://github.com/substack/node-garbage/blob/master/index.js

const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`~!@#$%^&*()-_=+[]{}|\\:;\'",.<>?/ \t\n'

function garbage (count = 200, options = {}) {
  return generate(count, options)[1]
}

function generate (count, options) {
  let totWeight = 0
  const types = Object.keys(generators).map((t) => {
    const weight = options.weights && typeof options.weights[t] === 'number' ? options.weights[t] : 1
    if (weight < 0) {
      throw new TypeError('Cannot have a negative weight')
    }
    totWeight += weight
    return [t, weight]
  })
  if (totWeight === 0) {
    throw new Error('Cannot have a total weight of zero')
  }
  const rnd = Math.random() * totWeight
  let wacc = 0
  for (const [type, weight] of types) {
    wacc += weight
    if (wacc >= rnd) {
      return generators[type](count, options)
    }
  }
  throw new Error('Internal error')
}

function rndSize (bias = 5) {
  const m = Math.random()
  const n = Math.random()
  return Math.abs(Math.floor(5 / (1 - n * n) - 5 + m * bias))
}

function rndChar () {
  return charset.charAt(Math.floor(Math.random() * charset.length))
}

function rndByte () {
  return Math.floor(Math.random() * 256)
}

const generators = {
  list (count, options) {
    const res = []
    if (count <= 0) {
      return res
    }
    const len = rndSize()
    let size = 1
    for (let i = 0; i < len && size < count; i++) {
      const x = generate(--count - len, options)
      res.push(x[1])
      size += x[0]
    }
    return [size, res]
  },

  map (count, options) {
    if (count === undefined) {
      count = 20
    }

    const res = {}
    if (count <= 0) {
      return res
    }
    const len = rndSize()
    let size = 1
    for (let i = 0; i < len && size < count; i++) {
      const key = generators.string(5)[1]
      const x = generate(--count - len, options)
      res[key] = x[1]
      size += x[0]
    }
    return [size, res]
  },

  string (bias = 50) {
    const len = rndSize(bias)
    const res = []
    for (let i = 0; i < len; i++) {
      const c = rndChar()
      res.push(c)
    }
    return [1, res.join('')]
  },

  bytes () {
    const len = rndSize(50)
    const res = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      res[i] = rndByte()
    }
    return [1, res]
  },

  boolean  () {
    const n = Math.random()
    return [1, n > 0.5]
  },

  integer () {
    const n = Math.random()
    const neg = Math.random() < 0.5
    return [1, Math.floor(Number.MAX_SAFE_INTEGER * n) * (neg ? -1 : 1)]
  },

  float () {
    const n = Math.random()
    return [1, Math.tan((n - 0.5) * Math.PI)]
  },

  null () {
    return [1, null]
  }
}

export default garbage
