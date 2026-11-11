// Built-in stand-in for the exam API, so candidates' code can "call" it without Judge0 having
// network access. Before a submission runs, runCode() calls applyExamShim(), which adds a small
// piece of code that answers requests to the exam URL with the real response (fetched live by
// your server) and fails every other request like a blocked network.
//
// Only touches code that mentions the exam host, so other tasks run exactly as written.
// Supported: JavaScript (102), TypeScript (101), Python (109), Go (107).
// Covered calls: fetch, XMLHttpRequest, https.get / https.request (Node); urllib, requests,
// http.client (Python); net/http (Go).
// Not supported: Java, C#, C, C++, Rust. Their HTTP clients can't be swapped from outside.

export const EXAM_URL =
  process.env.EXAM_API_URL || 'https://tech-exam-2026.vercel.app/api/business-units'
export const EXAM_KEY = process.env.EXAM_API_KEY || 'wv-exam-key-2025'
const EXAM_HOST = new URL(EXAM_URL).host

const JS = 102
const TS = 101
const PYTHON = 109
const GO = 107

export const examShimLanguages: number[] = [JS, TS, PYTHON, GO]

// True when this code should get the shim.
export const needsExamShim = (languageId: number, sourceCode: string) =>
  examShimLanguages.includes(languageId) && sourceCode.includes(EXAM_HOST)

// The Node.js stand-in, as plain JavaScript text. It replaces fetch, XMLHttpRequest and
// https.get / https.request. It runs through `new Function(...)`, so the same text works for
// JavaScript and for TypeScript (tsc never sees inside the string, whatever its target is).
const NODE_SHIM = `
(function () {
  var g = globalThis;
  var json = { 'content-type': 'application/json' };
  var load = (g.process && g.process.mainModule && g.process.mainModule.require)
    ? g.process.mainModule.require.bind(g.process.mainModule) : null;

  function lower(h) {
    var out = {};
    if (!h) return out;
    if (typeof h.forEach === 'function' && typeof h.get === 'function') {
      h.forEach(function (v, k) { out[String(k).toLowerCase()] = v; });
    } else if (Array.isArray(h)) {
      h.forEach(function (p) { out[String(p[0]).toLowerCase()] = p[1]; });
    } else {
      Object.keys(h).forEach(function (k) { out[k.toLowerCase()] = h[k]; });
    }
    return out;
  }
  // null = not the exam URL (behaves like a blocked network)
  function serve(url, headers) {
    if (String(url).indexOf(U) !== 0) return null;
    if (lower(headers)['x-api-key'] !== K) return { status: 401, text: 'Unauthorized', body: '{"error":"Unauthorized"}' };
    return { status: 200, text: 'OK', body: D };
  }

  // ---- fetch ----
  g.fetch = function (i, o) {
    var u = typeof i === 'string' ? i : (i && i.url) || String(i);
    var r = serve(u, (o && o.headers) || (i && i.headers));
    if (!r) return Promise.reject(new TypeError('fetch failed'));
    return Promise.resolve(new Response(r.body, { status: r.status, headers: json }));
  };

  // ---- XMLHttpRequest ----
  var XHR = function () {
    var x = this, hdrs = {}, listeners = {};
    x.readyState = 0; x.status = 0; x.statusText = ''; x.responseText = ''; x.response = '';
    x.responseType = ''; x.timeout = 0; x.withCredentials = false;
    function fire(type) {
      var ev = { type: type, target: x };
      if (typeof x['on' + type] === 'function') x['on' + type].call(x, ev);
      (listeners[type] || []).forEach(function (f) { f.call(x, ev); });
    }
    x.open = function (m, u) { x._url = u; x.readyState = 1; fire('readystatechange'); };
    x.setRequestHeader = function (k, v) { hdrs[k] = v; };
    x.getResponseHeader = function (k) { return String(k).toLowerCase() === 'content-type' ? 'application/json' : null; };
    x.getAllResponseHeaders = function () { return 'content-type: application/json\\r\\n'; };
    x.overrideMimeType = function () {};
    x.abort = function () {};
    x.addEventListener = function (t, f) { (listeners[t] = listeners[t] || []).push(f); };
    x.removeEventListener = function (t, f) { listeners[t] = (listeners[t] || []).filter(function (c) { return c !== f; }); };
    x.send = function () {
      setTimeout(function () {
        var r = serve(x._url, hdrs);
        if (!r) { x.readyState = 4; fire('readystatechange'); fire('error'); fire('loadend'); return; }
        x.status = r.status; x.statusText = r.text; x.responseText = r.body;
        x.response = x.responseType === 'json' ? JSON.parse(r.body) : r.body;
        x.readyState = 4; fire('readystatechange'); fire('load'); fire('loadend');
      }, 0);
    };
  };
  XHR.UNSENT = 0; XHR.OPENED = 1; XHR.HEADERS_RECEIVED = 2; XHR.LOADING = 3; XHR.DONE = 4;
  g.XMLHttpRequest = XHR;

  // ---- https.get / https.request ----
  try {
    if (load) {
      var https = load('https'), Events = load('events'), Stream = load('stream');
      var build = function (a, b, c) {
        var opts = {}, cb, href;
        if (typeof a === 'string' || (a && typeof a.href === 'string')) {
          href = new URL(String(a)).href;
          if (typeof b === 'function') cb = b; else { opts = b || {}; cb = c; }
        } else {
          opts = a || {}; cb = b;
          href = (opts.protocol || 'https:') + '//' + (opts.hostname || opts.host || 'localhost') +
            (opts.port ? ':' + opts.port : '') + (opts.path || '/');
        }
        var hdrs = Object.assign({}, opts.headers || {});
        var req = new Events.EventEmitter();
        req.setHeader = function (k, v) { hdrs[k] = v; };
        req.write = function () { return true; };
        req.setTimeout = function () { return req; };
        req.abort = function () {};
        req.destroy = function () {};
        req.end = function () {
          process.nextTick(function () {
            var r = serve(href, hdrs);
            if (!r) {
              var err = new Error('getaddrinfo ENOTFOUND'); err.code = 'ENOTFOUND';
              req.emit('error', err); return;
            }
            var res = new Stream.Readable({ read: function () {} });
            res.statusCode = r.status; res.statusMessage = r.text; res.headers = { 'content-type': 'application/json' };
            res.push(r.body); res.push(null);
            if (cb) cb(res);
            req.emit('response', res);
          });
          return req;
        };
        return req;
      };
      https.request = function (a, b, c) { return build(a, b, c); };
      https.get = function (a, b, c) { var r = build(a, b, c); r.end(); return r; };
    }
  } catch (e) {}
})();
`

const nodeShim = (body: string) =>
  // One line, so the candidate's line numbers in error messages stay correct.
  `;new Function(${JSON.stringify(
    `var U=${JSON.stringify(EXAM_URL)},K=${JSON.stringify(EXAM_KEY)},D=${JSON.stringify(body)};${NODE_SHIM}`,
  )})();`

const jsShim = nodeShim
const tsShim = nodeShim

const pythonShimSource = (body: string) => `
import sys, io, json, types
import urllib.request as _ur, urllib.error as _ue, urllib.response as _resp
from email.message import Message as _Msg

_U = ${JSON.stringify(EXAM_URL)}
_K = ${JSON.stringify(EXAM_KEY)}
_D = ${JSON.stringify(body)}

def _headers(pairs):
    return {str(k).lower(): v for k, v in dict(pairs or {}).items()}

def _check(url, hdrs):
    if not str(url).startswith(_U):
        raise _ue.URLError("Network access is disabled")
    if _headers(hdrs).get("x-api-key") != _K:
        raise _ue.HTTPError(url, 401, "Unauthorized", _Msg(), io.BytesIO(b'{"error":"Unauthorized"}'))

def _urlopen(req, data=None, timeout=None, **kw):
    if isinstance(req, str):
        url, hdrs = req, {}
    else:
        url, hdrs = req.full_url, dict(req.header_items())
    _check(url, hdrs)
    m = _Msg()
    m["Content-Type"] = "application/json"
    return _resp.addinfourl(io.BytesIO(_D.encode()), m, url, 200)

_ur.urlopen = _urlopen

import http.client as _hc

class _HResp:
    def __init__(self, status, reason, body):
        self.status = status
        self.reason = reason
        self.version = 11
        self.headers = _Msg()
        self.headers["Content-Type"] = "application/json"
        self.msg = self.headers
        self._b = io.BytesIO(body)
    def read(self, amt=None):
        return self._b.read() if amt is None else self._b.read(amt)
    def getheader(self, name, default=None):
        return self.headers.get(name, default)
    def getheaders(self):
        return list(self.headers.items())
    def getcode(self):
        return self.status
    def close(self):
        pass
    def __enter__(self):
        return self
    def __exit__(self, *a):
        return False

class _HConn:
    def __init__(self, host, port=None, *a, **kw):
        self._host = host
        self._req = None
    def request(self, method, url, body=None, headers=None, **kw):
        self._req = ("https://" + self._host + url, headers or {})
    def getresponse(self):
        url, hdrs = self._req
        if not url.startswith(_U):
            raise ConnectionError("Network access is disabled")
        if _headers(hdrs).get("x-api-key") != _K:
            return _HResp(401, "Unauthorized", b'{"error":"Unauthorized"}')
        return _HResp(200, "OK", _D.encode())
    def close(self):
        pass
    def set_debuglevel(self, level):
        pass

_hc.HTTPSConnection = _HConn

class _R:
    def __init__(self, code, body, url):
        self.status_code = code
        self.content = body
        self.text = body.decode()
        self.url = url
        self.ok = code < 400
        self.headers = {"Content-Type": "application/json"}
    def json(self):
        return json.loads(self.text)
    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception("%d Client Error: Unauthorized for url: %s" % (self.status_code, self.url))

def _get(url, headers=None, **kw):
    if not str(url).startswith(_U):
        raise ConnectionError("Network access is disabled")
    if _headers(headers).get("x-api-key") != _K:
        return _R(401, b'{"error":"Unauthorized"}', url)
    return _R(200, _D.encode(), url)

_m = types.ModuleType("requests")
_m.get = _get
_m.Response = _R
sys.modules["requests"] = _m
`

const pythonShim = (body: string) => {
  const encoded = Buffer.from(pythonShimSource(body), 'utf8').toString('base64')
  return `import base64 as _b64;exec(_b64.b64decode("${encoded}"),{"__name__":"_shim"})`
}

// Go: put the imports on the same line as `package main` (so line numbers don't move) and add an
// init() at the end that swaps http.DefaultTransport.
const goImports =
  '; import examhttp "net/http"; import examio "io"; import examstrings "strings"; import examerrors "errors"'

const goShim = (body: string) => `

type examRoundTripper struct{}

func (examRoundTripper) RoundTrip(r *examhttp.Request) (*examhttp.Response, error) {
	if !examstrings.HasPrefix(r.URL.String(), ${JSON.stringify(EXAM_URL)}) {
		return nil, examerrors.New("dial tcp: network access is disabled")
	}
	status, text, data := 200, "200 OK", ${JSON.stringify(body)}
	if r.Header.Get("X-Api-Key") != ${JSON.stringify(EXAM_KEY)} {
		status, text, data = 401, "401 Unauthorized", "{\\"error\\":\\"Unauthorized\\"}"
	}
	return &examhttp.Response{
		Status:     text,
		StatusCode: status,
		Proto:      "HTTP/1.1",
		ProtoMajor: 1,
		ProtoMinor: 1,
		Header:     examhttp.Header{"Content-Type": {"application/json"}},
		Body:       examio.NopCloser(examstrings.NewReader(data)),
		Request:    r,
	}, nil
}

func init() { examhttp.DefaultTransport = examRoundTripper{} }
`

// Returns the code to actually run. If the shim can't be added, the original code is returned.
export const applyExamShim = (languageId: number, sourceCode: string, body: string): string => {
  switch (languageId) {
    case JS:
      return `${jsShim(body)} ${sourceCode}`
    case TS:
      return `${tsShim(body)} ${sourceCode}`
    case PYTHON: {
      // `from __future__` imports must stay first, so the shim goes after the last one.
      const lines = sourceCode.split('\n')
      let last = -1
      lines.forEach((line, index) => {
        if (/^\s*from\s+__future__\s+import\b/.test(line)) last = index
      })
      lines.splice(last + 1, 0, pythonShim(body))
      return lines.join('\n')
    }
    case GO: {
      if (!/^\s*package\s+main\b/m.test(sourceCode)) return sourceCode
      return sourceCode.replace(/^(\s*package\s+main\b)/m, `$1${goImports}`) + goShim(body)
    }
    default:
      return sourceCode
  }
}
