/**
 * Browser helpers: recipe file → Gemini payload, HTML → plain text.
 * Mammoth (.docx) is loaded dynamically on first DOCX use — not in HTML.
 */
(function (global) {
  var MAX_TEXT_CHARS = 200000;
  var MAX_FILE_BYTES = 4 * 1024 * 1024;
  var MAMMOTH_CDN = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';
  var mammothLoadPromise = null;

  function loadMammoth() {
    if (global.mammoth && global.mammoth.extractRawText) return Promise.resolve();
    if (mammothLoadPromise) return mammothLoadPromise;
    mammothLoadPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = MAMMOTH_CDN;
      s.crossOrigin = 'anonymous';
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load DOCX library.')); };
      document.head.appendChild(s);
    });
    return mammothLoadPromise;
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        var s = String(r.result || '');
        var i = s.indexOf(',');
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      r.onerror = function () {
        reject(new Error('Could not read file.'));
      };
      r.readAsDataURL(file);
    });
  }

  /**
   * @returns {Promise<{ kind: 'text', text: string } | { kind: 'parts', parts: Array }>}
   */
  function preparePayloadFromFile(file) {
    if (!file || !file.size) {
      return Promise.reject(new Error('Choose a file first.'));
    }
    if (file.size > MAX_FILE_BYTES) {
      return Promise.reject(new Error('File too large (max 4 MB).'));
    }
    var name = (file.name || '').toLowerCase();
    var mime = file.type || '';

    if (name.endsWith('.doc') && !name.endsWith('.docx')) {
      return Promise.reject(
        new Error('Legacy .doc is not supported. Save as .docx or PDF, or paste text.')
      );
    }

    if (name.endsWith('.docx') || mime.indexOf('wordprocessingml') >= 0) {
      return loadMammoth().then(function () {
        return new Promise(function (resolve, reject) {
          var fr = new FileReader();
          fr.onload = function () {
            global.mammoth
              .extractRawText({ arrayBuffer: fr.result })
              .then(function (result) {
                var t = (result && result.value) || '';
                t = t.trim();
                if (!t) reject(new Error('No text could be read from the DOCX.'));
                else
                  resolve({
                    kind: 'text',
                    text: t.slice(0, MAX_TEXT_CHARS),
                  });
              })
              .catch(reject);
          };
          fr.onerror = function () {
            reject(new Error('Could not read DOCX.'));
          };
          fr.readAsArrayBuffer(file);
        });
      });
    }

    if (mime.indexOf('pdf') >= 0 || name.endsWith('.pdf')) {
      return readFileAsDataUrl(file).then(function (b64) {
        return {
          kind: 'parts',
          parts: [
            {
              text:
                'Extract the recipe from this PDF (title, ingredients, instructions). Ignore ads and site chrome. Output must match the JSON schema.',
            },
            { inlineData: { mimeType: 'application/pdf', data: b64 } },
          ],
        };
      });
    }

    if (mime.indexOf('image/') === 0) {
      return readFileAsDataUrl(file).then(function (b64) {
        var mt = mime || 'image/jpeg';
        return {
          kind: 'parts',
          parts: [
            {
              text:
                'Extract the recipe from this image (ingredients and steps). Output must match the JSON schema.',
            },
            { inlineData: { mimeType: mt, data: b64 } },
          ],
        };
      });
    }

    return Promise.reject(
      new Error('Unsupported file type. Use PDF, DOCX, or an image (JPEG, PNG, WebP, …).')
    );
  }

  function htmlToPlainText(html) {
    var raw = String(html || '');
    if (!raw.trim()) return '';
    try {
      var doc = new DOMParser().parseFromString(raw, 'text/html');
      var root =
        doc.querySelector('article') ||
        doc.querySelector('[itemtype*="Recipe"]') ||
        doc.querySelector('main') ||
        doc.body;
      var t = root ? root.innerText || '' : '';
      t = String(t)
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (!t && doc.body) t = (doc.body.innerText || '').trim();
      if (!t) t = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return t.slice(0, MAX_TEXT_CHARS);
    } catch (e) {
      return raw
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_TEXT_CHARS);
    }
  }

  /**
   * @param {string} pageUrl
   * @param {string} proxyBase from KuschiRecipeGemini.loadProxyUrl()
   */
  function fetchUrlThenPlainText(pageUrl, proxyBase) {
    var G = global.KuschiRecipeGemini;
    if (!G || typeof G.fetchUrlAsPlainText !== 'function') {
      return Promise.reject(new Error('recipe-gemini-format.js not loaded.'));
    }
    return G.fetchUrlAsPlainText(pageUrl, proxyBase).then(function (html) {
      return htmlToPlainText(html);
    });
  }

  global.KuschiRecipeImport = {
    MAX_TEXT_CHARS: MAX_TEXT_CHARS,
    MAX_FILE_BYTES: MAX_FILE_BYTES,
    preparePayloadFromFile: preparePayloadFromFile,
    htmlToPlainText: htmlToPlainText,
    fetchUrlThenPlainText: fetchUrlThenPlainText,
  };
})(typeof window !== 'undefined' ? window : this);
