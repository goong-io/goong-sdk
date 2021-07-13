(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.goongSdk = factory());
}(this, (function () { 'use strict';

  // Like https://github.com/thlorenz/lib/parse-link-header but without any
  // additional dependencies.

  function parseParam(param) {
    var parts = param.match(/\s*(.+)\s*=\s*"?([^"]+)"?/);
    if (!parts) return null;

    return {
      key: parts[1],
      value: parts[2]
    };
  }

  function parseLink(link) {
    var parts = link.match(/<?([^>]*)>(.*)/);
    if (!parts) return null;

    var linkUrl = parts[1];
    var linkParams = parts[2].split(';');
    var rel = null;
    var parsedLinkParams = linkParams.reduce(function(result, param) {
      var parsed = parseParam(param);
      if (!parsed) return result;
      if (parsed.key === 'rel') {
        if (!rel) {
          rel = parsed.value;
        }
        return result;
      }
      result[parsed.key] = parsed.value;
      return result;
    }, {});
    if (!rel) return null;

    return {
      url: linkUrl,
      rel: rel,
      params: parsedLinkParams
    };
  }

  /**
   * Parse a Link header.
   *
   * @param {string} linkHeader
   * @returns {{
   *   [string]: {
   *     url: string,
   *     params: { [string]: string }
   *   }
   * }}
   */
  function parseLinkHeader(linkHeader) {
    if (!linkHeader) return {};

    return linkHeader.split(/,\s*</).reduce(function(result, link) {
      var parsed = parseLink(link);
      if (!parsed) return result;
      // rel value can be multiple whitespace-separated rels.
      var splitRel = parsed.rel.split(/\s+/);
      splitRel.forEach(function(rel) {
        if (!result[rel]) {
          result[rel] = {
            url: parsed.url,
            params: parsed.params
          };
        }
      });
      return result;
    }, {});
  }

  var parseLinkHeader_1 = parseLinkHeader;

  /**
   * A Goong API response.
   *
   * @class GAPIResponse
   * @property {Object} body - The response body, parsed as JSON.
   * @property {string} rawBody - The raw response body.
   * @property {number} statusCode - The response's status code.
   * @property {Object} headers - The parsed response headers.
   * @property {Object} links - The parsed response links.
   * @property {GAPIRequest} request - The response's originating `GAPIRequest`.
   */

  /**
   * @ignore
   * @param {GAPIRequest} request
   * @param {Object} responseData
   * @param {Object} responseData.headers
   * @param {string} responseData.body
   * @param {number} responseData.statusCode
   */
  function GAPIResponse(request, responseData) {
    this.request = request;
    this.headers = responseData.headers;
    this.rawBody = responseData.body;
    this.statusCode = responseData.statusCode;
    try {
      this.body = JSON.parse(responseData.body || '{}');
    } catch (parseError) {
      this.body = responseData.body;
    }
    this.links = parseLinkHeader_1(this.headers.link);
  }

  /**
   * Check if there is a next page that you can fetch.
   *
   * @returns {boolean}
   */
  GAPIResponse.prototype.hasNextPage = function hasNextPage() {
    return !!this.links.next;
  };

  /**
   * Create a request for the next page, if there is one.
   * If there is no next page, returns `null`.
   *
   * @returns {GAPIRequest | null}
   */
  GAPIResponse.prototype.nextPage = function nextPage() {
    if (!this.hasNextPage()) return null;
    return this.request._extend({
      path: this.links.next.url
    });
  };

  var gapiResponse = GAPIResponse;

  var constants = {
    API_ORIGIN: 'https://rsapi.goong.io',
    EVENT_PROGRESS_DOWNLOAD: 'downloadProgress',
    EVENT_PROGRESS_UPLOAD: 'uploadProgress',
    EVENT_ERROR: 'error',
    EVENT_RESPONSE: 'response',
    ERROR_HTTP: 'HttpError',
    ERROR_REQUEST_ABORTED: 'RequestAbortedError'
  };

  /**
   * A Goong API error.
   *
   * If there's an error during the API transaction,
   * the Promise returned by `GAPIRequest`'s [`send`](#send)
   * method should reject with a `GAPIError`.
   *
   * @class GAPIError
   * @hideconstructor
   * @property {GAPIRequest} request - The errored request.
   * @property {string} type - The type of error. Usually this is `'HttpError'`.
   *   If the request was aborted, so the error was
   *   not sent from the server, the type will be
   *   `'RequestAbortedError'`.
   * @property {number} [statusCode] - The numeric status code of
   *   the HTTP response.
   * @property {Object | string} [body] - If the server sent a response body,
   *   this property exposes that response, parsed as JSON if possible.
   * @property {string} [message] - Whatever message could be derived from the
   *   call site and HTTP response.
   *
   * @param {GAPIRequest} options.request
   * @param {number} [options.statusCode]
   * @param {string} [options.body]
   * @param {string} [options.message]
   * @param {string} [options.type]
   */
  function GAPIError(options) {
    var errorType = options.type || constants.ERROR_HTTP;

    var body;
    if (options.body) {
      try {
        body = JSON.parse(options.body);
      } catch (e) {
        body = options.body;
      }
    } else {
      body = null;
    }

    var message = options.message || null;
    if (!message) {
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body.message === 'string') {
        message = body.message;
      } else if (errorType === constants.ERROR_REQUEST_ABORTED) {
        message = 'Request aborted';
      }
    }

    this.message = message;
    this.type = errorType;
    this.statusCode = options.statusCode || null;
    this.request = options.request;
    this.body = body;
  }

  var gapiError = GAPIError;

  function parseSingleHeader(raw) {
    var boundary = raw.indexOf(':');
    var name = raw
      .substring(0, boundary)
      .trim()
      .toLowerCase();
    var value = raw.substring(boundary + 1).trim();
    return {
      name: name,
      value: value
    };
  }

  /**
   * Parse raw headers into an object with lowercase properties.
   * Does not fully parse headings into more complete data structure,
   * as larger libraries might do. Also does not deal with duplicate
   * headers because Node doesn't seem to deal with those well, so
   * we shouldn't let the browser either, for consistency.
   *
   * @param {string} raw
   * @returns {Object}
   */
  function parseHeaders(raw) {
    var headers = {};
    if (!raw) {
      return headers;
    }

    raw
      .trim()
      .split(/[\r|\n]+/)
      .forEach(function(rawHeader) {
        var parsed = parseSingleHeader(rawHeader);
        headers[parsed.name] = parsed.value;
      });

    return headers;
  }

  var parseHeaders_1 = parseHeaders;

  // Keys are request IDs, values are XHRs.
  var requestsUnderway = {};

  function browserAbort(request) {
    var xhr = requestsUnderway[request.id];
    if (!xhr) return;
    xhr.abort();
    delete requestsUnderway[request.id];
  }

  function createResponse(request, xhr) {
    return new gapiResponse(request, {
      body: xhr.response,
      headers: parseHeaders_1(xhr.getAllResponseHeaders()),
      statusCode: xhr.status
    });
  }

  function normalizeBrowserProgressEvent(event) {
    var total = event.total;
    var transferred = event.loaded;
    var percent = (100 * transferred) / total;
    return {
      total: total,
      transferred: transferred,
      percent: percent
    };
  }

  function sendRequestXhr(request, xhr) {
    return new Promise(function(resolve, reject) {
      xhr.onprogress = function(event) {
        request.emitter.emit(
          constants.EVENT_PROGRESS_DOWNLOAD,
          normalizeBrowserProgressEvent(event)
        );
      };

      var file = request.file;
      if (file) {
        xhr.upload.onprogress = function(event) {
          request.emitter.emit(
            constants.EVENT_PROGRESS_UPLOAD,
            normalizeBrowserProgressEvent(event)
          );
        };
      }

      xhr.onerror = function(error) {
        reject(error);
      };

      xhr.onabort = function() {
        var gAPIError = new gapiError({
          request: request,
          type: constants.ERROR_REQUEST_ABORTED
        });
        reject(gAPIError);
      };

      xhr.onload = function() {
        delete requestsUnderway[request.id];
        if (xhr.status < 200 || xhr.status >= 400) {
          var gAPIError = new gapiError({
            request: request,
            body: xhr.response,
            statusCode: xhr.status
          });
          reject(gAPIError);
          return;
        }
        resolve(xhr);
      };

      var body = request.body;

      // matching service needs to send a www-form-urlencoded request
      if (typeof body === 'string') {
        xhr.send(body);
      } else if (body) {
        xhr.send(JSON.stringify(body));
      } else if (file) {
        xhr.send(file);
      } else {
        xhr.send();
      }

      requestsUnderway[request.id] = xhr;
    }).then(function(xhr) {
      return createResponse(request, xhr);
    });
  }

  // The accessToken argument gives this function flexibility
  // for Goong's internal client.
  function createRequestXhr(request, accessToken) {
    var url = request.url(accessToken);
    var xhr = new window.XMLHttpRequest();
    xhr.open(request.method, url);
    Object.keys(request.headers).forEach(function(key) {
      xhr.setRequestHeader(key, request.headers[key]);
    });
    xhr.timeout = request.timeout;
    return xhr;
  }

  function browserSend(request) {
    return Promise.resolve().then(function() {
      var xhr = createRequestXhr(request, request.client.accessToken);
      return sendRequestXhr(request, xhr);
    });
  }

  var browserLayer = {
    browserAbort: browserAbort,
    sendRequestXhr: sendRequestXhr,
    browserSend: browserSend,
    createRequestXhr: createRequestXhr
  };

  var immutable = extend;

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  function extend() {
      var target = {};

      for (var i = 0; i < arguments.length; i++) {
          var source = arguments[i];

          for (var key in source) {
              if (hasOwnProperty.call(source, key)) {
                  target[key] = source[key];
              }
          }
      }

      return target
  }

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var eventemitter3 = createCommonjsModule(function (module) {

  var has = Object.prototype.hasOwnProperty
    , prefix = '~';

  /**
   * Constructor to create a storage for our `EE` objects.
   * An `Events` instance is a plain object whose properties are event names.
   *
   * @constructor
   * @private
   */
  function Events() {}

  //
  // We try to not inherit from `Object.prototype`. In some engines creating an
  // instance in this way is faster than calling `Object.create(null)` directly.
  // If `Object.create(null)` is not supported we prefix the event names with a
  // character to make sure that the built-in object properties are not
  // overridden or used as an attack vector.
  //
  if (Object.create) {
    Events.prototype = Object.create(null);

    //
    // This hack is needed because the `__proto__` property is still inherited in
    // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
    //
    if (!new Events().__proto__) prefix = false;
  }

  /**
   * Representation of a single event listener.
   *
   * @param {Function} fn The listener function.
   * @param {*} context The context to invoke the listener with.
   * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
   * @constructor
   * @private
   */
  function EE(fn, context, once) {
    this.fn = fn;
    this.context = context;
    this.once = once || false;
  }

  /**
   * Add a listener for a given event.
   *
   * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
   * @param {(String|Symbol)} event The event name.
   * @param {Function} fn The listener function.
   * @param {*} context The context to invoke the listener with.
   * @param {Boolean} once Specify if the listener is a one-time listener.
   * @returns {EventEmitter}
   * @private
   */
  function addListener(emitter, event, fn, context, once) {
    if (typeof fn !== 'function') {
      throw new TypeError('The listener must be a function');
    }

    var listener = new EE(fn, context || emitter, once)
      , evt = prefix ? prefix + event : event;

    if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
    else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
    else emitter._events[evt] = [emitter._events[evt], listener];

    return emitter;
  }

  /**
   * Clear event by name.
   *
   * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
   * @param {(String|Symbol)} evt The Event name.
   * @private
   */
  function clearEvent(emitter, evt) {
    if (--emitter._eventsCount === 0) emitter._events = new Events();
    else delete emitter._events[evt];
  }

  /**
   * Minimal `EventEmitter` interface that is molded against the Node.js
   * `EventEmitter` interface.
   *
   * @constructor
   * @public
   */
  function EventEmitter() {
    this._events = new Events();
    this._eventsCount = 0;
  }

  /**
   * Return an array listing the events for which the emitter has registered
   * listeners.
   *
   * @returns {Array}
   * @public
   */
  EventEmitter.prototype.eventNames = function eventNames() {
    var names = []
      , events
      , name;

    if (this._eventsCount === 0) return names;

    for (name in (events = this._events)) {
      if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
    }

    if (Object.getOwnPropertySymbols) {
      return names.concat(Object.getOwnPropertySymbols(events));
    }

    return names;
  };

  /**
   * Return the listeners registered for a given event.
   *
   * @param {(String|Symbol)} event The event name.
   * @returns {Array} The registered listeners.
   * @public
   */
  EventEmitter.prototype.listeners = function listeners(event) {
    var evt = prefix ? prefix + event : event
      , handlers = this._events[evt];

    if (!handlers) return [];
    if (handlers.fn) return [handlers.fn];

    for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
      ee[i] = handlers[i].fn;
    }

    return ee;
  };

  /**
   * Return the number of listeners listening to a given event.
   *
   * @param {(String|Symbol)} event The event name.
   * @returns {Number} The number of listeners.
   * @public
   */
  EventEmitter.prototype.listenerCount = function listenerCount(event) {
    var evt = prefix ? prefix + event : event
      , listeners = this._events[evt];

    if (!listeners) return 0;
    if (listeners.fn) return 1;
    return listeners.length;
  };

  /**
   * Calls each of the listeners registered for a given event.
   *
   * @param {(String|Symbol)} event The event name.
   * @returns {Boolean} `true` if the event had listeners, else `false`.
   * @public
   */
  EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
    var evt = prefix ? prefix + event : event;

    if (!this._events[evt]) return false;

    var listeners = this._events[evt]
      , len = arguments.length
      , args
      , i;

    if (listeners.fn) {
      if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

      switch (len) {
        case 1: return listeners.fn.call(listeners.context), true;
        case 2: return listeners.fn.call(listeners.context, a1), true;
        case 3: return listeners.fn.call(listeners.context, a1, a2), true;
        case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
        case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
        case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
      }

      for (i = 1, args = new Array(len -1); i < len; i++) {
        args[i - 1] = arguments[i];
      }

      listeners.fn.apply(listeners.context, args);
    } else {
      var length = listeners.length
        , j;

      for (i = 0; i < length; i++) {
        if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

        switch (len) {
          case 1: listeners[i].fn.call(listeners[i].context); break;
          case 2: listeners[i].fn.call(listeners[i].context, a1); break;
          case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
          case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
          default:
            if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
              args[j - 1] = arguments[j];
            }

            listeners[i].fn.apply(listeners[i].context, args);
        }
      }
    }

    return true;
  };

  /**
   * Add a listener for a given event.
   *
   * @param {(String|Symbol)} event The event name.
   * @param {Function} fn The listener function.
   * @param {*} [context=this] The context to invoke the listener with.
   * @returns {EventEmitter} `this`.
   * @public
   */
  EventEmitter.prototype.on = function on(event, fn, context) {
    return addListener(this, event, fn, context, false);
  };

  /**
   * Add a one-time listener for a given event.
   *
   * @param {(String|Symbol)} event The event name.
   * @param {Function} fn The listener function.
   * @param {*} [context=this] The context to invoke the listener with.
   * @returns {EventEmitter} `this`.
   * @public
   */
  EventEmitter.prototype.once = function once(event, fn, context) {
    return addListener(this, event, fn, context, true);
  };

  /**
   * Remove the listeners of a given event.
   *
   * @param {(String|Symbol)} event The event name.
   * @param {Function} fn Only remove the listeners that match this function.
   * @param {*} context Only remove the listeners that have this context.
   * @param {Boolean} once Only remove one-time listeners.
   * @returns {EventEmitter} `this`.
   * @public
   */
  EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
    var evt = prefix ? prefix + event : event;

    if (!this._events[evt]) return this;
    if (!fn) {
      clearEvent(this, evt);
      return this;
    }

    var listeners = this._events[evt];

    if (listeners.fn) {
      if (
        listeners.fn === fn &&
        (!once || listeners.once) &&
        (!context || listeners.context === context)
      ) {
        clearEvent(this, evt);
      }
    } else {
      for (var i = 0, events = [], length = listeners.length; i < length; i++) {
        if (
          listeners[i].fn !== fn ||
          (once && !listeners[i].once) ||
          (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }

      //
      // Reset the array, or remove it completely if we have no more listeners.
      //
      if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
      else clearEvent(this, evt);
    }

    return this;
  };

  /**
   * Remove all listeners, or those of the specified event.
   *
   * @param {(String|Symbol)} [event] The event name.
   * @returns {EventEmitter} `this`.
   * @public
   */
  EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
    var evt;

    if (event) {
      evt = prefix ? prefix + event : event;
      if (this._events[evt]) clearEvent(this, evt);
    } else {
      this._events = new Events();
      this._eventsCount = 0;
    }

    return this;
  };

  //
  // Alias methods names because people roll like that.
  //
  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  //
  // Expose the prefix.
  //
  EventEmitter.prefixed = prefix;

  //
  // Allow `EventEmitter` to be imported as module namespace.
  //
  EventEmitter.EventEmitter = EventEmitter;

  //
  // Expose the module.
  //
  {
    module.exports = EventEmitter;
  }
  });

  // Encode each item of an array individually. The comma
  // delimiters should not themselves be encoded.
  function encodeArray(arrayValue) {
    return arrayValue.map(encodeURIComponent).join(',');
  }

  function encodeValue(value) {
    if (Array.isArray(value)) {
      return encodeArray(value);
    }
    return encodeURIComponent(String(value));
  }

  /**
   * Append a query parameter to a URL.
   *
   * @param {string} url
   * @param {string} key
   * @param {string|number|boolean|Array<*>>} [value] - Provide an array
   *   if the value is a list and commas between values need to be
   *   preserved, unencoded.
   * @returns {string} - Modified URL.
   */
  function appendQueryParam(url, key, value) {
    if (value === false || value === null) {
      return url;
    }
    var punctuation = /\?/.test(url) ? '&' : '?';
    var query = encodeURIComponent(key);
    if (value !== undefined && value !== '' && value !== true) {
      query += '=' + encodeValue(value);
    }
    return '' + url + punctuation + query;
  }

  /**
   * Derive a query string from an object and append it
   * to a URL.
   *
   * @param {string} url
   * @param {Object} [queryObject] - Values should be primitives.
   * @returns {string} - Modified URL.
   */
  function appendQueryObject(url, queryObject) {
    if (!queryObject) {
      return url;
    }

    var result = url;
    Object.keys(queryObject).forEach(function(key) {
      var value = queryObject[key];
      if (value === undefined) {
        return;
      }
      if (Array.isArray(value)) {
        value = value
          .filter(function(v) {
            return !!v;
          })
          .join(',');
      }
      result = appendQueryParam(result, key, value);
    });
    return result;
  }

  /**
   * Prepend an origin to a URL. If the URL already has an
   * origin, do nothing.
   *
   * @param {string} url
   * @param {string} origin
   * @returns {string} - Modified URL.
   */
  function prependOrigin(url, origin) {
    if (!origin) {
      return url;
    }

    if (url.slice(0, 4) === 'http') {
      return url;
    }

    var delimiter = url[0] === '/' ? '' : '/';
    return '' + origin.replace(/\/$/, '') + delimiter + url;
  }

  /**
   * Interpolate values into a route with express-style,
   * colon-prefixed route parameters.
   *
   * @param {string} route
   * @param {Object} [params] - Values should be primitives
   *   or arrays of primitives. Provide an array if the value
   *   is a list and commas between values need to be
   *   preserved, unencoded.
   * @returns {string} - Modified URL.
   */
  function interpolateRouteParams(route, params) {
    if (!params) {
      return route;
    }
    return route.replace(/\/:([a-zA-Z0-9]+)/g, function(_, paramId) {
      var value = params[paramId];
      if (value === undefined) {
        throw new Error('Unspecified route parameter ' + paramId);
      }
      var preppedValue = encodeValue(value);
      return '/' + preppedValue;
    });
  }

  var urlUtils = {
    appendQueryObject: appendQueryObject,
    appendQueryParam: appendQueryParam,
    prependOrigin: prependOrigin,
    interpolateRouteParams: interpolateRouteParams
  };

  var requestId = 1;

  /**
   * A Goong API request.
   *
   * Note that creating a `GAPIRequest` does *not* send the request automatically.
   * Use the request's `send` method to send it off and get a `Promise`.
   *
   * The `emitter` property is an `EventEmitter` that emits the following events:
   *
   * - `'response'` - Listeners will be called with a `GAPIResponse`.
   * - `'error'` - Listeners will be called with a `GAPIError`.
   * - `'downloadProgress'` - Listeners will be called with `ProgressEvents`.
   * - `'uploadProgress'` - Listeners will be called with `ProgressEvents`.
   *   Upload events are only available when the request includes a file.
   *
   * @class GAPIRequest
   * @property {EventEmitter} emitter - An event emitter. See above.
   * @property {GAPIClient} client - This request's `GAPIClient`.
   * @property {GAPIResponse|null} response - If this request has been sent and received
   *   a response, the response is available on this property.
   * @property {GAPIError|Error|null} error - If this request has been sent and
   *   received an error in response, the error is available on this property.
   * @property {boolean} aborted - If the request has been aborted
   *   (via [`abort`](#abort)), this property will be `true`.
   * @property {boolean} sent - If the request has been sent, this property will
   *   be `true`. You cannot send the same request twice, so if you need to create
   *   a new request that is the equivalent of an existing one, use
   *   [`clone`](#clone).
   * @property {string} path - The request's path, including colon-prefixed route
   *   parameters.
   * @property {string} origin - The request's origin.
   * @property {string} method - The request's HTTP method.
   * @property {Object} query - A query object, which will be transformed into
   *   a URL query string.
   * @property {Object} params - A route parameters object, whose values will
   *   be interpolated the path.
   * @property {Object} headers - The request's headers.
   * @property {number} timeout - The request's timeout.
   * @property {Object|string|null} body - Data to send with the request.
   *   If the request has a body, it will also be sent with the header
   *   `'Content-Type: application/json'`.
   * @property {Blob|ArrayBuffer|string|ReadStream} file - A file to
   *   send with the request. The browser client accepts Blobs and ArrayBuffers;
   *   the Node client accepts strings (filepaths) and ReadStreams.
   * @property {string} encoding - The encoding of the response.
   * @property {string} sendFileAs - The method to send the `file`. Options are
   *   `data` (x-www-form-urlencoded) or `form` (multipart/form-data).
   */

  /**
   * @ignore
   * @param {GAPIClient} client
   * @param {Object} options
   * @param {string} options.method
   * @param {string} options.path
   * @param {Object} [options.query={}]
   * @param {Object} [options.params={}]
   * @param {string} [options.origin]
   * @param {Object} [options.headers]
   * @param {Object} [options.timeout=500]
   * @param {Object} [options.body=null]
   * @param {Blob|ArrayBuffer|string|ReadStream} [options.file=null]
   * @param {string} [options.encoding=utf8]
   */
  function GAPIRequest(client, options) {
    if (!client) {
      throw new Error('GAPIRequest requires a client');
    }
    if (!options || !options.path || !options.method) {
      throw new Error(
        'GAPIRequest requires an options object with path and method properties'
      );
    }

    var defaultHeaders = {};
    if (options.body) {
      defaultHeaders['content-type'] = 'application/json';
    }

    var headersWithDefaults = immutable(defaultHeaders, options.headers);

    // Disallows duplicate header names of mixed case,
    // e.g. Content-Type and content-type.
    var headers = Object.keys(headersWithDefaults).reduce(function(memo, name) {
      memo[name.toLowerCase()] = headersWithDefaults[name];
      return memo;
    }, {});

    this.id = requestId++;
    this._options = options;

    this.emitter = new eventemitter3();
    this.client = client;
    this.response = null;
    this.error = null;
    this.sent = false;
    this.aborted = false;
    this.path = options.path;
    this.method = options.method;
    this.origin = options.origin || client.origin;
    this.query = options.query || {};
    this.params = options.params || {};
    this.body = options.body || null;
    this.file = options.file || null;
    this.encoding = options.encoding || 'utf8';
    this.sendFileAs = options.sendFileAs || null;
    this.headers = headers;
    this.timeout = options.timeout || 500;
  }

  /**
   * Get the URL of the request.
   *
   * @param {string} [accessToken] - By default, the access token of the request's
   *   client is used.
   * @return {string}
   */
  GAPIRequest.prototype.url = function url(accessToken) {
    var url = urlUtils.prependOrigin(this.path, this.origin);
    url = urlUtils.appendQueryObject(url, this.query);
    var routeParams = this.params;
    var actualAccessToken =
      accessToken == null ? this.client.accessToken : accessToken;
    if (actualAccessToken) {
      url = urlUtils.appendQueryParam(url, 'api_key', actualAccessToken);
    }
    url = urlUtils.interpolateRouteParams(url, routeParams);
    return url;
  };

  /**
   * Send the request. Returns a Promise that resolves with a `GAPIResponse`.
   * You probably want to use `response.body`.
   *
   * `send` only retrieves the first page of paginated results. You can get
   * the next page by using the `GAPIResponse`'s [`nextPage`](#nextpage)
   * function, or iterate through all pages using [`eachPage`](#eachpage)
   * instead of `send`.
   *
   * @returns {Promise<GAPIResponse>}
   */
  GAPIRequest.prototype.send = function send() {
    var self = this;

    if (self.sent) {
      throw new Error(
        'This request has already been sent. Check the response and error properties. Create a new request with clone().'
      );
    }
    self.sent = true;

    return self.client.sendRequest(self).then(
      function(response) {
        self.response = response;
        self.emitter.emit(constants.EVENT_RESPONSE, response);
        return response;
      },
      function(error) {
        self.error = error;
        self.emitter.emit(constants.EVENT_ERROR, error);
        throw error;
      }
    );
  };

  /**
   * Abort the request.
   *
   * Any pending `Promise` returned by [`send`](#send) will be rejected with
   * an error with `type: 'RequestAbortedError'`. If you've created a request
   * that might be aborted, you need to catch and handle such errors.
   *
   * This method will also abort any requests created while fetching subsequent
   * pages via [`eachPage`](#eachpage).
   *
   * If the request has not been sent or has already been aborted, nothing
   * will happen.
   */
  GAPIRequest.prototype.abort = function abort() {
    if (this._nextPageRequest) {
      this._nextPageRequest.abort();
      delete this._nextPageRequest;
    }

    if (this.response || this.error || this.aborted) return;

    this.aborted = true;
    this.client.abortRequest(this);
  };

  /**
   * Invoke a callback for each page of a paginated API response.
   *
   * The callback should have the following signature:
   *
   * ```js
   * (
   *   error: GAPIError,
   *   response: GAPIResponse,
   *   next: () => void
   * ) => void
   * ```
   *
   * **The next page will not be fetched until you've invoked the
   * `next` callback**, indicating that you're ready for it.
   *
   * @param {Function} callback
   */
  GAPIRequest.prototype.eachPage = function eachPage(callback) {
    var self = this;

    function handleResponse(response) {
      function getNextPage() {
        delete self._nextPageRequest;
        var nextPageRequest = response.nextPage();
        if (nextPageRequest) {
          self._nextPageRequest = nextPageRequest;
          getPage(nextPageRequest);
        }
      }
      callback(null, response, getNextPage);
    }

    function handleError(error) {
      callback(error, null, function() {});
    }

    function getPage(request) {
      request.send().then(handleResponse, handleError);
    }
    getPage(this);
  };

  /**
   * Clone this request.
   *
   * Each request can only be sent *once*. So if you'd like to send the
   * same request again, clone it and send away.
   *
   * @returns {GAPIRequest} - A new `GAPIRequest` configured just like this one.
   */
  GAPIRequest.prototype.clone = function clone() {
    return this._extend();
  };

  /**
   * @ignore
   */
  GAPIRequest.prototype._extend = function _extend(options) {
    var extendedOptions = immutable(this._options, options);
    return new GAPIRequest(this.client, extendedOptions);
  };

  var gapiRequest = GAPIRequest;

  /**
   * A low-level Goong API client. Use it to create service clients
   * that share the same configuration.
   *
   * Services and `GAPIRequest`s use the underlying `GAPIClient` to
   * determine how to create, send, and abort requests in a way
   * that is appropriate to the configuration and environment
   * (Node or the browser).
   *
   * @class GAPIClient
   * @property {string} accessToken - The Goong access token / api key assigned
   *   to this client.
   * @property {string} [origin] - The origin
   *   to use for API requests. Defaults to https://rsapi.goong.io
   */

  function GAPIClient(options) {
    if (!options || !options.accessToken) {
      throw new Error('Cannot create a client without an API key');
    }

    this.accessToken = options.accessToken;
    this.origin = options.origin || constants.API_ORIGIN;
  }

  GAPIClient.prototype.createRequest = function createRequest(requestOptions) {
    return new gapiRequest(this, requestOptions);
  };

  var gapiClient = GAPIClient;

  function BrowserClient(options) {
    gapiClient.call(this, options);
  }
  BrowserClient.prototype = Object.create(gapiClient.prototype);
  BrowserClient.prototype.constructor = BrowserClient;

  BrowserClient.prototype.sendRequest = browserLayer.browserSend;
  BrowserClient.prototype.abortRequest = browserLayer.browserAbort;

  /**
   * Create a client for the browser.
   *
   * @param {Object} options
   * @param {string} options.accessToken
   * @param {string} [options.origin]
   * @returns {GAPIClient}
   */
  function createBrowserClient(options) {
    return new BrowserClient(options);
  }

  var browserClient = createBrowserClient;

  var toString = Object.prototype.toString;

  var isPlainObj = function (x) {
  	var prototype;
  	return toString.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
  };

  /**
   * Validators are functions which assert certain type.
   * They can return a string which can then be used
   * to display a helpful error message.
   * They can also return a function for a custom error message.
   */



  var DEFAULT_ERROR_PATH = 'value';
  var NEWLINE_INDENT = '\n  ';

  var v = {};

  /**
   * Runners
   *
   * Take root validators and run assertion
   */
  v.assert = function(rootValidator, options) {
    options = options || {};
    return function(value) {
      var message = validate(rootValidator, value);
      // all good
      if (!message) {
        return;
      }

      var errorMessage = processMessage(message, options);

      if (options.apiName) {
        errorMessage = options.apiName + ': ' + errorMessage;
      }

      throw new Error(errorMessage);
    };
  };

  /**
   * Higher Order Validators
   *
   * validators which take other validators as input
   * and output a new validator
   */
  v.shape = function shape(validatorObj) {
    var validators = objectEntries(validatorObj);
    return function shapeValidator(value) {
      var validationResult = validate(v.plainObject, value);

      if (validationResult) {
        return validationResult;
      }

      var key, validator;
      var errorMessages = [];

      for (var i = 0; i < validators.length; i++) {
        key = validators[i].key;
        validator = validators[i].value;
        validationResult = validate(validator, value[key]);

        if (validationResult) {
          // return [key].concat(validationResult);
          errorMessages.push([key].concat(validationResult));
        }
      }

      if (errorMessages.length < 2) {
        return errorMessages[0];
      }

      // enumerate all the error messages
      return function(options) {
        errorMessages = errorMessages.map(function(message) {
          var key = message[0];
          var renderedMessage = processMessage(message, options)
            .split('\n')
            .join(NEWLINE_INDENT); // indents any inner nesting
          return '- ' + key + ': ' + renderedMessage;
        });

        var objectId = options.path.join('.');
        var ofPhrase = objectId === DEFAULT_ERROR_PATH ? '' : ' of ' + objectId;

        return (
          'The following properties' +
          ofPhrase +
          ' have invalid values:' +
          NEWLINE_INDENT +
          errorMessages.join(NEWLINE_INDENT)
        );
      };
    };
  };

  v.strictShape = function strictShape(validatorObj) {
    var shapeValidator = v.shape(validatorObj);
    return function strictShapeValidator(value) {
      var shapeResult = shapeValidator(value);
      if (shapeResult) {
        return shapeResult;
      }

      var invalidKeys = Object.keys(value).reduce(function(memo, valueKey) {
        if (validatorObj[valueKey] === undefined) {
          memo.push(valueKey);
        }
        return memo;
      }, []);

      if (invalidKeys.length !== 0) {
        return function() {
          return 'The following keys are invalid: ' + invalidKeys.join(', ');
        };
      }
    };
  };

  v.arrayOf = function arrayOf(validator) {
    return createArrayValidator(validator);
  };

  v.tuple = function tuple() {
    var validators = Array.isArray(arguments[0])
      ? arguments[0]
      : Array.prototype.slice.call(arguments);
    return createArrayValidator(validators);
  };

  // Currently array validation fails when the first invalid item is found.
  function createArrayValidator(validators) {
    var validatingTuple = Array.isArray(validators);
    var getValidator = function(index) {
      if (validatingTuple) {
        return validators[index];
      }
      return validators;
    };

    return function arrayValidator(value) {
      var validationResult = validate(v.plainArray, value);
      if (validationResult) {
        return validationResult;
      }

      if (validatingTuple && value.length !== validators.length) {
        return 'an array with ' + validators.length + ' items';
      }

      for (var i = 0; i < value.length; i++) {
        validationResult = validate(getValidator(i), value[i]);
        if (validationResult) {
          return [i].concat(validationResult);
        }
      }
    };
  }

  v.required = function required(validator) {
    function requiredValidator(value) {
      if (value == null) {
        return function(options) {
          return formatErrorMessage(
            options,
            isArrayCulprit(options.path)
              ? 'cannot be undefined/null.'
              : 'is required.'
          );
        };
      }
      return validator.apply(this, arguments);
    }
    requiredValidator.__required = true;

    return requiredValidator;
  };

  v.oneOfType = function oneOfType() {
    var validators = Array.isArray(arguments[0])
      ? arguments[0]
      : Array.prototype.slice.call(arguments);
    return function oneOfTypeValidator(value) {
      var messages = validators
        .map(function(validator) {
          return validate(validator, value);
        })
        .filter(Boolean);

      // If we don't have as many messages as no. of validators,
      // then at least one validator was ok with the value.
      if (messages.length !== validators.length) {
        return;
      }

      // check primitive type
      if (
        messages.every(function(message) {
          return message.length === 1 && typeof message[0] === 'string';
        })
      ) {
        return orList(
          messages.map(function(m) {
            return m[0];
          })
        );
      }

      // Complex oneOfTypes like
      // `v.oneOftypes(v.shape({name: v.string})`, `v.shape({name: v.number}))`
      // are complex ¯\_(ツ)_/¯. For the current scope only returning the longest message.
      return messages.reduce(function(max, arr) {
        return arr.length > max.length ? arr : max;
      });
    };
  };

  /**
   * Meta Validators
   * which take options as argument (not validators)
   * and return a new primitive validator
   */
  v.equal = function equal(compareWith) {
    return function equalValidator(value) {
      if (value !== compareWith) {
        return JSON.stringify(compareWith);
      }
    };
  };

  v.oneOf = function oneOf() {
    var options = Array.isArray(arguments[0])
      ? arguments[0]
      : Array.prototype.slice.call(arguments);
    var validators = options.map(function(value) {
      return v.equal(value);
    });

    return v.oneOfType.apply(this, validators);
  };

  v.range = function range(compareWith) {
    var min = compareWith[0];
    var max = compareWith[1];
    return function rangeValidator(value) {
      var validationResult = validate(v.number, value);

      if (validationResult || value < min || value > max) {
        return 'number between ' + min + ' & ' + max + ' (inclusive)';
      }
    };
  };

  /**
   * Primitive validators
   *
   * simple validators which return a string or undefined
   */
  v.any = function any() {
    return;
  };

  v.boolean = function boolean(value) {
    if (typeof value !== 'boolean') {
      return 'boolean';
    }
  };

  v.number = function number(value) {
    if (typeof value !== 'number') {
      return 'number';
    }
  };

  v.plainArray = function plainArray(value) {
    if (!Array.isArray(value)) {
      return 'array';
    }
  };

  v.plainObject = function plainObject(value) {
    if (!isPlainObj(value)) {
      return 'object';
    }
  };

  v.string = function string(value) {
    if (typeof value !== 'string') {
      return 'string';
    }
  };

  v.func = function func(value) {
    if (typeof value !== 'function') {
      return 'function';
    }
  };

  function validate(validator, value) {
    // assertions are optional by default unless wrapped in v.require
    if (value == null && !validator.hasOwnProperty('__required')) {
      return;
    }

    var result = validator(value);

    if (result) {
      return Array.isArray(result) ? result : [result];
    }
  }

  function processMessage(message, options) {
    // message array follows the convention
    // [...path, result]
    // path is an array of object keys / array indices
    // result is output of the validator
    var len = message.length;

    var result = message[len - 1];
    var path = message.slice(0, len - 1);

    if (path.length === 0) {
      path = [DEFAULT_ERROR_PATH];
    }
    options = immutable(options, { path: path });

    return typeof result === 'function'
      ? result(options) // allows customization of result
      : formatErrorMessage(options, prettifyResult(result));
  }

  function orList(list) {
    if (list.length < 2) {
      return list[0];
    }
    if (list.length === 2) {
      return list.join(' or ');
    }
    return list.slice(0, -1).join(', ') + ', or ' + list.slice(-1);
  }

  function prettifyResult(result) {
    return 'must be ' + addArticle(result) + '.';
  }

  function addArticle(nounPhrase) {
    if (/^an? /.test(nounPhrase)) {
      return nounPhrase;
    }
    if (/^[aeiou]/i.test(nounPhrase)) {
      return 'an ' + nounPhrase;
    }
    if (/^[a-z]/i.test(nounPhrase)) {
      return 'a ' + nounPhrase;
    }
    return nounPhrase;
  }

  function formatErrorMessage(options, prettyResult) {
    var arrayCulprit = isArrayCulprit(options.path);
    var output = options.path.join('.') + ' ' + prettyResult;
    var prepend = arrayCulprit ? 'Item at position ' : '';

    return prepend + output;
  }

  function isArrayCulprit(path) {
    return typeof path[path.length - 1] == 'number' || typeof path[0] == 'number';
  }

  function objectEntries(obj) {
    return Object.keys(obj || {}).map(function(key) {
      return { key: key, value: obj[key] };
    });
  }

  v.validate = validate;
  v.processMessage = processMessage;

  var lib = v;

  function file(value) {
    // If we're in a browser so Blob is available, the file must be that.
    // In Node, however, it could be a filepath or a pipeable (Readable) stream.
    if (typeof window !== 'undefined') {
      if (value instanceof commonjsGlobal.Blob || value instanceof commonjsGlobal.ArrayBuffer) {
        return;
      }
      return 'Blob or ArrayBuffer';
    }
    if (typeof value === 'string' || value.pipe !== undefined) {
      return;
    }
    return 'Filename or Readable stream';
  }

  function assertShape(validatorObj, apiName) {
    return lib.assert(lib.strictShape(validatorObj), apiName);
  }

  function date(value) {
    var msg = 'date';
    if (typeof value === 'boolean') {
      return msg;
    }
    try {
      var date = new Date(value);
      if (date.getTime && isNaN(date.getTime())) {
        return msg;
      }
    } catch (e) {
      return msg;
    }
  }

  function coordinates(value) {
    return lib.tuple(lib.number, lib.number)(value);
  }

  var validator = immutable(lib, {
    file: file,
    date: date,
    coordinates: coordinates,
    assertShape: assertShape
  });

  // This will create the environment-appropriate client.


  function createServiceFactory(ServicePrototype) {
    return function(clientOrConfig) {
      var client;
      if (gapiClient.prototype.isPrototypeOf.call(clientOrConfig)) {
        client = clientOrConfig;
      } else {
        client = browserClient(clientOrConfig);
      }
      var service = Object.create(ServicePrototype);
      service.client = client;
      return service;
    };
  }

  var createServiceFactory_1 = createServiceFactory;

  /**
   * Autocomplete API service.
   *
   * Learn more about this service and its responses in
   * [Goong REST API documentation](https://docs.goong.io/rest/guide#place).
   */
  var Autocomplete = {};

  /**
   * Autocomplete search
   *
   * See the [public documentation](https://docs.goong.io/rest/guide#get-points-by-keyword).
   *
   * @param {Object} config
   * @param {string} config.input - A place name.
   * @param {string} config.location -  A location to use as a hint when looking up the specified address - `latitude,longitude`
   * @param {number} config.radius -  Distance round from your location by kilometers
   * @param {number} [config.limit=10] - Limit the number of results returned.
   *  Options are [IETF language tags](https://en.wikipedia.org/wiki/IETF_language_tag) comprised of a mandatory
   *  [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) and optionally one or more IETF subtags for country or script.
   * @return {GAPIRequest}
   *
   * @example
   * autocompleteClient.search({
   *   input: 'san bay noi bai',
   *   limit: 5
   * })
   *   .send()
   *   .then(response => {
   *     const match = response.body;
   *   });
   *
   * @example
   * // autocomplete with location
   * autocompleteClient.search({
   *   input: 'san bay noi bai',
   *   location: '21.028531,105.854189',
   *   radius: 100
   * })
   *   .send()
   *   .then(response => {
   *     const match = response.body;
   *   });
   */
  Autocomplete.search = function(config) {
    validator.assertShape({
      input: validator.required(validator.string),
      location: validator.string,
      radius: validator.number,
      limit: validator.number
    })(config);

    return this.client.createRequest({
      method: 'GET',
      path: '/place/autocomplete',
      query: config
    });
  };

  /**
   * Autocomplete get place detail
   *
   * See the [public documentation](https://docs.goong.io/rest/guide#get-point-detail-by-id).
   *
   * @param {Object} config
   * @param {string} config.placeID - Place id from `Autocomplete` or `Geocoding`.
   *  Options are [IETF language tags](https://en.wikipedia.org/wiki/IETF_language_tag) comprised of a mandatory
   *  [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) and optionally one or more IETF subtags for country or script.
   * @return {GAPIRequest}
   *
   * @example
   * autocompleteClient.placeDetail({
   *   placeid: '0WmA4vbeody2J9AEvVM9YE3ZN85z7Mrw',
   * })
   *   .send()
   *   .then(response => {
   *     const match = response.body;
   *   });
   */
  Autocomplete.placeDetail = function(config) {
    validator.assertShape({
      placeid: validator.required(validator.string)
    })(config);

    return this.client.createRequest({
      method: 'GET',
      path: '/place/detail',
      query: config
    });
  };

  var autocomplete = createServiceFactory_1(Autocomplete);

  function objectMap(obj, cb) {
    return Object.keys(obj).reduce(function(result, key) {
      result[key] = cb(key, obj[key]);
      return result;
    }, {});
  }

  var objectMap_1 = objectMap;

  /**
   * Stringify all the boolean values in an object, so true becomes "true".
   *
   * @param {Object} obj
   * @returns {Object}
   */
  function stringifyBoolean(obj) {
    return objectMap_1(obj, function(_, value) {
      return typeof value === 'boolean' ? JSON.stringify(value) : value;
    });
  }

  var stringifyBooleans = stringifyBoolean;

  /**
   * Directions API service.
   *
   * Learn more about this service and its responses in
   * [Goong REST API documentation](https://docs.goong.io/rest/guide#direction).
   */
  var Directions = {};

  /**
   * Get directions.
   *
   * @param {Object} config
   * @param {number} config.origin - Origin coordinate `latitude,longitude`
   * @param {string} config.destination - Destination coordinate `latitude,longitude` 
   * @param {boolean} [config.alternatives=true] - Whether to try to return alternative routes.
   * @param {'car'|'bike'|'taxi'} [config.vehicle='car'] - Vehicle type
   * @param {'fastest'|'shortest'} [config.type='fastest'] - Routing type
   
   * @return {GAPIRequest}
   *
   * @example
   * directionsClient.getDirections({
   *   origin: '20.981971,105.864323',
   *   destination: '21.031011,105.783206',
   *   alternatives: true,
   *   vehicle: 'car',
   *   type: 'shortest'
   * })
   *   .send()
   *   .then(response => {
   *     const directions = response.body;
   *   });
   */
  Directions.getDirections = function(config) {
    validator.assertShape({
      origin: validator.required(validator.string),
      destination: validator.required(validator.string),
      vehicle: validator.oneOf('car', 'bike', 'taxi'),
      type: validator.oneOf('fastest', 'shortest'),
      alternatives: validator.boolean
    })(config);
    var query = stringifyBooleans(config);
    return this.client.createRequest({
      method: 'GET',
      path: '/Direction',
      query: query
    });
  };

  var directions = createServiceFactory_1(Directions);

  /**
   * Geocoding API service.
   *
   * Learn more about this service and its responses in
   * [Goong REST API documentation](https://docs.goong.io/rest/guide#geocode).
   */
  var Geocoding = {};

  /**
   * Get Place by coordinate
   *
   * @param {Object} config
   * @param {string} config.latlng - Coordinates at which features will be reversed.
   * @return {GAPIRequest}
   *
   * @example
   * geocodingClient.reverseGeocode({
   *   latlng: '20.981971,105.864323'
   * })
   *   .send()
   *   .then(response => {
   *     // GeoJSON document with geocoding matches
   *     const match = response.body;
   *   });
   */
  Geocoding.reverseGeocode = function(config) {
    validator.assertShape({
      latlng: validator.required(validator.string)
    })(config);

    return this.client.createRequest({
      method: 'GET',
      path: '/Geocode',
      query: config
    });
  };

  var geocoding = createServiceFactory_1(Geocoding);

  /**
   * Map Matching API service.
   *
   * Learn more about this service and its responses in
   * [Goong REST API documentation](https://docs.goong.io/rest/guide#distance-matrix).
   */
  var DistanceMatrix = {};

  /**
   * Get a duration and/or distance matrix showing travel times and distances between coordinates.
   *
   * @param {Object} config
   * @param {number} config.origins - Origin coordinate: `latitude,longitude|latitude,longitude`
   * @param {string} config.destinations - List of destination coordinate: `latitude,longitude|latitude,longitude|latitude,longitude`
   * @param {'car'|'bike'|'taxi'} [config.vehicle='car'] - Vehicle type
   * @param {'fastest'|'shortest'} [config.type='fastest'] - Routing type
   * @return {GAPIRequest}
   *
   * @example
   * matrixClient.getMatrix({
   *   origins: '20.981971,105.864323',
   *   destinations: '21.031011,105.783206|21.022328,105.790480|21.016665,105.788774',
   *   vehicle: 'car',
   *   type: 'fastest',
   * })
   *   .send()
   *   .then(response => {
   *       const matrix = response.body;
   *   });
   */
  DistanceMatrix.getMatrix = function(config) {
    validator.assertShape({
      origins: validator.required(validator.string),
      destinations: validator.required(validator.string),
      vehicle: validator.oneOf('car', 'bike', 'taxi'),
      type: validator.oneOf('fastest', 'shortest')
    })(config);

    return this.client.createRequest({
      method: 'GET',
      path: '/DistanceMatrix',
      query: config
    });
  };

  var distancematrix = createServiceFactory_1(DistanceMatrix);

  /**
   * Static Images API service.
   *
   * Learn more about this service and its responses in
   * [Goong REST API documentation](https://docs.goong.io/rest/guide#static-map).
   */
  var Static = {};

  /**
   * Get a static map image.
   *
   * @param {Object} config
   * @param {number} config.origin - Origin coordinate `latitude,longitude`
   * @param {string} config.destination - Destination coordinate `latitude,longitude`
   * @param {number} [config.width=600] - Width of the image in pixels, default 600px.
   * @param {number} [config.height=400] - Height of the image in pixels, default 400px.
   * @param {'car'|'bike'|'taxi'} [config.vehicle='car'] - Vehicle type
   * @param {'fastest'|'shortest'} [config.type='fastest'] - Routing type
   * @param {string} [config.color='#253494'] - Color of route line, default #253494
   *
   * @return {GAPIRequest}
   *
   * @example
   * staticClient.getStaticImage({
   *   origin: '20.981971,105.864323',
   *   destination: '20.994531,105.849663',
   *   width: 600,
   *   height: 400,
   *   vehicle: 'car',
   *   type: 'fastest',
   *   color: '#253494'
   *
   * })
   *   .send()
   *   .then(response => {
   *     const image = response.body;
   *   });
   *
   */
  Static.getStaticImage = function(config) {
    validator.assertShape({
      origin: validator.required(validator.string),
      destination: validator.required(validator.string),
      width: validator.number,
      height: validator.number,
      vehicle: validator.oneOf('car', 'bike', 'taxi'),
      type: validator.oneOf('fastest', 'shortest'),
      color: validator.string
    })(config);

    return this.client.createRequest({
      method: 'GET',
      path: '/staticmap/route',
      query: config,
      encoding: 'binary'
    });
  };

  var _static = createServiceFactory_1(Static);

  function goongSdk(options) {
    var client = browserClient(options);

    client.autocomplete = autocomplete(client);
    client.directions = directions(client);
    client.geocoding = geocoding(client);
    client.distancematrix = distancematrix(client);
    client.static = _static(client);

    return client;
  }

  var bundle = goongSdk;

  return bundle;

})));
