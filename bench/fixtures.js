/**
 * Deterministic fixture generators for cborg benchmarks.
 * Generates realistic IPLD/CBOR data shapes for both Filecoin-like (bytes-heavy)
 * and Bluesky-like (string-heavy) workloads.
 *
 * Uses seeded PRNG for reproducibility across runs.
 */

/**
 * BenchCID - A lightweight CID-like class for benchmarking.
 *
 * This mimics the structure of real CIDs from multiformats so that
 * cidEncoder's fast-path detection works correctly:
 *   - obj.asCID === obj (self-reference check)
 *   - obj['/'] === obj.bytes (legacy check)
 *
 * This allows benchmarks to capture the real overhead of CID encoding/decoding
 * without depending on the multiformats package.
 */
export class BenchCID {
  /**
   * @param {Uint8Array} bytes - The raw CID bytes (36 bytes for CIDv1 + sha256)
   */
  constructor (bytes) {
    this.bytes = bytes
    // Self-reference for CID detection (matches real CID behavior)
    this.asCID = this
    // Legacy IPLD detection path
    this['/'] = bytes
  }
}

// Mulberry32 - simple seeded PRNG
function mulberry32 (seed) {
  return function () {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Random utilities built on seeded PRNG
function createRandom (seed) {
  const rand = mulberry32(seed)

  const randInt = (min, max) => {
    if (max === undefined) {
      max = min
      min = 0
    }
    return Math.floor(rand() * (max - min)) + min
  }

  const randBytes = (len) => {
    const b = new Uint8Array(len)
    for (let i = 0; i < len; i++) b[i] = randInt(256)
    return b
  }

  const randBool = () => rand() > 0.5

  const pick = (arr) => arr[randInt(arr.length)]

  // Generate random string of given length from charset
  const randString = (len, charset = 'abcdefghijklmnopqrstuvwxyz0123456789') => {
    let s = ''
    for (let i = 0; i < len; i++) s += charset[randInt(charset.length)]
    return s
  }

  return { rand, randInt, randBytes, randBool, pick, randString }
}

// Common character sets
const ALPHA_LOWER = 'abcdefghijklmnopqrstuvwxyz'
const ALPHA_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const ALPHANUMERIC = ALPHA_LOWER + DIGITS
const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567'

// Emoji set for realistic post content
const EMOJI = ['😀', '😂', '🎉', '❤️', '🔥', '👍', '🚀', '✨', '💯', '🙌', '👀', '💪', '🤔', '😎', '🌟']

// Words for generating realistic-ish text
const WORDS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'just', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its',
  'think', 'also', 'back', 'after', 'use', 'how', 'our', 'work', 'first', 'well',
  'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'great'
]

/**
 * Generate a fake CID as a BenchCID instance (36 bytes for CIDv1 + sha256)
 * @param {ReturnType<typeof createRandom>} r
 * @returns {BenchCID}
 */
function generateCID (r) {
  const bytes = new Uint8Array(36)
  bytes[0] = 0x01 // CIDv1
  bytes[1] = 0x71 // dag-cbor codec
  bytes[2] = 0x12 // sha2-256
  bytes[3] = 0x20 // 32 bytes digest
  const digest = r.randBytes(32)
  bytes.set(digest, 4)
  return new BenchCID(bytes)
}

/**
 * Generate a DID (did:plc:xxxx format)
 */
function generateDID (r) {
  return `did:plc:${r.randString(24, BASE32)}`
}

/**
 * Generate a handle (user.bsky.social format)
 */
function generateHandle (r) {
  const username = r.randString(r.randInt(4, 16), ALPHA_LOWER + DIGITS)
  const domains = ['bsky.social', 'bsky.app', 'example.com', 'test.dev']
  return `${username}.${r.pick(domains)}`
}

/**
 * Generate an AT-URI
 */
function generateATUri (r, did, collection, rkey) {
  did = did || generateDID(r)
  collection = collection || r.pick([
    'app.bsky.feed.post',
    'app.bsky.feed.like',
    'app.bsky.graph.follow',
    'app.bsky.feed.repost'
  ])
  rkey = rkey || r.randString(13, ALPHANUMERIC)
  return `at://${did}/${collection}/${rkey}`
}

/**
 * Generate an ISO 8601 timestamp
 */
function generateTimestamp (r) {
  const year = r.randInt(2020, 2025)
  const month = String(r.randInt(1, 13)).padStart(2, '0')
  const day = String(r.randInt(1, 29)).padStart(2, '0')
  const hour = String(r.randInt(0, 24)).padStart(2, '0')
  const minute = String(r.randInt(0, 60)).padStart(2, '0')
  const second = String(r.randInt(0, 60)).padStart(2, '0')
  const ms = String(r.randInt(0, 1000)).padStart(3, '0')
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}Z`
}

/**
 * Generate realistic post text with occasional emoji
 */
function generatePostText (r, minLen = 20, maxLen = 280) {
  const targetLen = r.randInt(minLen, maxLen)
  const words = []
  let len = 0

  while (len < targetLen) {
    // Occasionally add emoji
    if (r.rand() < 0.05) {
      words.push(r.pick(EMOJI))
      len += 2
    } else {
      const word = r.pick(WORDS)
      words.push(word)
      len += word.length + 1
    }
  }

  // Capitalize first word
  let text = words.join(' ')
  text = text.charAt(0).toUpperCase() + text.slice(1)

  // Occasionally add punctuation
  if (r.rand() < 0.3) text += '!'
  else if (r.rand() < 0.2) text += '?'
  else text += '.'

  return text.slice(0, maxLen)
}

// =============================================================================
// Bluesky-like fixtures (string-heavy)
// =============================================================================

function generateBskyPost (r) {
  const did = generateDID(r)
  const hasReply = r.rand() < 0.3
  const hasEmbed = r.rand() < 0.2
  const hasLangs = r.rand() < 0.8

  const post = {
    $type: 'app.bsky.feed.post',
    text: generatePostText(r),
    createdAt: generateTimestamp(r)
  }

  if (hasLangs) {
    post.langs = [r.pick(['en', 'ja', 'pt', 'es', 'de', 'fr'])]
  }

  if (hasReply) {
    const rootDid = generateDID(r)
    const parentDid = r.rand() < 0.5 ? rootDid : generateDID(r)
    post.reply = {
      root: {
        cid: generateCID(r),
        uri: generateATUri(r, rootDid, 'app.bsky.feed.post')
      },
      parent: {
        cid: generateCID(r),
        uri: generateATUri(r, parentDid, 'app.bsky.feed.post')
      }
    }
  }

  if (hasEmbed) {
    // Simple external embed
    post.embed = {
      $type: 'app.bsky.embed.external',
      external: {
        uri: `https://example.com/${r.randString(20, ALPHANUMERIC)}`,
        title: generatePostText(r, 10, 50),
        description: generatePostText(r, 20, 100)
      }
    }
  }

  return post
}

function generateBskyFollow (r) {
  return {
    $type: 'app.bsky.graph.follow',
    subject: generateDID(r),
    createdAt: generateTimestamp(r)
  }
}

function generateBskyLike (r) {
  return {
    $type: 'app.bsky.feed.like',
    subject: {
      cid: generateCID(r),
      uri: generateATUri(r, null, 'app.bsky.feed.post')
    },
    createdAt: generateTimestamp(r)
  }
}

function generateBskyRepost (r) {
  return {
    $type: 'app.bsky.feed.repost',
    subject: {
      cid: generateCID(r),
      uri: generateATUri(r, null, 'app.bsky.feed.post')
    },
    createdAt: generateTimestamp(r)
  }
}

function generateBskyProfile (r) {
  return {
    $type: 'app.bsky.actor.profile',
    displayName: r.randString(r.randInt(5, 25), ALPHA_LOWER + ALPHA_UPPER + ' '),
    description: generatePostText(r, 50, 200),
    avatar: r.randBool() ? { cid: generateCID(r), mimeType: 'image/jpeg' } : undefined,
    banner: r.randBool() ? { cid: generateCID(r), mimeType: 'image/jpeg' } : undefined
  }
}

/**
 * Generate an MST (Merkle Search Tree) node - Bluesky's HAMT variant
 */
function generateMSTNode (r, entryCount) {
  entryCount = entryCount || r.randInt(4, 32)
  const hasLeft = r.rand() < 0.5

  const entries = []
  for (let i = 0; i < entryCount; i++) {
    entries.push({
      k: r.randBytes(r.randInt(8, 32)), // key bytes
      v: generateCID(r), // value CID
      p: r.randInt(0, 64), // prefix count
      t: r.rand() < 0.3 ? generateCID(r) : null // optional subtree
    })
  }

  return {
    l: hasLeft ? generateCID(r) : null,
    e: entries
  }
}

// =============================================================================
// Filecoin-like fixtures (bytes-heavy)
// =============================================================================

/**
 * Generate a Filecoin-like address (f1/f3 style as bytes)
 */
function generateFilAddress (r) {
  // f1 addresses are 21 bytes, f3 are 49 bytes
  return r.rand() < 0.7 ? r.randBytes(21) : r.randBytes(49)
}

/**
 * Generate a Filecoin-like message
 */
function generateFilMessage (r) {
  return {
    Version: 0,
    To: generateFilAddress(r),
    From: generateFilAddress(r),
    Nonce: r.randInt(0, 10000000),
    Value: r.randBytes(r.randInt(1, 16)), // BigInt as bytes
    GasLimit: r.randInt(0, 10000000000),
    GasFeeCap: r.randBytes(r.randInt(1, 12)),
    GasPremium: r.randBytes(r.randInt(1, 12)),
    Method: r.randInt(0, 30),
    Params: r.randBytes(r.randInt(0, 1024))
  }
}

/**
 * Generate a Filecoin-like block header
 */
function generateFilBlockHeader (r) {
  const parentCount = r.randInt(1, 6)
  return {
    Miner: generateFilAddress(r),
    Ticket: {
      VRFProof: r.randBytes(96)
    },
    ElectionProof: {
      WinCount: r.randInt(1, 10),
      VRFProof: r.randBytes(96)
    },
    BeaconEntries: Array(r.randInt(1, 3)).fill(0).map(() => ({
      Round: r.randInt(1000000, 9999999),
      Data: r.randBytes(96)
    })),
    WinPoStProof: Array(r.randInt(1, 2)).fill(0).map(() => ({
      PoStProof: r.randInt(0, 10),
      ProofBytes: r.randBytes(192)
    })),
    Parents: Array(parentCount).fill(0).map(() => generateCID(r)),
    ParentWeight: r.randBytes(r.randInt(4, 16)),
    Height: r.randInt(1000000, 9999999),
    ParentStateRoot: generateCID(r),
    ParentMessageReceipts: generateCID(r),
    Messages: generateCID(r),
    BLSAggregate: {
      Type: 2,
      Data: r.randBytes(96)
    },
    Timestamp: r.randInt(1600000000, 1800000000),
    BlockSig: {
      Type: 2,
      Data: r.randBytes(96)
    },
    ForkSignaling: 0,
    ParentBaseFee: r.randBytes(r.randInt(4, 12))
  }
}

/**
 * Generate a HAMT node (Filecoin-style)
 */
function generateHAMTNode (r, width) {
  width = width || r.randInt(8, 32)
  return {
    bitfield: r.randBytes(32),
    pointers: Array(width).fill(0).map(() =>
      r.rand() < 0.6
        ? generateCID(r) // link to child node
        : [{ key: r.randBytes(32), value: generateCID(r) }] // bucket entry
    )
  }
}

/**
 * Generate an AMT (Array Mapped Trie) node
 */
function generateAMTNode (r, width) {
  width = width || r.randInt(4, 16)
  return {
    height: r.randInt(0, 5),
    count: r.randInt(1, 10000),
    node: {
      bmap: r.randBytes(8),
      links: Array(width).fill(0).map(() => generateCID(r)),
      values: Array(r.randInt(0, 4)).fill(0).map(() => r.randBytes(r.randInt(32, 256)))
    }
  }
}

/**
 * Generate array of CIDs (common pattern - Parents[], Links[], etc.)
 */
function generateCIDArray (r, count) {
  count = count || r.randInt(5, 50)
  return Array(count).fill(0).map(() => generateCID(r))
}

// =============================================================================
// Micro-benchmark fixtures (isolated patterns)
// =============================================================================

function generateMapWithKeys (r, keyCount, keyLen = 10) {
  const obj = {}
  for (let i = 0; i < keyCount; i++) {
    obj[r.randString(keyLen, ALPHANUMERIC)] = r.randInt(0, 1000000)
  }
  return obj
}

function generateNestedObject (r, depth, breadth = 3) {
  if (depth === 0) {
    return r.randInt(0, 1000000)
  }
  const obj = {}
  for (let i = 0; i < breadth; i++) {
    obj[`key${i}`] = generateNestedObject(r, depth - 1, breadth)
  }
  return obj
}

function generateStringArray (r, count, minLen, maxLen) {
  return Array(count).fill(0).map(() =>
    r.randString(r.randInt(minLen, maxLen), ALPHANUMERIC + ' ')
  )
}

function generateIntegerArray (r, count, max) {
  return Array(count).fill(0).map(() => r.randInt(0, max))
}

function generateBytesArray (r, count, minLen, maxLen) {
  return Array(count).fill(0).map(() => r.randBytes(r.randInt(minLen, maxLen)))
}

// =============================================================================
// Main fixture generator
// =============================================================================

export function generateFixtures (seed = 12345, counts = {}) {
  const r = createRandom(seed)

  // Default counts for each fixture type
  const c = Object.assign({
    // Bluesky-like
    bskyPosts: 200,
    bskyFollows: 200,
    bskyLikes: 200,
    bskyReposts: 200,
    bskyProfiles: 100,
    mstNodes: 200,

    // Filecoin-like
    filMessages: 200,
    filBlockHeaders: 50,
    hamtNodes: 200,
    amtNodes: 200,
    cidArrays: 200,

    // Micro-benchmarks
    mapsSmall: 200, // 10 keys
    mapsMedium: 100, // 50 keys
    mapsLarge: 50, // 200 keys
    nestedShallow: 100, // depth 3
    nestedDeep: 50, // depth 10
    stringsShort: 200, // arrays of short strings
    stringsMedium: 200, // arrays of medium strings
    stringsLong: 100, // arrays of long strings
    integersSmall: 200, // 0-23 (single byte)
    integersMedium: 200, // 0-65535
    integersLarge: 200, // full 64-bit range
    bytesSmall: 200, // <64 bytes
    bytesMedium: 200, // 64-512 bytes
    bytesLarge: 100 // 1KB+
  }, counts)

  return {
    // Bluesky-like (string-heavy)
    bsky: {
      posts: Array(c.bskyPosts).fill(0).map(() => generateBskyPost(r)),
      follows: Array(c.bskyFollows).fill(0).map(() => generateBskyFollow(r)),
      likes: Array(c.bskyLikes).fill(0).map(() => generateBskyLike(r)),
      reposts: Array(c.bskyReposts).fill(0).map(() => generateBskyRepost(r)),
      profiles: Array(c.bskyProfiles).fill(0).map(() => generateBskyProfile(r)),
      mstNodes: Array(c.mstNodes).fill(0).map(() => generateMSTNode(r))
    },

    // Filecoin-like (bytes-heavy)
    filecoin: {
      messages: Array(c.filMessages).fill(0).map(() => generateFilMessage(r)),
      blockHeaders: Array(c.filBlockHeaders).fill(0).map(() => generateFilBlockHeader(r)),
      hamtNodes: Array(c.hamtNodes).fill(0).map(() => generateHAMTNode(r)),
      amtNodes: Array(c.amtNodes).fill(0).map(() => generateAMTNode(r)),
      cidArrays: Array(c.cidArrays).fill(0).map(() => generateCIDArray(r))
    },

    // Micro-benchmarks (isolated patterns)
    micro: {
      mapsSmall: Array(c.mapsSmall).fill(0).map(() => generateMapWithKeys(r, 10)),
      mapsMedium: Array(c.mapsMedium).fill(0).map(() => generateMapWithKeys(r, 50)),
      mapsLarge: Array(c.mapsLarge).fill(0).map(() => generateMapWithKeys(r, 200)),
      nestedShallow: Array(c.nestedShallow).fill(0).map(() => generateNestedObject(r, 3, 5)),
      nestedDeep: Array(c.nestedDeep).fill(0).map(() => generateNestedObject(r, 10, 2)),
      stringsShort: Array(c.stringsShort).fill(0).map(() => generateStringArray(r, 50, 5, 20)),
      stringsMedium: Array(c.stringsMedium).fill(0).map(() => generateStringArray(r, 30, 20, 100)),
      stringsLong: Array(c.stringsLong).fill(0).map(() => generateStringArray(r, 10, 100, 500)),
      integersSmall: Array(c.integersSmall).fill(0).map(() => generateIntegerArray(r, 100, 23)),
      integersMedium: Array(c.integersMedium).fill(0).map(() => generateIntegerArray(r, 100, 65535)),
      integersLarge: Array(c.integersLarge).fill(0).map(() => generateIntegerArray(r, 100, Number.MAX_SAFE_INTEGER)),
      bytesSmall: Array(c.bytesSmall).fill(0).map(() => generateBytesArray(r, 20, 8, 64)),
      bytesMedium: Array(c.bytesMedium).fill(0).map(() => generateBytesArray(r, 10, 64, 512)),
      bytesLarge: Array(c.bytesLarge).fill(0).map(() => generateBytesArray(r, 5, 1024, 4096))
    }
  }
}

export {
  createRandom,
  generateCID,
  generateDID,
  generateHandle,
  generateATUri,
  generateTimestamp,
  generatePostText,
  generateBskyPost,
  generateBskyFollow,
  generateBskyLike,
  generateBskyRepost,
  generateBskyProfile,
  generateMSTNode,
  generateFilAddress,
  generateFilMessage,
  generateFilBlockHeader,
  generateHAMTNode,
  generateAMTNode,
  generateCIDArray,
  generateMapWithKeys,
  generateNestedObject,
  generateStringArray,
  generateIntegerArray,
  generateBytesArray
}
