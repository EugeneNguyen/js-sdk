(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.matchmore = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (value instanceof ArrayBuffer) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || string instanceof ArrayBuffer) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

},{"base64-js":2,"ieee754":4}],4:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var LocationManager = (function () {
    function LocationManager(manager) {
        this.init(manager);
    }
    LocationManager.prototype.init = function (manager) {
        this.manager = manager;
    };
    LocationManager.prototype.startUpdatingLocation = function () {
        var _this = this;
        var watchOptions = {
            timeout: 60 * 60 * 1000,
            maxAge: 0,
            enableHighAccuracy: true
        };
        if (navigator.geolocation) {
            this.geoId = navigator.geolocation.watchPosition(function (loc) { _this.onLocationReceived(loc); }, this.onError, watchOptions);
        }
        else {
            throw new Error("Geolocation is not supported in this browser/app");
        }
    };
    LocationManager.prototype.stopUpdatingLocation = function () {
        if (navigator.geolocation) {
            navigator.geolocation.clearWatch(this.geoId);
        }
        else {
            throw new Error("Geolocation is not supported in this browser/app");
        }
    };
    LocationManager.prototype.onLocationReceived = function (loc) {
        if (!loc.coords)
            return;
        var latitude, longitude, altitude;
        if (loc.coords.latitude)
            latitude = parseFloat(loc.coords.latitude);
        else
            return;
        if (loc.coords.longitude)
            longitude = parseFloat(loc.coords.longitude);
        else
            return;
        if (loc.coords.altitude)
            altitude = parseFloat(loc.coords.altitude);
        else
            altitude = 0;
        altitude = 0;
        this.onLocationUpdate(loc);
        try {
            this.manager.updateLocation(latitude, longitude, altitude, 1.0, 1.0);
        }
        catch (e) {
        }
    };
    LocationManager.prototype.onError = function (error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                throw new Error("User denied the request for Geolocation.");
            case error.POSITION_UNAVAILABLE:
                throw new Error("Location information is unavailable.");
            case error.TIMEOUT:
                throw new Error("The request to get user location timed out.");
            case error.UNKNOWN_ERROR:
                throw new Error("An unknown error occurred.");
        }
    };
    return LocationManager;
}());
exports.LocationManager = LocationManager;

},{}],6:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var ScalpsCoreRestApi = require("matchmore_core_rest_api");
var matchmonitor_1 = require("./matchmonitor");
var locationmanager_1 = require("./locationmanager");
var Manager = (function () {
    function Manager(apiKey, apiUrlOverride) {
        this.apiKey = apiKey;
        this.users = [];
        this.devices = [];
        this.publications = [];
        this.subscriptions = [];
        this.locations = [];
        this.init(apiUrlOverride);
    }
    Manager.prototype.init = function (apiUrlOverride) {
        this.defaultClient = ScalpsCoreRestApi.ApiClient.instance;
        this.defaultClient.authentications['api-key'].apiKey = this.apiKey;
        if (apiUrlOverride)
            this.defaultClient.basePath = apiUrlOverride;
        this.matchMonitor = new matchmonitor_1.MatchMonitor(this);
        this.locationManager = new locationmanager_1.LocationManager(this);
    };
    Manager.prototype.createUser = function (userName, completion) {
        var _this = this;
        var p = new Promise(function (resolve, reject) {
            var api = new ScalpsCoreRestApi.UsersApi();
            var callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while creating user '" + userName + "' :" + error);
                }
                else {
                    resolve(JSON.parse(response.text));
                }
            };
            api.createUser(userName, callback);
        });
        p.then(function (user) {
            _this.users.push(user);
            _this.defaultUser = _this.users[0];
            if (completion)
                completion(user);
        });
        return p;
    };
    Manager.prototype.createDevice = function (deviceName, platform, deviceToken, latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, completion) {
        if (this.defaultUser) {
            return this.createAnyDevice(this.defaultUser.userId, deviceName, platform, deviceToken, latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, completion);
        }
        else {
            throw new Error("There is no default user available, please call createUser before createDevice");
        }
    };
    Manager.prototype.createAnyDevice = function (userId, deviceName, platform, deviceToken, latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, completion) {
        var _this = this;
        var p = new Promise(function (resolve, reject) {
            var api = new ScalpsCoreRestApi.DeviceApi();
            var callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while creating device '" + deviceName + "' :" + error);
                }
                else {
                    resolve(JSON.parse(response.text));
                }
            };
            var opts = {
                'horizontalAccuracy': horizontalAccuracy,
                'verticalAccuracy': verticalAccuracy
            };
            api.createDevice(userId, deviceName, platform, deviceToken, latitude, longitude, altitude, opts, callback);
        });
        p.then(function (device) {
            _this.devices.push(device);
            _this.defaultDevice = _this.devices[0];
            if (completion)
                completion(device);
        });
        return p;
    };
    Manager.prototype.createPublication = function (topic, range, duration, properties, completion) {
        if (this.defaultUser && this.defaultDevice) {
            return this.createAnyPublication(this.defaultUser.userId, this.defaultDevice.deviceId, topic, range, duration, properties, completion);
        }
        else {
            throw new Error("There is no default user or device available, please call createUser and createDevice before createPublication");
        }
    };
    Manager.prototype.createAnyPublication = function (userId, deviceId, topic, range, duration, properties, completion) {
        var _this = this;
        var p = new Promise(function (resolve, reject) {
            var api = new ScalpsCoreRestApi.PublicationApi();
            var callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while creating publication '" + topic + "' :" + error);
                }
                else {
                    resolve(JSON.parse(response.text));
                }
            };
            api.createPublication(userId, deviceId, topic, range, duration, properties, callback);
        });
        p.then(function (publication) {
            _this.publications.push(publication);
            if (completion)
                completion(publication);
        });
        return p;
    };
    Manager.prototype.createSubscription = function (topic, selector, range, duration, completion) {
        if (this.defaultUser && this.defaultDevice) {
            return this.createAnySubscription(this.defaultUser.userId, this.defaultDevice.deviceId, topic, selector, range, duration, completion);
        }
        else {
            throw new Error("There is no default user or device available, please call createUser and createDevice before createSubscription");
        }
    };
    Manager.prototype.createAnySubscription = function (userId, deviceId, topic, selector, range, duration, completion) {
        var _this = this;
        var p = new Promise(function (resolve, reject) {
            var api = new ScalpsCoreRestApi.SubscriptionApi();
            var callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while creating subscription '" + topic + "' :" + error);
                }
                else {
                    resolve(JSON.parse(response.text));
                }
            };
            api.createSubscription(userId, deviceId, topic, selector, range, duration, callback);
        });
        p.then(function (subscription) {
            _this.subscriptions.push(subscription);
            if (completion)
                completion(subscription);
        });
        return p;
    };
    Manager.prototype.updateLocation = function (latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, completion) {
        if (this.defaultUser && this.defaultDevice) {
            return this.updateAnyLocation(this.defaultUser.userId, this.defaultDevice.deviceId, latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, completion);
        }
        else {
            throw new Error("There is no default user or device available, please call createUser and createDevice before updateLocation");
        }
    };
    Manager.prototype.updateAnyLocation = function (userId, deviceId, latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, completion) {
        var _this = this;
        var p = new Promise(function (resolve, reject) {
            var api = new ScalpsCoreRestApi.LocationApi();
            var callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while creating location ['" + latitude + "','" + longitude + "']  :" + error);
                }
                else {
                    resolve(JSON.parse(response.text));
                }
            };
            var opts = {
                'horizontalAccuracy': horizontalAccuracy,
                'verticalAccuracy': verticalAccuracy
            };
            api.createLocation(userId, deviceId, latitude, longitude, altitude, opts, callback);
        });
        p.then(function (location) {
            _this.locations.push(location);
            if (completion)
                completion(location);
        });
        return p;
    };
    Manager.prototype.getAllMatches = function (completion) {
        if (this.defaultUser && this.defaultDevice) {
            return this.getAllMatchesForAny(this.defaultUser.userId, this.defaultDevice.deviceId);
        }
        else {
            throw new Error("There is no default user or device available, please call createUser and createDevice before getAllMatches");
        }
    };
    Manager.prototype.getAllMatchesForAny = function (userId, deviceId, completion) {
        var p = new Promise(function (resolve, reject) {
            var api = new ScalpsCoreRestApi.DeviceApi();
            var callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while fetching matches: " + error);
                }
                else {
                    resolve(JSON.parse(response.text));
                }
            };
            api.getMatches(userId, deviceId, callback);
        });
        p.then(function (matches) {
            if (completion)
                completion(matches);
        });
        return p;
    };
    Manager.prototype.getAllPublicationsForDevice = function (userId, deviceId, completion) {
        var p = new Promise(function (resolve, reject) {
            var api = new ScalpsCoreRestApi.DeviceApi();
            var callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while fetching publications: " + error);
                }
                else {
                    resolve(JSON.parse(response.text));
                }
            };
            api.getPublications(userId, deviceId, callback);
        });
        return p;
    };
    Manager.prototype.getAllSubscriptionsForDevice = function (userId, deviceId, completion) {
        var p = new Promise(function (resolve, reject) {
            var api = new ScalpsCoreRestApi.DeviceApi();
            var callback = function (error, data, response) {
                if (error) {
                    reject("An error has occured while fetching subscriptions: " + error);
                }
                else {
                    resolve(JSON.parse(response.text));
                }
            };
            api.getSubscriptions(userId, deviceId, callback);
        });
        return p;
    };
    Manager.prototype.onMatch = function (completion) {
        this.matchMonitor.onMatch = completion;
    };
    Manager.prototype.onLocationUpdate = function (completion) {
        this.locationManager.onLocationUpdate = completion;
    };
    Manager.prototype.startMonitoringMatches = function () {
        this.matchMonitor.startMonitoringMatches();
    };
    Manager.prototype.stopMonitoringMatches = function () {
        this.matchMonitor.stopMonitoringMatches();
    };
    Manager.prototype.startUpdatingLocation = function () {
        this.locationManager.startUpdatingLocation();
    };
    Manager.prototype.stopUpdatingLocation = function () {
        this.locationManager.stopUpdatingLocation();
    };
    return Manager;
}());
exports.Manager = Manager;

},{"./locationmanager":5,"./matchmonitor":7,"matchmore_core_rest_api":18}],7:[function(require,module,exports){
"use strict";
exports.__esModule = true;
var MatchMonitor = (function () {
    function MatchMonitor(manager) {
        this.deliveredMatches = [];
        this.init(manager);
    }
    MatchMonitor.prototype.init = function (manager) {
        this.manager = manager;
        this.onMatch = function (match) { };
    };
    MatchMonitor.prototype.startMonitoringMatches = function () {
        var _this = this;
        this.stopMonitoringMatches();
        this.timerId = setInterval(function () { _this.checkMatches(); }, 1000);
    };
    MatchMonitor.prototype.stopMonitoringMatches = function () {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
    };
    MatchMonitor.prototype.checkMatches = function () {
        var _this = this;
        this.manager.getAllMatches().then(function (matches) {
            for (var idx in matches) {
                var match = matches[idx];
                if (_this.hasNotBeenDelivered(match)) {
                    _this.deliveredMatches.push(match);
                    _this.onMatch(match);
                }
            }
        });
    };
    MatchMonitor.prototype.hasNotBeenDelivered = function (match) {
        for (var idx in this.deliveredMatches) {
            var deliveredMatch = this.deliveredMatches[idx];
            if (deliveredMatch.matchId == match.matchId)
                return false;
        }
        return true;
    };
    return MatchMonitor;
}());
exports.MatchMonitor = MatchMonitor;

},{}],8:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

if (typeof module !== 'undefined') {
  module.exports = Emitter;
}

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],9:[function(require,module,exports){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
},{}],10:[function(require,module,exports){
(function (Buffer){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['superagent'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('superagent'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.ApiClient = factory(root.superagent);
  }
}(this, function(superagent) {
  'use strict';

  /**
   * @module ApiClient
   * @version 0.1.0
   */

  /**
   * Manages low level client-server communications, parameter marshalling, etc. There should not be any need for an
   * application to use this class directly - the *Api and model classes provide the public API for the service. The
   * contents of this file should be regarded as internal but are documented for completeness.
   * @alias module:ApiClient
   * @class
   */
  var exports = function() {
    /**
     * The base URL against which to resolve every API call's (relative) path.
     * @type {String}
     * @default http://api.adjago.io/v02
     */
    this.basePath = 'http://api.adjago.io/v02'.replace(/\/+$/, '');

    /**
     * The authentication methods to be included for all API calls.
     * @type {Array.<String>}
     */
    this.authentications = {
      'api-key': {type: 'apiKey', 'in': 'header', name: 'api-key'}
    };
    /**
     * The default HTTP headers to be included for all API calls.
     * @type {Array.<String>}
     * @default {}
     */
    this.defaultHeaders = {};

    /**
     * The default HTTP timeout for all API calls.
     * @type {Number}
     * @default 60000
     */
    this.timeout = 60000;

    /**
     * If set to false an additional timestamp parameter is added to all API GET calls to
     * prevent browser caching
     * @type {Boolean}
     * @default true
     */
    this.cache = true;
  };

  /**
   * Returns a string representation for an actual parameter.
   * @param param The actual parameter.
   * @returns {String} The string representation of <code>param</code>.
   */
  exports.prototype.paramToString = function(param) {
    if (param == undefined || param == null) {
      return '';
    }
    if (param instanceof Date) {
      return param.toJSON();
    }
    return param.toString();
  };

  /**
   * Builds full URL by appending the given path to the base URL and replacing path parameter place-holders with parameter values.
   * NOTE: query parameters are not handled here.
   * @param {String} path The path to append to the base URL.
   * @param {Object} pathParams The parameter values to append.
   * @returns {String} The encoded path with parameter values substituted.
   */
  exports.prototype.buildUrl = function(path, pathParams) {
    if (!path.match(/^\//)) {
      path = '/' + path;
    }
    var url = this.basePath + path;
    var _this = this;
    url = url.replace(/\{([\w-]+)\}/g, function(fullMatch, key) {
      var value;
      if (pathParams.hasOwnProperty(key)) {
        value = _this.paramToString(pathParams[key]);
      } else {
        value = fullMatch;
      }
      return encodeURIComponent(value);
    });
    return url;
  };

  /**
   * Checks whether the given content type represents JSON.<br>
   * JSON content type examples:<br>
   * <ul>
   * <li>application/json</li>
   * <li>application/json; charset=UTF8</li>
   * <li>APPLICATION/JSON</li>
   * </ul>
   * @param {String} contentType The MIME content type to check.
   * @returns {Boolean} <code>true</code> if <code>contentType</code> represents JSON, otherwise <code>false</code>.
   */
  exports.prototype.isJsonMime = function(contentType) {
    return Boolean(contentType != null && contentType.match(/^application\/json(;.*)?$/i));
  };

  /**
   * Chooses a content type from the given array, with JSON preferred; i.e. return JSON if included, otherwise return the first.
   * @param {Array.<String>} contentTypes
   * @returns {String} The chosen content type, preferring JSON.
   */
  exports.prototype.jsonPreferredMime = function(contentTypes) {
    for (var i = 0; i < contentTypes.length; i++) {
      if (this.isJsonMime(contentTypes[i])) {
        return contentTypes[i];
      }
    }
    return contentTypes[0];
  };

  /**
   * Checks whether the given parameter value represents file-like content.
   * @param param The parameter to check.
   * @returns {Boolean} <code>true</code> if <code>param</code> represents a file.
   */
  exports.prototype.isFileParam = function(param) {
    // fs.ReadStream in Node.js (but not in runtime like browserify)
    if (typeof window === 'undefined' &&
        typeof require === 'function' &&
        require('fs') &&
        param instanceof require('fs').ReadStream) {
      return true;
    }
    // Buffer in Node.js
    if (typeof Buffer === 'function' && param instanceof Buffer) {
      return true;
    }
    // Blob in browser
    if (typeof Blob === 'function' && param instanceof Blob) {
      return true;
    }
    // File in browser (it seems File object is also instance of Blob, but keep this for safe)
    if (typeof File === 'function' && param instanceof File) {
      return true;
    }
    return false;
  };

  /**
   * Normalizes parameter values:
   * <ul>
   * <li>remove nils</li>
   * <li>keep files and arrays</li>
   * <li>format to string with `paramToString` for other cases</li>
   * </ul>
   * @param {Object.<String, Object>} params The parameters as object properties.
   * @returns {Object.<String, Object>} normalized parameters.
   */
  exports.prototype.normalizeParams = function(params) {
    var newParams = {};
    for (var key in params) {
      if (params.hasOwnProperty(key) && params[key] != undefined && params[key] != null) {
        var value = params[key];
        if (this.isFileParam(value) || Array.isArray(value)) {
          newParams[key] = value;
        } else {
          newParams[key] = this.paramToString(value);
        }
      }
    }
    return newParams;
  };

  /**
   * Enumeration of collection format separator strategies.
   * @enum {String}
   * @readonly
   */
  exports.CollectionFormatEnum = {
    /**
     * Comma-separated values. Value: <code>csv</code>
     * @const
     */
    CSV: ',',
    /**
     * Space-separated values. Value: <code>ssv</code>
     * @const
     */
    SSV: ' ',
    /**
     * Tab-separated values. Value: <code>tsv</code>
     * @const
     */
    TSV: '\t',
    /**
     * Pipe(|)-separated values. Value: <code>pipes</code>
     * @const
     */
    PIPES: '|',
    /**
     * Native array. Value: <code>multi</code>
     * @const
     */
    MULTI: 'multi'
  };

  /**
   * Builds a string representation of an array-type actual parameter, according to the given collection format.
   * @param {Array} param An array parameter.
   * @param {module:ApiClient.CollectionFormatEnum} collectionFormat The array element separator strategy.
   * @returns {String|Array} A string representation of the supplied collection, using the specified delimiter. Returns
   * <code>param</code> as is if <code>collectionFormat</code> is <code>multi</code>.
   */
  exports.prototype.buildCollectionParam = function buildCollectionParam(param, collectionFormat) {
    if (param == null) {
      return null;
    }
    switch (collectionFormat) {
      case 'csv':
        return param.map(this.paramToString).join(',');
      case 'ssv':
        return param.map(this.paramToString).join(' ');
      case 'tsv':
        return param.map(this.paramToString).join('\t');
      case 'pipes':
        return param.map(this.paramToString).join('|');
      case 'multi':
        // return the array directly as SuperAgent will handle it as expected
        return param.map(this.paramToString);
      default:
        throw new Error('Unknown collection format: ' + collectionFormat);
    }
  };

  /**
   * Applies authentication headers to the request.
   * @param {Object} request The request object created by a <code>superagent()</code> call.
   * @param {Array.<String>} authNames An array of authentication method names.
   */
  exports.prototype.applyAuthToRequest = function(request, authNames) {
    var _this = this;
    authNames.forEach(function(authName) {
      var auth = _this.authentications[authName];
      switch (auth.type) {
        case 'basic':
          if (auth.username || auth.password) {
            request.auth(auth.username || '', auth.password || '');
          }
          break;
        case 'apiKey':
          if (auth.apiKey) {
            var data = {};
            if (auth.apiKeyPrefix) {
              data[auth.name] = auth.apiKeyPrefix + ' ' + auth.apiKey;
            } else {
              data[auth.name] = auth.apiKey;
            }
            if (auth['in'] === 'header') {
              request.set(data);
            } else {
              request.query(data);
            }
          }
          break;
        case 'oauth2':
          if (auth.accessToken) {
            request.set({'Authorization': 'Bearer ' + auth.accessToken});
          }
          break;
        default:
          throw new Error('Unknown authentication type: ' + auth.type);
      }
    });
  };

  /**
   * Deserializes an HTTP response body into a value of the specified type.
   * @param {Object} response A SuperAgent response object.
   * @param {(String|Array.<String>|Object.<String, Object>|Function)} returnType The type to return. Pass a string for simple types
   * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
   * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
   * all properties on <code>data<code> will be converted to this type.
   * @returns A value of the specified type.
   */
  exports.prototype.deserialize = function deserialize(response, returnType) {
    if (response == null || returnType == null || response.status == 204) {
      return null;
    }
    // Rely on SuperAgent for parsing response body.
    // See http://visionmedia.github.io/superagent/#parsing-response-bodies
    var data = response.body;
    if (data == null || (typeof data === 'object' && typeof data.length === 'undefined' && !Object.keys(data).length)) {
      // SuperAgent does not always produce a body; use the unparsed response as a fallback
      data = response.text;
    }
    return exports.convertToType(data, returnType);
  };

  /**
   * Callback function to receive the result of the operation.
   * @callback module:ApiClient~callApiCallback
   * @param {String} error Error message, if any.
   * @param data The data returned by the service call.
   * @param {String} response The complete HTTP response.
   */

  /**
   * Invokes the REST service using the supplied settings and parameters.
   * @param {String} path The base URL to invoke.
   * @param {String} httpMethod The HTTP method to use.
   * @param {Object.<String, String>} pathParams A map of path parameters and their values.
   * @param {Object.<String, Object>} queryParams A map of query parameters and their values.
   * @param {Object.<String, Object>} headerParams A map of header parameters and their values.
   * @param {Object.<String, Object>} formParams A map of form parameters and their values.
   * @param {Object} bodyParam The value to pass as the request body.
   * @param {Array.<String>} authNames An array of authentication type names.
   * @param {Array.<String>} contentTypes An array of request MIME types.
   * @param {Array.<String>} accepts An array of acceptable response MIME types.
   * @param {(String|Array|ObjectFunction)} returnType The required type to return; can be a string for simple types or the
   * constructor for a complex type.
   * @param {module:ApiClient~callApiCallback} callback The callback function.
   * @returns {Object} The SuperAgent request object.
   */
  exports.prototype.callApi = function callApi(path, httpMethod, pathParams,
      queryParams, headerParams, formParams, bodyParam, authNames, contentTypes, accepts,
      returnType, callback) {

    var _this = this;
    var url = this.buildUrl(path, pathParams);
    var request = superagent(httpMethod, url);

	  // Hack to force body param
	  bodyParam = formParams;

    // apply authentications
    this.applyAuthToRequest(request, authNames);

    // set query parameters
    if (httpMethod.toUpperCase() === 'GET' && this.cache === false) {
        queryParams['_'] = new Date().getTime();
    }
    request.query(this.normalizeParams(queryParams));

    // set header parameters
    request.set(this.defaultHeaders).set(this.normalizeParams(headerParams));

    // set request timeout
    request.timeout(this.timeout);

    var contentType = this.jsonPreferredMime(contentTypes);
    if (contentType) {
      // Issue with superagent and multipart/form-data (https://github.com/visionmedia/superagent/issues/746)
      if(contentType != 'multipart/form-data') {
        request.type(contentType);
      }
    } else if (!request.header['Content-Type']) {
      request.type('application/json');
    }

    if (contentType === 'application/x-www-form-urlencoded') {
      request.send(this.normalizeParams(formParams));
    } else if (contentType == 'multipart/form-data') {
      var _formParams = this.normalizeParams(formParams);
      for (var key in _formParams) {
        if (_formParams.hasOwnProperty(key)) {
          if (this.isFileParam(_formParams[key])) {
            // file field
            request.attach(key, _formParams[key]);
          } else {
            request.field(key, _formParams[key]);
          }
        }
      }
    } else if (bodyParam) {
      request.send(bodyParam);
    }

    var accept = this.jsonPreferredMime(accepts);
    if (accept) {
      request.accept(accept);
    }


    request.end(function(error, response) {
      if (callback) {
        var data = null;
        if (!error) {
          try {
            data = _this.deserialize(response, returnType);
          } catch (err) {
            error = err;
          }
        }
        callback(error, data, response);
      }
    });

    return request;
  };

  /**
   * Parses an ISO-8601 string representation of a date value.
   * @param {String} str The date value as a string.
   * @returns {Date} The parsed date object.
   */
  exports.parseDate = function(str) {
    return new Date(str.replace(/T/i, ' '));
  };

  /**
   * Converts a value to the specified type.
   * @param {(String|Object)} data The data to convert, as a string or object.
   * @param {(String|Array.<String>|Object.<String, Object>|Function)} type The type to return. Pass a string for simple types
   * or the constructor function for a complex type. Pass an array containing the type name to return an array of that type. To
   * return an object, pass an object with one property whose name is the key type and whose value is the corresponding value type:
   * all properties on <code>data<code> will be converted to this type.
   * @returns An instance of the specified type.
   */
  exports.convertToType = function(data, type) {
    switch (type) {
      case 'Boolean':
        return Boolean(data);
      case 'Integer':
        return parseInt(data, 10);
      case 'Number':
        return parseFloat(data);
      case 'String':
        return String(data);
      case 'Date':
        return this.parseDate(String(data));
      default:
        if (type === Object) {
          // generic object, return directly
          return data;
        } else if (typeof type === 'function') {
          // for model type like: User
          return type.constructFromObject(data);
        } else if (Array.isArray(type)) {
          // for array type like: ['String']
          var itemType = type[0];
          return data.map(function(item) {
            return exports.convertToType(item, itemType);
          });
        } else if (typeof type === 'object') {
          // for plain object type like: {'String': 'Integer'}
          var keyType, valueType;
          for (var k in type) {
            if (type.hasOwnProperty(k)) {
              keyType = k;
              valueType = type[k];
              break;
            }
          }
          var result = {};
          for (var k in data) {
            if (data.hasOwnProperty(k)) {
              var key = exports.convertToType(k, keyType);
              var value = exports.convertToType(data[k], valueType);
              result[key] = value;
            }
          }
          return result;
        } else {
          // for unknown type, return the data directly
          return data;
        }
    }
  };

  /**
   * Constructs a new map or array model from REST data.
   * @param data {Object|Array} The REST data.
   * @param obj {Object|Array} The target object or array.
   */
  exports.constructFromObject = function(data, obj, itemType) {
    if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        if (data.hasOwnProperty(i))
          obj[i] = exports.convertToType(data[i], itemType);
      }
    } else {
      for (var k in data) {
        if (data.hasOwnProperty(k))
          obj[k] = exports.convertToType(data[k], itemType);
      }
    }
  };

  /**
   * The default API client implementation.
   * @type {module:ApiClient}
   */
  exports.instance = new exports();

  return exports;
}));

}).call(this,require("buffer").Buffer)
},{"buffer":3,"fs":1,"superagent":31}],11:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/APIError', 'model/Device', 'model/DeviceLocation', 'model/Matches', 'model/Publication', 'model/Publications', 'model/Subscription', 'model/Subscriptions'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('../model/APIError'), require('../model/Device'), require('../model/DeviceLocation'), require('../model/Matches'), require('../model/Publication'), require('../model/Publications'), require('../model/Subscription'), require('../model/Subscriptions'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.DeviceApi = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.APIError, root.ScalpsCoreRestApi.Device, root.ScalpsCoreRestApi.DeviceLocation, root.ScalpsCoreRestApi.Matches, root.ScalpsCoreRestApi.Publication, root.ScalpsCoreRestApi.Publications, root.ScalpsCoreRestApi.Subscription, root.ScalpsCoreRestApi.Subscriptions);
  }
}(this, function(ApiClient, APIError, Device, DeviceLocation, Matches, Publication, Publications, Subscription, Subscriptions) {
  'use strict';

  /**
   * Device service.
   * @module api/DeviceApi
   * @version 0.1.0
   */

  /**
   * Constructs a new DeviceApi. 
   * @alias module:api/DeviceApi
   * @class
   * @param {module:ApiClient} apiClient Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


    /**
     * Callback function to receive the result of the createDevice operation.
     * @callback module:api/DeviceApi~createDeviceCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Device} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create device for a user
     * @param {String} userId The id (UUID) of the user for which to create a device
     * @param {String} name The name of the device
     * @param {String} platform  The platform of the device, this can be any string representing the platform type, for instance &#39;iOS 9.3&#39; 
     * @param {String} deviceToken  The deviceToken is the device push notification token given to this device by the OS, either iOS or Android, for identifying the device with push notification services. 
     * @param {Number} latitude The latitude of the device. 
     * @param {Number} longitude The longitude of the device. 
     * @param {Number} altitude The altitude of the device. 
     * @param {Object} opts Optional parameters
     * @param {Number} opts.horizontalAccuracy  The horizontal accuracy of the location, measured on a scale from &#39;0.0&#39; to &#39;1.0&#39;, &#39;1.0&#39; being the most accurate. If this value is not specified then the default value of &#39;1.0&#39; is used  (default to 5)
     * @param {Number} opts.verticalAccuracy  The vertical accuracy of the location, measured on a scale from &#39;0.0&#39; to &#39;1.0&#39;, &#39;1.0&#39; being the most accurate. If this value is not specified then the default value of &#39;1.0&#39; is used  (default to 5)
     * @param {module:api/DeviceApi~createDeviceCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Device}
     */
    this.createDevice = function(userId, name, platform, deviceToken, latitude, longitude, altitude, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createDevice");
      }

      // verify the required parameter 'name' is set
      if (name == undefined || name == null) {
        throw new Error("Missing the required parameter 'name' when calling createDevice");
      }

      // verify the required parameter 'platform' is set
      if (platform == undefined || platform == null) {
        throw new Error("Missing the required parameter 'platform' when calling createDevice");
      }

      // verify the required parameter 'deviceToken' is set
      if (deviceToken == undefined || deviceToken == null) {
        throw new Error("Missing the required parameter 'deviceToken' when calling createDevice");
      }

      // verify the required parameter 'latitude' is set
      if (latitude == undefined || latitude == null) {
        throw new Error("Missing the required parameter 'latitude' when calling createDevice");
      }

      // verify the required parameter 'longitude' is set
      if (longitude == undefined || longitude == null) {
        throw new Error("Missing the required parameter 'longitude' when calling createDevice");
      }

      // verify the required parameter 'altitude' is set
      if (altitude == undefined || altitude == null) {
        throw new Error("Missing the required parameter 'altitude' when calling createDevice");
      }


      var pathParams = {
        'userId': userId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'name': name,
        'platform': platform,
        'deviceToken': deviceToken,
        'latitude': latitude,
        'longitude': longitude,
        'altitude': altitude,
        'horizontalAccuracy': opts['horizontalAccuracy'],
        'verticalAccuracy': opts['verticalAccuracy']
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json', 'application/x-www-form-urlencoded'];
      var accepts = ['application/json'];
      var returnType = Device;

      return this.apiClient.callApi(
        '/users/{userId}/devices', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the createLocation operation.
     * @callback module:api/DeviceApi~createLocationCallback
     * @param {String} error Error message, if any.
     * @param {module:model/DeviceLocation} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create a new location for a device
     * @param {String} userId The id (UUID) of the user
     * @param {String} deviceId The id (UUID) of the device
     * @param {Number} latitude The latitude of the device. 
     * @param {Number} longitude The longitude of the device. 
     * @param {Number} altitude The altitude of the device. 
     * @param {Object} opts Optional parameters
     * @param {Number} opts.horizontalAccuracy  The horizontal accuracy of the location, measured on a scale from &#39;0.0&#39; to &#39;1.0&#39;, &#39;1.0&#39; being the most accurate. If this value is not specified then the default value of &#39;1.0&#39; is used  (default to 5)
     * @param {Number} opts.verticalAccuracy  The vertical accuracy of the location, measured on a scale from &#39;0.0&#39; to &#39;1.0&#39;, &#39;1.0&#39; being the most accurate. If this value is not specified then the default value of &#39;1.0&#39; is used  (default to 5)
     * @param {module:api/DeviceApi~createLocationCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/DeviceLocation}
     */
    this.createLocation = function(userId, deviceId, latitude, longitude, altitude, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createLocation");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling createLocation");
      }

      // verify the required parameter 'latitude' is set
      if (latitude == undefined || latitude == null) {
        throw new Error("Missing the required parameter 'latitude' when calling createLocation");
      }

      // verify the required parameter 'longitude' is set
      if (longitude == undefined || longitude == null) {
        throw new Error("Missing the required parameter 'longitude' when calling createLocation");
      }

      // verify the required parameter 'altitude' is set
      if (altitude == undefined || altitude == null) {
        throw new Error("Missing the required parameter 'altitude' when calling createLocation");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'latitude': latitude,
        'longitude': longitude,
        'altitude': altitude,
        'horizontalAccuracy': opts['horizontalAccuracy'],
        'verticalAccuracy': opts['verticalAccuracy']
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = DeviceLocation;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/locations', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the createPublication operation.
     * @callback module:api/DeviceApi~createPublicationCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Publication} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create a publication for a device for a user
     * @param {String} userId The id (UUID) of the user to create a device for
     * @param {String} deviceId The id (UUID) of the user device
     * @param {String} topic The topic of the publication. This will act as a first match filter. For a subscription to be able to match a publication they must have the exact same topic 
     * @param {Number} range The range of the publication in meters. This is the range around the device holding the publication in which matches with subscriptions can be triggered 
     * @param {Number} duration The duration of the publication in seconds. If set to &#39;-1&#39; the publication will live forever and if set to &#39;0&#39; it will be instant at the time of publication. 
     * @param {String} properties  A string representing a map of (key, value) pairs in JSON format:  &#x60;{\&quot;key1\&quot;: \&quot;value1\&quot;, \&quot;key2\&quot;: \&quot;value2\&quot;}&#x60; 
     * @param {module:api/DeviceApi~createPublicationCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Publication}
     */
    this.createPublication = function(userId, deviceId, topic, range, duration, properties, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createPublication");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling createPublication");
      }

      // verify the required parameter 'topic' is set
      if (topic == undefined || topic == null) {
        throw new Error("Missing the required parameter 'topic' when calling createPublication");
      }

      // verify the required parameter 'range' is set
      if (range == undefined || range == null) {
        throw new Error("Missing the required parameter 'range' when calling createPublication");
      }

      // verify the required parameter 'duration' is set
      if (duration == undefined || duration == null) {
        throw new Error("Missing the required parameter 'duration' when calling createPublication");
      }

      // verify the required parameter 'properties' is set
      if (properties == undefined || properties == null) {
        throw new Error("Missing the required parameter 'properties' when calling createPublication");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'topic': topic,
        'range': range,
        'duration': duration,
        'properties': properties
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Publication;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/publications', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the createSubscription operation.
     * @callback module:api/DeviceApi~createSubscriptionCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Subscription} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create a subscription for a device for a user
     * @param {String} userId  The id (UUID) of the user to create a device for 
     * @param {String} deviceId  The id (UUID) of the user device 
     * @param {String} topic  The topic of the subscription. This will act as a first match filter. For a subscription to be able to match a publication they must have the exact same topic 
     * @param {String} selector  This is an expression to filter the publications. For instance &#39;job&#x3D;&#39;developer&#39;&#39; will allow matching only with publications containing a &#39;job&#39; key with a value of &#39;developer&#39; 
     * @param {Number} range  The range of the subscription in meters. This is the range around the device holding the subscription in which matches with publications can be triggered 
     * @param {Number} duration  The duration of the subscription in seconds. If set to &#39;-1&#39; the subscription will live forever and if set to &#39;0&#39; it will be instant at the time of subscription. 
     * @param {module:api/DeviceApi~createSubscriptionCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Subscription}
     */
    this.createSubscription = function(userId, deviceId, topic, selector, range, duration, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createSubscription");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling createSubscription");
      }

      // verify the required parameter 'topic' is set
      if (topic == undefined || topic == null) {
        throw new Error("Missing the required parameter 'topic' when calling createSubscription");
      }

      // verify the required parameter 'selector' is set
      if (selector == undefined || selector == null) {
        throw new Error("Missing the required parameter 'selector' when calling createSubscription");
      }

      // verify the required parameter 'range' is set
      if (range == undefined || range == null) {
        throw new Error("Missing the required parameter 'range' when calling createSubscription");
      }

      // verify the required parameter 'duration' is set
      if (duration == undefined || duration == null) {
        throw new Error("Missing the required parameter 'duration' when calling createSubscription");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'topic': topic,
        'selector': selector,
        'range': range,
        'duration': duration
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Subscription;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/subscriptions', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the getDevice operation.
     * @callback module:api/DeviceApi~getDeviceCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Device} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Info about a device of a user
     * @param {String} userId The id (UUID) of the user of the device
     * @param {String} deviceId The id (UUID) of the user device
     * @param {module:api/DeviceApi~getDeviceCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Device}
     */
    this.getDevice = function(userId, deviceId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling getDevice");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling getDevice");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Device;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the getMatches operation.
     * @callback module:api/DeviceApi~getMatchesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Matches} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Get matches for the device
     * @param {String} userId The id (UUID) of the user of the device
     * @param {String} deviceId The id (UUID) of the user device
     * @param {module:api/DeviceApi~getMatchesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Matches}
     */
    this.getMatches = function(userId, deviceId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling getMatches");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling getMatches");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Matches;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/matches', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the getPublications operation.
     * @callback module:api/DeviceApi~getPublicationsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Publications} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Get all publications for a device
     * @param {String} userId The id (UUID) of the user
     * @param {String} deviceId The id (UUID) of the device
     * @param {module:api/DeviceApi~getPublicationsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Publications}
     */
    this.getPublications = function(userId, deviceId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling getPublications");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling getPublications");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Publications;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/publications', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the getSubscriptions operation.
     * @callback module:api/DeviceApi~getSubscriptionsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Subscriptions} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Get all subscriptions for a device
     * @param {String} userId The id (UUID) of the user
     * @param {String} deviceId The id (UUID) of the device
     * @param {module:api/DeviceApi~getSubscriptionsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Subscriptions}
     */
    this.getSubscriptions = function(userId, deviceId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling getSubscriptions");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling getSubscriptions");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Subscriptions;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/subscriptions', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }
  };

  return exports;
}));

},{"../ApiClient":10,"../model/APIError":19,"../model/Device":20,"../model/DeviceLocation":21,"../model/Matches":24,"../model/Publication":25,"../model/Publications":26,"../model/Subscription":27,"../model/Subscriptions":28}],12:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/APIError', 'model/DeviceLocation'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('../model/APIError'), require('../model/DeviceLocation'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.LocationApi = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.APIError, root.ScalpsCoreRestApi.DeviceLocation);
  }
}(this, function(ApiClient, APIError, DeviceLocation) {
  'use strict';

  /**
   * Location service.
   * @module api/LocationApi
   * @version 0.1.0
   */

  /**
   * Constructs a new LocationApi. 
   * @alias module:api/LocationApi
   * @class
   * @param {module:ApiClient} apiClient Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


    /**
     * Callback function to receive the result of the createLocation operation.
     * @callback module:api/LocationApi~createLocationCallback
     * @param {String} error Error message, if any.
     * @param {module:model/DeviceLocation} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create a new location for a device
     * @param {String} userId The id (UUID) of the user
     * @param {String} deviceId The id (UUID) of the device
     * @param {Number} latitude The latitude of the device. 
     * @param {Number} longitude The longitude of the device. 
     * @param {Number} altitude The altitude of the device. 
     * @param {Object} opts Optional parameters
     * @param {Number} opts.horizontalAccuracy  The horizontal accuracy of the location, measured on a scale from &#39;0.0&#39; to &#39;1.0&#39;, &#39;1.0&#39; being the most accurate. If this value is not specified then the default value of &#39;1.0&#39; is used  (default to 5)
     * @param {Number} opts.verticalAccuracy  The vertical accuracy of the location, measured on a scale from &#39;0.0&#39; to &#39;1.0&#39;, &#39;1.0&#39; being the most accurate. If this value is not specified then the default value of &#39;1.0&#39; is used  (default to 5)
     * @param {module:api/LocationApi~createLocationCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/DeviceLocation}
     */
    this.createLocation = function(userId, deviceId, latitude, longitude, altitude, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createLocation");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling createLocation");
      }

      // verify the required parameter 'latitude' is set
      if (latitude == undefined || latitude == null) {
        throw new Error("Missing the required parameter 'latitude' when calling createLocation");
      }

      // verify the required parameter 'longitude' is set
      if (longitude == undefined || longitude == null) {
        throw new Error("Missing the required parameter 'longitude' when calling createLocation");
      }

      // verify the required parameter 'altitude' is set
      if (altitude == undefined || altitude == null) {
        throw new Error("Missing the required parameter 'altitude' when calling createLocation");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'latitude': latitude,
        'longitude': longitude,
        'altitude': altitude,
        'horizontalAccuracy': opts['horizontalAccuracy'],
        'verticalAccuracy': opts['verticalAccuracy']
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = DeviceLocation;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/locations', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }
  };

  return exports;
}));

},{"../ApiClient":10,"../model/APIError":19,"../model/DeviceLocation":21}],13:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/APIError', 'model/Matches'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('../model/APIError'), require('../model/Matches'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.MatchesApi = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.APIError, root.ScalpsCoreRestApi.Matches);
  }
}(this, function(ApiClient, APIError, Matches) {
  'use strict';

  /**
   * Matches service.
   * @module api/MatchesApi
   * @version 0.1.0
   */

  /**
   * Constructs a new MatchesApi. 
   * @alias module:api/MatchesApi
   * @class
   * @param {module:ApiClient} apiClient Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


    /**
     * Callback function to receive the result of the getMatches operation.
     * @callback module:api/MatchesApi~getMatchesCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Matches} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Get matches for the device
     * @param {String} userId The id (UUID) of the user of the device
     * @param {String} deviceId The id (UUID) of the user device
     * @param {module:api/MatchesApi~getMatchesCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Matches}
     */
    this.getMatches = function(userId, deviceId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling getMatches");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling getMatches");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Matches;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/matches', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }
  };

  return exports;
}));

},{"../ApiClient":10,"../model/APIError":19,"../model/Matches":24}],14:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/APIError', 'model/Publication', 'model/Publications'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('../model/APIError'), require('../model/Publication'), require('../model/Publications'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.PublicationApi = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.APIError, root.ScalpsCoreRestApi.Publication, root.ScalpsCoreRestApi.Publications);
  }
}(this, function(ApiClient, APIError, Publication, Publications) {
  'use strict';

  /**
   * Publication service.
   * @module api/PublicationApi
   * @version 0.1.0
   */

  /**
   * Constructs a new PublicationApi. 
   * @alias module:api/PublicationApi
   * @class
   * @param {module:ApiClient} apiClient Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


    /**
     * Callback function to receive the result of the createPublication operation.
     * @callback module:api/PublicationApi~createPublicationCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Publication} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create a publication for a device for a user
     * @param {String} userId The id (UUID) of the user to create a device for
     * @param {String} deviceId The id (UUID) of the user device
     * @param {String} topic The topic of the publication. This will act as a first match filter. For a subscription to be able to match a publication they must have the exact same topic 
     * @param {Number} range The range of the publication in meters. This is the range around the device holding the publication in which matches with subscriptions can be triggered 
     * @param {Number} duration The duration of the publication in seconds. If set to &#39;-1&#39; the publication will live forever and if set to &#39;0&#39; it will be instant at the time of publication. 
     * @param {String} properties  A string representing a map of (key, value) pairs in JSON format:  &#x60;{\&quot;key1\&quot;: \&quot;value1\&quot;, \&quot;key2\&quot;: \&quot;value2\&quot;}&#x60; 
     * @param {module:api/PublicationApi~createPublicationCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Publication}
     */
    this.createPublication = function(userId, deviceId, topic, range, duration, properties, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createPublication");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling createPublication");
      }

      // verify the required parameter 'topic' is set
      if (topic == undefined || topic == null) {
        throw new Error("Missing the required parameter 'topic' when calling createPublication");
      }

      // verify the required parameter 'range' is set
      if (range == undefined || range == null) {
        throw new Error("Missing the required parameter 'range' when calling createPublication");
      }

      // verify the required parameter 'duration' is set
      if (duration == undefined || duration == null) {
        throw new Error("Missing the required parameter 'duration' when calling createPublication");
      }

      // verify the required parameter 'properties' is set
      if (properties == undefined || properties == null) {
        throw new Error("Missing the required parameter 'properties' when calling createPublication");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'topic': topic,
        'range': range,
        'duration': duration,
        'properties': properties
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Publication;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/publications', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the getPublications operation.
     * @callback module:api/PublicationApi~getPublicationsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Publications} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Get all publications for a device
     * @param {String} userId The id (UUID) of the user
     * @param {String} deviceId The id (UUID) of the device
     * @param {module:api/PublicationApi~getPublicationsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Publications}
     */
    this.getPublications = function(userId, deviceId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling getPublications");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling getPublications");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Publications;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/publications', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }
  };

  return exports;
}));

},{"../ApiClient":10,"../model/APIError":19,"../model/Publication":25,"../model/Publications":26}],15:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/APIError', 'model/Subscription', 'model/Subscriptions'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('../model/APIError'), require('../model/Subscription'), require('../model/Subscriptions'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.SubscriptionApi = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.APIError, root.ScalpsCoreRestApi.Subscription, root.ScalpsCoreRestApi.Subscriptions);
  }
}(this, function(ApiClient, APIError, Subscription, Subscriptions) {
  'use strict';

  /**
   * Subscription service.
   * @module api/SubscriptionApi
   * @version 0.1.0
   */

  /**
   * Constructs a new SubscriptionApi. 
   * @alias module:api/SubscriptionApi
   * @class
   * @param {module:ApiClient} apiClient Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


    /**
     * Callback function to receive the result of the createSubscription operation.
     * @callback module:api/SubscriptionApi~createSubscriptionCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Subscription} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create a subscription for a device for a user
     * @param {String} userId  The id (UUID) of the user to create a device for 
     * @param {String} deviceId  The id (UUID) of the user device 
     * @param {String} topic  The topic of the subscription. This will act as a first match filter. For a subscription to be able to match a publication they must have the exact same topic 
     * @param {String} selector  This is an expression to filter the publications. For instance &#39;job&#x3D;&#39;developer&#39;&#39; will allow matching only with publications containing a &#39;job&#39; key with a value of &#39;developer&#39; 
     * @param {Number} range  The range of the subscription in meters. This is the range around the device holding the subscription in which matches with publications can be triggered 
     * @param {Number} duration  The duration of the subscription in seconds. If set to &#39;-1&#39; the subscription will live forever and if set to &#39;0&#39; it will be instant at the time of subscription. 
     * @param {module:api/SubscriptionApi~createSubscriptionCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Subscription}
     */
    this.createSubscription = function(userId, deviceId, topic, selector, range, duration, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createSubscription");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling createSubscription");
      }

      // verify the required parameter 'topic' is set
      if (topic == undefined || topic == null) {
        throw new Error("Missing the required parameter 'topic' when calling createSubscription");
      }

      // verify the required parameter 'selector' is set
      if (selector == undefined || selector == null) {
        throw new Error("Missing the required parameter 'selector' when calling createSubscription");
      }

      // verify the required parameter 'range' is set
      if (range == undefined || range == null) {
        throw new Error("Missing the required parameter 'range' when calling createSubscription");
      }

      // verify the required parameter 'duration' is set
      if (duration == undefined || duration == null) {
        throw new Error("Missing the required parameter 'duration' when calling createSubscription");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'topic': topic,
        'selector': selector,
        'range': range,
        'duration': duration
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Subscription;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/subscriptions', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the getSubscriptions operation.
     * @callback module:api/SubscriptionApi~getSubscriptionsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Subscriptions} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Get all subscriptions for a device
     * @param {String} userId The id (UUID) of the user
     * @param {String} deviceId The id (UUID) of the device
     * @param {module:api/SubscriptionApi~getSubscriptionsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Subscriptions}
     */
    this.getSubscriptions = function(userId, deviceId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling getSubscriptions");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling getSubscriptions");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Subscriptions;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/subscriptions', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }
  };

  return exports;
}));

},{"../ApiClient":10,"../model/APIError":19,"../model/Subscription":27,"../model/Subscriptions":28}],16:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/APIError', 'model/Device', 'model/DeviceLocation', 'model/Publication', 'model/Publications', 'model/Subscription', 'model/Subscriptions', 'model/Users'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('../model/APIError'), require('../model/Device'), require('../model/DeviceLocation'), require('../model/Publication'), require('../model/Publications'), require('../model/Subscription'), require('../model/Subscriptions'), require('../model/Users'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.UserApi = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.APIError, root.ScalpsCoreRestApi.Device, root.ScalpsCoreRestApi.DeviceLocation, root.ScalpsCoreRestApi.Publication, root.ScalpsCoreRestApi.Publications, root.ScalpsCoreRestApi.Subscription, root.ScalpsCoreRestApi.Subscriptions, root.ScalpsCoreRestApi.Users);
  }
}(this, function(ApiClient, APIError, Device, DeviceLocation, Publication, Publications, Subscription, Subscriptions, Users) {
  'use strict';

  /**
   * User service.
   * @module api/UserApi
   * @version 0.1.0
   */

  /**
   * Constructs a new UserApi. 
   * @alias module:api/UserApi
   * @class
   * @param {module:ApiClient} apiClient Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


    /**
     * Callback function to receive the result of the createDevice operation.
     * @callback module:api/UserApi~createDeviceCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Device} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create device for a user
     * @param {String} userId The id (UUID) of the user for which to create a device
     * @param {String} name The name of the device
     * @param {String} platform  The platform of the device, this can be any string representing the platform type, for instance &#39;iOS 9.3&#39; 
     * @param {String} deviceToken  The deviceToken is the device push notification token given to this device by the OS, either iOS or Android, for identifying the device with push notification services. 
     * @param {Number} latitude The latitude of the device. 
     * @param {Number} longitude The longitude of the device. 
     * @param {Number} altitude The altitude of the device. 
     * @param {Object} opts Optional parameters
     * @param {Number} opts.horizontalAccuracy  The horizontal accuracy of the location, measured on a scale from &#39;0.0&#39; to &#39;1.0&#39;, &#39;1.0&#39; being the most accurate. If this value is not specified then the default value of &#39;1.0&#39; is used  (default to 5)
     * @param {Number} opts.verticalAccuracy  The vertical accuracy of the location, measured on a scale from &#39;0.0&#39; to &#39;1.0&#39;, &#39;1.0&#39; being the most accurate. If this value is not specified then the default value of &#39;1.0&#39; is used  (default to 5)
     * @param {module:api/UserApi~createDeviceCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Device}
     */
    this.createDevice = function(userId, name, platform, deviceToken, latitude, longitude, altitude, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createDevice");
      }

      // verify the required parameter 'name' is set
      if (name == undefined || name == null) {
        throw new Error("Missing the required parameter 'name' when calling createDevice");
      }

      // verify the required parameter 'platform' is set
      if (platform == undefined || platform == null) {
        throw new Error("Missing the required parameter 'platform' when calling createDevice");
      }

      // verify the required parameter 'deviceToken' is set
      if (deviceToken == undefined || deviceToken == null) {
        throw new Error("Missing the required parameter 'deviceToken' when calling createDevice");
      }

      // verify the required parameter 'latitude' is set
      if (latitude == undefined || latitude == null) {
        throw new Error("Missing the required parameter 'latitude' when calling createDevice");
      }

      // verify the required parameter 'longitude' is set
      if (longitude == undefined || longitude == null) {
        throw new Error("Missing the required parameter 'longitude' when calling createDevice");
      }

      // verify the required parameter 'altitude' is set
      if (altitude == undefined || altitude == null) {
        throw new Error("Missing the required parameter 'altitude' when calling createDevice");
      }


      var pathParams = {
        'userId': userId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'name': name,
        'platform': platform,
        'deviceToken': deviceToken,
        'latitude': latitude,
        'longitude': longitude,
        'altitude': altitude,
        'horizontalAccuracy': opts['horizontalAccuracy'],
        'verticalAccuracy': opts['verticalAccuracy']
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json', 'application/x-www-form-urlencoded'];
      var accepts = ['application/json'];
      var returnType = Device;

      return this.apiClient.callApi(
        '/users/{userId}/devices', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the createLocation operation.
     * @callback module:api/UserApi~createLocationCallback
     * @param {String} error Error message, if any.
     * @param {module:model/DeviceLocation} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create a new location for a device
     * @param {String} userId The id (UUID) of the user
     * @param {String} deviceId The id (UUID) of the device
     * @param {Number} latitude The latitude of the device. 
     * @param {Number} longitude The longitude of the device. 
     * @param {Number} altitude The altitude of the device. 
     * @param {Object} opts Optional parameters
     * @param {Number} opts.horizontalAccuracy  The horizontal accuracy of the location, measured on a scale from &#39;0.0&#39; to &#39;1.0&#39;, &#39;1.0&#39; being the most accurate. If this value is not specified then the default value of &#39;1.0&#39; is used  (default to 5)
     * @param {Number} opts.verticalAccuracy  The vertical accuracy of the location, measured on a scale from &#39;0.0&#39; to &#39;1.0&#39;, &#39;1.0&#39; being the most accurate. If this value is not specified then the default value of &#39;1.0&#39; is used  (default to 5)
     * @param {module:api/UserApi~createLocationCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/DeviceLocation}
     */
    this.createLocation = function(userId, deviceId, latitude, longitude, altitude, opts, callback) {
      opts = opts || {};
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createLocation");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling createLocation");
      }

      // verify the required parameter 'latitude' is set
      if (latitude == undefined || latitude == null) {
        throw new Error("Missing the required parameter 'latitude' when calling createLocation");
      }

      // verify the required parameter 'longitude' is set
      if (longitude == undefined || longitude == null) {
        throw new Error("Missing the required parameter 'longitude' when calling createLocation");
      }

      // verify the required parameter 'altitude' is set
      if (altitude == undefined || altitude == null) {
        throw new Error("Missing the required parameter 'altitude' when calling createLocation");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'latitude': latitude,
        'longitude': longitude,
        'altitude': altitude,
        'horizontalAccuracy': opts['horizontalAccuracy'],
        'verticalAccuracy': opts['verticalAccuracy']
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = DeviceLocation;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/locations', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the createPublication operation.
     * @callback module:api/UserApi~createPublicationCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Publication} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create a publication for a device for a user
     * @param {String} userId The id (UUID) of the user to create a device for
     * @param {String} deviceId The id (UUID) of the user device
     * @param {String} topic The topic of the publication. This will act as a first match filter. For a subscription to be able to match a publication they must have the exact same topic 
     * @param {Number} range The range of the publication in meters. This is the range around the device holding the publication in which matches with subscriptions can be triggered 
     * @param {Number} duration The duration of the publication in seconds. If set to &#39;-1&#39; the publication will live forever and if set to &#39;0&#39; it will be instant at the time of publication. 
     * @param {String} properties  A string representing a map of (key, value) pairs in JSON format:  &#x60;{\&quot;key1\&quot;: \&quot;value1\&quot;, \&quot;key2\&quot;: \&quot;value2\&quot;}&#x60; 
     * @param {module:api/UserApi~createPublicationCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Publication}
     */
    this.createPublication = function(userId, deviceId, topic, range, duration, properties, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createPublication");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling createPublication");
      }

      // verify the required parameter 'topic' is set
      if (topic == undefined || topic == null) {
        throw new Error("Missing the required parameter 'topic' when calling createPublication");
      }

      // verify the required parameter 'range' is set
      if (range == undefined || range == null) {
        throw new Error("Missing the required parameter 'range' when calling createPublication");
      }

      // verify the required parameter 'duration' is set
      if (duration == undefined || duration == null) {
        throw new Error("Missing the required parameter 'duration' when calling createPublication");
      }

      // verify the required parameter 'properties' is set
      if (properties == undefined || properties == null) {
        throw new Error("Missing the required parameter 'properties' when calling createPublication");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'topic': topic,
        'range': range,
        'duration': duration,
        'properties': properties
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Publication;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/publications', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the createSubscription operation.
     * @callback module:api/UserApi~createSubscriptionCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Subscription} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create a subscription for a device for a user
     * @param {String} userId  The id (UUID) of the user to create a device for 
     * @param {String} deviceId  The id (UUID) of the user device 
     * @param {String} topic  The topic of the subscription. This will act as a first match filter. For a subscription to be able to match a publication they must have the exact same topic 
     * @param {String} selector  This is an expression to filter the publications. For instance &#39;job&#x3D;&#39;developer&#39;&#39; will allow matching only with publications containing a &#39;job&#39; key with a value of &#39;developer&#39; 
     * @param {Number} range  The range of the subscription in meters. This is the range around the device holding the subscription in which matches with publications can be triggered 
     * @param {Number} duration  The duration of the subscription in seconds. If set to &#39;-1&#39; the subscription will live forever and if set to &#39;0&#39; it will be instant at the time of subscription. 
     * @param {module:api/UserApi~createSubscriptionCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Subscription}
     */
    this.createSubscription = function(userId, deviceId, topic, selector, range, duration, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling createSubscription");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling createSubscription");
      }

      // verify the required parameter 'topic' is set
      if (topic == undefined || topic == null) {
        throw new Error("Missing the required parameter 'topic' when calling createSubscription");
      }

      // verify the required parameter 'selector' is set
      if (selector == undefined || selector == null) {
        throw new Error("Missing the required parameter 'selector' when calling createSubscription");
      }

      // verify the required parameter 'range' is set
      if (range == undefined || range == null) {
        throw new Error("Missing the required parameter 'range' when calling createSubscription");
      }

      // verify the required parameter 'duration' is set
      if (duration == undefined || duration == null) {
        throw new Error("Missing the required parameter 'duration' when calling createSubscription");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'topic': topic,
        'selector': selector,
        'range': range,
        'duration': duration
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Subscription;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/subscriptions', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the getDevice operation.
     * @callback module:api/UserApi~getDeviceCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Device} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Info about a device of a user
     * @param {String} userId The id (UUID) of the user of the device
     * @param {String} deviceId The id (UUID) of the user device
     * @param {module:api/UserApi~getDeviceCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Device}
     */
    this.getDevice = function(userId, deviceId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling getDevice");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling getDevice");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Device;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the getPublications operation.
     * @callback module:api/UserApi~getPublicationsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Publications} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Get all publications for a device
     * @param {String} userId The id (UUID) of the user
     * @param {String} deviceId The id (UUID) of the device
     * @param {module:api/UserApi~getPublicationsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Publications}
     */
    this.getPublications = function(userId, deviceId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling getPublications");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling getPublications");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Publications;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/publications', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the getSubscriptions operation.
     * @callback module:api/UserApi~getSubscriptionsCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Subscriptions} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Get all subscriptions for a device
     * @param {String} userId The id (UUID) of the user
     * @param {String} deviceId The id (UUID) of the device
     * @param {module:api/UserApi~getSubscriptionsCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Subscriptions}
     */
    this.getSubscriptions = function(userId, deviceId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling getSubscriptions");
      }

      // verify the required parameter 'deviceId' is set
      if (deviceId == undefined || deviceId == null) {
        throw new Error("Missing the required parameter 'deviceId' when calling getSubscriptions");
      }


      var pathParams = {
        'userId': userId,
        'deviceId': deviceId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Subscriptions;

      return this.apiClient.callApi(
        '/users/{userId}/devices/{deviceId}/subscriptions', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the showUserById operation.
     * @callback module:api/UserApi~showUserByIdCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Users} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Info about a user
     * @param {String} userId The id (UUID) of the user to retrieve
     * @param {module:api/UserApi~showUserByIdCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Users}
     */
    this.showUserById = function(userId, callback) {
      var postBody = null;

      // verify the required parameter 'userId' is set
      if (userId == undefined || userId == null) {
        throw new Error("Missing the required parameter 'userId' when calling showUserById");
      }


      var pathParams = {
        'userId': userId
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Users;

      return this.apiClient.callApi(
        '/users/{userId}', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }
  };

  return exports;
}));

},{"../ApiClient":10,"../model/APIError":19,"../model/Device":20,"../model/DeviceLocation":21,"../model/Publication":25,"../model/Publications":26,"../model/Subscription":27,"../model/Subscriptions":28,"../model/Users":30}],17:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/APIError', 'model/User', 'model/Users'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('../model/APIError'), require('../model/User'), require('../model/Users'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.UsersApi = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.APIError, root.ScalpsCoreRestApi.User, root.ScalpsCoreRestApi.Users);
  }
}(this, function(ApiClient, APIError, User, Users) {
  'use strict';

  /**
   * Users service.
   * @module api/UsersApi
   * @version 0.1.0
   */

  /**
   * Constructs a new UsersApi. 
   * @alias module:api/UsersApi
   * @class
   * @param {module:ApiClient} apiClient Optional API client implementation to use,
   * default to {@link module:ApiClient#instance} if unspecified.
   */
  var exports = function(apiClient) {
    this.apiClient = apiClient || ApiClient.instance;


    /**
     * Callback function to receive the result of the createUser operation.
     * @callback module:api/UsersApi~createUserCallback
     * @param {String} error Error message, if any.
     * @param {module:model/User} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * Create a user
     * @param {String} name The name of the user to be created
     * @param {module:api/UsersApi~createUserCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/User}
     */
    this.createUser = function(name, callback) {
      var postBody = null;

      // verify the required parameter 'name' is set
      if (name == undefined || name == null) {
        throw new Error("Missing the required parameter 'name' when calling createUser");
      }


      var pathParams = {
      };
      var queryParams = {
      };
      var headerParams = {
      };
      var formParams = {
        'name': name
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = User;

      return this.apiClient.callApi(
        '/users', 'POST',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }

    /**
     * Callback function to receive the result of the listUsers operation.
     * @callback module:api/UsersApi~listUsersCallback
     * @param {String} error Error message, if any.
     * @param {module:model/Users} data The data returned by the service call.
     * @param {String} response The complete HTTP response.
     */

    /**
     * List all users
     * @param {Object} opts Optional parameters
     * @param {Number} opts.limit How many items to return at one time (1-100, default 100)
     * @param {module:api/UsersApi~listUsersCallback} callback The callback function, accepting three arguments: error, data, response
     * data is of type: {@link module:model/Users}
     */
    this.listUsers = function(opts, callback) {
      opts = opts || {};
      var postBody = null;


      var pathParams = {
      };
      var queryParams = {
        'limit': opts['limit']
      };
      var headerParams = {
      };
      var formParams = {
      };

      var authNames = ['api-key'];
      var contentTypes = ['application/json'];
      var accepts = ['application/json'];
      var returnType = Users;

      return this.apiClient.callApi(
        '/users', 'GET',
        pathParams, queryParams, headerParams, formParams, postBody,
        authNames, contentTypes, accepts, returnType, callback
      );
    }
  };

  return exports;
}));

},{"../ApiClient":10,"../model/APIError":19,"../model/User":29,"../model/Users":30}],18:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/APIError', 'model/Device', 'model/DeviceLocation', 'model/Location', 'model/Match', 'model/Matches', 'model/Publication', 'model/Publications', 'model/Subscription', 'model/Subscriptions', 'model/User', 'model/Users', 'api/DeviceApi', 'api/LocationApi', 'api/MatchesApi', 'api/PublicationApi', 'api/SubscriptionApi', 'api/UserApi', 'api/UsersApi'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('./ApiClient'), require('./model/APIError'), require('./model/Device'), require('./model/DeviceLocation'), require('./model/Location'), require('./model/Match'), require('./model/Matches'), require('./model/Publication'), require('./model/Publications'), require('./model/Subscription'), require('./model/Subscriptions'), require('./model/User'), require('./model/Users'), require('./api/DeviceApi'), require('./api/LocationApi'), require('./api/MatchesApi'), require('./api/PublicationApi'), require('./api/SubscriptionApi'), require('./api/UserApi'), require('./api/UsersApi'));
  }
}(function(ApiClient, APIError, Device, DeviceLocation, Location, Match, Matches, Publication, Publications, Subscription, Subscriptions, User, Users, DeviceApi, LocationApi, MatchesApi, PublicationApi, SubscriptionApi, UserApi, UsersApi) {
  'use strict';

  /**
   * __SCALPS_____We_connect_things_httpscalps_unil_chThe_first_version_of_the_SCALPS_API_is_an_exciting_step_to_allow_developers_use_a_context_aware_pubsub_cloud_service___A_lot_of_mobile_applications_and_their_use_cases_may_be_modeled_using_this_approach_and_can_therefore_profit_form_using_SCALPS_as_their_backend_service_Build_something_great_with_SCALPSOnce_youve__registered_your_client_httpscalps_unil_chaccountregister_its_easy_start_using_our_awesome_cloud_based_context_aware_pubsub__admitted_a_lot_of_buzzwords__RESTful_APIWe_do_our_best_to_have_all_our_URLs_be_RESTful_httpen_wikipedia_orgwikiRepresentational_state_transfer_Every_endpoint__URL_may_support_one_of_four_different_http_verbs__GETrequests_fetch_information_about_an_object_POST_requests_create_objectsPUT_requests_update_objects_and_finally_DELETE_requests_will_deleteobjects__Domain_model_User_Device_Location_Publication_Subscription_Match_More_about_SCALPS.<br>
   * The <code>index</code> module provides access to constructors for all the classes which comprise the public API.
   * <p>
   * An AMD (recommended!) or CommonJS application will generally do something equivalent to the following:
   * <pre>
   * var ScalpsCoreRestApi = require('index'); // See note below*.
   * var xxxSvc = new ScalpsCoreRestApi.XxxApi(); // Allocate the API class we're going to use.
   * var yyyModel = new ScalpsCoreRestApi.Yyy(); // Construct a model instance.
   * yyyModel.someProperty = 'someValue';
   * ...
   * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
   * ...
   * </pre>
   * <em>*NOTE: For a top-level AMD script, use require(['index'], function(){...})
   * and put the application logic within the callback function.</em>
   * </p>
   * <p>
   * A non-AMD browser application (discouraged) might do something like this:
   * <pre>
   * var xxxSvc = new ScalpsCoreRestApi.XxxApi(); // Allocate the API class we're going to use.
   * var yyy = new ScalpsCoreRestApi.Yyy(); // Construct a model instance.
   * yyyModel.someProperty = 'someValue';
   * ...
   * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
   * ...
   * </pre>
   * </p>
   * @module index
   * @version 0.1.0
   */
  var exports = {
    /**
     * The ApiClient constructor.
     * @property {module:ApiClient}
     */
    ApiClient: ApiClient,
    /**
     * The APIError model constructor.
     * @property {module:model/APIError}
     */
    APIError: APIError,
    /**
     * The Device model constructor.
     * @property {module:model/Device}
     */
    Device: Device,
    /**
     * The DeviceLocation model constructor.
     * @property {module:model/DeviceLocation}
     */
    DeviceLocation: DeviceLocation,
    /**
     * The Location model constructor.
     * @property {module:model/Location}
     */
    Location: Location,
    /**
     * The Match model constructor.
     * @property {module:model/Match}
     */
    Match: Match,
    /**
     * The Matches model constructor.
     * @property {module:model/Matches}
     */
    Matches: Matches,
    /**
     * The Publication model constructor.
     * @property {module:model/Publication}
     */
    Publication: Publication,
    /**
     * The Publications model constructor.
     * @property {module:model/Publications}
     */
    Publications: Publications,
    /**
     * The Subscription model constructor.
     * @property {module:model/Subscription}
     */
    Subscription: Subscription,
    /**
     * The Subscriptions model constructor.
     * @property {module:model/Subscriptions}
     */
    Subscriptions: Subscriptions,
    /**
     * The User model constructor.
     * @property {module:model/User}
     */
    User: User,
    /**
     * The Users model constructor.
     * @property {module:model/Users}
     */
    Users: Users,
    /**
     * The DeviceApi service constructor.
     * @property {module:api/DeviceApi}
     */
    DeviceApi: DeviceApi,
    /**
     * The LocationApi service constructor.
     * @property {module:api/LocationApi}
     */
    LocationApi: LocationApi,
    /**
     * The MatchesApi service constructor.
     * @property {module:api/MatchesApi}
     */
    MatchesApi: MatchesApi,
    /**
     * The PublicationApi service constructor.
     * @property {module:api/PublicationApi}
     */
    PublicationApi: PublicationApi,
    /**
     * The SubscriptionApi service constructor.
     * @property {module:api/SubscriptionApi}
     */
    SubscriptionApi: SubscriptionApi,
    /**
     * The UserApi service constructor.
     * @property {module:api/UserApi}
     */
    UserApi: UserApi,
    /**
     * The UsersApi service constructor.
     * @property {module:api/UsersApi}
     */
    UsersApi: UsersApi
  };

  return exports;
}));

},{"./ApiClient":10,"./api/DeviceApi":11,"./api/LocationApi":12,"./api/MatchesApi":13,"./api/PublicationApi":14,"./api/SubscriptionApi":15,"./api/UserApi":16,"./api/UsersApi":17,"./model/APIError":19,"./model/Device":20,"./model/DeviceLocation":21,"./model/Location":22,"./model/Match":23,"./model/Matches":24,"./model/Publication":25,"./model/Publications":26,"./model/Subscription":27,"./model/Subscriptions":28,"./model/User":29,"./model/Users":30}],19:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.APIError = factory(root.ScalpsCoreRestApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';




  /**
   * The APIError model module.
   * @module model/APIError
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>APIError</code>.
   * @alias module:model/APIError
   * @class
   * @param code {Number} 
   * @param message {String} 
   */
  var exports = function(code, message) {
    var _this = this;

    _this['code'] = code;
    _this['message'] = message;
  };

  /**
   * Constructs a <code>APIError</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/APIError} obj Optional instance to populate.
   * @return {module:model/APIError} The populated <code>APIError</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('code')) {
        obj['code'] = ApiClient.convertToType(data['code'], 'Number');
      }
      if (data.hasOwnProperty('message')) {
        obj['message'] = ApiClient.convertToType(data['message'], 'String');
      }
    }
    return obj;
  }

  /**
   * @member {Number} code
   */
  exports.prototype['code'] = undefined;
  /**
   * @member {String} message
   */
  exports.prototype['message'] = undefined;



  return exports;
}));



},{"../ApiClient":10}],20:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/Location'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Location'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.Device = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.Location);
  }
}(this, function(ApiClient, Location) {
  'use strict';




  /**
   * The Device model module.
   * @module model/Device
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>Device</code>.
   * @alias module:model/Device
   * @class
   * @param deviceId {String} The id (UUID) of the device
   * @param name {String} The name of the device
   * @param platform {String}  The platform of the device, this can be any string representing the platform type, for instance 'iOS' 
   * @param deviceToken {String}  The deviceToken is the device push notification token given to this device by the OS, either iOS or Android for identifying the device with push notification services. 
   * @param location {module:model/Location} 
   */
  var exports = function(deviceId, name, platform, deviceToken, location) {
    var _this = this;

    _this['deviceId'] = deviceId;
    _this['name'] = name;
    _this['platform'] = platform;
    _this['deviceToken'] = deviceToken;
    _this['location'] = location;
  };

  /**
   * Constructs a <code>Device</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Device} obj Optional instance to populate.
   * @return {module:model/Device} The populated <code>Device</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('deviceId')) {
        obj['deviceId'] = ApiClient.convertToType(data['deviceId'], 'String');
      }
      if (data.hasOwnProperty('name')) {
        obj['name'] = ApiClient.convertToType(data['name'], 'String');
      }
      if (data.hasOwnProperty('platform')) {
        obj['platform'] = ApiClient.convertToType(data['platform'], 'String');
      }
      if (data.hasOwnProperty('deviceToken')) {
        obj['deviceToken'] = ApiClient.convertToType(data['deviceToken'], 'String');
      }
      if (data.hasOwnProperty('location')) {
        obj['location'] = Location.constructFromObject(data['location']);
      }
    }
    return obj;
  }

  /**
   * The id (UUID) of the device
   * @member {String} deviceId
   */
  exports.prototype['deviceId'] = undefined;
  /**
   * The name of the device
   * @member {String} name
   */
  exports.prototype['name'] = undefined;
  /**
   *  The platform of the device, this can be any string representing the platform type, for instance 'iOS' 
   * @member {String} platform
   */
  exports.prototype['platform'] = undefined;
  /**
   *  The deviceToken is the device push notification token given to this device by the OS, either iOS or Android for identifying the device with push notification services. 
   * @member {String} deviceToken
   */
  exports.prototype['deviceToken'] = undefined;
  /**
   * @member {module:model/Location} location
   */
  exports.prototype['location'] = undefined;



  return exports;
}));



},{"../ApiClient":10,"./Location":22}],21:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/Location'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Location'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.DeviceLocation = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.Location);
  }
}(this, function(ApiClient, Location) {
  'use strict';




  /**
   * The DeviceLocation model module.
   * @module model/DeviceLocation
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>DeviceLocation</code>.
   * @alias module:model/DeviceLocation
   * @class
   * @param deviceId {String}  The id (UUID) of the device to create a device location for 
   * @param location {module:model/Location} 
   */
  var exports = function(deviceId, location) {
    var _this = this;

    _this['deviceId'] = deviceId;
    _this['location'] = location;
  };

  /**
   * Constructs a <code>DeviceLocation</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/DeviceLocation} obj Optional instance to populate.
   * @return {module:model/DeviceLocation} The populated <code>DeviceLocation</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('deviceId')) {
        obj['deviceId'] = ApiClient.convertToType(data['deviceId'], 'String');
      }
      if (data.hasOwnProperty('location')) {
        obj['location'] = Location.constructFromObject(data['location']);
      }
    }
    return obj;
  }

  /**
   *  The id (UUID) of the device to create a device location for 
   * @member {String} deviceId
   */
  exports.prototype['deviceId'] = undefined;
  /**
   * @member {module:model/Location} location
   */
  exports.prototype['location'] = undefined;



  return exports;
}));



},{"../ApiClient":10,"./Location":22}],22:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.Location = factory(root.ScalpsCoreRestApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';




  /**
   * The Location model module.
   * @module model/Location
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>Location</code>.
   * @alias module:model/Location
   * @class
   * @param latitude {Number} The latitude of the device in degrees, for instance '46.5333' (Lausanne, Switzerland) 
   * @param longitude {Number} The longitude of the device in degrees, for instance '6.6667' (Lausanne, Switzerland) 
   * @param altitude {Number} The altitude of the device in meters, for instance '495.0' (Lausanne, Switzerland) 
   */
  var exports = function(latitude, longitude, altitude) {
    var _this = this;


    _this['latitude'] = latitude;
    _this['longitude'] = longitude;
    _this['altitude'] = altitude;


  };

  /**
   * Constructs a <code>Location</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Location} obj Optional instance to populate.
   * @return {module:model/Location} The populated <code>Location</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('timestamp')) {
        obj['timestamp'] = ApiClient.convertToType(data['timestamp'], 'Number');
      }
      if (data.hasOwnProperty('latitude')) {
        obj['latitude'] = ApiClient.convertToType(data['latitude'], 'Number');
      }
      if (data.hasOwnProperty('longitude')) {
        obj['longitude'] = ApiClient.convertToType(data['longitude'], 'Number');
      }
      if (data.hasOwnProperty('altitude')) {
        obj['altitude'] = ApiClient.convertToType(data['altitude'], 'Number');
      }
      if (data.hasOwnProperty('horizontalAccuracy')) {
        obj['horizontalAccuracy'] = ApiClient.convertToType(data['horizontalAccuracy'], 'Number');
      }
      if (data.hasOwnProperty('verticalAccuracy')) {
        obj['verticalAccuracy'] = ApiClient.convertToType(data['verticalAccuracy'], 'Number');
      }
    }
    return obj;
  }

  /**
   * The timestamp in seconds since Jan 01 1970. (UTC). If no timestamp is provided upon creation then the system uses the moment of the call to the api as a timestamp 
   * @member {Number} timestamp
   */
  exports.prototype['timestamp'] = undefined;
  /**
   * The latitude of the device in degrees, for instance '46.5333' (Lausanne, Switzerland) 
   * @member {Number} latitude
   */
  exports.prototype['latitude'] = undefined;
  /**
   * The longitude of the device in degrees, for instance '6.6667' (Lausanne, Switzerland) 
   * @member {Number} longitude
   */
  exports.prototype['longitude'] = undefined;
  /**
   * The altitude of the device in meters, for instance '495.0' (Lausanne, Switzerland) 
   * @member {Number} altitude
   */
  exports.prototype['altitude'] = undefined;
  /**
   * The horizontal accuracy of the location, measured on a scale from '0.0' to '1.0', '1.0' being the most accurate. If this value is not specified then the default value of '1.0' is used 
   * @member {Number} horizontalAccuracy
   * @default 1.0
   */
  exports.prototype['horizontalAccuracy'] = 1.0;
  /**
   * The vertical accuracy of the location, measured on a scale from '0.0' to '1.0', '1.0' being the most accurate. If this value is not specified then the default value of '1.0' is used 
   * @member {Number} verticalAccuracy
   * @default 1.0
   */
  exports.prototype['verticalAccuracy'] = 1.0;



  return exports;
}));



},{"../ApiClient":10}],23:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/Publication', 'model/Subscription'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Publication'), require('./Subscription'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.Match = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.Publication, root.ScalpsCoreRestApi.Subscription);
  }
}(this, function(ApiClient, Publication, Subscription) {
  'use strict';




  /**
   * The Match model module.
   * @module model/Match
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>Match</code>.
   * An object representing a match between a subscription and a publication.
   * @alias module:model/Match
   * @class
   * @param matchId {String} The id (UUID) of the user
   * @param timestamp {Number} The timestamp of the match in seconds since Jan 01 1970 (UTC).
   * @param publication {module:model/Publication} 
   * @param subscription {module:model/Subscription} 
   */
  var exports = function(matchId, timestamp, publication, subscription) {
    var _this = this;

    _this['matchId'] = matchId;
    _this['timestamp'] = timestamp;
    _this['publication'] = publication;
    _this['subscription'] = subscription;
  };

  /**
   * Constructs a <code>Match</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Match} obj Optional instance to populate.
   * @return {module:model/Match} The populated <code>Match</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('matchId')) {
        obj['matchId'] = ApiClient.convertToType(data['matchId'], 'String');
      }
      if (data.hasOwnProperty('timestamp')) {
        obj['timestamp'] = ApiClient.convertToType(data['timestamp'], 'Number');
      }
      if (data.hasOwnProperty('publication')) {
        obj['publication'] = Publication.constructFromObject(data['publication']);
      }
      if (data.hasOwnProperty('subscription')) {
        obj['subscription'] = Subscription.constructFromObject(data['subscription']);
      }
    }
    return obj;
  }

  /**
   * The id (UUID) of the user
   * @member {String} matchId
   */
  exports.prototype['matchId'] = undefined;
  /**
   * The timestamp of the match in seconds since Jan 01 1970 (UTC).
   * @member {Number} timestamp
   */
  exports.prototype['timestamp'] = undefined;
  /**
   * @member {module:model/Publication} publication
   */
  exports.prototype['publication'] = undefined;
  /**
   * @member {module:model/Subscription} subscription
   */
  exports.prototype['subscription'] = undefined;



  return exports;
}));



},{"../ApiClient":10,"./Publication":25,"./Subscription":27}],24:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/Match'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Match'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.Matches = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.Match);
  }
}(this, function(ApiClient, Match) {
  'use strict';




  /**
   * The Matches model module.
   * @module model/Matches
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>Matches</code>.
   * @alias module:model/Matches
   * @class
   * @extends Array
   */
  var exports = function() {
    var _this = this;
    _this = new Array();
    Object.setPrototypeOf(_this, exports);

    return _this;
  };

  /**
   * Constructs a <code>Matches</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Matches} obj Optional instance to populate.
   * @return {module:model/Matches} The populated <code>Matches</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      ApiClient.constructFromObject(data, obj, 'Match');

    }
    return obj;
  }




  return exports;
}));



},{"../ApiClient":10,"./Match":23}],25:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/Location'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Location'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.Publication = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.Location);
  }
}(this, function(ApiClient, Location) {
  'use strict';




  /**
   * The Publication model module.
   * @module model/Publication
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>Publication</code>.
   * @alias module:model/Publication
   * @class
   * @param topic {String} The topic of the publication. This will act as a first match filter. For a subscription to be able to match a publication they must have the exact same topic
   * @param range {Number} The range of the publication in meters. This is the range around the device holding the publication in which matches with subscriptions can be triggered
   * @param duration {Number} The duration of the publication in seconds. If set to '-1' the publication will live forever and if set to '0' it will be instant at the time of publication.
   * @param properties {String} The dictionary of key, value pairs.
   */
  var exports = function(topic, range, duration, properties) {
    var _this = this;




    _this['topic'] = topic;

    _this['range'] = range;
    _this['duration'] = duration;
    _this['properties'] = properties;

  };

  /**
   * Constructs a <code>Publication</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Publication} obj Optional instance to populate.
   * @return {module:model/Publication} The populated <code>Publication</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('timestamp')) {
        obj['timestamp'] = ApiClient.convertToType(data['timestamp'], 'Number');
      }
      if (data.hasOwnProperty('publicationId')) {
        obj['publicationId'] = ApiClient.convertToType(data['publicationId'], 'String');
      }
      if (data.hasOwnProperty('deviceId')) {
        obj['deviceId'] = ApiClient.convertToType(data['deviceId'], 'String');
      }
      if (data.hasOwnProperty('topic')) {
        obj['topic'] = ApiClient.convertToType(data['topic'], 'String');
      }
      if (data.hasOwnProperty('location')) {
        obj['location'] = Location.constructFromObject(data['location']);
      }
      if (data.hasOwnProperty('range')) {
        obj['range'] = ApiClient.convertToType(data['range'], 'Number');
      }
      if (data.hasOwnProperty('duration')) {
        obj['duration'] = ApiClient.convertToType(data['duration'], 'Number');
      }
      if (data.hasOwnProperty('properties')) {
        obj['properties'] = ApiClient.convertToType(data['properties'], 'String');
      }
      if (data.hasOwnProperty('op')) {
        obj['op'] = ApiClient.convertToType(data['op'], 'String');
      }
    }
    return obj;
  }

  /**
   * The timestamp in seconds since Jan 01 1970. (UTC). If no timestamp is provided upon creation then the system uses the moment of the call to the api as a timestamp
   * @member {Number} timestamp
   */
  exports.prototype['timestamp'] = undefined;
  /**
   * The id (UUID) of the publication
   * @member {String} publicationId
   */
  exports.prototype['publicationId'] = undefined;
  /**
   * The id (UUID) of the device to attach a publication to
   * @member {String} deviceId
   */
  exports.prototype['deviceId'] = undefined;
  /**
   * The topic of the publication. This will act as a first match filter. For a subscription to be able to match a publication they must have the exact same topic
   * @member {String} topic
   */
  exports.prototype['topic'] = undefined;
  /**
   * @member {module:model/Location} location
   */
  exports.prototype['location'] = undefined;
  /**
   * The range of the publication in meters. This is the range around the device holding the publication in which matches with subscriptions can be triggered
   * @member {Number} range
   */
  exports.prototype['range'] = undefined;
  /**
   * The duration of the publication in seconds. If set to '-1' the publication will live forever and if set to '0' it will be instant at the time of publication.
   * @member {Number} duration
   */
  exports.prototype['duration'] = undefined;
  /**
   * The dictionary of key, value pairs.
   * @member {String} properties
   */
  exports.prototype['properties'] = undefined;
  /**
   * The internal operation resulting from the API call. For instance 'create'
   * @member {String} op
   */
  exports.prototype['op'] = undefined;



  return exports;
}));



},{"../ApiClient":10,"./Location":22}],26:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/Publication'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Publication'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.Publications = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.Publication);
  }
}(this, function(ApiClient, Publication) {
  'use strict';




  /**
   * The Publications model module.
   * @module model/Publications
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>Publications</code>.
   * @alias module:model/Publications
   * @class
   * @extends Array
   */
  var exports = function() {
    var _this = this;
    _this = new Array();
    Object.setPrototypeOf(_this, exports);

    return _this;
  };

  /**
   * Constructs a <code>Publications</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Publications} obj Optional instance to populate.
   * @return {module:model/Publications} The populated <code>Publications</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      ApiClient.constructFromObject(data, obj, 'Publication');

    }
    return obj;
  }




  return exports;
}));



},{"../ApiClient":10,"./Publication":25}],27:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/Location'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Location'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.Subscription = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.Location);
  }
}(this, function(ApiClient, Location) {
  'use strict';




  /**
   * The Subscription model module.
   * @module model/Subscription
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>Subscription</code>.
   * @alias module:model/Subscription
   * @class
   * @param topic {String} The topic of the subscription. This will act as a first match filter. For a subscription to be able to match a publication they must have the exact same topic
   * @param selector {String} This is an expression to filter the publications. For instance 'job='developer'' will allow matching only with publications containing a 'job' key with a value of 'developer'
   * @param range {Number} The range of the subscription in meters. This is the range around the device holding the subscription in which matches with publications can be triggered
   * @param duration {Number} The duration of the subscription in seconds. If set to '-1' the subscription will live forever and if set to '0' it will be instant at the time of subscription.
   */
  var exports = function(topic, selector, range, duration) {
    var _this = this;




    _this['topic'] = topic;
    _this['selector'] = selector;

    _this['range'] = range;
    _this['duration'] = duration;

  };

  /**
   * Constructs a <code>Subscription</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Subscription} obj Optional instance to populate.
   * @return {module:model/Subscription} The populated <code>Subscription</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('timestamp')) {
        obj['timestamp'] = ApiClient.convertToType(data['timestamp'], 'Number');
      }
      if (data.hasOwnProperty('subscriptionId')) {
        obj['subscriptionId'] = ApiClient.convertToType(data['subscriptionId'], 'String');
      }
      if (data.hasOwnProperty('deviceId')) {
        obj['deviceId'] = ApiClient.convertToType(data['deviceId'], 'String');
      }
      if (data.hasOwnProperty('topic')) {
        obj['topic'] = ApiClient.convertToType(data['topic'], 'String');
      }
      if (data.hasOwnProperty('selector')) {
        obj['selector'] = ApiClient.convertToType(data['selector'], 'String');
      }
      if (data.hasOwnProperty('location')) {
        obj['location'] = Location.constructFromObject(data['location']);
      }
      if (data.hasOwnProperty('range')) {
        obj['range'] = ApiClient.convertToType(data['range'], 'Number');
      }
      if (data.hasOwnProperty('duration')) {
        obj['duration'] = ApiClient.convertToType(data['duration'], 'Number');
      }
      if (data.hasOwnProperty('op')) {
        obj['op'] = ApiClient.convertToType(data['op'], 'String');
      }
    }
    return obj;
  }

  /**
   * The timestamp in seconds since Jan 01 1970. (UTC). If no timestamp is provided upon creation then the system uses the moment of the call to the api as a timestamp
   * @member {Number} timestamp
   */
  exports.prototype['timestamp'] = undefined;
  /**
   * The id (UUID) of the subscription
   * @member {String} subscriptionId
   */
  exports.prototype['subscriptionId'] = undefined;
  /**
   * The id (UUID) of the device to attach a subscription to
   * @member {String} deviceId
   */
  exports.prototype['deviceId'] = undefined;
  /**
   * The topic of the subscription. This will act as a first match filter. For a subscription to be able to match a publication they must have the exact same topic
   * @member {String} topic
   */
  exports.prototype['topic'] = undefined;
  /**
   * This is an expression to filter the publications. For instance 'job='developer'' will allow matching only with publications containing a 'job' key with a value of 'developer'
   * @member {String} selector
   */
  exports.prototype['selector'] = undefined;
  /**
   * @member {module:model/Location} location
   */
  exports.prototype['location'] = undefined;
  /**
   * The range of the subscription in meters. This is the range around the device holding the subscription in which matches with publications can be triggered
   * @member {Number} range
   */
  exports.prototype['range'] = undefined;
  /**
   * The duration of the subscription in seconds. If set to '-1' the subscription will live forever and if set to '0' it will be instant at the time of subscription.
   * @member {Number} duration
   */
  exports.prototype['duration'] = undefined;
  /**
   * The internal operation resulting from the API call. For instance 'create'
   * @member {String} op
   */
  exports.prototype['op'] = undefined;



  return exports;
}));



},{"../ApiClient":10,"./Location":22}],28:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/Subscription'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./Subscription'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.Subscriptions = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.Subscription);
  }
}(this, function(ApiClient, Subscription) {
  'use strict';




  /**
   * The Subscriptions model module.
   * @module model/Subscriptions
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>Subscriptions</code>.
   * @alias module:model/Subscriptions
   * @class
   * @extends Array
   */
  var exports = function() {
    var _this = this;
    _this = new Array();
    Object.setPrototypeOf(_this, exports);

    return _this;
  };

  /**
   * Constructs a <code>Subscriptions</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Subscriptions} obj Optional instance to populate.
   * @return {module:model/Subscriptions} The populated <code>Subscriptions</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      ApiClient.constructFromObject(data, obj, 'Subscription');

    }
    return obj;
  }




  return exports;
}));



},{"../ApiClient":10,"./Subscription":27}],29:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.User = factory(root.ScalpsCoreRestApi.ApiClient);
  }
}(this, function(ApiClient) {
  'use strict';




  /**
   * The User model module.
   * @module model/User
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>User</code>.
   * @alias module:model/User
   * @class
   */
  var exports = function() {
    var _this = this;



  };

  /**
   * Constructs a <code>User</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/User} obj Optional instance to populate.
   * @return {module:model/User} The populated <code>User</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();

      if (data.hasOwnProperty('userId')) {
        obj['userId'] = ApiClient.convertToType(data['userId'], 'String');
      }
      if (data.hasOwnProperty('name')) {
        obj['name'] = ApiClient.convertToType(data['name'], 'String');
      }
    }
    return obj;
  }

  /**
   * The id (UUID) of the user
   * @member {String} userId
   */
  exports.prototype['userId'] = undefined;
  /**
   * The name of the user
   * @member {String} name
   */
  exports.prototype['name'] = undefined;



  return exports;
}));



},{"../ApiClient":10}],30:[function(require,module,exports){
/**
 * SCALPS Core REST API
 *  ## [SCALPS --- We connect things!](http://scalps.unil.ch) The first version of the SCALPS API is an exciting step to allow developers use a context-aware pub/sub cloud service.  A lot of mobile applications and their use cases may be modeled using this approach and can therefore profit form using SCALPS as their backend service.  **Build something great with SCALPS!**  Once you've [registered your client](http://scalps.unil.ch/account/register/) it's easy start using our awesome cloud based context-aware pub/sub (admitted, a lot of buzzwords). ## RESTful API We do our best to have all our URLs be [RESTful](http://en.wikipedia.org/wiki/Representational_state_transfer). Every endpoint (URL) may support one of four different http verbs. GET requests fetch information about an object, POST requests create objects, PUT requests update objects, and finally DELETE requests will delete objects.  ## Domain model ### User ### Device ### Location ### Publication ### Subscription ### Match ## More about SCALPS 
 *
 * OpenAPI spec version: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 *
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['ApiClient', 'model/User'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS-like environments that support module.exports, like Node.
    module.exports = factory(require('../ApiClient'), require('./User'));
  } else {
    // Browser globals (root is window)
    if (!root.ScalpsCoreRestApi) {
      root.ScalpsCoreRestApi = {};
    }
    root.ScalpsCoreRestApi.Users = factory(root.ScalpsCoreRestApi.ApiClient, root.ScalpsCoreRestApi.User);
  }
}(this, function(ApiClient, User) {
  'use strict';




  /**
   * The Users model module.
   * @module model/Users
   * @version 0.1.0
   */

  /**
   * Constructs a new <code>Users</code>.
   * @alias module:model/Users
   * @class
   * @extends Array
   */
  var exports = function() {
    var _this = this;
    _this = new Array();
    Object.setPrototypeOf(_this, exports);

    return _this;
  };

  /**
   * Constructs a <code>Users</code> from a plain JavaScript object, optionally creating a new instance.
   * Copies all relevant properties from <code>data</code> to <code>obj</code> if supplied or a new instance if not.
   * @param {Object} data The plain JavaScript object bearing properties of interest.
   * @param {module:model/Users} obj Optional instance to populate.
   * @return {module:model/Users} The populated <code>Users</code> instance.
   */
  exports.constructFromObject = function(data, obj) {
    if (data) {
      obj = obj || new exports();
      ApiClient.constructFromObject(data, obj, 'User');

    }
    return obj;
  }




  return exports;
}));



},{"../ApiClient":10,"./User":29}],31:[function(require,module,exports){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root;
if (typeof window !== 'undefined') { // Browser window
  root = window;
} else if (typeof self !== 'undefined') { // Web Worker
  root = self;
} else { // Other environments
  root = this;
}

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

request.getXHR = function () {
  if (root.XMLHttpRequest
      && (!root.location || 'file:' != root.location.protocol
          || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
};

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      pushEncodedKeyValuePair(pairs, key, obj[key]);
        }
      }
  return pairs.join('&');
}

/**
 * Helps 'serialize' with serializing arrays.
 * Mutates the pairs array.
 *
 * @param {Array} pairs
 * @param {String} key
 * @param {Mixed} val
 */

function pushEncodedKeyValuePair(pairs, key, val) {
  if (Array.isArray(val)) {
    return val.forEach(function(v) {
      pushEncodedKeyValuePair(pairs, key, v);
    });
  }
  pairs.push(encodeURIComponent(key)
    + '=' + encodeURIComponent(val));
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Check if `mime` is json or has +json structured syntax suffix.
 *
 * @param {String} mime
 * @return {Boolean}
 * @api private
 */

function isJSON(mime) {
  return /[\/+]json\b/.test(mime);
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  // responseText is accessible only if responseType is '' or 'text' and on older browsers
  this.text = ((this.req.method !='HEAD' && (this.xhr.responseType === '' || this.xhr.responseType === 'text')) || typeof this.xhr.responseType === 'undefined')
     ? this.xhr.responseText
     : null;
  this.statusText = this.req.xhr.statusText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this.parseBody(this.text ? this.text : this.xhr.response)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  return parse && str && (str.length || str instanceof Object)
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
  if (status === 1223) {
    status = 204;
  }

  var type = status / 100 | 0;

  // status / class
  this.status = this.statusCode = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.on('end', function(){
    var err = null;
    var res = null;

    try {
      res = new Response(self);
    } catch(e) {
      err = new Error('Parser is unable to parse the response');
      err.parse = true;
      err.original = e;
      // issue #675: return the raw response if the response parsing fails
      err.rawResponse = self.xhr && self.xhr.responseText ? self.xhr.responseText : null;
      return self.callback(err);
    }

    self.emit('response', res);

    if (err) {
      return self.callback(err, res);
    }

    if (res.status >= 200 && res.status < 300) {
      return self.callback(err, res);
    }

    var new_err = new Error(res.statusText || 'Unsuccessful HTTP response');
    new_err.original = err;
    new_err.response = res;
    new_err.status = res.status;

    self.callback(new_err, res);
  });
}

/**
 * Mixin `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Allow for extension
 */

Request.prototype.use = function(fn) {
  fn(this);
  return this;
}

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Remove header `field`.
 *
 * Example:
 *
 *      req.get('/')
 *        .unset('User-Agent')
 *        .end(callback);
 *
 * @param {String} field
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.unset = function(field){
  delete this._header[field.toLowerCase()];
  delete this.header[field];
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Force given parser
 *
 * Sets the body parser no matter type.
 *
 * @param {Function}
 * @api public
 */

Request.prototype.parse = function(fn){
  this._parser = fn;
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Write the field `name` and `val` for "multipart/form-data"
 * request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 * ```
 *
 * @param {String} name
 * @param {String|Blob|File} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.field = function(name, val){
  if (!this._formData) this._formData = new root.FormData();
  this._formData.append(name, val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `filename`.
 *
 * ``` js
 * request.post('/upload')
 *   .attach(new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String} filename
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, filename){
  if (!this._formData) this._formData = new root.FormData();
  this._formData.append(field, file, filename || file.name);
  return this;
};

/**
 * Send `data` as the request body, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"}')
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj || isHost(data)) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  this.clearTimeout();
  fn(err, res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Request has been terminated\nPossible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');
  err.crossDomain = true;

  err.status = this.status;
  err.method = this.method;
  err.url = this.url;

  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = request.getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;

    // In IE9, reads to any property (e.g. status) off of an aborted XHR will
    // result in the error "Could not complete the operation due to error c00c023f"
    var status;
    try { status = xhr.status } catch(e) { status = 0; }

    if (0 == status) {
      if (self.timedout) return self.timeoutError();
      if (self.aborted) return;
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  var handleProgress = function(e){
    if (e.total > 0) {
      e.percent = e.loaded / e.total * 100;
    }
    e.direction = 'download';
    self.emit('progress', e);
  };
  if (this.hasListeners('progress')) {
    xhr.onprogress = handleProgress;
  }
  try {
    if (xhr.upload && this.hasListeners('progress')) {
      xhr.upload.onprogress = handleProgress;
    }
  } catch(e) {
    // Accessing xhr.upload fails in IE from a web worker, so just pretend it doesn't exist.
    // Reported here:
    // https://connect.microsoft.com/IE/feedback/details/837245/xmlhttprequest-upload-throws-invalid-argument-when-used-from-web-worker-context
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.timedout = true;
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var contentType = this.getHeader('Content-Type');
    var serialize = this._parser || request.serialize[contentType ? contentType.split(';')[0] : ''];
    if (!serialize && isJSON(contentType)) serialize = request.serialize['application/json'];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  this.emit('request', this);

  // IE11 xhr.send(undefined) sends 'undefined' string as POST payload (instead of nothing)
  // We need null here if data is undefined
  xhr.send(typeof data !== 'undefined' ? data : null);
  return this;
};

/**
 * Faux promise support
 *
 * @param {Function} fulfill
 * @param {Function} reject
 * @return {Request}
 */

Request.prototype.then = function (fulfill, reject) {
  return this.end(function(err, res) {
    err ? reject(err) : fulfill(res);
  });
}

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

function del(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

request['del'] = del;
request['delete'] = del;

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

},{"emitter":8,"reduce":9}]},{},[6])(6)
});
