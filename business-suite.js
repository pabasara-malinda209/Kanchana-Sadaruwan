/* Commercial tuition platform extensions. Requires Supabase migration 002_commercial_suite.sql. */
(() => {
  const cfg=window.APP_CONFIG||{};
  const ready=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("YOUR-PROJECT")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("YOUR_");
  const db=ready&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
  const $=s=>document.querySelector(s);
  const modules=[
    ["crm","CRM & Leads","leads",["name","phone","email","source","interest","stage","follow_up_on"],"Lead tracking, enquiries and follow-ups"],
    ["batches","Batches & Classes","batches",["batch_name","grade","subject","medium","capacity","venue","fee"],"Batch capacity, fees and class groups"],
    ["sessions","Class Sessions","class_sessions",["batch_id","session_date","start_time","end_time","topic","meeting_url"],"Physical and online class sessions"],
    ["staff","Teachers & Staff","staff",["full_name","role_title","email","phone","monthly_salary"],"Staff directory and salary records"],
    ["expenses","Expenses","expenses",["category","description","amount","spent_on","payment_method"],"Operating costs and profit tracking"],
    ["assignments","Homework & Assignments","assignments",["title","description","grade","subject","due_on","attachment_url","published"],"Publish homework and collect work"],
    ["submissions","Assignment Submissions","submissions",["assignment_id","student_id","submission_url","marks","feedback","status"],"Review and mark student submissions"],
    ["quizzes","Online Quizzes","quizzes",["title","grade","subject","opens_at","closes_at","total_marks","published"],"Create online assessments and quizzes"],
    ["online","Live & Recorded Lessons","online_sessions",["title","session_type","grade","subject","starts_at","meeting_url","recording_url"],"Online class links and recordings"],
    ["messages","Messages","messages",["recipient_user_id","subject","body","channel","sent_at"],"Parent and student communications"],
    ["events","Events & Calendar","events",["title","description","event_date","event_type","venue","published"],"Workshops, seminars and special classes"],
    ["reviews","Testimonials","testimonials",["student_name","grade","quote","rating","published"],"Manage public student reviews"],
    ["campaigns","Marketing Campaigns","campaigns",["name","channel","start_on","end_on","budget","status"],"Promotions and campaign tracking"],
    ["coupons","Discount Coupons","coupons",["code","discount_type","discount_value","valid_until","active"],"Offers, scholarships and discounts"],
    ["referrals","Referrals","referrals",["referrer_student_id","referred_name","referred_phone","status","reward"],"Student referral tracking"],
    ["certificates","Certificates","certificates",["student_id","certificate_type","issued_on","certificate_url"],"Issue and track certificates"],
    ["guardians","Parent Links","guardian_students",["guardian_user_id","student_id","relationship"],"Connect parent accounts to children"],
    ["settings","Website Settings","website_settings",["setting_key","setting_value","public"],"Editable website content and settings"],
    ["invoices","Student Invoices","invoices",["student_id","invoice_number","description","amount","due_on","status"],"Create fee invoices and track unpaid balances"],
    ["questions","Quiz Questions","quiz_questions",["quiz_id","question","question_type","options","answer_key","marks"],"Add questions and answer keys for published quizzes"]
  ];
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const label=s=>s.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
  const numericFields=new Set(["amount","fee","capacity","grade","marks","rating","budget","discount_value","total_marks","monthly_salary","reward"]);
  const booleanFields=new Set(["published","active","public"]);
  function field(k){
    const l=esc(label(k));
    if(booleanFields.has(k))return '<label class="suite-check"><input type="hidden" name="'+esc(k)+'" value="false"><input type="checkbox" name="'+esc(k)+'" value="true"> '+l+'</label>';
    const type=k.endsWith("_on")||k.endsWith("_date")?"date":k.endsWith("_at")?"datetime-local":k.endsWith("_time")?"time":k.includes("url")?"url":numericFields.has(k)?"number":"text";
    return '<label>'+l+'<input name="'+esc(k)+'" type="'+type+'" '+(numericFields.has(k)?'step="any" min="0"':'')+'></label>';
  }
  function inject(){
    const nav=$("#sideNav"); if(!nav||!$("#portal")||$("#portal").hidden||!nav.dataset.suiteReady||!["teacher","admin"].includes(nav.dataset.suiteRole))return;
    if(nav.querySelector('[data-suite-menu]'))return;
    const head=document.createElement("div");head.className="suite-nav-heading";head.textContent="BUSINESS SUITE";head.dataset.suiteMenu="1";nav.append(head);
    modules.forEach(m=>{const b=document.createElement("button");b.type="button";b.textContent=m[1];b.dataset.suiteModule=m[0];nav.append(b)});
    const old=$("#pageTitle"); if(old)old.insertAdjacentHTML("afterend",'<span class="suite-live">COMMERCIAL EDITION</span>');
  }
  async function render(id){
    const m=modules.find(x=>x[0]===id),root=$("#dashboardContent");if(!m||!root)return;
    document.querySelectorAll("[data-page],[data-suite-module]").forEach(x=>x.classList.toggle("active",x.dataset.suiteModule===id));
    $("#pageTitle").textContent=m[1];
    if(!db){root.innerHTML='<div class="panel"><h3>'+esc(m[1])+'</h3><p>මෙම module එක සක්‍රීය කිරීමට Supabase credentials සහ 002_commercial_suite.sql migration එක අවශ්‍යයි.</p></div>';return}
    root.innerHTML='<div class="panel"><div class="suite-panel-head"><div><h3>'+esc(m[1])+'</h3><p>'+esc(m[4])+'</p></div><div><button class="btn light" id="suiteRefresh">Refresh</button> <button class="btn light" id="suiteExport">Export CSV</button></div></div><form id="suiteAdd" class="suite-form">'+m[3].map(field).join("")+'<button class="btn primary">Save Record</button></form><div class="suite-table-wrap"><table><thead><tr>'+m[3].map(k=>'<th>'+esc(label(k))+'</th>').join("")+'<th>Action</th></tr></thead><tbody id="suiteRows"><tr><td colspan="'+(m[3].length+1)+'">Loading…</td></tr></tbody></table></div></div>';
    const load=async()=>{const {data,error}=await db.from(m[2]).select("*").order("created_at",{ascending:false}).limit(200);const body=$("#suiteRows");if(error){body.innerHTML='<tr><td colspan="'+(m[3].length+1)+'">'+esc(error.message)+'</td></tr>';return}body.innerHTML=(data||[]).map(r=>'<tr>'+m[3].map(k=>'<td>'+esc(typeof r[k]==="object"?JSON.stringify(r[k]):r[k])+'</td>').join("")+'<td><button class="suite-edit" data-id="'+esc(r.id)+'">Edit</button> <button class="suite-delete" data-id="'+esc(r.id)+'">Delete</button></td></tr>').join("")||'<tr><td colspan="'+(m[3].length+1)+'">No records yet.</td></tr>';
    body.querySelectorAll(".suite-edit").forEach(b=>b.onclick=()=>{
      const row=(data||[]).find(x=>x.id===b.dataset.id),form=$("#suiteAdd");if(!row||!form)return;
      m[3].forEach(k=>{const check=form.querySelector('input[type="checkbox"][name="'+k+'"]');if(check)check.checked=Boolean(row[k]);else{const el=form.elements.namedItem(k);if(el)el.value=row[k]&&typeof row[k]==="object"?JSON.stringify(row[k]):row[k]??""}});
      form.dataset.editId=row.id;form.querySelector(".btn.primary").textContent="Update Record";form.scrollIntoView({behavior:"smooth"});
    });body.querySelectorAll(".suite-delete").forEach(b=>b.onclick=async()=>{if(confirm("Delete this record?")){const {error}=await db.from(m[2]).delete().eq("id",b.dataset.id);if(error)alert(error.message);else load()}})};
    $("#suiteExport").onclick=async()=>{
      const {data,error}=await db.from(m[2]).select("*").order("created_at",{ascending:false}).limit(5000);
      if(error){alert(error.message);return}
      const columns=m[3],cell=v=>{const raw=String(v??"");const safe=/^[\s]*[=+@-]/.test(raw)?"'"+raw:raw;return '"'+safe.replace(/"/g,'""')+'"'};
      const csv=[columns.join(","),...(data||[]).map(row=>columns.map(k=>cell(row[k])).join(","))].join("\\r\\n");
      const url=URL.createObjectURL(new Blob(["\\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
      const a=document.createElement("a");a.href=url;a.download=m[0]+"-export.csv";a.click();URL.revokeObjectURL(url);
    };
    $("#suiteRefresh").onclick=load;
    $("#suiteAdd").onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));for(const k of Object.keys(v)){if(v[k]==="")delete v[k];else if(numericFields.has(k))v[k]=Number(v[k]);else if(booleanFields.has(k))v[k]=v[k]==="true";else if(k==="options"||k==="setting_value"){try{v[k]=JSON.parse(v[k])}catch{alert(label(k)+" must be valid JSON.");return}}}const editing=e.target.dataset.editId;const result=editing?await db.from(m[2]).update(v).eq("id",editing):await db.from(m[2]).insert(v);if(result.error)alert(result.error.message);else{delete e.target.dataset.editId;e.target.reset();e.target.querySelector(".btn.primary").textContent="Save Record";load()}};load();
  }
  function init(){
    const nav=$("#sideNav");if(nav){nav.dataset.suiteReady="1";const obs=new MutationObserver(()=>inject());obs.observe(nav,{childList:true});inject()}
    const portal=$("#portal");if(portal)new MutationObserver(()=>{if(!portal.hidden)inject()}).observe(portal,{attributes:true,attributeFilter:["hidden"]});
    document.addEventListener("click",e=>{const b=e.target.closest("[data-suite-module]");if(b)render(b.dataset.suiteModule)});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();