/* Securely link pre-registered student/parent accounts to student records. */
(() => {
 const $=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const cfg=window.APP_CONFIG||{},ok=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("YOUR-PROJECT")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("YOUR_");
 const db=ok&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
 async function render(){
  $("#pageTitle").textContent="Portal Account Linking";
  $("#dashboardContent").innerHTML='<div class="panel"><h3>Link student or parent account</h3><p>The student or parent must create an account first. Enter the exact email address used at sign-up.</p><form id="linkAccount" class="suite-form"><label>Account type<select name="mode"><option value="student">Student login</option><option value="parent">Parent / guardian</option></select></label><label>Account email<input type="email" name="email" required></label><label>Student<select name="student_id" id="linkStudent" required><option value="">Loading students…</option></select></label><label>Relationship (parent only)<input name="relationship" value="Parent"></label><button class="btn primary">Link account</button></form><p id="linkMessage" class="message"></p></div>';
  const {data,error}=await db.from("students").select("id,full_name,grade").order("full_name");
  const select=$("#linkStudent");if(error){select.innerHTML='<option>'+esc(error.message)+'</option>';return}
  select.innerHTML='<option value="">Choose student</option>'+(data||[]).map(s=>'<option value="'+esc(s.id)+'">'+esc(s.full_name)+' — Grade '+esc(s.grade)+'</option>').join("");
  $("#linkAccount").onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target));const msg=$("#linkMessage");msg.textContent="Linking account…";const {data,error}=await db.rpc("link_portal_account",{p_email:v.email,p_student_id:v.student_id,p_mode:v.mode,p_relationship:v.relationship});msg.textContent=error?error.message:"Account linked successfully. Ask the user to sign out and sign in again.";
  };
 }
 function init(){
  const nav=$("#sideNav"),portal=$("#portal");if(!nav||!portal)return;
  const add=()=>{if(portal.hidden||!["teacher","admin"].includes(nav.dataset.suiteRole)||nav.querySelector("[data-account-link]"))return;const b=document.createElement("button");b.type="button";b.dataset.accountLink="1";b.textContent="Link Portal Accounts";nav.append(b)};
  new MutationObserver(add).observe(nav,{childList:true,attributes:true});new MutationObserver(add).observe(portal,{attributes:true,attributeFilter:["hidden"]});add();
  nav.addEventListener("click",e=>{if(e.target.closest("[data-account-link]")){if(db)render();else $("#dashboardContent").textContent="Configure Supabase first."}});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
