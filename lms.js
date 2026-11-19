/* Learner workflows: online quizzes, QR attendance, invoices and inbox. */
(() => {
 const $=s=>document.querySelector(s), esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const cfg=window.APP_CONFIG||{},ready=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("YOUR-PROJECT")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("YOUR_");
 const db=ready&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
 let currentRole="",scanner=null;
 function addNav(){
  const nav=$("#sideNav"),portal=$("#portal");if(!nav||!portal||portal.hidden)return;
  const role=nav.dataset.suiteRole||"student";currentRole=role;
  const items=["teacher","admin"].includes(role)?[["attendance-qr","Create QR Attendance"],["inbox","Inbox"]]:role==="parent"?[["invoices","Children's Invoices"],["inbox","Inbox"]]:[["quizzes","Online Quizzes"],["scan-qr","Scan Attendance QR"],["invoices","My Invoices"],["inbox","Inbox"]];
  items.forEach(([id,label])=>{if(nav.querySelector('[data-lms-page="'+id+'"]'))return;const b=document.createElement("button");b.type="button";b.dataset.lmsPage=id;b.textContent=label;nav.append(b)});
 }
 async function session(){if(!db)return null;const {data}=await db.auth.getSession();return data.session}
 function panel(title,body){const root=$("#dashboardContent");$("#pageTitle").textContent=title;root.innerHTML='<div class="panel"><h3>'+esc(title)+'</h3>'+body+'</div>'}
 async function renderInvoices(){
  panel("Invoices",'<div class="empty">Loading invoices…</div>');
  const {data,error}=await db.from("invoices").select("*").order("created_at",{ascending:false}).limit(100);
  const root=$("#dashboardContent .panel");if(error){root.innerHTML+='<p>'+esc(error.message)+'</p>';return}
  root.innerHTML='<h3>Invoices & Fees</h3><div class="suite-table-wrap"><table><thead><tr><th>Invoice</th><th>Student</th><th>Description</th><th>Amount (LKR)</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>'+
   (data||[]).map(x=>'<tr><td>'+esc(x.invoice_number)+'</td><td>'+esc(x.student_id)+'</td><td>'+esc(x.description)+'</td><td>'+Number(x.amount).toLocaleString()+'</td><td>'+esc(x.due_on||"—")+'</td><td>'+esc(x.status)+'</td><td>'+(x.status==="unpaid"?'<button class="btn primary lms-pay" data-id="'+esc(x.id)+'">Pay online</button>':"—")+'</td></tr>').join("")+'</tbody></table></div><div id="payDetails" hidden><h3>Pay invoice securely</h3><form id="payDetailsForm" class="suite-form"><label>First name<input name="first_name" required></label><label>Last name<input name="last_name" required></label><label>Phone<input name="phone" required></label><label>Address<input name="address" required></label><label>City<input name="city" required></label><label>Country<input name="country" value="Sri Lanka" required></label><button class="btn primary">Continue to PayHere</button></form><p id="payMsg" class="message"></p></div>';
  root.querySelectorAll(".lms-pay").forEach(b=>b.onclick=()=>{const box=$("#payDetails");box.hidden=false;box.dataset.invoiceId=b.dataset.id;box.scrollIntoView({behavior:"smooth"});});
  $("#payDetailsForm").onsubmit=async e=>{e.preventDefault();const msg=$("#payMsg");msg.textContent="Preparing secure checkout…";const ses=await session();const payload=Object.fromEntries(new FormData(e.target));payload.invoice_id=$("#payDetails").dataset.invoiceId;try{const response=await fetch("/.netlify/functions/payhere-checkout",{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+ses.access_token},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error||"Checkout unavailable");const form=document.createElement("form");form.method="POST";form.action=result.action;Object.entries(result.fields).forEach(([k,v])=>{const input=document.createElement("input");input.type="hidden";input.name=k;input.value=v;form.append(input)});document.body.append(form);form.submit()}catch(err){msg.textContent=err.message}};

 }
 async function renderInbox(){
  panel("Inbox",'<div class="empty">Loading messages…</div>');
  const {data,error}=await db.from("messages").select("subject,body,channel,sent_at,created_at").order("created_at",{ascending:false}).limit(100);
  const root=$("#dashboardContent .panel");if(error){root.innerHTML+='<p>'+esc(error.message)+'</p>';return}
  root.innerHTML='<h3>Inbox</h3>'+(data||[]).map(m=>'<article class="inbox-item"><b>'+esc(m.subject||"Message")+'</b><p>'+esc(m.body)+'</p><small>'+esc(m.channel||"portal")+' · '+esc(m.sent_at||m.created_at)+'</small></article>').join("")||'<p>No messages yet.</p>';
 }
 async function renderQuizzes(){
  panel("Online Quizzes",'<div class="empty">Loading available quizzes…</div>');
  const ses=await session();const {data:student,error:studentError}=await db.from("students").select("grade").eq("auth_user_id",ses.user.id).maybeSingle();
  const root=$("#dashboardContent .panel");if(studentError||!student){root.innerHTML+='<p>Student profile is not linked.</p>';return}
  const {data,error}=await db.from("quizzes").select("id,title,grade,subject,opens_at,closes_at,total_marks").eq("published",true).order("created_at",{ascending:false});
  if(error){root.innerHTML+='<p>'+esc(error.message)+'</p>';return}
  const available=(data||[]).filter(q=>q.grade==null||Number(q.grade)===Number(student.grade));
  root.innerHTML='<h3>Available quizzes</h3>'+(available.map(q=>'<button class="btn light lms-quiz" data-id="'+esc(q.id)+'">'+esc(q.title)+' · '+esc(q.subject||"")+'</button>').join("")||'<p>No published quizzes for your grade.</p>');
  root.querySelectorAll(".lms-quiz").forEach(b=>b.onclick=()=>takeQuiz(b.dataset.id));
 }
 async function takeQuiz(id){
  panel("Quiz",'<div class="empty">Loading questions…</div>');
  const {data,error}=await db.rpc("get_quiz_questions",{p_quiz_id:id});
  const root=$("#dashboardContent .panel");if(error){root.innerHTML+='<p>'+esc(error.message)+'</p>';return}
  const questions=data||[];if(!questions.length){root.innerHTML+='<p>No questions in this quiz.</p>';return}
  root.innerHTML='<h3>Answer all questions</h3><form id="quizForm">'+questions.map((q,i)=>{
   let opts=q.options;if(typeof opts==="string"){try{opts=JSON.parse(opts)}catch{opts=[]}}
   const choices=Array.isArray(opts)?opts:Object.values(opts||{});
   const input=q.question_type==="mcq"&&choices.length?choices.map((v,j)=>'<label class="quiz-option"><input type="radio" name="'+esc(q.id)+'" value="'+esc(typeof v==="object"?(v.value??v.label??""):v)+'" required> '+esc(typeof v==="object"?(v.label??v.value??""):v)+'</label>').join(""):'<input name="'+esc(q.id)+'" required maxlength="500" placeholder="Your answer">';
   return '<fieldset class="quiz-question"><legend>'+(i+1)+'. '+esc(q.question)+' ('+esc(q.marks)+' marks)</legend>'+input+'</fieldset>';
  }).join("")+'<button class="btn primary">Submit answers</button></form>';
  $("#quizForm").onsubmit=async e=>{e.preventDefault();const answers={};questions.forEach(q=>{const el=e.target.elements[q.id];if(el){if(el.length&&el[0]?.type==="radio"){const chosen=[...el].find(x=>x.checked);answers[q.id]=chosen?.value||""}else answers[q.id]=el.value}});
   const {data,error}=await db.rpc("submit_quiz_attempt",{p_quiz_id:id,p_answers:answers});
   if(error){alert(error.message);return}const result=Array.isArray(data)?data[0]:data;
   panel("Quiz submitted",'<p>Your score: <b>'+esc(result?.score)+' / '+esc(result?.total_marks)+'</b></p><p>Your attempt has been saved.</p>');
  };
 }
 async function renderQrTeacher(){
  panel("Create QR Attendance",'<label>Class date <input id="qrDate" type="date" value="'+new Date().toISOString().slice(0,10)+'"></label><button class="btn primary" id="makeQr">Generate 10-minute QR</button><div id="qrResult"></div>');
  $("#makeQr").onclick=async()=>{const {data,error}=await db.rpc("create_attendance_qr_token",{p_class_date:$("#qrDate").value||null});const root=$("#qrResult");if(error){root.textContent=error.message;return}root.innerHTML='<p>Valid for 10 minutes. Students must scan while signed in.</p><div id="qrCanvas"></div><p><code>'+esc(data)+'</code></p>';if(window.QRCode)new QRCode($("#qrCanvas"),{text:data,width:220,height:220});};
 }
 async function redeem(token){
  const {data,error}=await db.rpc("redeem_attendance_qr_token",{p_token:token.trim()});if(error)throw error;return data;
 }
 async function renderQrStudent(){
  panel("Scan Attendance QR",'<p>Allow camera access and scan the teacher’s current QR code. If camera scanning is unavailable, enter the token manually.</p><div id="reader" style="max-width:420px"></div><form id="tokenForm"><label>QR token<input name="token" required autocomplete="off"></label><button class="btn primary">Submit attendance</button></form><p id="qrMsg" class="message"></p>');
  $("#tokenForm").onsubmit=async e=>{e.preventDefault();try{if(scanner){try{await scanner.stop()}catch(err){}scanner=null}const v=await redeem(new FormData(e.target).get("token"));$("#qrMsg").textContent="Attendance recorded successfully."}catch(err){$("#qrMsg").textContent=err.message}};
  if(window.Html5Qrcode){try{scanner=new Html5Qrcode("reader");await scanner.start({facingMode:"environment"},{fps:10,qrbox:220},async decoded=>{try{await scanner.stop();scanner=null;await redeem(decoded);$("#qrMsg").textContent="Attendance recorded successfully."}catch(err){$("#qrMsg").textContent=err.message}})}catch(err){$("#qrMsg").textContent="Camera unavailable. Use the token field below."}}
 }
 async function route(id){
  if(scanner&&id!=="scan-qr"){try{await scanner.stop()}catch(e){}scanner=null}
  if(!db){panel("Backend setup required","<p>Configure Supabase before using portal workflows.</p>");return}
  if(!await session()){panel("Please sign in","<p>Your session has expired. Sign in again.</p>");return}
  if(id==="quizzes")return renderQuizzes();
  if(id==="invoices")return renderInvoices();
  if(id==="inbox")return renderInbox();
  if(id==="attendance-qr")return renderQrTeacher();
  if(id==="scan-qr")return renderQrStudent();
 }
 function init(){
  const nav=$("#sideNav"),portal=$("#portal");if(!nav||!portal)return;
  const observer=new MutationObserver(addNav);observer.observe(nav,{childList:true,attributes:true,attributeFilter:["data-suite-role"]});
  const po=new MutationObserver(addNav);po.observe(portal,{attributes:true,attributeFilter:["hidden"]});
  addNav();
  nav.addEventListener("click",e=>{const b=e.target.closest("[data-lms-page]");if(b){e.preventDefault();route(b.dataset.lmsPage)}});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
