/* Shared bilingual CA fact renderer. Facts are stored once per reading card. */
(function(){
 'use strict';
 var bank;
 function facts(q){
  if(!bank){var el=document.getElementById('efp-ca-facts');try{bank=JSON.parse(el?el.textContent:'{}')}catch(_){bank={}}}
  return q&&q.exp_ref&&bank[q.exp_ref]||null;
 }
 function escape(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 function safe(s){
  var t=document.createElement('template');t.innerHTML=s;
  function clean(n){if(n.nodeType===3)return escape(n.textContent);if(n.nodeType!==1)return '';var inner=Array.from(n.childNodes).map(clean).join('');if(n.tagName==='B'||n.tagName==='STRONG')return '<b>'+inner+'</b>';if(n.tagName==='SPAN'&&n.classList.contains('highlight-text'))return '<span class="highlight-text">'+inner+'</span>';return inner}
  return Array.from(t.content.childNodes).map(clean).join('');
 }
 function render(q,lang){var list=facts(q);if(!list)return escape([].concat(q.exp&&q.exp[lang]||'').join(' '));return '<ul class="efp-ca-fact-list" lang="'+lang+'">'+list.map(function(pair){return '<li>'+safe(pair[lang])+'</li>'}).join('')+'</ul>'}
 window.EFP_CA_EXPLANATIONS={render:render,facts:facts};
})();
