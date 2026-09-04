(function(){"use strict";
var docs=Array.isArray(window.EF_CRUX_DOCS)?window.EF_CRUX_DOCS:[];
var params=new URLSearchParams(location.search),id=params.get('id'),doc=docs.find(function(x){return x.id===id});
if(!doc){document.getElementById('title').textContent='Document not found';return}
var page=Math.max(1,Math.min(doc.pages,parseInt(params.get('page')||'1',10)||1));
var pages=[];
var title=document.getElementById('title'),crumb=document.getElementById('crumb'),input=document.getElementById('pageInput'),total=document.getElementById('pageTotal'),favBtn=document.getElementById('favBtn'),bookmarkPage=document.getElementById('bookmarkPage'),completeBtn=document.getElementById('completeBtn'),pdfObject=document.getElementById('pdfObject'),openPdf=document.getElementById('openPdf'),openPdf2=document.getElementById('openPdf2'),docSearch=document.getElementById('docSearch'),docHits=document.getElementById('docHits');
function safe(raw,f){try{return JSON.parse(raw)||f}catch(e){return f}}
function bms(){var v=safe(localStorage.getItem('efp_bookmarks'),{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function saveB(v){try{localStorage.setItem('efp_bookmarks',JSON.stringify(v))}catch(e){}}
function fk(){return 'cruxdoc:'+doc.id}
function pk(){return 'cruxpage:'+doc.id+':'+page}
function prog(){var a=safe(localStorage.getItem('efp_visited_crux_'+doc.id),[]);return Array.isArray(a)?a:[]}
function saveProg(a){try{localStorage.setItem('efp_visited_crux_'+doc.id,JSON.stringify(Array.from(new Set(a))))}catch(e){}}
function recent(){var a=safe(localStorage.getItem('efp_visited_crux_recent'),[]);return Array.isArray(a)?a:[]}
function pushRecent(){var a=recent().filter(function(x){return x!==doc.id});a.unshift(doc.id);a=a.slice(0,20);try{localStorage.setItem('efp_visited_crux_recent',JSON.stringify(a))}catch(e){}}
function toast(s){var t=document.getElementById('toast');t.textContent=s;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('show')},1500)}
function markVisited(){var a=prog().filter(function(x){return !/^last:/.test(x)});a.push('p:'+page,'last:'+page);saveProg(a);pushRecent();if(typeof gtag==='function')gtag('event','crux_page_view',{document_id:doc.id,document_title:doc.title,page_number:page,source:doc.source,reader_mode:'original_pdf'})}
function updateUrl(){var p=new URLSearchParams(location.search);p.set('id',doc.id);p.set('page',String(page));history.replaceState(null,'',location.pathname+'?'+p.toString())}
function pdfUrl(){return doc.pdf+'#page='+page+'&zoom=page-width'}
function updateControls(){input.value=page;total.textContent=doc.pages;var b=bms();favBtn.textContent=b[fk()]?'★':'☆';favBtn.classList.toggle('on',!!b[fk()]);bookmarkPage.textContent=b[pk()]?'🔖 Bookmarked':'🔖 Bookmark Page';bookmarkPage.classList.toggle('bookmarked',!!b[pk()]);completeBtn.textContent=prog().indexOf('complete')>=0?'✓ Completed':'✓ Complete';openPdf.href=pdfUrl();openPdf2.href=pdfUrl()}
function showPdf(){var url=pdfUrl();if(pdfObject.getAttribute('data')!==url)pdfObject.setAttribute('data',url);updateControls();markVisited();updateUrl()}
function go(n){var next=Math.max(1,Math.min(doc.pages,n));if(next===page){updateControls();return}page=next;showPdf();window.scrollTo({top:0,behavior:'smooth'})}
function loadPagesForSearch(){var s=document.createElement('script');s.src='pages/'+doc.id+'.js?v=20260904v9';s.onload=function(){pages=Array.isArray(window.EF_CRUX_DOC_PAGES)?window.EF_CRUX_DOC_PAGES:[];runDocSearch()};s.onerror=function(){docSearch.placeholder='PDF search index unavailable — use page number';docSearch.disabled=true};document.head.appendChild(s)}
function runDocSearch(){var q=docSearch.value.trim().toLowerCase();docHits.innerHTML='';if(q.length<2||!pages.length)return;var hits=[];for(var i=0;i<pages.length;i++)if(String(pages[i]).toLowerCase().includes(q))hits.push(i+1);hits.slice(0,30).forEach(function(n){var b=document.createElement('button');b.textContent='Page '+n;b.addEventListener('click',function(){go(n)});docHits.appendChild(b)});if(!hits.length){var s=document.createElement('span');s.textContent='No matching page';docHits.appendChild(s)}else if(hits.length>30){var m=document.createElement('span');m.textContent=' +'+(hits.length-30)+' more';docHits.appendChild(m)}}
title.textContent=doc.title;crumb.textContent=doc.breadcrumb+' · '+doc.pages+' pages';document.title=doc.title+' | Original PDF | ExamFusion Prep';
document.getElementById('backBtn').addEventListener('click',function(){if(history.length>1)history.back();else location.href='index.html'});
document.getElementById('prev').addEventListener('click',function(){go(page-1)});
document.getElementById('next').addEventListener('click',function(){go(page+1)});
input.addEventListener('change',function(){go(parseInt(input.value,10)||page)});
input.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();go(parseInt(input.value,10)||page);input.blur()}});
favBtn.addEventListener('click',function(){var b=bms();if(b[fk()])delete b[fk()];else b[fk()]=true;saveB(b);updateControls();toast(b[fk()]?'Added to favourites':'Removed from favourites')});
bookmarkPage.addEventListener('click',function(){var b=bms();if(b[pk()])delete b[pk()];else b[pk()]=true;saveB(b);updateControls();toast(b[pk()]?'Page bookmarked · Open My Pages to view it':'Page bookmark removed')});
completeBtn.addEventListener('click',function(){var a=prog(),i=a.indexOf('complete');if(i>=0)a.splice(i,1);else a.push('complete');saveProg(a);updateControls();toast(a.indexOf('complete')>=0?'Marked complete':'Completion removed')});
var st;docSearch.addEventListener('input',function(){clearTimeout(st);st=setTimeout(runDocSearch,140)});
function dark(){document.documentElement.classList.toggle('dark',localStorage.getItem('efp_black_mode')==='on');document.getElementById('darkBtn').textContent=document.documentElement.classList.contains('dark')?'Light':'Dark'}
document.getElementById('darkBtn').addEventListener('click',function(){localStorage.setItem('efp_black_mode',document.documentElement.classList.contains('dark')?'off':'on');dark()});
dark();showPdf();loadPagesForSearch();
})();