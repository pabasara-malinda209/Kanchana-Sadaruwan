/* Assignment submission and marking workflows. */
(() => {
 const $=s=>document.querySelector(s);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const cfg=window.APP_CONFIG||{},ready=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("YOUR-PROJECT")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("YOUR_");
 const db=ready&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
 const session=async()=>{if(!db)return null;const {data}=await db.auth.getSession();return data.session};
 function show(title,html){$("#pageTitle").textContent=title;$("#dashboardContent").innerHTML='<div class="panel"><h3>'+esc(title)+'</h3>'+html+'</div>'}
 function addLinks(){
  const nav=$("#sideNav"),portal=$("#portal");if(!nav||!portal||portal.hidden)return;
  const role=nav.dataset.suiteRole||"student";
  const links=["teacher","admin"].includes(role)?[["review-homework","Review Homework"]]:role==="parent"?[["child-homework","Children's Homework"]]:[["my-homework","Homework"]];
  links.forEach(([id,label])=>{if(nav.querySelector('[data-homework-page="'+id+'"]'))return;const b=document.createElement("button");b.type="button";b.dataset.homeworkPage=id;b.textContent=label;nav.append(b)});
 }
 async function studentHomework(){
  show("Homework & Assignments","<p>Loading published assignments…</p>");
  const ses=await session();if(!ses){show("Sign in required","<p>Please sign in again.</p>");return}
  const {data:student,error:se}=await db.from("students").select("id").eq("auth_user_id",ses.user.id).maybeSingle();
  if(se||!student){show("Homework & Assignments","<p>Your student profile is not linked. Please contact the teacher.</p>");return}
  const {data,error}=await db.from("assignments").select("*").eq("published",true).order("due_on",{ascending:true});
  if(error){show("Homework & Assignments","<p>"+esc(error.message)+"</p>");return}
  const html=(data||[]).map(a=>'<article class="assignment-card"><b>'+esc(a.title)+'</b><p>'+esc(a.description||"")+'</p><small>Due: '+esc(a.due_on||"Not set")+'</small><form class="homework-upload" data-assignment="'+esc(a.id)+'"><label>Upload work (PDF, Word, image or video)<input type="file" name="work" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4" required></label><button class="btn primary">Submit work</button></form></article>').join("")||"<p>No homework published.</p>";
  show("Homework & Assignments",html);
  document.querySelectorAll(".homework-upload").forEach(form=>form.onsubmit=async e=>{
   e.preventDefault();const file=new FormData(form).get("work");if(!file||!file.size)return;
   const path=student.id+"/assignments/"+form.dataset.assignment+"/"+Date.now()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
   const {error:up}=await db.storage.from("student-private").upload(path,file,{upsert:false});
   if(up){alert(up.message);return}
   const {error:ins}=await db.from("submissions").insert({assignment_id:form.dataset.assignment,student_id:student.id,submission_url:path,status:"submitted"});
   if(ins){alert(ins.message);return}
   form.innerHTML="<p class='message'>Work submitted successfully.</p>";
  });
 }
 async function parentHomework(){
  show("Children's Homework","<p>Loading submissions…</p>");
  const ses=await session();const {data:links,error}=await db.from("guardian_students").select("student_id").eq("guardian_user_id",ses.user.id);
  if(error){show("Children's Homework","<p>"+esc(error.message)+"</p>");return}
  const ids=(links||[]).map(x=>x.student_id);if(!ids.length){show("Children's Homework","<p>No children are linked to this account.</p>");return}
  const {data,error:err}=await db.from("submissions").select("assignment_id,status,marks,feedback,created_at").in("student_id",ids).order("created_at",{ascending:false});
  show("Children's Homework",err?"<p>"+esc(err.message)+"</p>":(data||[]).map(x=>'<p>Assignment '+esc(x.assignment_id)+' · '+esc(x.status)+' · Marks: '+esc(x.marks??"Pending")+'<br>'+esc(x.feedback||"")+'</p>').join("")||"<p>No submissions yet.</p>");
 }
 async function reviewHomework(){
  show("Review Homework","<p>Loading submissions…</p>");
  const {data,error}=await db.from("submissions").select("id,assignment_id,student_id,submission_url,marks,feedback,status,created_at,students(full_name)").order("created_at",{ascending:false}).limit(100);
  if(error){show("Review Homework","<p>"+esc(error.message)+"</p>");return}
  const html=(data||[]).map(s=>'<form class="mark-homework" data-id="'+esc(s.id)+'"><b>'+esc(s.students?.full_name||s.student_id)+'</b><small> · Assignment '+esc(s.assignment_id)+'</small><label>Marks<input name="marks" type="number" min="0" step="any" value="'+esc(s.marks??"")+'"></label><label>Feedback<textarea name="feedback">'+esc(s.feedback||"")+'</textarea></label><label>Status<select name="status"><option value="submitted" '+(s.status==="submitted"?"selected":"")+'>Submitted</option><option value="reviewed" '+(s.status==="reviewed"?"selected":"")+'>Reviewed</option><option value="resubmit" '+(s.status==="resubmit"?"selected":"")+'>Resubmit</option></select></label><button type="button" class="btn light open-homework" data-path="'+esc(s.submission_url||"")+'">Open submitted file</button> <button class="btn primary">Save feedback</button></form>').join("")||"<p>No submissions yet.</p>";
  show("Review Homework",html);
  document.querySelectorAll(".open-homework").forEach(b=>b.onclick=async()=>{const {data,error}=await db.storage.from("student-private").createSignedUrl(b.dataset.path,60);if(error)alert(error.message);else window.open(data.signedUrl,"_blank","noopener")});
  document.querySelectorAll(".mark-homework").forEach(form=>form.onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(form));if(v.marks==="")delete v.marks;else v.marks=Number(v.marks);const {error}=await db.from("submissions").update(v).eq("id",form.dataset.id);if(error)alert(error.message);else alert("Feedback saved.")});
 }
 function init(){
  const nav=$("#sideNav"),portal=$("#portal");if(!nav||!portal)return;
  new MutationObserver(addLinks).observe(nav,{childList:true,attributes:true});
  new MutationObserver(addLinks).observe(portal,{attributes:true,attributeFilter:["hidden"]});
  addLinks();
  nav.addEventListener("click",e=>{const b=e.target.closest("[data-homework-page]");if(!b)return;const id=b.dataset.homeworkPage;if(!db){show("Backend setup required","<p>Configure Supabase first.</p>");return}if(id==="my-homework")studentHomework();if(id==="child-homework")parentHomework();if(id==="review-homework")reviewHomework()});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
