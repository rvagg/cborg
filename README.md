# cborg - a simple CBOR encoder & decoder

```js
import { encode, decode } from 'cborg'

const decoded = decode(Buffer.from('a16474686973a26269736543424f522163796179f5', 'hex'))
console.log('decoded:', decoded)
console.log('encoded:', encode(decoded))
```

```
decoded: { this: { is: 'CBOR!', yay: true } }
encoded: Uint8Array(21) [
  161, 100, 116, 104, 105, 115,
  162,  98, 105, 115, 101,  67,
   66,  79,  82,  33,  99, 121,
   97, 121, 245
]
```

## License and Copyright

Copyright 2020 Rod Vagg

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
