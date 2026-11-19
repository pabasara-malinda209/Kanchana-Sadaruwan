/* Read-only administration audit and operating overview. */
(() => {
 const $=s=>document.querySelector(s),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const cfg=window.APP_CONFIG||{},ok=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("YOUR-PROJECT")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("YOUR_");
 const db=ok&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
 function show(title,html){$("#pageTitle").textContent=title;$("#dashboardContent").innerHTML='<div class="panel"><h3>'+esc(title)+'</h3>'+html+'</div>'}
 async function audit(){
  show("Audit Log","<p>Loading recent activity…</p>");
  const {data,error}=await db.from("audit_logs").select("actor_user_id,action,entity,entity_id,details,created_at").order("created_at",{ascending:false}).limit(200);
  if(error){show("Audit Log","<p>"+esc(error.message)+"</p>");return}
  show("Audit Log",'<p>Read-only history of selected student, payment and attendance changes.</p><div class="suite-table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Record</th></tr></thead><tbody>'+(data||[]).map(x=>'<tr><td>'+esc(x.created_at)+'</td><td>'+esc(x.actor_user_id||"System")+'</td><td>'+esc(x.action)+'</td><td>'+esc(x.entity)+' · '+esc(x.entity_id)+'</td></tr>').join("")+'</tbody></table></div>'||"<p>No activity logged yet.</p>");
 }
 async function overview(){
  show("System Overview","<p>Checking system records…</p>");
  const tables=["students","registration_requests","batches","invoices","payments","expenses","attendance"];
  const counts=await Promise.all(tables.map(async t=>{const {count,error}=await db.from(t).select("id",{count:"exact",head:true});return {table:t,count:count||0,error}}));
  show("System Overview",'<div class="metricgrid">'+counts.map(x=>'<div class="metric"><b>'+esc(x.error?"—":x.count)+'</b><small>'+esc(x.table.replaceAll("_"," "))+'</small></div>').join("")+'</div><p>Counts are live database records. Review the audit log and security checklist before launch.</p>');
 }
 function init(){
  const nav=$("#sideNav"),portal=$("#portal");if(!nav||!portal)return;
  const add=()=>{if(portal.hidden||!["teacher","admin"].includes(nav.dataset.suiteRole))return;[["audit-page","Audit Log"],["overview-page","System Overview"]].forEach(([id,label])=>{if(nav.querySelector('[data-admin-page="'+id+'"]'))return;const b=document.createElement("button");b.type="button";b.dataset.adminPage=id;b.textContent=label;nav.append(b)})};
  new MutationObserver(add).observe(nav,{childList:true,attributes:true});new MutationObserver(add).observe(portal,{attributes:true,attributeFilter:["hidden"]});add();
  nav.addEventListener("click",e=>{const b=e.target.closest("[data-admin-page]");if(!b)return;if(!db){show("Backend setup required","<p>Configure Supabase first.</p>");return}if(b.dataset.adminPage==="audit-page")audit();else overview()});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
