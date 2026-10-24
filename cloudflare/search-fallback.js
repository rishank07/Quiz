// Included only in the Cloudflare build, alongside the generated part map.
function efLoadCloudflareSearchParts(url, globalName, parts) {
  var key = new URL(url, document.baseURI).href + "|" + globalName;
  if (EF_FALLBACK_SCRIPT_PROMISES[key]) return EF_FALLBACK_SCRIPT_PROMISES[key];
  var job = efFallbackLoadQueue.then(function () {
    window[globalName] = [];
    return parts.reduce(function (previous, src) {
      return previous.then(function () {
        return new Promise(function (resolve, reject) {
          var script = document.createElement("script");
          var timer = setTimeout(function () { finish(new Error("Search part timed out")); }, 60000);
          function finish(error) {
            clearTimeout(timer); script.remove();
            if (error) reject(error); else resolve();
          }
          script.src = src; script.async = true;
          script.onload = function () { finish(); };
          script.onerror = function () { finish(new Error("Search part could not load")); };
          (document.head || document.documentElement).appendChild(script);
        });
      });
    }, Promise.resolve()).then(function () {
      if (!Array.isArray(window[globalName])) throw new Error("Search index is unavailable");
      EF_FALLBACK_GLOBAL_URLS[globalName] = key;
      return window[globalName];
    });
  });
  EF_FALLBACK_SCRIPT_PROMISES[key] = job.catch(function (error) {
    delete EF_FALLBACK_SCRIPT_PROMISES[key]; throw error;
  });
  efFallbackLoadQueue = job.catch(function () {});
  Object.keys(EF_FALLBACK_SCRIPT_PROMISES).slice(0, -2).forEach(function (old) {
    delete EF_FALLBACK_SCRIPT_PROMISES[old];
  });
  return EF_FALLBACK_SCRIPT_PROMISES[key];
}
