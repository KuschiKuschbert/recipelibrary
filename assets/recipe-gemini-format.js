/**
 * Shared Gemini JSON formatting for kitchen (index) and Riviera add-recipe modals.
 * Single browser-stored API key; free tier via Google AI Studio.
 */
(function (global) {
  var LEGACY_KITCHEN_KEY = 'kuschi_kitchen_gemini_key_v1';
  var STORAGE_KEY = 'kuschi_gemini_api_key_v1';
  var PROXY_STORAGE_KEY = 'kuschi_recipe_fetch_proxy_v1';
  var MODEL = 'gemini-2.0-flash';

  var SCHEMA_KITCHEN = {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING', description: 'Recipe title' },
      yield: { type: 'STRING', description: 'Servings or yield, e.g. 4 servings' },
      cuisine: { type: 'STRING' },
      category: { type: 'STRING' },
      protein: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Lowercase tags e.g. chicken, dairy' },
      tags: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Dietary tags' },
      ingredients: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            qty: { type: 'STRING' },
            unit: { type: 'STRING', description: 'g, ml, L, etc.' },
            item: { type: 'STRING' },
            prep: { type: 'STRING', description: 'Prep note if any' },
          },
          required: ['item'],
        },
      },
      instructions: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'One string per step, no leading numbers required',
      },
    },
    required: ['name', 'ingredients', 'instructions'],
  };

  var SCHEMA_RIVIERA = {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING', description: 'Recipe title' },
      subtitle: { type: 'STRING', description: 'Sauces / pairings line' },
      type: { type: 'STRING', description: 'e.g. Canape / Tapas' },
      course: { type: 'STRING', description: 'e.g. Canape' },
      protein: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Lowercase e.g. pork, dairy, seafood' },
      diet: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Dietary labels e.g. Gluten-Free' },
      method: { type: 'STRING', description: 'Cooking method e.g. Deep Fry, Oven' },
      yield: { type: 'STRING' },
      label: { type: 'STRING', description: 'Prep label for cards; default to name if unknown' },
      elements: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Plating components' },
      ingredients: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            qty: { type: 'STRING', description: 'Single string e.g. 500 g or 2 L' },
            item: { type: 'STRING' },
            prep: { type: 'STRING' },
          },
          required: ['item'],
        },
      },
      method_steps: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Prep / kitchen method, one step per string',
      },
      service: {
        type: 'ARRAY',
        items: { type: 'STRING' },
        description: 'Service / plating steps if distinct from prep',
      },
      note: { type: 'STRING', description: 'Single note or empty' },
    },
    required: ['name', 'ingredients', 'method_steps'],
  };

  function loadApiKey() {
    var k = localStorage.getItem(STORAGE_KEY);
    if (k) return k;
    var leg = localStorage.getItem(LEGACY_KITCHEN_KEY);
    if (leg) {
      localStorage.setItem(STORAGE_KEY, leg);
      return leg;
    }
    return '';
  }

  function saveApiKey(trimmed) {
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
    else localStorage.removeItem(STORAGE_KEY);
  }

  function loadProxyUrl() {
    return (localStorage.getItem(PROXY_STORAGE_KEY) || '').trim();
  }

  function saveProxyUrl(trimmed) {
    if (trimmed) localStorage.setItem(PROXY_STORAGE_KEY, trimmed);
    else localStorage.removeItem(PROXY_STORAGE_KEY);
  }

  function parseGenerateResponse(res, data) {
    if (!res.ok) {
      var msg = (data.error && data.error.message) || res.statusText || 'Request failed';
      throw new Error(msg);
    }
    var partsOut = data.candidates && data.candidates[0] && data.candidates[0].content;
    partsOut = partsOut && partsOut.parts;
    var text = null;
    if (partsOut && partsOut.length) {
      for (var i = 0; i < partsOut.length; i++) {
        if (partsOut[i].text) {
          text = partsOut[i].text;
          break;
        }
      }
    }
    if (!text) {
      var block =
        (data.promptFeedback && data.promptFeedback.blockReason) ||
        (data.candidates && data.candidates[0] && data.candidates[0].finishReason);
      throw new Error(block ? 'Blocked: ' + block : 'No response from model');
    }
    return JSON.parse(text);
  }

  /**
   * @param {string} apiKey
   * @param {string} systemText
   * @param {Array<{text?: string, inlineData?: {mimeType: string, data: string}}>} userParts
   * @param {object} responseSchema
   * @returns {Promise<object>}
   */
  function generateStructuredFromParts(apiKey, systemText, userParts, responseSchema) {
    var url =
      'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent';
    var parts = [];
    for (var i = 0; i < userParts.length; i++) {
      var p = userParts[i];
      if (p.text != null && p.text !== '') parts.push({ text: p.text });
      if (p.inlineData && p.inlineData.mimeType && p.inlineData.data) {
        parts.push({ inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } });
      }
    }
    if (!parts.length) {
      return Promise.reject(new Error('No content to send to the model.'));
    }
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents: [{ parts: parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        },
      }),
    }).then(function (res) {
      return res.json().then(function (data) {
        return parseGenerateResponse(res, data);
      });
    });
  }

  /**
   * @param {string} apiKey
   * @param {string} systemText
   * @param {string} userText
   * @param {object} responseSchema Gemini Schema object
   * @returns {Promise<object>}
   */
  function generateStructured(apiKey, systemText, userText, responseSchema) {
    return generateStructuredFromParts(apiKey, systemText, [{ text: userText }], responseSchema);
  }

  /**
   * Fetch recipe page HTML/text. Tries browser fetch first; on failure uses optional proxy base URL
   * (GET base?url=encoded). Proxy returns text/plain or JSON { text } | { html }.
   */
  function fetchUrlAsPlainText(pageUrl, proxyBase) {
    return fetch(pageUrl, { mode: 'cors', credentials: 'omit' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .catch(function () {
        var base = (proxyBase || '').trim().replace(/\/$/, '');
        if (!base) {
          throw new Error(
            'Could not load URL (site blocked direct access). Paste the recipe text, upload a file, or set a fetch proxy URL below.'
          );
        }
        var sep = base.indexOf('?') >= 0 ? '&' : '?';
        var u = base + sep + 'url=' + encodeURIComponent(pageUrl);
        return fetch(u, { mode: 'cors', credentials: 'omit' }).then(function (res) {
          if (!res.ok) throw new Error('Proxy HTTP ' + res.status);
          var ct = (res.headers.get('content-type') || '').toLowerCase();
          if (ct.indexOf('application/json') >= 0) {
            return res.json().then(function (j) {
              var t = (j && (j.text || j.html || j.body)) || '';
              return typeof t === 'string' ? t : '';
            });
          }
          return res.text();
        });
      });
  }

  global.KuschiRecipeGemini = {
    STORAGE_KEY: STORAGE_KEY,
    LEGACY_KITCHEN_KEY: LEGACY_KITCHEN_KEY,
    PROXY_STORAGE_KEY: PROXY_STORAGE_KEY,
    MODEL: MODEL,
    SCHEMA_KITCHEN: SCHEMA_KITCHEN,
    SCHEMA_RIVIERA: SCHEMA_RIVIERA,
    loadApiKey: loadApiKey,
    saveApiKey: saveApiKey,
    loadProxyUrl: loadProxyUrl,
    saveProxyUrl: saveProxyUrl,
    generateStructured: generateStructured,
    generateStructuredFromParts: generateStructuredFromParts,
    fetchUrlAsPlainText: fetchUrlAsPlainText,
  };
})(typeof window !== 'undefined' ? window : this);
