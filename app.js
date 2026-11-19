if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').then(reg => console.log('SW registered')).catch(err => console.log('SW registration failed', err));
  });
}

let secretClickCount = 0;
let secretClickTimer = null;
const ADMIN_PASSWORD = "shirazali2024";

document.getElementById('secretHeader').addEventListener('click', (e) => {
  if (e.target.closest('.head-actions')) return;
  secretClickCount++;
  clearTimeout(secretClickTimer);
  secretClickTimer = setTimeout(() => { secretClickCount = 0; }, 1500);
  if (secretClickCount === 5) {
    secretClickCount = 0;
    const pass = prompt("أدخل كلمة المرور للوصول إلى لوحة التحكم:");
    if (pass === ADMIN_PASSWORD) {
      showAdminLinks();
    } else if (pass !== null) {
      alert("كلمة المرور غير صحيحة!");
    }
  }
});

function showAdminLinks() {
  if (document.getElementById('admin-widget')) {
    alert("لوحة التحكم مفعلة بالفعل في القائمة الجانبية.");
    return;
  }
  const sidebar = document.getElementById('sidebar');
  const adminHtml = `
    <div class="side-widget" id="admin-widget" style="background:var(--paper-2); padding:10px; border-radius:8px; border:1px dashed var(--accent);">
      <h4 style="color:var(--primary-dark); border-bottom:none; margin-bottom:5px;">⚙️ لوحة التحكم</h4>
      <ul class="side-list">
        <li><a href="admin.html">إدارة الكتب</a></li>
        <li><a href="admin-articles.html">إدارة المقالات</a></li>
        <li><a href="articles.html">المقالات</a></li>
        <li><a href="sorter.html">أداة الفرز</a></li>
        <li><a href="tool.html">أداة مساعدة</a></li>
      </ul>
    </div>
  `;
  sidebar.insertAdjacentHTML('beforeend', adminHtml);
  alert("تم تفعيل لوحة التحكم بنجاح! افتح القائمة الجانبية للوصول إليها.");
}

window.filterSidebar = function(val) {
  val = val.toLowerCase().trim();
  const lists = document.querySelectorAll('.sidebar .side-list');
  lists.forEach(list => {
    let hasVisible = false;
    list.querySelectorAll('li').forEach(li => {
      const text = li.textContent.toLowerCase();
      if(text.includes(val)) {
        li.style.display = 'block';
        hasVisible = true;
      } else {
        li.style.display = 'none';
      }
    });
    const header = list.previousElementSibling;
    if(header && header.tagName === 'H4') {
      header.style.display = hasVisible ? 'block' : 'none';
    }
  });
};

let CATS = [], MEDIA_LISTS = { video: [], audio: [] };
let ARTICLES = [], ARTICLE_CATS = [];
const articlesState = { q:"", cat:"all", author:"all", year:"all", contentType:"all", page:1, perPage:10, sort:"newest" };
let ARTICLE_FAVS = [];
try { const af = JSON.parse(localStorage.getItem("alsh_article_favs")||"[]"); if(Array.isArray(af)) ARTICLE_FAVS = af; } catch(e){}
const saveArticleFavs = () => { try{ localStorage.setItem("alsh_article_favs", JSON.stringify(ARTICLE_FAVS)); }catch(e){} };
const isArticleFav = (id) => ARTICLE_FAVS.includes(id);

async function loadCategories() {
  try {
    const res = await fetch('categories.json?t=' + Date.now());
    if (!res.ok) { return []; }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items || []);
    return list.filter(c => c && c.id && c.name).map(c => ({ id: String(c.id), name: String(c.name) }));
  } catch (e) { console.error('خطأ categories.json:', e); return []; }
}

async function loadMediaLists() {
  try {
    const res = await fetch('media_lists.json?t=' + Date.now());
    if (res.ok) MEDIA_LISTS = await res.json();
  } catch(e) { console.warn('media_lists.json not found'); }
}

let SERIES = [
  {id:"taqrib-quran",name:"تقريب القرآن",author:"shirazi-m",desc:"موسوعة تفسيرية شاملة للقرآن الكريم في عشرة أجزاء."},
  {id:"tabyin-quran",name:"تبيين القرآن",author:"shirazi-m",desc:"موسوعة تفسيرية وبيانية لآيات القرآن الكريم."},
  {id:"kalima-encyclopedia",name:"الكلمة",author:"shirazi-h",desc:"موسوعة حديثية ومعرفية ضخمة تجمع كلمات الله عز وجل والأنبياء وأهل البيت (عليهم السلام) في 26 مجلداً."},
  {id:"fiqh-encyclopedia",name:"الفقه",author:"shirazi-m",desc:"موسوعة فقهية شاملة تُغطي جميع أبواب الفقه الإسلامي، من الاجتهاد والتقليد إلى الديات."},
  {id:"fiqh-zahra",name:"من فقه الزهراء عليها السلام",author:"shirazi-m",desc:"موسوعة فقهية مستندة إلى فقه الصديقة الطاهرة فاطمة الزهراء (عليها السلام)، في سبعة أجزاء."}
];
async function loadSeries() {
  try {
    const res = await fetch('series.json?t=' + Date.now());
    if (!res.ok) { return null; }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items || []);
    const filtered = list.filter(s => s && s.id && s.name);
    return filtered.length > 0 ? filtered : null;
  } catch (e) { return null; }
}

const AUTHORS_BASE = [
  {id:"shirazi-m", img:"shirazi-m.jpg", name:"آية الله العظمى السيد محمد الحسيني الشيرازي",short:"السيد محمد الحسيني الشيرازي",bio:"المرجع الديني الراحل (1347 – 1422هـ).", longBio:"سأقوم بكتابة نبذة مطولة عن المؤلف هنا. "},
  {id:"shirazi-h", img:"shirazi-h.jpg", name:"الشهيد السيد حسن الحسيني الشيرازي",short:"السيد حسن الحسيني الشيرازي",bio:"من أعلام أسرة آل الشيرازي، ومؤلف موسوعة الكلمة الضخمة.", longBio:""},
  {id:"shirazi-s", img:"shirazi-s.jpg", name:"آية الله العظمى السيد صادق الحسيني الشيرازي",short:"السيد صادق الحسيني الشيرازي",bio:"مرجع ديني معاصر، من أعلام أسرة آل الشيرازي.", longBio:""},
  {id:"shirazi-mr", img:"shirazi-mr.jpg", name:"آية الله الفقيه السيد محمد رضا الشيرازي",short:"السيد محمد رضا الشيرازي",bio:"فقيه ومفكر إسلامي، من أسرة آل الشيرازي.", longBio:""},
  {id:"shirazi-mo", img:"shirazi-mo.jpg", name:"آية الله السيد مرتضى الحسيني الشيرازي",short:"السيد مرتضى الحسيني الشيرازي",bio:"عالم دين ومؤلف، من أسرة آل الشيرازي.", longBio:""},
  {id:"shirazi-j", img:"shirazi-j.jpg", name:"السيد جعفر الحسيني الشيرازي",short:"السيد جعفر الحسيني الشيرازي",bio:"باحث ومؤلف إسلامي، من أسرة آل الشيرازي.", longBio:""},
  {id:"shirazi-me", img:"shirazi-me.jpg", name:"السيد مهدي الحسيني الشيرازي",short:"السيد مهدي الحسيني الشيرازي",bio:"من أعلام أسرة آل الشيرازي.", longBio:""}
];
let AUTHORS = [...AUTHORS_BASE];

async function loadAuthors() {
  try {
    const res = await fetch('authors.json?t=' + Date.now());
    if (res.ok) {
      const custom = await res.json();
      if (Array.isArray(custom)) {
        AUTHORS = [...AUTHORS_BASE, ...custom];
      }
    }
  } catch(e) {}
}

const DONATION_PROJECTS = [
  { id: 1, title: "طباعة كتاب: موسوعة الفقه", desc: "طباعة ونشر نسخ ورقية من الكتاب لتوزيعها على المكتبات والمراكز العلمية." },
  { id: 2, title: "رقمنة مخطوطات ووثائق نادرة", desc: "تصوير وفهرسة المخطوطات والوثائق وحفظها رقمياً وإتاحتها للباحثين." },
  { id: 3, title: "ترجمة كتاب إلى الإنجليزية", desc: "ترجمة ومراجعة ونشر أحد مؤلفات المكتبة لغير الناطقين بالعربية." },
  { id: 4, title: "إنشاء مكتبة صوتية", desc: "تسجيل الكتب والمحاضرات بصوت واضح وإتاحتها للمكفوفين وذوي الاحتياجات." },
  { id: 5, title: "ترميم الكتب التالفة", desc: "تجليد وترميم الكتب القديمة والتالفة للحفاظ عليها في المكتبة." },
  { id: 6, title: "استضافة الموقع وصيانته", desc: "تغطية تكاليف الاستضافة والدومين والصيانة التقنية السنوية." }
];

const BOOKS_JSON_FILES = [["books.json", "all"]];
const FILES_BASE = "./files/";
const DEFAULT_AUTH = "shirazi-m";
let BOOKS = [], AUDIOS = [], VIDEOS = [];
const app = document.getElementById("app");

const state = { view:"table", sort:"manual", q:"", cat:"all", author:"all", series:"all", searchType:"title", limit: 40 };

const esc = s => String(s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const getCat = id => CATS.find(c=>c.id===id);
const getBook = id => BOOKS.find(b=>b.id===id);
const getAuthor = id => AUTHORS.find(a=>a.id===id);
const getSeries = id => SERIES.find(s=>s.id===id);
const getBookCats = b => (b.cats && Array.isArray(b.cats) && b.cats.length > 0) ? b.cats : (b.c ? [b.c] : ['other']);
const countIn = id => BOOKS.filter(b=>getBookCats(b).includes(id)).length;
const countByAuthor = id => BOOKS.filter(b=>b.a===id).length;
const countBySeries = id => BOOKS.filter(b=>b.series===id).length;

const authorName = (id, text) => {
  const found = AUTHORS.find(a=>a.id===id);
  if (found) return found.short || found.name;
  return text || "—";
};
const authorsWithBooks = () => AUTHORS.filter(a=>countByAuthor(a.id)>0);

function jsonToBook(item){
  const formats = item.formats || ["pdf"];
  const f = formats.map(x => x==="pdf"?"p":x==="word"?"w":"e").join("");
  const hasPdf = (formats.includes("pdf") || formats.includes("p")) && ((item.pdf_url && item.pdf_url.trim() !== "" && item.pdf_url !== "#") || (item.filename && item.filename.trim() !== ""));
  const hasWord = (formats.includes("word") || formats.includes("w")) && (item.word_url && item.word_url.trim() !== "" && item.word_url !== "#");
  if (!hasPdf && !hasWord) return null;
  const catsArray = (Array.isArray(item.categories) && item.categories.filter(c => typeof c === 'string' && c.trim()).length > 0)
    ? item.categories.filter(c => typeof c === 'string' && c.trim())
    : (item.category ? [item.category] : ['other']);
  return {
    id: item.id || ("b_" + Math.random().toString(36).substr(2, 9)),
    t: item.title||"", c: catsArray[0], cats: catsArray,
    y: parseInt(item.year)||0, pages: parseInt(item.pages)||0,
    desc: item.description||"", cover: item.cover||"",
    f, a: item.author||DEFAULT_AUTH, authorText: item.authorText || "", series: item.series||"",
    filename: item.filename || "", pdf_url: item.pdf_url || "", word_url: item.word_url || "", wordExt: item.word_ext||"docx",
    hasPdf, hasWord, reads: Math.floor(Math.random()*1800)+80
  };
}

async function loadJsonFile(path){
  try {
    const res = await fetch(path + "?t=" + Date.now());
    if (!res.ok) { alert("خطأ: لم يتم العثور على الملف " + path); return []; }
    const json = JSON.parse(await res.text());
    if (!json.items || !Array.isArray(json.items)) { alert("خطأ: الملف لا يحتوي على items"); return []; }
    return json.items.map(item => jsonToBook(item)).filter(b => b !== null);
  } catch(e) { alert("خطأ في books.json:\n" + e.message); return []; }
}

async function loadAllJsonBooks(){
  const results = await Promise.all(BOOKS_JSON_FILES.map(([f])=>loadJsonFile(f)));
  return results.flat();
}

async function loadAudios(){ try { const res = await fetch('audios.json?t=' + Date.now()); if(!res.ok) return []; const json = await res.json(); return json.items || []; } catch(e) { return []; } }
async function loadVideos(){ try { const res = await fetch('videos.json?t=' + Date.now()); if(!res.ok) return []; const json = await res.json(); return json.items || []; } catch(e) { return []; } }

let FAVORITES = { books:[], series:[] };
try { const f = JSON.parse(localStorage.getItem("alsh_favorites")||"{}"); if(Array.isArray(f.books)) FAVORITES.books = f.books; if(Array.isArray(f.series)) FAVORITES.series = f.series; } catch(e){}
const saveFavs = () => { try{ localStorage.setItem("alsh_favorites", JSON.stringify(FAVORITES)); }catch(e){} };
const isFav = (type,id) => type==="book" ? FAVORITES.books.includes(id) : FAVORITES.series.includes(id);
const countFavs = () => FAVORITES.books.length + FAVORITES.series.length;

function updateFavUI(){
  const c = countFavs();
  const top = document.getElementById("favCountTop");
  const side = document.getElementById("favCountSide");
  if(top) top.textContent = c;
  if(side) side.textContent = c;
}

function toggleFav(type,id,ev){
  if(ev){ ev.stopPropagation(); ev.preventDefault(); }
  const arr = type==="book" ? FAVORITES.books : FAVORITES.series;
  const idx = arr.indexOf(id);
  if(idx>-1) arr.splice(idx,1); else arr.push(id);
  saveFavs(); updateFavUI();
  document.querySelectorAll(`[data-fav-type="${type}"][data-fav-id="${id}"]`).forEach(btn=>{ btn.classList.toggle("active", isFav(type,id)); });
}

function favBtnHtml(type,id,extra=""){
  const active = isFav(type,id);
  return `<button class="fav-btn ${active?'active':''} ${extra}" data-fav-type="${type}" data-fav-id="${id}" onclick="toggleFav('${type}','${id}',event)" aria-label="مفضلة"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>`;
}

function clearAllFavs(){
  if(!countFavs()) return;
  if(!confirm("هل تريد حذف جميع العناصر من المفضلة؟")) return;
  FAVORITES = { books:[], series:[] }; saveFavs(); updateFavUI(); renderFavorites();
}

let SEARCH_HISTORY = [];
try { const h = JSON.parse(localStorage.getItem("alsh_search_history")||"[]"); if(Array.isArray(h)) SEARCH_HISTORY = h.slice(0,15); } catch(e){}
const saveHistory = () => { try{ localStorage.setItem("alsh_search_history", JSON.stringify(SEARCH_HISTORY.slice(0,15))); }catch(e){} };
function addToHistory(term){ term=(term||"").trim(); if(!term||term.length<2) return; SEARCH_HISTORY = [term, ...SEARCH_HISTORY.filter(t=>t!==term)].slice(0,15); saveHistory(); }
function removeFromHistory(term){ SEARCH_HISTORY = SEARCH_HISTORY.filter(t=>t!==term); saveHistory(); }
function clearHistory(){ SEARCH_HISTORY = []; saveHistory(); }

function matchBook(b,query,type){
  const s = query.toLowerCase().trim();
  if(!s) return true;
  const title = b.t.toLowerCase();
  const authShort = authorName(b.a, b.authorText).toLowerCase();
  const authFull = (getAuthor(b.a)?.name||"").toLowerCase();
  const catNames = getBookCats(b).map(id => getCat(id)?.name || "").join(" ").toLowerCase();
  if(type==="title") return title.includes(s);
  if(type==="author") return authShort.includes(s) || authFull.includes(s);
  if(type==="category") return catNames.includes(s);
  return title.includes(s) || authShort.includes(s) || authFull.includes(s) || catNames.includes(s);
}

const htmlEl = document.documentElement;
const themeBtn = document.getElementById("themeBtn");
const themeText = document.getElementById("themeText");
function setTheme(t){
  if(t==="dark"){ htmlEl.setAttribute("data-theme","dark"); themeText.textContent="نهاري"; themeBtn.lastChild.textContent=" ☀️"; }
  else { htmlEl.removeAttribute("data-theme"); themeText.textContent="ليلي"; themeBtn.lastChild.textContent=" 🌙"; }
  try{ localStorage.setItem("alsh_theme", t); }catch(e){}
}
try{ if(localStorage.getItem("alsh_theme")==="dark") setTheme("dark"); }catch(e){}
themeBtn.addEventListener("click", ()=>{ setTheme(htmlEl.getAttribute("data-theme")==="dark" ? "light" : "dark"); });

function updateDateTime(){
  const now = new Date();
  try { document.getElementById('gregDate').textContent = new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now) + " م"; } catch(e){ document.getElementById('gregDate').textContent="—"; }
  try { document.getElementById('clock').textContent = new Intl.DateTimeFormat('ar-EG',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).format(now); } catch(e){}
}
updateDateTime(); setInterval(updateDateTime, 1000);

const menuBtn = document.getElementById("menuBtn");
const sidebarClose = document.getElementById("sidebarClose");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
function openSidebar(){ document.body.classList.add("sidebar-open","no-scroll"); }
function closeSidebar(){ document.body.classList.remove("sidebar-open","no-scroll"); }
menuBtn.onclick = openSidebar; sidebarClose.onclick = closeSidebar; sidebarBackdrop.onclick = closeSidebar;
document.addEventListener("keydown", e=>{ if(e.key==="Escape"){ closeSidebar(); closeMediaPlayer(); } });

function buildSidebar(){
  const activeCats = CATS.filter(c => countIn(c.id) > 0);
  document.getElementById("sideCats").innerHTML = `
    <li><a href="#/home" onclick="closeSidebar()">الرئيسية</a></li>
    <li><a href="#/library" onclick="closeSidebar()">كل الكتب <span class="side-cnt">${BOOKS.length}</span></a></li>
    ${activeCats.map(c=>`<li><a href="#/category/${c.id}" onclick="closeSidebar()">${esc(c.name)} <span class="side-cnt">${countIn(c.id)}</span></a></li>`).join("")}
  `;
  document.getElementById("sideSeries").innerHTML = SERIES.map(s=>`<li><a href="#/series-one/${s.id}" onclick="closeSidebar()">${esc(s.name)} <span class="side-cnt">${countBySeries(s.id)}</span></a></li>`).join("");
}

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", async ()=>{
  document.getElementById("yr").textContent = new Date().getFullYear();
  const [fromJson, cats, seriesFromJson, articlesData, articleCatsData] = await Promise.all([
    loadAllJsonBooks(), loadCategories(), loadSeries(), loadArticles(), loadArticleCategories()
  ]);
  ARTICLES = articlesData; ARTICLE_CATS = articleCatsData;
  await loadMediaLists();
  await loadAuthors();
  CATS = cats;
  if (seriesFromJson && seriesFromJson.length > 0) { SERIES = seriesFromJson; }
  AUDIOS = await loadAudios(); VIDEOS = await loadVideos();
  BOOKS = fromJson;
  buildSidebar(); updateFavUI(); router();
});

function router(){
  const raw = location.hash.replace(/^#\/?/,"") || "home";
  const [route, param] = raw.split("/");
  const decodedParam = param ? decodeURIComponent(param) : param;
  window.scrollTo({top:0,behavior:"smooth"}); closeSidebar();
  if (route !== "read") state.limit = 40;
  
  const innerPages = ["book", "read", "category", "series-one", "author", "library", "latest", "favorites", "audios", "videos", "masoomeen", "printed", "contact", "about", "istifta", "useful-links", "donate", "articles", "article"];
  
  if (innerPages.includes(route)) {
      document.body.classList.add('inner-page');
  } else {
      document.body.classList.remove('inner-page');
  }

  if(route==="home") renderHome();
  else if(route==="library") renderLibrary();
  else if(route==="latest") renderLatestPage();
  else if(route==="cats") renderAllCats();
  else if(route==="series") renderAllSeries();
  else if(route==="series-one") renderSeriesPage(decodedParam);
  else if(route==="category") renderCategory(decodedParam);
  else if(route==="authors") renderAllAuthors();
  else if(route==="author") renderAuthor(decodedParam);
  else if(route==="book") renderBookPage(decodedParam);
  else if(route==="favorites") renderFavorites();
  else if(route==="read") renderReader(decodedParam);
  else if(route==="audios") renderMediaLibrary("audio", decodedParam);
  else if(route==="videos") renderMediaLibrary("video", decodedParam);
  else if(route==="masoomeen") renderMasoomeenPage();
  else if(route==="printed") renderPrintedBooks();
  else if(route==="contact") renderContact();
  else if(route==="about") renderAbout();
  else if(route==="istifta") renderIstifta();
  else if(route==="useful-links") renderUsefulLinks();
  else if(route==="donate") renderDonate();
  else if(route==="articles") renderArticles();
  else if(route==="article") renderArticlePage(decodedParam);
  else renderHome();
}

function coverHtmlSmall(b, showAuth=true){
  if(b.cover) return `<img src="${b.cover}" alt="${esc(b.t)}" onerror="this.style.display='none';" decoding="async" loading="lazy">`;
  return `<div class="cover-ph"></div>`;
}

function coverHtmlBig(b){
  if(b.cover) return `<img src="${b.cover}" class="book-cover-img" alt="${esc(b.t)}" onerror="this.style.display='none';" decoding="async" loading="lazy">`;
  return `<div class="book-cover-big"></div>`;
}

function bookCardHtml(b){
  return `<a href="#/book/${b.id}" class="book-card"><div class="cover">${coverHtmlSmall(b,false)}</div><div class="info"><div class="title">${esc(b.t)}</div><div class="auth">${esc(authorName(b.a, b.authorText))}</div></div></a>`;
}

function bookRowHtml(b){
  const catsTags = getBookCats(b).map(cid => `<span><strong>التصنيف:</strong> ${esc(getCat(cid)?.name||"")}</span>`).join("");
  return `<div class="book-row"><a href="#/book/${b.id}" class="cover">${coverHtmlSmall(b,false)}</a><div class="info"><div><a href="#/book/${b.id}" class="title">${esc(b.t)}</a><div class="meta"><span><strong>المؤلف:</strong> ${esc(authorName(b.a, b.authorText))}</span>${catsTags}${b.pages?`<span><strong>الصفحات:</strong> ${b.pages}</span>`:""}</div>${b.desc?`<div class="desc">${esc(b.desc)}</div>`:""}</div></div></div>`;
}

function authorCardHtml(a){
  const c = countByAuthor(a.id);
  const imgHtml = a.img ? `<img src="${a.img}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--line);" decoding="async" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">` : '';
  const fallbackHtml = `<div class="avatar-letter" style="width:44px;height:44px;font-size:18px;display:${a.img ? 'none' : 'grid'}">${esc(a.short.charAt(0))}</div>`;
  return `<a href="#/author/${a.id}" class="book-card" style="padding:14px;flex-direction:row;align-items:center;gap:12px"><div class="author-chip" style="margin:0;padding:0;background:none;border:none;flex-shrink:0">${imgHtml}${fallbackHtml}</div><div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:700;color:var(--ink);line-height:1.4">${esc(a.short)}</div><div style="font-size:11.5px;color:var(--muted);margin-top:3px">${c} كتاب</div></div></a>`;
}

function seriesCardHtml(s){
  const c = countBySeries(s.id);
  return `<a href="#/series-one/${s.id}" class="series-card"><div style="flex:1;min-width:0"><div class="sc-name">${esc(s.name)}</div><div class="sc-desc" style="font-size:11px; opacity:0.85; margin-top:4px; line-height:1.4;">${esc(s.desc)}</div><div class="sc-meta" style="font-size:10px; opacity:0.75; margin-top:4px;">المؤلف: ${esc(authorName(s.author))}</div></div><div class="sc-badge">${c}<small>كتاب</small></div></a>`;
}

function catCardHtml(c){
  return `<a href="#/category/${c.id}" class="cat-card"><div><div class="cc-name">${esc(c.name)}</div><div class="cc-count">${countIn(c.id)} كتاب</div></div><div class="cc-badge">${countIn(c.id)}</div></a>`;
}

function renderHome(){
  const latest = [...BOOKS].slice(0, 3);
  const lastReadId = localStorage.getItem("alsh_last_read");
  const lastReadBook = lastReadId ? getBook(lastReadId) : null;
  const activeCats = CATS.filter(c => countIn(c.id) > 0);
  app.innerHTML = `
    <section class="hero">
      <p>موسوعة إلكترونية شاملة تجمع تراث أسرة آل الشيرازي الكرام العلمي عبر أجيالها، مع تصنيف علمي يسهّل الوصول إلى مئات المؤلفات.</p>
      <div class="random-btn" onclick="goToRandomBook()">• اكتشف كتاباً عشوائياً</div>
      <div class="stats"><div class="stat"><strong>${BOOKS.length}</strong><span>كتاب</span></div><div class="stat"><strong>${SERIES.length}</strong><span>موسوعة</span></div><div class="stat"><strong>${AUTHORS.length}</strong><span>مؤلف</span></div><div class="stat"><strong>PDF · Word</strong><span>صيغ التحميل</span></div></div>
    </section>
    <div class="home-action-row">
      <a href="https://t.me/shirazi_lib" target="_blank" class="tg-banner">
        <svg viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        متابعة المكتبة على التيليجرام
      </a>
      ${lastReadBook?`<a href="#/read/${lastReadBook.id}" class="continue-reading"><div class="cr-text"><h3>متابعة القراءة</h3><p>لقد توقفت عند: ${esc(lastReadBook.t)}</p></div></a>`:""}
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
      <div class="sec-title" style="margin-bottom:0;"><span>أحدث الإصدارات</span></div>
      <a href="#/latest" style="font-size:13px; font-weight:700; color:var(--primary); text-decoration:underline;">للمزيد ←</a>
    </div>
    ${latest.length?`<div class="compact-books">${latest.map(bookCardHtml).join("")}</div>`:`<div class="empty-state">لا توجد كتب بعد.</div>`}
    ${SERIES.length?`<div class="sec-title">الموسوعات</div><div class="series-grid" style="margin-bottom:26px">${SERIES.map(seriesCardHtml).join("")}</div>`:""}
    <div class="sec-title">التصنيفات</div><div class="cat-grid" style="margin-bottom:26px">${activeCats.map(catCardHtml).join("")}</div>
  `;
}

function renderLatestPage(){
  state.limit = 40;
  const latest = [...BOOKS].slice(3);
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>أحدث الإصدارات</span></div>
  <div class="sec-title">أحدث الإصدارات</div>
  ${toolbarHtml()}
  <div id="booksBox" class="${state.view==='table'?'books-list':'books-grid'}"></div>`;
  bindToolbar();
  renderList(latest);
}

window.goToRandomBook = () => {
  if(BOOKS.length === 0) return;
  location.hash = '#/book/' + BOOKS[Math.floor(Math.random() * BOOKS.length)].id;
};

function renderLibrary(){
  state.cat="all"; state.author="all"; state.series="all"; state.limit=40;
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>كل الكتب</span></div><div class="sec-title">كل الكتب</div>${toolbarHtml()}<div id="booksBox" class="${state.view==='table'?'books-list':'books-grid'}"></div>`;
  bindToolbar();
  if(state.q){ const el = document.getElementById("q"); if(el) el.value = state.q; }
  renderList();
}

function renderCategory(id){
  const cat = getCat(id);
  if(!cat){ location.hash = "#/home"; return; }
  state.cat = id; state.author = "all"; state.series = "all"; state.q = ""; state.limit=40;
  let specialBanner = "";
  if (id === 'ahlulbayt') {
    specialBanner = `<a href="#/masoomeen" class="series-banner"><div class="sb-text"><h2>سلسلة من حياة المعصومين عليهم السلام</h2><p>مجموعة مباركة من 13 كتاباً تروي سير أهل البيت (عليهم السلام) مرتبة حسب التسلسل العقائدي.</p></div><div class="sb-icon">🕌</div></a>`;
  }
  app.innerHTML = `${specialBanner}<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>${esc(cat.name)}</span></div>${toolbarHtml()}<div id="booksBox" class="${state.view==='table'?'books-list':'books-grid'}"></div>`;
  bindToolbar(); renderList();
}

function renderMasoomeenPage(){
  const books = BOOKS.filter(b => getBookCats(b).includes('masoomeen') || getBookCats(b).includes('ahlulbayt'));
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <a href="#/category/ahlulbayt">أهل البيت (عليهم السلام)</a> <span>/</span> <span>من حياة المعصومين</span></div>
    <div class="sec-title" style="color:var(--primary-dark)">من حياة المعصومين عليهم السلام</div>
    <div style="background:var(--paper);padding:20px;border-radius:var(--radius-lg);margin-bottom:20px;border:1px solid var(--line);text-align:center;"><p style="font-size:14px;color:var(--ink-2);line-height:1.8;">هذه السلسلة المباركة تعرض سيرة أهل البيت (عليهم السلام) بالترتيب العقائدي، بدءاً من الرسول الأكرم (صلى الله عليه وآله) وحتى الإمام العسكري (عليه السلام).</p></div>
    ${books.length ? `<div class="books-grid">${books.map(bookCardHtml).join("")}</div>` : `<div class="empty-state">جاري تحميل الكتب...</div>`}
  `;
}

function renderAllCats(){
  const activeCats = CATS.filter(c => countIn(c.id) > 0);
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>التصنيفات</span></div><div class="sec-title">جميع التصنيفات</div><div class="cat-grid">${activeCats.map(catCardHtml).join("")}</div>`;
}

function renderAllAuthors(){
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>المؤلفون</span></div><div class="sec-title">المؤلفون</div><div class="books-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${authorsWithBooks().map(authorCardHtml).join("")}</div>`;
}

function renderAuthor(id){
  const a = getAuthor(id);
  if(!a){ location.hash = "#/authors"; return; }
  state.author = id; state.cat = "all"; state.series = "all"; state.q = ""; state.limit=40;
  const count = countByAuthor(id);
  const imgBig = a.img ? `<img src="${a.img}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;margin:0 auto 14px;box-shadow:0 8px 20px rgba(0,0,0,.25);border:3px solid var(--accent);" loading="lazy" decoding="async" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">` : '';
  const fallbackBig = `<div class="author-avatar-big" style="display:${a.img ? 'none' : 'grid'}">${esc(a.short.charAt(0))}</div>`;
  const longBioHtml = a.longBio ? `
    <div class="sec-title" style="margin-top: 26px;">عن المؤلف</div>
    <div class="about-box" style="margin-top: 14px;">
      ${a.longBio}
    </div>
  ` : '';
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <a href="#/authors">المؤلفون</a> <span>/</span> <span>${esc(a.short)}</span></div><div class="author-header">${imgBig}${fallbackBig}<h1>${esc(a.name)}</h1><p>${esc(a.bio)}</p><div class="author-stats"><span>عدد الكتب: ${count}</span></div></div>${longBioHtml}${count?`${toolbarHtml()}<div id="booksBox" class="${state.view==='table'?'books-list':'books-grid'}"></div>`:`<div class="empty-state">لا توجد كتب مضافة لهذا المؤلف حالياً.</div>`}`;
  if(count){ bindToolbar(); renderList(); }
}

function renderAllSeries(){
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>الموسوعات</span></div><div class="sec-title">الموسوعات</div>${SERIES.length?`<div class="series-grid">${SERIES.map(seriesCardHtml).join("")}</div>`:`<div class="empty-state">لا توجد موسوعات بعد.</div>`}`;
}

function renderSeriesPage(id){
  const s = getSeries(id);
  if(!s){ location.hash = "#/series"; return; }
  state.series = id; state.cat = "all"; state.author = "all"; state.q = ""; state.limit=40;
  const count = countBySeries(id);
  let bulkHtml = "";
  if (id === "fiqh-encyclopedia") {
    bulkHtml = `<div style="background:var(--paper-2);border:1px solid var(--line);border-radius:var(--radius-lg);padding:16px;margin-bottom:20px;display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;"><h3 style="font-family:'Amiri',serif;font-size:18px;color:var(--primary-dark);margin:0;">تحميل الموسوعة كاملة</h3><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:10px;"><a href="https://github.com/alaqeela14/alshirazi-library/releases/download/fiqh-volumes/Fiqh_Encyclopedia_PDF.zip" class="dl-btn dl-pdf" style="text-decoration:none;">تحميل الكل (PDF)</a><a href="https://github.com/alaqeela14/alshirazi-library/releases/download/fiqh-volumes/Fiqh_Encyclopedia_Word.zip" class="dl-btn dl-word" style="text-decoration:none;">تحميل الكل (Word)</a></div></div>`;
  }
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <a href="#/series">الموسوعات</a> <span>/</span> <span>${esc(s.name)}</span></div>
  ${bulkHtml}
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
    <div class="sec-title" style="margin-bottom:0;">${esc(s.name)}</div>
    <button onclick="shareSeries('${s.id}')" class="share-btn-compact" style="position:static; padding:5px 12px;">مشاركة الموسوعة</button>
  </div>
  ${toolbarHtml()}<div id="booksBox" class="${state.view==='table'?'books-list':'books-grid'}"></div>`;
  bindToolbar(); renderList();
}

function renderBookPage(id){
  const b = getBook(id);
  if(!b){ location.hash = "#/home"; return; }
  const a = getAuthor(b.a);
  let related = BOOKS.filter(x=>getBookCats(x).some(c=>getBookCats(b).includes(c)) && x.id!==b.id).slice(0,6);
  if(related.length<3){ related = [...related, ...BOOKS.filter(x=>x.a===b.a && x.id!==b.id)].slice(0,6); }
  localStorage.setItem("alsh_last_read", b.id);
  const chipImg = a && a.img ? `<img src="${a.img}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;" loading="lazy" decoding="async" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">` : '';
  const chipFallback = `<div class="avatar-letter" style="display:${a && a.img ? 'none' : 'grid'}">${esc((a?.short||"م").charAt(0))}</div>`;
  const descHtml = b.desc ? `<div class="book-desc-section"><div class="sec-title">عن الكتاب</div><div class="book-desc">${esc(b.desc)}</div></div>` : '';
  const catsLinks = getBookCats(b).map(cid => `<a href="#/category/${cid}" style="color:var(--primary);text-decoration:underline">${esc(getCat(cid)?.name||"غير مصنف")}</a>`).join(" • ");
  app.innerHTML = `
  <a href="#/home" class="back-btn" style="cursor:pointer;">← رجوع</a>
  <div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span><a href="#/category/${getBookCats(b)[0]}">${esc(getCat(getBookCats(b)[0])?.name||"تصنيف")}</a> <span>/</span><span>${esc(b.t)}</span></div>
  <div class="book-page">
    <div class="book-main">
      <div class="book-cover-wrap">${coverHtmlBig(b)}</div>
      <div class="book-info">
        <h1 class="book-title">${esc(b.t)}</h1>
        <a href="#/author/${b.a}" class="author-chip">${chipImg}${chipFallback}<span>${esc(authorName(b.a, b.authorText))}</span></a>
        <div class="book-meta-grid">
          <div class="meta-item" style="flex-wrap:wrap"><strong>التصنيفات:</strong> ${catsLinks}</div>
          ${b.pages?`<div class="meta-item"><strong>الصفحات:</strong> ${b.pages}</div>`:""}
          ${b.y?`<div class="meta-item"><strong>التاريخ:</strong> ${b.y} هـ</div>`:""}
          ${b.series&&getSeries(b.series)?`<div class="meta-item"><strong>الموسوعة:</strong> <a href="#/series-one/${b.series}" style="color:var(--primary)">${esc(getSeries(b.series).name)}</a></div>`:""}
        </div>
        <div class="download-box">
          <div class="download-header"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>تحميل الكتاب</div>
          <div class="download-body">
            ${b.hasPdf?`<button class="dl-btn dl-pdf" onclick="downloadBook('${b.id}','pdf')">PDF</button>`:""}
            ${b.hasWord?`<button class="dl-btn dl-word" onclick="downloadBook('${b.id}','word')">Word</button>`:""}
            ${b.hasPdf?`<a href="#/read/${b.id}" class="dl-btn dl-read">قراءة</a>`:""}
            <button class="dl-btn dl-share" onclick="shareBook('${b.id}')">مشاركة</button>
            ${favBtnHtml("book",b.id)}
          </div>
        </div>
      </div>
    </div>
    ${descHtml}
  </div>
  ${related.length?`<div class="sec-title">كتب مشابهة</div><div class="books-grid">${related.map(bookCardHtml).join("")}</div>`:""}`;
}

function renderPrintedBooks(){
  const locations = [
    { city: "النجف الأشرف", name: "مكتبة الإمام الحسن المجتبى عليه السلام", address: "", phone: "009647826265250" },
    { city: "كربلاء المقدسة", name: "مكتبة الإمام الحسين عليه السلام التخصصية", address: "شارع الإمام علي عليه السلام", phone: "" },
    { city: "مشهد المقدسة", name: "مدرسة الإمام الرضا عليه السلام", address: "تقاطع شهداء، شارع بهجت، فرع 7", phone: "" },
    { city: "طهران", name: "دارالعلم", address: "شارع انقلاب، شارع 12 فروردين، مجتمع ناشران، الطابق الأرضي، الرقم 16 و 18", phone: "" },
    { city: "قم المقدسة", name: "دارالعلم", address: "شارع معلم، دوار روح الله، فرع 19", phone: "" },
    { city: "قم المقدسة", name: "دارالعلم", address: "شارع معلم، مجتمع ناشران، الطابق الأرضي، الرقم 7", phone: "" }
  ];
  let html = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>الحصول على الكتب المطبوعة</span></div><div class="sec-title">الحصول على الكتب المطبوعة</div><div style="background:var(--paper);padding:20px;border-radius:var(--radius-lg);margin-bottom:24px;border:1px solid var(--line);text-align:center;"><p style="font-size:14px;color:var(--ink-2);line-height:1.8;">يمكنك الحصول على نسخ ورقية من مؤلفات أسرة آل الشيرازي من خلال الوكلاء والمكتبات المعتمدة التالية:</p></div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">`;
  locations.forEach(loc => {
    html += `<div class="print-card"><div class="print-city">📍 ${esc(loc.city)}</div><div class="print-name">${esc(loc.name)}</div>${loc.address?`<div class="print-address">🗺️ ${esc(loc.address)}</div>`:""}${loc.phone?`<a href="tel:${loc.phone}" class="print-phone">📞 ${esc(loc.phone)}</a>`:""}</div>`;
  });
  html += `</div>`;
  app.innerHTML = html;
}

function renderContact(){
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>تواصل معنا</span></div><div class="sec-title">تواصل معنا</div><div class="contact-card"><div class="contact-icon">✉️</div><h3>يسعدنا تواصلكم معنا</h3><p>إذا كان لديكم أي استفسار، أو اقتراح، أو ترغبون في إضافة كتب جديدة للمكتبة، يمكنكم التواصل معنا عبر الوسائل التالية:</p><div style="display:flex;flex-direction:column;gap:15px;align-items:center;margin-top:30px;"><div style="background:var(--paper-2);padding:15px 30px;border-radius:10px;border:1px dashed var(--line);width:100%;max-width:400px;"><strong style="color:var(--primary-dark);display:block;margin-bottom:5px;">البريد الإلكتروني:</strong><span style="color:var(--muted);">[سيتم إضافته قريباً]</span></div><div style="background:var(--paper-2);padding:15px 30px;border-radius:10px;border:1px dashed var(--line);width:100%;max-width:400px;"><strong style="color:var(--primary-dark);display:block;margin-bottom:5px;">رقم الواتساب:</strong><span style="color:var(--muted);">[سيتم إضافته قريباً]</span></div><div style="background:var(--paper-2);padding:15px 30px;border-radius:10px;border:1px dashed var(--line);width:100%;max-width:400px;"><strong style="color:var(--primary-dark);display:block;margin-bottom:5px;">قناة التيليجرام:</strong><span style="color:var(--muted);">[سيتم إضافته قريباً]</span></div></div></div>`;
}

function renderIstifta(){
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>استفتاء</span></div><div class="sec-title">إرسال استفتاء</div><div class="form-container"><form onsubmit="event.preventDefault(); alert('تم إرسال استفتائك بنجاح.'); this.reset();"><div class="form-group"><label>الاسم</label><input type="text" class="form-control" required></div><div class="form-group"><label>البريد الإلكتروني</label><input type="email" class="form-control" required></div><div class="form-group"><label>نص السؤال</label><textarea class="form-control" required></textarea></div><button type="submit" class="btn-submit">إرسال الاستفتاء</button></form></div>`;
}

function renderUsefulLinks(){
  const links = [
    { title: "موقع الإمام الشيرازي رحمه الله", desc: "الموقع الرسمي لآية الله العظمى السيد محمد الحسيني الشيرازي", url: "alshirazi.com", link: "https://alshirazi.com", img: "link-alshirazi.jpg" },
    { title: "موقع المرجع الشيرازي دام ظله", desc: "الموقع الرسمي لآية الله العظمى السيد صادق الحسيني الشيرازي", url: "arabic.shirazi.ir", link: "http://arabic.shirazi.ir", img: "link-shirazi-ir.jpg" },
    { title: "موقع التقى / السيد مرتضى الشيرازي", desc: "الموقع الرسمي لآية الله السيد مرتضى الحسيني الشيرازي", url: "m-alshirazi.com", link: "http://m-alshirazi.com/", img: "link-murtadha.jpg" },
    { title: "موقع السيد مهدي الشيرازي", desc: "الموقع الرسمي للسيد مهدي الحسيني الشيرازي", url: "mahdialshirazi.com", link: "https://mahdialshirazi.com", img: "link-mahdi.jpg" },
    { title: "مؤسسة العقيلة", desc: "مؤسسة ثقافية إسلامية", url: "al-aqila.org", link: "#", img: "link-aqila.jpg" }, 
    { title: "مكتبة آل الشيرازي / تيليجرام", desc: "القناة الرسمية للمكتبة على تيليجرام", url: "t.me/shirazi_lib", link: "https://t.me/shirazi_lib", img: "link-telegram.jpg" },
    { title: "مؤسسة الإمام الشيرازي العالمية", desc: "المؤسسة العالمية لتراث الإمام الشيرازي", url: "alshirazionline.org", link: "https://alshirazionline.org", img: "link-alshirazionline.jpg" },
    { title: "شبكة النبأ", desc: "موقع إخباري وبحثي", url: "m.annabaa.org", link: "http://m.annabaa.org", img: "link-annabaa.jpg" }
  ];
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>مواقع مفيدة</span></div><div class="sec-title">مواقع مفيدة</div><div class="links-grid">${links.map(l => `<a href="${l.link}" target="${l.link==='#'?'_self':'_blank'}" class="link-card"><img src="${l.img}" class="link-img" alt="${esc(l.title)}" onerror="this.style.display='none';"><div class="title">${esc(l.title)}</div><div class="desc">${esc(l.desc)}</div><div class="url">${esc(l.url)}</div></a>`).join("")}</div>`;
}

function renderDonate(){
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>الدعم والمساهمة</span></div><div class="sec-title"><span style="color:#000000;">♦</span> الدعم والمساهمة</div><div style="background:var(--paper);padding:20px;border-radius:var(--radius-lg);margin-bottom:24px;border:1px solid var(--line);text-align:center;"><p style="font-size:14px;color:var(--ink-2);line-height:1.8;">ساهم في نشر علوم محمد وآله (عليهم الصلاة والسلام) ↓</p></div><div class="donate-grid">${DONATION_PROJECTS.map(p => `<div class="donate-card"><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><a href="#/contact" class="btn-donate">ساهم الآن</a></div>`).join("")}</div>`;
}

function renderFavorites(){
  const favBooks = FAVORITES.books.map(getBook).filter(Boolean);
  const favSeries = FAVORITES.series.map(getSeries).filter(Boolean);
  const total = favBooks.length + favSeries.length;
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>المفضلة</span></div><div class="fav-header"><div style="flex:1;min-width:200px"><h1>المفضلة</h1><p>جميع الكتب والموسوعات التي حفظتها في مكان واحد</p><div class="fh-stats"><span class="fh-stat">الكتب: <strong>${favBooks.length}</strong></span><span class="fh-stat">الموسوعات: <strong>${favSeries.length}</strong></span><span class="fh-stat">الإجمالي: <strong>${total}</strong></span></div></div>${total?`<button class="fav-clear-btn" onclick="clearAllFavs()">حذف الكل</button>`:""}</div>${total===0?`<div class="empty-box"><div class="ef-icon">⭐</div><h3 style="font-family:'Amiri',serif;font-size:20px;color:var(--ink);margin-bottom:8px">لا توجد عناصر محفوظة بعد</h3><p>اضغط على أيقونة النجمة في صفحة أي كتاب لإضافته هنا.</p></div>`:`${favBooks.length?`<div class="sec-title">الكتب (${favBooks.length})</div><div class="books-grid">${favBooks.map(bookCardHtml).join("")}</div>`:""}${favSeries.length?`<div class="sec-title" style="margin-top:26px">الموسوعات (${favSeries.length})</div><div class="series-grid">${favSeries.map(s=>`<a href="#/series-one/${s.id}" class="series-card" style="background:var(--paper);color:var(--ink);border:1px solid var(--line);border-inline-start:4px solid var(--accent);box-shadow:var(--shadow-sm)"><div style="flex:1;min-width:0"><div style="font-family:'Amiri',serif;font-size:16px;font-weight:700;color:var(--primary-dark);margin-bottom:6px">${esc(s.name)}</div><div style="font-size:12px;color:var(--muted);line-height:1.6">${esc(s.desc)}</div></div>${favBtnHtml("series",s.id)}</a>`).join("")}</div>`:""}`}`;
}

function renderReader(id){
  const b = getBook(id);
  if(!b){ location.hash = "#/home"; return; }
  if(!b.hasPdf){ alert("هذا الكتاب غير متوفر بصيغة PDF للقراءة المباشرة."); location.hash = "#/book/" + id; return; }
  let rawUrl = "";
  if (b.pdf_url && b.pdf_url.trim() !== "" && b.pdf_url !== "#") rawUrl = b.pdf_url;
  else if (b.filename && b.filename.trim() !== "") rawUrl = b.filename;
  else rawUrl = b.id + ".pdf";
  if (!rawUrl.startsWith("http") && !rawUrl.startsWith("//")) rawUrl = FILES_BASE + rawUrl;
  // توحيد القراءة باستخدام PDF.js لجميع الكتب
  const viewerUrl = "https://mozilla.github.io/pdf.js/web/viewer.html?file=" + encodeURIComponent(rawUrl);
  app.innerHTML = `
    <div class="reader-wrap">
      <div class="reader-header">
        <a href="#/book/${b.id}" class="back-btn" style="margin:0; padding:4px 10px; font-size:11px;">← رجوع</a>
        <h1>${esc(b.t)}</h1>
        <a href="${esc(rawUrl)}" target="_blank" rel="noopener" class="reader-action">فتح الملف</a>
        <a href="${esc(rawUrl)}" download class="reader-action reader-download">تحميل PDF</a>
        <button onclick="document.getElementById('pdfFrame').classList.toggle('dark-pdf')" class="back-btn" style="margin:0; padding:4px 10px; font-size:11px; background:var(--ink); color:#fff; border-color:var(--ink);">🌙 ليلي</button>
        ${favBtnHtml("book",b.id)}
      </div>
      <iframe id="pdfFrame" src="${viewerUrl}" class="reader-iframe improved-reader-iframe" title="قارئ PDF: ${esc(b.t)}" allowfullscreen loading="lazy"></iframe>
    </div>
  `;
}
function extractYouTubeId(url){
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return m ? m[1] : null;
}

window.openMediaPlayer = function(url, title, type){
  const overlay = document.getElementById('mediaPlayerOverlay');
  const body = document.getElementById('mediaPlayerBody');
  const foot = document.getElementById('mediaPlayerFoot');
  document.getElementById('mediaPlayerTitle').textContent = title || 'تشغيل';
  if (type === 'video') {
    const vid = extractYouTubeId(url);
    if (vid) {
      body.innerHTML = `<iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    } else {
      body.innerHTML = `<div style="color:#fff;padding:20px;text-align:center">تعذر تحميل الفيديو. <a href="${url}" target="_blank" style="color:var(--accent)">فتح مباشرة</a></div>`;
    }
    foot.innerHTML = `
      <button class="media-modal-btn" onclick="shareMediaItem('${esc(url)}', '${esc(title)}')">
        <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
        مشاركة
      </button>
      <button class="media-modal-btn" onclick="window.open('${esc(url)}','_blank')">
        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        تحميل
      </button>
    `;
  } else {
    body.innerHTML = `
      <div style="background:var(--paper-2); width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;">
        <div style="font-size:50px; margin-bottom:20px; color:var(--primary);">🎧</div>
        <audio id="inlineAudioEl" controls autoplay src="${esc(url)}" style="width:100%; max-width:400px;"></audio>
      </div>`;
    foot.innerHTML = `
      <button class="media-modal-btn" onclick="window.open('${esc(url)}','_blank')">
        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        تحميل
      </button>
      <button class="media-modal-btn" onclick="shareMediaItem('${esc(url)}', '${esc(title)}')">
        <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
        مشاركة
      </button>
    `;
  }
  overlay.classList.add('open');
};

window.closeMediaPlayer = function(){
  const overlay = document.getElementById('mediaPlayerOverlay');
  const body = document.getElementById('mediaPlayerBody');
  const audio = document.getElementById('inlineAudioEl');
  if (audio) { audio.pause(); audio.src = ''; }
  body.innerHTML = '';
  overlay.classList.remove('open');
};

window.toggleMediaFullscreen = function(){
  const body = document.getElementById('mediaPlayerBody');
  if (body.requestFullscreen) body.requestFullscreen();
  else if (body.webkitRequestFullscreen) body.webkitRequestFullscreen();
};

window.shareMediaItem = async function(url, title){
  const shareData = { title: title, text: title, url: window.location.href };
  try {
    if (navigator.share) await navigator.share(shareData);
    else { await navigator.clipboard.writeText(window.location.href); alert('تم نسخ رابط الصفحة'); }
  } catch(e) {}
};

window.shareList = async function(listName){
  const shareData = { title: 'قائمة: ' + listName, text: 'تصفح قائمة "' + listName + '" على مكتبة آل الشيرازي', url: window.location.href };
  try {
    if (navigator.share) await navigator.share(shareData);
    else { await navigator.clipboard.writeText(window.location.href); alert('تم نسخ رابط القائمة'); }
  } catch(e) {}
};

let mediaFilterState = {
  q: '',
  topic: 'all',
  speaker: 'all',
  expanded: false
};

window.toggleMediaFilterPanel = function(e) {
  if(e) e.stopPropagation();
  mediaFilterState.expanded = !mediaFilterState.expanded;
  const panel = document.getElementById('smartFilterPanel');
  const btn = document.getElementById('btnFilterToggle');
  if (panel) {
    if (mediaFilterState.expanded) {
      panel.classList.add('expanded');
      if(btn) btn.classList.add('active');
    } else {
      panel.classList.remove('expanded');
      if(btn) btn.classList.remove('active');
    }
  }
};

window.updateMediaFilterState = function(key, val) {
  mediaFilterState[key] = val;
};

window.applyMediaFilters = function() {
  mediaFilterState.expanded = false;
  const panel = document.getElementById('smartFilterPanel');
  const btn = document.getElementById('btnFilterToggle');
  if (panel) panel.classList.remove('expanded');
  if (btn) btn.classList.remove('active');
  if (location.hash.startsWith('#/videos')) renderMediaLibrary('video', window.activeMediaCategory);
  else if (location.hash.startsWith('#/audios')) renderMediaLibrary('audio', window.activeMediaCategory);
};

window.resetMediaFilters = function() {
  mediaFilterState.q = '';
  mediaFilterState.topic = 'all';
  mediaFilterState.speaker = 'all';
  mediaFilterState.expanded = false;
  const input = document.getElementById('mediaSmartSearchInput');
  if(input) input.value = '';
  if (location.hash.startsWith('#/videos')) renderMediaLibrary('video', window.activeMediaCategory);
  else if (location.hash.startsWith('#/audios')) renderMediaLibrary('audio', window.activeMediaCategory);
};

window.removeMediaFilterChip = function(key) {
  mediaFilterState[key] = (key === 'q') ? '' : 'all';
  const panel = document.getElementById('smartFilterPanel');
  if (panel) {
    if (key === 'topic') {
       const sel = document.getElementById('mediaTopicSelect');
       if(sel) sel.value = 'all';
    }
    if (key === 'speaker') {
       const sel = document.getElementById('mediaSpeakerSelect');
       if(sel) sel.value = 'all';
    }
  }
  const input = document.getElementById('mediaSmartSearchInput');
  if (key === 'q' && input) input.value = '';
  if (location.hash.startsWith('#/videos')) renderMediaLibrary('video', window.activeMediaCategory);
  else if (location.hash.startsWith('#/audios')) renderMediaLibrary('audio', window.activeMediaCategory);
};

window.onMediaSmartSearchInput = function(val) {
  mediaFilterState.q = val;
  const panel = document.getElementById('smartFilterPanel');
  if (panel) {
      drawMediaResults();
  }
};

function renderMediaLibrary(type, categoryParam = null){
  const isAudio = type === "audio";
  const data = isAudio ? AUDIOS : VIDEOS;
  const typeKey = isAudio ? 'audio' : 'video';
  const pageTitle = isAudio ? "المكتبة الصوتية" : "المكتبة المرئية";
  
  // قراءة القسم من الرابط مباشرة
  window.activeMediaCategory = categoryParam ? decodeURIComponent(categoryParam) : null;

  const lists = MEDIA_LISTS[typeKey] || [];
  if (!window.activeMediaCategory) {
    app.innerHTML = `
      <div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>${pageTitle}</span></div>
      <div class="sec-title">تصفح الأقسام</div>
      <div class="books-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px;">
        ${lists.map(l => {
          const count = data.filter(a => a.topic === l.name).length;
          return `<div class="book-card" onclick="window.openMediaCategory('${esc(l.name)}')" style="padding:20px; text-align:center; cursor:pointer;">
            <div style="font-family:'Amiri',serif; font-size:18px; color:var(--primary); margin-bottom:8px;">${esc(l.name)}</div>
            <div style="font-size:12px; color:var(--muted);">${count} عنصر</div>
          </div>`;
        }).join('')}
      </div>
    `;
    return;
  }
  const categoryName = window.activeMediaCategory;
  const filtered = data.filter(a => a.topic === categoryName);
  app.innerHTML = `
    <div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <a href="#" onclick="window.openMediaCategory(null); return false;">${pageTitle}</a> <span>/</span> <span>${esc(categoryName)}</span></div>
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
      <button class="btn btn-outline" style="padding:5px 12px; font-size:12px;" onclick="window.openMediaCategory(null)">← عودة للأقسام</button>
      <button class="share-list-btn" onclick="shareList('${esc(categoryName).replace(/'/g,"\\'")}')">مشاركة القائمة</button>
    </div>
    <div id="mediaResultsBox">
       <div class="lib-table">
          <div class="lib-thead"><div>العنوان</div><div>الأستاذ</div><div>الخدمات</div></div>
          ${filtered.map(a => `
            <div class="lib-row">
              <div class="lib-title" onclick="openMediaPlayer('${esc(a.url)}', '${esc(a.title)}', '${typeKey}')">${esc(a.title)}</div>
              <div class="lib-auth">${esc(a.speaker || a.author || '—')}</div>
              <div class="lib-actions"><button class="lib-btn" onclick="openMediaPlayer('${esc(a.url)}', '${esc(a.title)}', '${typeKey}')">▶</button></div>
            </div>
          `).join('')}
       </div>
    </div>
  `;
}

// تحديث الرابط عند فتح قسم (هذا ما يحل مشكلة زر الرجوع)
window.openMediaCategory = function(catName) {
  const type = location.hash.includes('videos') ? 'videos' : 'audios';
  if (catName) {
    location.hash = `#/${type}/${encodeURIComponent(catName)}`;
  } else {
    location.hash = `#/${type}`;
  }
};

function renderAbout(){
  app.innerHTML = `<div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>عن المكتبة</span></div><div class="sec-title">عن المكتبة</div><div class="about-box"><p>هذه المكتبة الإلكترونية تهدف إلى إتاحة تراث <strong>أسرة آل الشيرازي</strong> العلمي عبر أجيالها، إلى طلبة العلم والباحثين، عبر تصنيف علمي واضح ومنظم.</p><p style="color:var(--muted)">المؤلفات المعروضة هنا (${BOOKS.length} كتاباً) قابلة للتوسيع عبر لوحة التحكم.</p></div>`;
}

function toolbarHtml(){
  const auths = authorsWithBooks();
  return `<div class="toolbar"><div class="results" id="resCount"></div><div class="tools">${auths.length>1?`<select id="authorFilter"><option value="all">كل المؤلفين</option>${auths.map(a=>`<option value="${a.id}">${esc(a.short)}</option>`).join("")}</select>`:""}
  <select id="sort">
    <option value="manual" ${state.sort==='manual'?'selected':''}>الترتيب اليدوي (حسب اللوحة)</option>
    <option value="title-asc" ${state.sort==='title-asc'?'selected':''}>أبجدي (أ – ي)</option>
    <option value="title-desc" ${state.sort==='title-desc'?'selected':''}>أبجدي (ي – أ)</option>
    <option value="year-desc" ${state.sort==='year-desc'?'selected':''}>الأحدث أولاً</option>
    <option value="year-asc" ${state.sort==='year-asc'?'selected':''}>الأقدم أولاً</option>
  </select>
  <div class="view-toggle"><button data-view="table" class="${state.view==='table'?'active':''}">قائمة</button><button data-view="grid" class="${state.view==='grid'?'active':''}">بطاقات</button></div></div></div>`;
}

function bindToolbar(){
  const sortEl = document.getElementById("sort");
  if(sortEl){ sortEl.value = state.sort; sortEl.onchange = ()=>{ state.sort = sortEl.value; state.limit = 40; renderList(); }; }
  const auEl = document.getElementById("authorFilter");
  if(auEl){ auEl.value = state.author; auEl.onchange = ()=>{ state.author = auEl.value; state.limit = 40; renderList(); }; }
  document.querySelectorAll(".view-toggle button").forEach(b=>{
    b.onclick = ()=>{
      state.view = b.dataset.view;
      document.querySelectorAll(".view-toggle button").forEach(x=>x.classList.toggle("active",x===b));
      const box = document.getElementById("booksBox");
      if(box) box.className = state.view==="table"?"books-list":"books-grid";
      renderList();
    };
  });
}

function getFiltered(){
  let list = [...BOOKS];
  if(state.cat!=="all") list = list.filter(b=>getBookCats(b).includes(state.cat));
  if(state.author!=="all") list = list.filter(b=>b.a===state.author);
  if(state.series!=="all") list = list.filter(b=>b.series===state.series);
  if(state.q) list = list.filter(b=>matchBook(b,state.q,state.searchType));
  if (state.sort === "manual") {
  } else if (state.sort === "title-asc") {
    const parseId = (id) => { const m = String(id).match(/\d+/); return m ? parseInt(m[0], 10) : 0; };
    list.sort((a,b) => { const nA = parseId(a.id); const nB = parseId(b.id); if (nA !== nB && nA !== 0 && nB !== 0) return nA - nB; return a.t.localeCompare(b.t, "ar"); });
  } else if (state.sort === "title-desc") {
    const parseId = (id) => { const m = String(id).match(/\d+/); return m ? parseInt(m[0], 10) : 0; };
    list.sort((a,b) => { const nA = parseId(a.id); const nB = parseId(b.id); if (nA !== nB && nA !== 0 && nB !== 0) return nB - nA; return b.t.localeCompare(a.t, "ar"); });
  } else if (state.sort === "year-desc") {
    list.sort((a,b)=>(b.y||0)-(a.y||0));
  } else if (state.sort === "year-asc") {
    list.sort((a,b)=>(a.y||0)-(b.y||0));
  }
  return list;
}

function renderList(passedList){
  const list = passedList || getFiltered();
  const box = document.getElementById("booksBox");
  const res = document.getElementById("resCount");
  if(!box) return;
  const total = list.length;
  const sliced = list.slice(0, state.limit);
  if(res) res.innerHTML = `عرض <strong>${sliced.length}</strong> من أصل <strong>${total}</strong> كتاب`;
  if(!sliced.length){ 
    box.className = ""; 
    box.innerHTML = `<div class="empty-state">لا توجد نتائج مطابقة.</div>`; 
    return; 
  }
  box.innerHTML = state.view==="table" ? sliced.map(bookRowHtml).join("") : sliced.map(bookCardHtml).join("");
  if (total > state.limit) {
    const moreBtnWrap = document.createElement('div');
    moreBtnWrap.style = "text-align:center; margin-top:20px; grid-column: 1 / -1; width:100%; display:flex; justify-content:center;";
    moreBtnWrap.innerHTML = `<button class="back-btn" style="padding:10px 30px; font-size:14px;" onclick="loadMoreBooks()">عرض المزيد (${total - state.limit} كتاب)</button>`;
    box.appendChild(moreBtnWrap);
  }
}

window.loadMoreBooks = () => {
  state.limit += 40;
  renderList();
};

const q = document.getElementById("q");
const sug = document.getElementById("sug");
const searchTypeSel = document.getElementById("searchType");
let timer;
if(searchTypeSel) searchTypeSel.value = state.searchType;

function isListPage(){ const h = location.hash || ""; return h==="#/library" || h.startsWith("#/category/") || h.startsWith("#/author/") || h.startsWith("#/series-one/") || h==="#/latest"; }

function getCurrentSearchContext() {
  const hash = location.hash || "#/home";
  if (hash.startsWith("#/videos")) return "videos";
  if (hash.startsWith("#/audios")) return "audios";
  return "books";
}

function showHistory(){
  if(!SEARCH_HISTORY.length){ sug.innerHTML = `<li class="sug-empty">لا يوجد سجل بحث</li>`; sug.classList.add("show"); return; }
  sug.innerHTML = `<li class="sug-head"><span>البحث السابق</span><button class="sug-clear" onclick="event.stopPropagation();clearHistory();showHistory();">مسح</button></li>${SEARCH_HISTORY.map(t=>`<li data-history="${esc(t)}"><span class="sug-term">${esc(t)}</span><button class="sug-remove" onclick="event.stopPropagation();removeFromHistory('${esc(t).replace(/'/g,"\\'")}');showHistory();">✕</button></li>`).join("")}`;
  sug.classList.add("show");
}

function showSuggestions(v){
  const context = getCurrentSearchContext();
  let results = [];
  if (context === 'videos') {
    results = VIDEOS.filter(a => (a.title||'').toLowerCase().includes(v.toLowerCase()) || (a.speaker||'').toLowerCase().includes(v.toLowerCase())).map(a => ({type: 'video', id: a.url, title: a.title, sub: a.speaker})).slice(0, 10);
  } else if (context === 'audios') {
    results = AUDIOS.filter(a => (a.title||'').toLowerCase().includes(v.toLowerCase()) || (a.speaker||'').toLowerCase().includes(v.toLowerCase())).map(a => ({type: 'audio', id: a.url, title: a.title, sub: a.speaker})).slice(0, 10);
  } else {
    const bookRes = BOOKS.filter(b => matchBook(b, v, state.searchType)).map(b => ({type: 'book', id: b.id, title: b.t, sub: authorName(b.a, b.authorText)})).slice(0, 5);
    let mediaRes = [];
    if (location.hash === '#/home' || !location.hash) {
      const vRes = VIDEOS.filter(a => (a.title||'').toLowerCase().includes(v.toLowerCase())).map(a => ({type: 'video', id: a.url, title: a.title, sub: a.speaker})).slice(0, 3);
      const aRes = AUDIOS.filter(a => (a.title||'').toLowerCase().includes(v.toLowerCase())).map(a => ({type: 'audio', id: a.url, title: a.title, sub: a.speaker})).slice(0, 3);
      mediaRes = [...vRes, ...aRes];
    }
    results = [...bookRes, ...mediaRes];
  }
  if(!results.length){ sug.innerHTML = `<li class="sug-empty">لا توجد نتائج</li>`; sug.classList.add("show"); return; }
  sug.innerHTML = results.map(r => `
    <li data-type="${r.type}" data-id="${esc(r.id)}" data-title="${esc(r.title)}">
      <span class="sug-term">${r.type==='book'?'📖':r.type==='video'?'🎬':'🎧'} ${esc(r.title)}</span>
      <span class="sug-auth">${esc(r.sub||'')}</span>
    </li>
  `).join("");
  sug.classList.add("show");
}

q.addEventListener("focus", ()=>{ if(!q.value.trim()) showHistory(); else showSuggestions(q.value.trim()); });
q.addEventListener("input", ()=>{ clearTimeout(timer); const v = q.value.trim(); if(isListPage()){ if(v){ state.q = v; state.limit=40; renderList(); } else if(state.q){ state.q = ""; renderList(); } } if(!v){ showHistory(); return; } timer = setTimeout(()=>showSuggestions(v), 150); });

sug.addEventListener("click", e=>{
  if(e.target.closest("[data-remove]") || e.target.closest(".sug-clear") || e.target.closest(".sug-remove")){ e.stopPropagation(); return; }
  const h = e.target.closest("li[data-history]"); if(h){ q.value = h.dataset.history; doSearch(h.dataset.history); return; }
  const li = e.target.closest("li[data-id]"); if(!li) return;
  const type = li.dataset.type;
  const id = li.dataset.id;
  const title = li.dataset.title;
  sug.classList.remove("show"); q.value = ""; 
  if (type === 'book') {
    state.q = ""; location.hash = "#/book/" + id;
  } else if (type === 'video') {
    openMediaPlayer(id, title, 'video');
  } else if (type === 'audio') {
    openMediaPlayer(id, title, 'audio');
  }
});

searchTypeSel.addEventListener("change", ()=>{ state.searchType = searchTypeSel.value; if(q.value.trim()) showSuggestions(q.value.trim()); });
document.getElementById("qBtn").onclick = ()=>doSearch(q.value);
q.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); doSearch(q.value); } });

function doSearch(v){
  v = (v||"").trim(); if(!v){ return; }
  addToHistory(v);
  const context = getCurrentSearchContext();
  if (context === 'videos') {
    mediaFilterState.q = v;
    renderMediaLibrary('video', window.activeMediaCategory);
    sug.classList.remove("show");
    return;
  }
  if (context === 'audios') {
    mediaFilterState.q = v;
    renderMediaLibrary('audio', window.activeMediaCategory);
    sug.classList.remove("show");
    return;
  }
  state.q = v; state.cat = "all"; state.author = "all"; state.series = "all"; state.limit = 40;
  sug.classList.remove("show"); if(isListPage()) renderList(); else location.hash = "#/library";
}

document.addEventListener("click", e=>{ if(!e.target.closest(".search-wrap")) sug.classList.remove("show"); });

async function downloadBook(id, format){
  const b = getBook(id); if(!b) return;
  let url = format === "pdf" ? (b.pdf_url || b.filename) : b.word_url;
  if (!url) { alert("رابط الملف غير متوفر."); return; }
  if (!url.startsWith("http") && !url.startsWith("//")) url = FILES_BASE + url;
  window.open(url, "_blank");
}

async function shareBook(id){
  const b = getBook(id); if(!b) return;
  const shareData = { title: b.t, text: `تصفح هذا الكتاب من مكتبة آل الشيرازي: ${b.t}`, url: window.location.href };
  try { if (navigator.share) { await navigator.share(shareData); } else { await navigator.clipboard.writeText(shareData.url); alert("تم نسخ الرابط"); } } catch(e){}
}

async function shareSeries(id){
  const s = getSeries(id); if(!s) return;
  const shareData = { title: s.name, text: `تصفح هذه الموسوعة: ${s.name}`, url: window.location.href };
  try { if (navigator.share) { await navigator.share(shareData); } else { await navigator.clipboard.writeText(shareData.url); alert("تم نسخ الرابط"); } } catch(e){}
}

/* ==========================================
   قسم بحوث ومقالات
   ========================================== */

async function loadArticles(){
  try {
    const res = await fetch('articles.json?t=' + Date.now());
    if(!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items || []);
    return items
      .filter(a => !a.status || a.status === "published")
      .map(a => {
        const year = a.publishedAt ? parseInt(String(a.publishedAt).split("-")[0]) || 0 : 0;
        const cat = a.category ? String(a.category) : "";
        return {
          id: a.id || ("art_" + Math.random().toString(36).substr(2,9)),
          type: a.type || "article",
          title: a.title || "",
          authorId: a.authorId || "",
          category: cat,
          categories: cat ? [cat] : [],
          summary: a.summary || "",
          keywords: Array.isArray(a.keywords) ? a.keywords : [],
          publishedAt: a.publishedAt || "",
          updatedAt: a.updatedAt || "",
          year, status: a.status || "published",
          featured: !!a.featured,
          views: parseInt(a.views) || 0,
          coverImage: a.coverImage || "",
          content: a.content || "",
          footnotes: Array.isArray(a.footnotes) ? a.footnotes : [],
          references: Array.isArray(a.references) ? a.references : [],
          journal: a.journal || null,
          attachments: Array.isArray(a.attachments) ? a.attachments : [],
          pdf_url: a.pdf_url || ""
        };
      });
  } catch(e){ console.error('articles.json:', e); return []; }
}

async function loadArticleCategories(){
  try {
    const res = await fetch('article-categories.json?t=' + Date.now());
    if(!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items || []);
    return list.filter(c => c && c.id && c.name).map(c => ({ id: String(c.id), name: String(c.name) }));
  } catch(e){ return []; }
}

function ensureArticleCats(){
  if (ARTICLE_CATS.length > 0) return;
  const ids = [...new Set(ARTICLES.map(a => a.category).filter(Boolean))];
  ARTICLE_CATS = ids.map(id => ({ id, name: id }));
}

function getArticleCatName(id){ const c = ARTICLE_CATS.find(x => x.id === id); return c ? c.name : id; }
function countArticlesByCat(id){ return ARTICLES.filter(a => a.category === id).length; }
function countArticlesByAuthor(aid){ return ARTICLES.filter(a => a.authorId === aid).length; }
function countArticlesByYear(y){ return ARTICLES.filter(a => a.year === parseInt(y)).length; }
function countArticlesByType(t){ return ARTICLES.filter(a => a.type === t).length; }

function articleAuthorDisplay(a){
  const found = AUTHORS.find(x => x.id === a.authorId);
  if (found) return found.short || found.name;
  return a.authorId || "غير معروف";
}
function articleAuthorFull(a){
  const found = AUTHORS.find(x => x.id === a.authorId);
  return found ? (found.name || found.short) : (a.authorId || "غير معروف");
}
function articleTypeLabel(t){
  if (t === "research") return "بحث";
  if (t === "article") return "مقال";
  return t || "—";
}
function journalLine(a){
  if (!a.journal) return "";
  const j = a.journal;
  const parts = [];
  if (j.name) parts.push(j.name);
  if (j.volume) parts.push(`المجلد ${j.volume}`);
  if (j.issue) parts.push(`العدد ${j.issue}`);
  if (j.pages) parts.push(`ص ${j.pages}`);
  return parts.join(" • ");
}

function getFilteredArticles(){
  let list = [...ARTICLES];
  if (articlesState.q){
    const s = articlesState.q.toLowerCase();
    list = list.filter(a =>
      a.title.toLowerCase().includes(s) ||
      articleAuthorDisplay(a).toLowerCase().includes(s) ||
      articleAuthorFull(a).toLowerCase().includes(s) ||
      a.summary.toLowerCase().includes(s) ||
      a.keywords.some(k => (k||"").toLowerCase().includes(s))
    );
  }
  if (articlesState.cat !== "all") list = list.filter(a => a.category === articlesState.cat);
  if (articlesState.author !== "all") list = list.filter(a => a.authorId === articlesState.author);
  if (articlesState.year !== "all") list = list.filter(a => a.year === parseInt(articlesState.year));
  if (articlesState.contentType !== "all") list = list.filter(a => a.type === articlesState.contentType);
  if (articlesState.sort === "newest"){
    list.sort((a,b) => (b.year - a.year) || (b.publishedAt > a.publishedAt ? 1 : (b.publishedAt < a.publishedAt ? -1 : 0)));
  } else if (articlesState.sort === "oldest"){
    list.sort((a,b) => (a.year - b.year) || (a.publishedAt > b.publishedAt ? 1 : -1));
  } else if (articlesState.sort === "title"){
    list.sort((a,b) => a.title.localeCompare(b.title, "ar"));
  } else if (articlesState.sort === "views"){
    list.sort((a,b) => b.views - a.views);
  }
  return list;
}

function researchCardHtml(a){
  const cats = a.categories.map(id => esc(getArticleCatName(id))).join(" • ");
  const dateStr = a.year ? `<span>📅 ${a.year}م</span>` : "";
  const favActive = isArticleFav(a.id);
  const typeBadge = `<span class="rc-badge type-${esc(a.type)}">${esc(articleTypeLabel(a.type))}</span>`;
  const featuredBadge = a.featured ? `<span class="rc-badge featured">★ مميز</span>` : "";
  const pdfBtns = a.pdf_url ? `
    <a href="${esc(a.pdf_url)}" target="_blank" rel="noopener" class="rc-btn primary">قراءة PDF</a>
    <a href="${esc(a.pdf_url)}" download class="rc-btn">تحميل PDF</a>
  ` : "";
  const publishLine = journalLine(a);
  return `
    <article class="research-card">
      <div class="rc-badges">${typeBadge}${featuredBadge}</div>
      <h3 style="cursor:pointer" onclick="location.hash='#/article/${a.id}'">${esc(a.title)}</h3>
      <div class="rc-author"><strong>${esc(articleAuthorDisplay(a))}</strong></div>
      ${publishLine ? `<div class="rc-publish">${esc(publishLine)}${a.year ? " • " + a.year + "م" : ""}</div>` : (a.year ? `<div class="rc-publish">${a.year}م</div>` : "")}
      <div class="rc-stats">
        ${a.views ? `<span>👁 ${a.views} مشاهدة</span>` : ""}
        ${dateStr}
        ${cats ? `<span>🏷 ${esc(cats)}</span>` : ""}
      </div>
      ${a.summary ? `<div class="rc-abstract">${esc(a.summary)}</div>` : ""}
      <div class="rc-actions">
        <button class="rc-btn primary" onclick="location.hash='#/article/${a.id}'">📖 قراءة البحث</button>
        ${pdfBtns}
        <button class="rc-btn ${favActive?'active':''}" data-article-fav="${esc(a.id)}" onclick="toggleArticleFav('${esc(a.id)}', event)">★ ${favActive?'محفوظ':'حفظ'}</button>
        <button class="rc-btn" onclick="shareResearchArticle('${esc(a.id)}')">🔗 مشاركة</button>
      </div>
    </article>
  `;
}

function renderArticles(){
  ensureArticleCats();
  if (!articlesState.q) articlesState.page = 1;
  const years = [...new Set(ARTICLES.map(a => a.year).filter(y => y > 0))].sort((a,b)=>b-a);
  const authors = [...new Set(ARTICLES.map(a => a.authorId).filter(Boolean))]
    .sort((x,y) => articleAuthorDisplay({authorId:x}).localeCompare(articleAuthorDisplay({authorId:y}), "ar"));
  const types = [...new Set(ARTICLES.map(a => a.type).filter(Boolean))];
  app.innerHTML = `
    <div class="articles-page-wrap">
      <div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <span>بحوث ومقالات</span></div>
      <div class="articles-search-sticky" id="artSearchSticky">
        <div class="articles-search-row">
          <svg class="icon-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" id="artSearchInput" placeholder="ابحث بالعنوان أو المؤلف أو الكلمة المفتاحية..." value="${esc(articlesState.q)}" autocomplete="off">
          <button class="btn-filter-mobile" onclick="toggleArticlesSidebar()">
            <span>الفلاتر</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          </button>
        </div>
      </div>
      <div class="articles-layout">
        <div class="articles-backdrop" id="artBackdrop" onclick="toggleArticlesSidebar()"></div>
        <aside class="articles-sidebar" id="artSidebar">
          <div class="filter-group">
            <h4>التصنيفات</h4>
            <ul class="filter-options">
              <li><button class="${articlesState.cat==='all'?'active':''}" onclick="setArticleFilter('cat','all')">الكل <span class="cnt">${ARTICLES.length}</span></button></li>
              ${ARTICLE_CATS.filter(c => countArticlesByCat(c.id) > 0).map(c =>
                `<li><button class="${articlesState.cat===c.id?'active':''}" data-val="${esc(c.id)}" onclick="setArticleFilter('cat', this.dataset.val)">${esc(c.name)} <span class="cnt">${countArticlesByCat(c.id)}</span></button></li>`
              ).join("")}
            </ul>
          </div>
          <div class="filter-group">
            <h4>المؤلفون</h4>
            <ul class="filter-options">
              <li><button class="${articlesState.author==='all'?'active':''}" onclick="setArticleFilter('author','all')">الكل</button></li>
              ${authors.map(aid =>
                `<li><button class="${articlesState.author===aid?'active':''}" data-val="${esc(aid)}" onclick="setArticleFilter('author', this.dataset.val)">${esc(articleAuthorDisplay({authorId:aid}))} <span class="cnt">${countArticlesByAuthor(aid)}</span></button></li>`
              ).join("")}
            </ul>
          </div>
          <div class="filter-group">
            <h4>السنوات</h4>
            <ul class="filter-options">
              <li><button class="${articlesState.year==='all'?'active':''}" onclick="setArticleFilter('year','all')">الكل</button></li>
              ${years.map(y =>
                `<li><button class="${articlesState.year===String(y)?'active':''}" onclick="setArticleFilter('year','${y}')">${y}م <span class="cnt">${countArticlesByYear(y)}</span></button></li>`
              ).join("")}
            </ul>
          </div>
          <div class="filter-group">
            <h4>نوع المحتوى</h4>
            <ul class="filter-options">
              <li><button class="${articlesState.contentType==='all'?'active':''}" onclick="setArticleFilter('contentType','all')">الكل</button></li>
              ${types.map(t =>
                `<li><button class="${articlesState.contentType===t?'active':''}" onclick="setArticleFilter('contentType','${t}')">${esc(articleTypeLabel(t))} <span class="cnt">${countArticlesByType(t)}</span></button></li>`
              ).join("")}
            </ul>
          </div>
          <button class="filter-clear-btn" onclick="resetArticleFilters()">إعادة تعيين الفلاتر</button>
        </aside>
        <div class="articles-main">
          <div class="articles-meta-bar">
            <span id="artResCount"></span>
            <select id="artSort" onchange="articlesState.sort=this.value; articlesState.page=1; renderArticlesResults();">
              <option value="newest" ${articlesState.sort==='newest'?'selected':''}>الأحدث أولاً</option>
              <option value="oldest" ${articlesState.sort==='oldest'?'selected':''}>الأقدم أولاً</option>
              <option value="title" ${articlesState.sort==='title'?'selected':''}>أبجدي (أ–ي)</option>
              <option value="views" ${articlesState.sort==='views'?'selected':''}>الأكثر مشاهدة</option>
            </select>
          </div>
          <div class="articles-cards" id="artCards"></div>
          <div class="articles-pagination" id="artPagination"></div>
        </div>
      </div>
    </div>
  `;
  const input = document.getElementById("artSearchInput");
  if(input){
    let t;
    input.addEventListener("input", ()=>{
      clearTimeout(t);
      t = setTimeout(()=>{
        articlesState.q = input.value.trim();
        articlesState.page = 1;
        renderArticlesResults();
      }, 250);
    });
  }
  window.removeEventListener("scroll", _artScrollHandler);
  window.addEventListener("scroll", _artScrollHandler, {passive:true});
  renderArticlesResults();
}

const _artScrollHandler = () => {
  const s = document.getElementById("artSearchSticky");
  if(s) s.classList.toggle("scrolled", window.scrollY > 30);
};

window.toggleArticlesSidebar = function(){
  const s = document.getElementById("artSidebar");
  const b = document.getElementById("artBackdrop");
  if(!s) return;
  const open = s.classList.toggle("open");
  if(b) b.classList.toggle("open", open);
};

window.setArticleFilter = function(key, val){
  articlesState[key] = val;
  articlesState.page = 1;
  renderArticles();
};

window.resetArticleFilters = function(){
  articlesState.cat = "all"; articlesState.author = "all";
  articlesState.year = "all"; articlesState.contentType = "all";
  articlesState.q = ""; articlesState.page = 1;
  renderArticles();
};

function renderArticlesResults(){
  const list = getFilteredArticles();
  const total = list.length;
  const perPage = articlesState.perPage;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if(articlesState.page > pages) articlesState.page = pages;
  const start = (articlesState.page - 1) * perPage;
  const sliced = list.slice(start, start + perPage);
  const res = document.getElementById("artResCount");
  if(res) res.innerHTML = `عرض <strong>${sliced.length}</strong> من أصل <strong>${total}</strong> بحث`;
  const box = document.getElementById("artCards");
  if(!box) return;
  box.innerHTML = sliced.length
    ? sliced.map(researchCardHtml).join("")
    : `<div class="empty-state">لا توجد بحوث مطابقة.</div>`;
  const pag = document.getElementById("artPagination");
  if(!pag) return;
  if(pages <= 1){ pag.innerHTML = ""; return; }
  let html = `<button ${articlesState.page===1?'disabled':''} onclick="goToArticlePage(${articlesState.page-1})">السابق</button>`;
  for(let i=1; i<=pages; i++){
    if(i === 1 || i === pages || Math.abs(i - articlesState.page) <= 1){
      html += `<button class="${i===articlesState.page?'active':''}" onclick="goToArticlePage(${i})">${i}</button>`;
    } else if(i === articlesState.page - 2 || i === articlesState.page + 2){
      html += `<span style="padding:0 4px;color:var(--muted)">…</span>`;
    }
  }
  html += `<button ${articlesState.page===pages?'disabled':''} onclick="goToArticlePage(${articlesState.page+1})">التالي</button>`;
  pag.innerHTML = html;
}

window.goToArticlePage = function(p){
  articlesState.page = p;
  renderArticlesResults();
  window.scrollTo({top:0, behavior:"smooth"});
};

window.toggleArticleFav = function(id, ev){
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }
  const idx = ARTICLE_FAVS.indexOf(id);
  if(idx>-1) ARTICLE_FAVS.splice(idx,1); else ARTICLE_FAVS.push(id);
  saveArticleFavs();
  document.querySelectorAll(`[data-article-fav="${id}"]`).forEach(btn => {
    const active = isArticleFav(id);
    btn.classList.toggle("active", active);
    btn.textContent = (active ? "★ محفوظ" : "★ حفظ");
    const span = btn.querySelector('span');
    if(span) span.textContent = (active ? "محفوظ" : "حفظ");
  });
};

window.shareResearchArticle = async function(id){
  const a = ARTICLES.find(x => x.id === id); if(!a) return;
  const url = location.origin + location.pathname + "#/article/" + id;
  const data = { title: a.title, text: `${a.title} — ${articleAuthorDisplay(a)}`, url };
  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(url); alert("تم نسخ الرابط"); }
  } catch(e){}
};

function renderArticlePage(id){
  const a = ARTICLES.find(x => x.id === id);
  if(!a){ location.hash = "#/articles"; return; }

  const catName = a.categories.map(cid => getArticleCatName(cid)).join(" • ");
  const j = a.journal || {};
  const journalHtml = j.name ? `
    <div class="meta-item"><strong>المجلة:</strong> ${esc(j.name)}</div>
    ${j.volume ? `<div class="meta-item"><strong>المجلد:</strong> ${esc(j.volume)}</div>` : ""}
    ${j.issue ? `<div class="meta-item"><strong>العدد:</strong> ${esc(j.issue)}</div>` : ""}
    ${j.pages ? `<div class="meta-item"><strong>الصفحات:</strong> ${esc(j.pages)}</div>` : ""}
    ${j.doi ? `<div class="meta-item"><strong>DOI:</strong> ${esc(j.doi)}</div>` : ""}
  ` : "";

  const footnotesHtml = a.footnotes.length ? `
    <div class="sec-title" style="margin-top:26px">الهوامش</div>
    <div class="article-footnotes">
      ${a.footnotes.map(f => `<p id="fn-${f.id}"><span class="fn-num">[${f.id}]</span> ${esc(f.text)}</p>`).join("")}
    </div>
  ` : "";

  const referencesHtml = a.references.length ? `
    <div class="sec-title" style="margin-top:26px">المراجع</div>
    <div class="article-references">
      ${a.references.map(r => `
        <div class="ref-item">
          <strong>${esc(r.author)}</strong>، <em>${esc(r.title)}</em>
          ${r.publisher ? `، ${esc(r.publisher)}` : ""}
          ${r.city ? `، ${esc(r.city)}` : ""}
          ${r.edition ? `، الطبعة ${esc(r.edition)}` : ""}
          ${r.volume ? `، ${esc(r.volume)}` : ""}
          ${r.year ? `، ${esc(r.year)}` : ""}.
        </div>
      `).join("")}
    </div>
  ` : "";

  const favActive = isArticleFav(a.id);
  const readTime = estimateReadingTime(a.content);
  const related = getRelatedArticles(a.id);

  app.innerHTML = `
    <div class="reading-progress" id="readingProgress"></div>
    <a href="#/articles" class="back-btn">← العودة للبحوث</a>
    <div class="breadcrumbs"><a href="#/home">الرئيسية</a> <span>/</span> <a href="#/articles">بحوث ومقالات</a> <span>/</span> <span>${esc(a.title)}</span></div>

    <div class="article-page" id="articlePage">

      <div class="article-top-bar">
        <div class="article-toolbar">
          <button class="at-btn" onclick="copyArticleText('${esc(a.id)}')" title="نسخ النص">📋 <span>نسخ</span></button>
          <button class="at-btn" onclick="shareResearchArticle('${esc(a.id)}')" title="مشاركة">🔗 <span>مشاركة</span></button>
          <button class="at-btn" onclick="printArticle()" title="طباعة">🖨️ <span>طباعة</span></button>
          <button class="at-btn" onclick="downloadArticlePDF('${esc(a.id)}')" title="تحميل PDF">⬇ <span>PDF</span></button>
          <button class="at-btn ${favActive?'active':''}" data-article-fav="${esc(a.id)}" onclick="toggleArticleFav('${esc(a.id)}', event)" title="حفظ">★ <span>${favActive?'محفوظ':'حفظ'}</span></button>
        </div>
        <div class="article-font-controls">
          <button class="at-btn" onclick="changeArticleFontSize(-1)" title="تصغير الخط">A−</button>
          <button class="at-btn" onclick="changeArticleFontSize(1)" title="تكبير الخط">A+</button>
        </div>
      </div>

      <div class="rc-badges" style="margin-bottom:10px">
        <span class="rc-badge type-${esc(a.type)}">${esc(articleTypeLabel(a.type))}</span>
        ${a.featured ? `<span class="rc-badge featured">★ مميز</span>` : ""}
      </div>
      <h1 class="article-title">${esc(a.title)}</h1>

      <div class="article-author-line">
        <a href="#/author/${a.authorId}" class="author-chip">
          <div class="avatar-letter">${esc(articleAuthorDisplay(a).charAt(0))}</div>
          <span>${esc(articleAuthorDisplay(a))}</span>
        </a>
        ${catName ? `<span class="article-cat-tag">📁 ${esc(catName)}</span>` : ""}
      </div>

      <div class="book-meta-grid">
        ${a.year ? `<div class="meta-item"><strong>السنة:</strong> ${a.year}م</div>` : ""}
        ${a.views ? `<div class="meta-item"><strong>المشاهدات:</strong> ${a.views}</div>` : ""}
        <div class="meta-item"><strong>وقت القراءة:</strong> ~${readTime} دقيقة</div>
        ${journalHtml}
      </div>

      ${a.summary ? `<div class="article-summary"><strong>الملخص:</strong> ${esc(a.summary)}</div>` : ""}

      ${a.keywords.length ? `<div class="article-keywords"><strong>الكلمات المفتاحية:</strong> ${a.keywords.map(k => `<span class="kw-chip">${esc(k)}</span>`).join(" ")}</div>` : ""}

      <div class="article-body" id="articleBody">${a.content || "<p>لم يُضف محتوى نصي بعد.</p>"}</div>

      ${footnotesHtml}
      ${referencesHtml}

      <div class="article-bottom-actions">
        <button class="at-btn" onclick="copyArticleText('${esc(a.id)}')">📋 نسخ النص</button>
        <button class="at-btn" onclick="shareResearchArticle('${esc(a.id)}')">🔗 مشاركة</button>
        <button class="at-btn" onclick="printArticle()">🖨️ طباعة</button>
        <button class="at-btn" onclick="downloadArticlePDF('${esc(a.id)}')">⬇ تحميل PDF</button>
      </div>
    </div>

    ${related.length ? `<div class="sec-title" style="margin-top:26px">بحوث ذات صلة</div><div class="articles-cards">${related.map(researchCardHtml).join("")}</div>` : ""}

    <button class="back-to-top" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="العودة للأعلى">↑</button>
  `;

  try {
    const savedSize = localStorage.getItem('alsh_article_font');
    const body = document.getElementById('articleBody');
    if (savedSize && body) body.style.fontSize = savedSize + 'px';
  } catch(e){}

  setTimeout(enhanceArticleBody, 50);
  setTimeout(updateReadingProgress, 100);
}

function estimateReadingTime(content){
  const temp = document.createElement('div');
  temp.innerHTML = content || '';
  const words = temp.textContent.split(/\s+/).filter(w => w.length > 0).length;
  return Math.max(1, Math.ceil(words / 200));
}

function getRelatedArticles(currentId){
  const current = ARTICLES.find(x => x.id === currentId);
  if(!current) return [];
  return ARTICLES
    .filter(x => x.id !== currentId)
    .map(x => {
      let score = 0;
      if (x.category === current.category) score += 3;
      x.keywords.forEach(k => { if (current.keywords.includes(k)) score += 1; });
      return { art: x, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.art);
}

function enhanceArticleBody(){
  const body = document.getElementById('articleBody');
  if(!body) return;
  const headings = body.querySelectorAll('h2, h3');
  if(headings.length < 3) return;
  const toc = document.createElement('div');
  toc.className = 'article-toc';
  let html = '<h4>محتويات البحث</h4><ol>';
  headings.forEach((h, i) => {
    const id = 'toc-' + i;
    h.id = id;
    const level = h.tagName === 'H2' ? 'lvl-2' : 'lvl-3';
    html += `<li class="${level}"><a href="#${id}">${h.textContent}</a></li>`;
  });
  html += '</ol>';
  toc.innerHTML = html;
  body.parentNode.insertBefore(toc, body);
  toc.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const target = document.getElementById(e.target.getAttribute('href').slice(1));
      if (target) target.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  });
}

function updateReadingProgress(){
  const bar = document.getElementById('readingProgress');
  if(!bar) return;
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  bar.style.width = progress + '%';
}

window.addEventListener('scroll', updateReadingProgress, {passive: true});

window.copyArticleText = function(id){
  const a = ARTICLES.find(x => x.id === id);
  if(!a) return;
  const temp = document.createElement('div');
  temp.innerHTML = a.content || '';
  const text = `${a.title}\n\n${articleAuthorDisplay(a)}\n\n${temp.textContent}`;
  navigator.clipboard.writeText(text)
    .then(() => alert('✅ تم نسخ نص البحث كاملاً'))
    .catch(() => alert('تعذر النسخ، جرّب تحديد النص يدوياً.'));
};

window.printArticle = function(){
  window.print();
};

window.downloadArticlePDF = function(id){
  const a = ARTICLES.find(x => x.id === id);
  if(!a) return;
  if(a.pdf_url){
    window.open(a.pdf_url, '_blank');
  } else {
    alert('لا يوجد ملف PDF مرفق.\nسيتم فتح نافذة الطباعة — اختر "حفظ كـ PDF".');
    setTimeout(() => window.print(), 300);
  }
};

window.changeArticleFontSize = function(delta){
  const body = document.getElementById('articleBody');
  if(!body) return;
  const current = parseFloat(getComputedStyle(body).fontSize);
  const next = Math.max(12, Math.min(24, current + delta));
  body.style.fontSize = next + 'px';
  try { localStorage.setItem('alsh_article_font', next); } catch(e){}
};
