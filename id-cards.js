/* Printable student ID cards for teachers, students and linked parents. */
(() => {
 const $=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const cfg=window.APP_CONFIG||{},ok=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("YOUR-PROJECT")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("YOUR_");
 const db=ok&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
 function printCard(s){
  const w=window.open("","_blank");if(!w){alert("Allow pop-ups to print the ID card.");return}
  w.document.write('<!doctype html><html><head><title>Student ID</title><style>body{font-family:Arial;padding:30px;background:#eee}.card{width:340px;height:210px;border-radius:18px;background:#102a70;color:white;padding:22px;box-sizing:border-box;position:relative;overflow:hidden}.brand{font-size:12px;letter-spacing:2px;color:#e5c87c}.name{font-size:24px;font-weight:bold;margin-top:28px}.meta{margin-top:12px;line-height:1.8}.no{position:absolute;right:18px;bottom:16px;color:#e5c87c;font-size:12px}@media print{body{background:white;padding:0}}</style></head><body><div class="card"><div class="brand">KANCHANA SADARUWAN EDUCATION</div><div class="name">'+esc(s.full_name)+'</div><div class="meta">Student ID: '+esc(s.registration_no||s.id)+'<br>Grade: '+esc(s.grade)+' · '+esc(s.medium||"")+'</div><div class="no">STUDENT</div></div><script>window.onload=()=>window.print()</script></body></html>');w.document.close();
 }
 function show(title,html){$("#pageTitle").textContent=title;$("#dashboardContent").innerHTML='<div class="panel"><h3>'+esc(title)+'</h3>'+html+'</div>'}
 async function render(role){
  const {data:ses}=await db.auth.getSession();let query=db.from("students").select("id,registration_no,full_name,grade,medium");
  if(role==="student")query=query.eq("auth_user_id",ses.session.user.id);
  if(role==="parent"){
   const {data:links,error}=await db.from("guardian_students").select("student_id").eq("guardian_user_id",ses.session.user.id);
   if(error){show("Student ID Cards","<p>"+esc(error.message)+"</p>");return}
   const ids=(links||[]).map(x=>x.student_id);if(!ids.length){show("Student ID Cards","<p>No linked children.</p>");return}query=query.in("id",ids);
  }
  const {data,error}=await query.order("full_name");
  if(error){show("Student ID Cards","<p>"+esc(error.message)+"</p>");return}
  if(role==="teacher"||role==="admin"){
   show("Student ID Cards",'<label>Choose student<select id="idStudent"><option value="">Select</option>'+(data||[]).map(s=>'<option value="'+esc(s.id)+'">'+esc(s.full_name)+' — '+esc(s.registration_no||"")+'</option>').join("")+'</select></label><button class="btn primary" id="printId">Print ID card</button>');
   $("#printId").onclick=()=>{const s=data.find(x=>x.id===$("#idStudent").value);if(s)printCard(s)};
  }else show("Student ID Cards",(data||[]).map(s=>'<p><b>'+esc(s.full_name)+'</b> · Grade '+esc(s.grade)+' <button class="btn light" data-idcard="'+esc(s.id)+'">Print ID</button></p>').join("")||"<p>No student record found.</p>");
  document.querySelectorAll("[data-idcard]").forEach(b=>b.onclick=()=>{const s=data.find(x=>x.id===b.dataset.idcard);if(s)printCard(s)});
 }
 function init(){
  const nav=$("#sideNav"),portal=$("#portal");if(!nav||!portal)return;
  const add=()=>{if(portal.hidden||nav.querySelector("[data-id-card]"))return;const role=nav.dataset.suiteRole||"student";const b=document.createElement("button");b.type="button";b.dataset.idCard="1";b.textContent="Student ID Cards";nav.append(b)};
  new MutationObserver(add).observe(nav,{childList:true,attributes:true});new MutationObserver(add).observe(portal,{attributes:true,attributeFilter:["hidden"]});add();
  nav.addEventListener("click",e=>{if(e.target.closest("[data-id-card]")){if(!db){show("Student ID Cards","<p>Configure Supabase first.</p>");return}render(nav.dataset.suiteRole||"student")}});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
