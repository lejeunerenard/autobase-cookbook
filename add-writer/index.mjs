import Autobase from 'autobase'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import { replicateAndSync } from 'autobase-test-helpers'
import b4a from 'b4a'

const autobaseOptions = {
  valueEncoding: 'json',
  apply: async (batch, view, base) => {
    for (const node of batch) {
      const op = node.value
      if (op.type === 'addWriter') {
        // op.key is the local writer key of the peer to be added.
        const peersKeyStr = op.key
        // It's sent as a string so needs to be decoded into a buffer
        const peersKeyBuffer = b4a.from(peersKeyStr, 'hex')

        const baseLocalShortKey = b4a.toString(base.local.key, 'hex').substring(0, 6)
        console.log(`[${baseLocalShortKey}]`, 'Adding writer', peersKeyBuffer)
        await base.addWriter(peersKeyBuffer, {
          isIndexer: op.isIndexer ?? false // Flag the new peer as an indexer with it defaulting to false
        })
        continue
      }
    }
  }
}

// Create Peer A
const storeA = new Corestore(RAM.reusable())
const baseA = new Autobase(storeA, null, autobaseOptions)
await baseA.ready() // so baseA.key is populated

// Create Peer B
const storeB = new Corestore(RAM.reusable())
// Peer B uses Peer A's key as the bootstrap key
const baseB = new Autobase(storeB, baseA.key, autobaseOptions)
baseB.on('writable', () => {
  console.log('baseB is writable!')
})
await baseB.ready() // so baseB.local.key is populated

// Peer B sends Peer A their local writer core's key
const baseBLocalKey = baseB.local.key

// Peer A adds Peer B as a writer by appending a block that will trigger
// `base.addWriter(key)` to run in the `apply` function.
// The key is appended as a string in order to encode a buffer as json.
await baseA.append({
  type: 'addWriter',
  key: b4a.toString(baseBLocalKey, 'hex')
})

// Sync between Peer A and B
await replicateAndSync([ baseA, baseB ])
console.log('Peer A & B synced')

// Adding Peer C
const storeC = new Corestore(RAM.reusable())
// Peer C uses Peer A's key as the bootstrap key
const baseC = new Autobase(storeC, baseA.key, autobaseOptions)
baseC.on('writable', () => {
  console.log('baseC is writable!')
})
await baseC.ready() // so baseC.local.key is populated

// Peer C sends Peer B their local writer core's key
const baseCLocalKey = baseC.local.key

// Peer B appends block adding Peer C as a writer
await baseB.append({
  type: 'addWriter',
  key: b4a.toString(baseCLocalKey, 'hex')
})

// Sync between Peer B and C
await replicateAndSync([ baseB, baseC ])
console.log('Peer B & C synced')

await Promise.all([
  baseA.close(),
  baseB.close(),
  baseC.close()
])
