(() => {
 const cfg=window.APP_CONFIG||{},ok=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("YOUR-PROJECT")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("YOUR_");
 if(!ok||!window.supabase)return;
 const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function load(){
  const wrap=document.querySelector("#events .wrap");if(!wrap)return;
  const [events,reviews]=await Promise.all([
   db.from("events").select("title,description,event_date,event_type,venue").eq("published",true).order("event_date",{ascending:true}).limit(6),
   db.from("testimonials").select("student_name,grade,quote,rating").eq("published",true).order("created_at",{ascending:false}).limit(6)
  ]);
  if(!events.error&&(events.data||[]).length){
   const section=document.createElement("section");section.className="public-feed";
   section.innerHTML='<div class="heading"><small>UPCOMING PROGRAMMES</small><h2>Events & class updates</h2></div><div class="public-feature-grid">'+events.data.map(e=>'<article><b>'+esc(e.title)+'</b><p>'+esc(e.description||"")+'</p><small>'+esc(e.event_date||"Date to be announced")+' · '+esc(e.venue||e.event_type||"")+'</small></article>').join("")+'</div>';
   wrap.append(section);
  }
  if(!reviews.error&&(reviews.data||[]).length){
   const section=document.createElement("section");section.className="public-feed";
   section.innerHTML='<div class="heading"><small>FAMILY FEEDBACK</small><h2>What our students say</h2></div><div class="public-feature-grid">'+reviews.data.map(r=>'<article><b>'+esc(r.student_name)+' · '+esc(r.grade||"Student")+'</b><p>“'+esc(r.quote)+'”</p><small>'+("★".repeat(Math.max(0,Math.min(5,Number(r.rating)||0))))+'</small></article>').join("")+'</div>';
   wrap.append(section);
  }
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load);else load();
})();
