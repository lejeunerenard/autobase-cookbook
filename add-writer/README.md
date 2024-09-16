# Adding a Writer to an Autobase

Autobase instances are not writable by default unless the peer creates the
autobase. To make a peer writable the following steps need to happen. In this
example peer `A` is an existing writer of the autobase and peer `B` is the one
being added as a writer. The same steps can be used to add any number of peers.

1. Peer `B` constructs an autobase instance using the `bootstrap` key (called
   `bootstrapKey`) like so:  
   ```
   const baseB = new Autobase(store, bootstrapKey, opts)
   ```
2. Peer `B` sends peer `A` their local key (`baseB.local.key`). How this is sent
   is up to you & your application.
3. Peer `A` appends a block which encodes that peer `B` should be added. This
   depends on your implementation, but in the example script it looks like this:
   ```
   base.append({ type: 'addWriter', key: b4a.toString(peerBKey, 'hex') })
   ```
   Note that peer `B`'s local key is named `peerBKey` and it is being encoded as
   a string because the `valueEncoding` for the base is `json` and the key is a
   buffer.
4. Once the apply function has run and called
   `await base.addWriter(Buffer.from(node.value.add, 'hex'), opts)`, peer `A`
   will consider peer `B` as writable.
5. Peer `B` will consider itself writable once it has replicated everything from
   peer `A`.

[`index.mjs`](index.mjs) showcases these steps with a fleshed out example. It
adds peer `B` to an autobase created by peer `A` and then peer `B` adds a third
peer, peer `C` without syncing with peer `A` to demonstrate how a writer can
append blocks so could append the block in step #3.
