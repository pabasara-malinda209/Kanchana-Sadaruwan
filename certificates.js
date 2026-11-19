/* Certificate issuing and learner/guardian viewing. Printing can be saved as PDF by the user. */
(() => {
 const $=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const cfg=window.APP_CONFIG||{},ok=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("YOUR-PROJECT")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("YOUR_");
 const db=ok&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
 async function session(){const {data}=await db.auth.getSession();return data.session}
 function show(title,html){$("#pageTitle").textContent=title;$("#dashboardContent").innerHTML='<div class="panel"><h3>'+esc(title)+'</h3>'+html+'</div>'}
 function printCertificate(student,type,date,target){
  const w=target||window.open("","_blank");if(!w){alert("Please allow pop-ups to print the certificate.");return}
  w.document.write('<!doctype html><html><head><title>Certificate</title><style>body{font-family:Georgia,serif;background:#f5f2e9;padding:50px}.cert{border:12px double #18356f;background:white;min-height:520px;text-align:center;padding:60px 35px;display:flex;flex-direction:column;justify-content:center}.kicker{letter-spacing:5px;color:#9a7935}.name{font-size:42px;color:#18356f;margin:35px}.type{font-size:25px}.date{margin-top:55px} @media print{body{padding:0;background:white}.cert{min-height:90vh}}</style></head><body><main class="cert"><div class="kicker">KANCHANA SADARUWAN EDUCATION</div><h1>CERTIFICATE</h1><p>This certificate is proudly presented to</p><div class="name">'+esc(student)+'</div><div class="type">'+esc(type)+'</div><p>For dedication, participation and achievement.</p><div class="date">Issued on '+esc(date)+'</div></main><script>window.onload=()=>window.print()</script></body></html>');
  w.document.close();
 }
 async function teacherPage(){
  show("Issue Certificate","<p>Loading students…</p>");
  const {data,error}=await db.from("students").select("id,full_name,grade").order("full_name");
  if(error){show("Issue Certificate","<p>"+esc(error.message)+"</p>");return}
  show("Issue Certificate",'<form id="certificateForm" class="suite-form"><label>Student<select name="student_id" required><option value="">Choose student</option>'+(data||[]).map(s=>'<option value="'+esc(s.id)+'">'+esc(s.full_name)+' — Grade '+esc(s.grade)+'</option>').join("")+'</select></label><label>Certificate title<input name="certificate_type" required placeholder="Course Completion"></label><label>Issue date<input name="issued_on" type="date" value="'+new Date().toISOString().slice(0,10)+'" required></label><button class="btn primary">Issue & Print</button></form>');
  $("#certificateForm").onsubmit=async e=>{e.preventDefault();const win=window.open("","_blank");if(!win){alert("Please allow pop-ups to print the certificate.");return}const v=Object.fromEntries(new FormData(e.target));const student=(data||[]).find(s=>s.id===v.student_id);const {error}=await db.from("certificates").insert(v);if(error){win.close();alert(error.message);return}printCertificate(student?.full_name,v.certificate_type,v.issued_on,win)};
 }
 async function learnerPage(role){
  const ses=await session();let ids=[];
  if(role==="parent"){const {data,error}=await db.from("guardian_students").select("student_id").eq("guardian_user_id",ses.user.id);if(error){show("My Certificates","<p>"+esc(error.message)+"</p>");return}ids=(data||[]).map(x=>x.student_id)}
  else {const {data,error}=await db.from("students").select("id").eq("auth_user_id",ses.user.id).maybeSingle();if(error||!data){show("My Certificates","<p>Student profile is not linked.</p>");return}ids=[data.id]}
  if(!ids.length){show("My Certificates","<p>No linked students found.</p>");return}
  const {data,error}=await db.from("certificates").select("certificate_type,issued_on,student_id").in("student_id",ids).order("issued_on",{ascending:false});
  if(error){show("My Certificates","<p>"+esc(error.message)+"</p>");return}
  const {data:students}=await db.from("students").select("id,full_name").in("id",ids);
  const names=Object.fromEntries((students||[]).map(s=>[s.id,s.full_name]));
  show("My Certificates",(data||[]).map(x=>'<article class="certificate-row"><b>'+esc(x.certificate_type)+'</b><p>'+esc(names[x.student_id]||"Student")+' · '+esc(x.issued_on)+'</p><button class="btn light" data-print-name="'+esc(names[x.student_id]||"Student")+'" data-print-type="'+esc(x.certificate_type)+'" data-print-date="'+esc(x.issued_on)+'">Print / Save PDF</button></article>').join("")||"<p>No certificates have been issued yet.</p>");
  document.querySelectorAll("[data-print-name]").forEach(b=>b.onclick=()=>printCertificate(b.dataset.printName,b.dataset.printType,b.dataset.printDate));
 }
 function init(){
  const nav=$("#sideNav"),portal=$("#portal");if(!nav||!portal)return;
  const add=()=>{if(portal.hidden)return;const role=nav.dataset.suiteRole||"student";const id=role==="teacher"||role==="admin"?"issue-certificate":"my-certificates";if(nav.querySelector('[data-cert-page]'))return;const b=document.createElement("button");b.type="button";b.dataset.certPage=id;b.textContent=id==="issue-certificate"?"Issue Certificates":"My Certificates";nav.append(b)};
  new MutationObserver(add).observe(nav,{childList:true,attributes:true});new MutationObserver(add).observe(portal,{attributes:true,attributeFilter:["hidden"]});add();
  nav.addEventListener("click",e=>{const b=e.target.closest("[data-cert-page]");if(!b)return;if(!db){show("Backend setup required","<p>Configure Supabase first.</p>");return}const role=nav.dataset.suiteRole||"student";if(b.dataset.certPage==="issue-certificate")teacherPage();else learnerPage(role)});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
