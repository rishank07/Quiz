(function () {
  "use strict";
  var params = new URLSearchParams(location.search), url = params.get("file");
  var entry = EFP_CF_PDF.route(url);
  // Older indexed and shared opener links should enter the site reader too.
  // Only the reader's explicit Open PDF button opts into the raw download.
  if (entry && params.get("download") !== "1") {
    location.replace(entry.reader + location.hash); return;
  }
  var asset = EFP_CF_PDF.find(url), status = document.getElementById("status");
  var progress = document.getElementById("progress"), link = document.getElementById("download");
  if (!asset) { status.textContent = "This PDF could not be found."; return; }
  document.getElementById("title").textContent = asset.filename;
  var source = EFP_CF_PDF.reader(asset), parts = [], received = 0;
  asset.parts.reduce(function (previous, _, index) {
    return previous.then(function () {
      var begin = index * asset.chunkSize;
      return source.range(begin, Math.min(begin + asset.chunkSize, asset.length));
    }).then(function (bytes) {
      parts.push(bytes); received += bytes.length;
      progress.value = received / asset.length;
      status.textContent = "Opening your PDF… " + Math.round(received / asset.length * 100) + "%";
    });
  }, Promise.resolve()).then(function () {
    source.stop();
    var blob = URL.createObjectURL(new Blob(parts, {type: "application/pdf"}));
    parts = []; link.href = blob; link.download = asset.filename; link.hidden = false;
    status.textContent = "Your PDF is ready.";
    // The original page fragment is preserved for Open PDF links from the reader.
    location.replace(blob + location.hash);
  }).catch(function () {
    source.stop(); status.textContent = "The PDF could not finish downloading. Please reload to retry.";
  });
})();
