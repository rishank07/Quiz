/* Run before the site's navigation handlers so Back closes the map overlay first. */
(() => {
  'use strict';
  window.addEventListener('click',event=>{
    if(event.button>0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
    const back=event.target?.closest?.("#efp-app-back-button,[data-nav='back'],a[data-efp-back]");
    if(!back||back.disabled||!window.EFP_MAPPING_OVERLAY?.back())return;
    event.preventDefault();event.stopImmediatePropagation();
  },true);
  window.addEventListener('popstate',event=>{
    if(!window.EFP_MAPPING_OVERLAY?.pop())return;
    event.stopImmediatePropagation();
  },true);
})();
