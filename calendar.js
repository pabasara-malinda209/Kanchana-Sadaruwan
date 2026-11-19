/* Export recurring class timetable to an .ics calendar file. */
(() => {
 const $=s=>document.querySelector(s);
 const cfg=window.APP_CONFIG||{},ok=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes("YOUR-PROJECT")&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes("YOUR_");
 const db=ok&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const ics=v=>String(v??"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
 const dayMap={sun:0,sunday:0,mon:1,monday:1,tue:2,tuesday:2,wed:3,wednesday:3,thu:4,thursday:4,fri:5,friday:5,sat:6,saturday:6};
 const pad=n=>String(n).padStart(2,"0");
 function stamp(date,time){const [h,m]=String(time||"00:00").split(":").map(Number);const d=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate(),h,m)-330*60000;const x=new Date(d);return x.getUTCFullYear()+pad(x.getUTCMonth()+1)+pad(x.getUTCDate())+"T"+pad(x.getUTCHours())+pad(x.getUTCMinutes())+"00Z"}
 async function exportCalendar(){
  const {data:auth}=await db.auth.getSession();const role=$("#sideNav").dataset.suiteRole;let grades=[];
  if(role==="student"){const {data}=await db.from("students").select("grade").eq("auth_user_id",auth.session.user.id).maybeSingle();if(data)grades=[Number(data.grade)]}
  else if(role==="parent"){const {data:links}=await db.from("guardian_students").select("student_id").eq("guardian_user_id",auth.session.user.id);const ids=(links||[]).map(x=>x.student_id);if(ids.length){const {data}=await db.from("students").select("grade").in("id",ids);grades=[...new Set((data||[]).map(x=>Number(x.grade)))]}}
  if(!["teacher","admin"].includes(role)&&!grades.length){alert("No linked student grade found.");return}
  const {data,error}=await db.from("timetable").select("grade,subject,medium,day_of_week,start_time,end_time,venue");
  if(error){alert(error.message);return}
  const rows=(data||[]).filter(x=>["teacher","admin"].includes(role)||grades.includes(Number(x.grade)));
  const now=new Date(),stampNow=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Kanchana Sadaruwan Education//Timetable//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  rows.forEach((r,index)=>{const day=dayMap[String(r.day_of_week||"").toLowerCase()];if(day===undefined)return;
   for(let week=0;week<8;week++){const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+((day-now.getDay()+7)%7)+week*7);if(date<new Date(now.getFullYear(),now.getMonth(),now.getDate()))continue;
    lines.push("BEGIN:VEVENT","UID:"+index+"-"+week+"-"+date.getTime()+"@ks-education","DTSTAMP:"+stampNow,"DTSTART:"+stamp(date,r.start_time),"DTEND:"+stamp(date,r.end_time),"SUMMARY:"+ics("Grade "+r.grade+" "+r.subject+" class"),"DESCRIPTION:"+ics("Medium: "+(r.medium||"")+"\nVenue: "+(r.venue||"")),"LOCATION:"+ics(r.venue||""),"END:VEVENT");
   }
  });
  lines.push("END:VCALENDAR");
  const blob=new Blob([lines.join("\r\n")],"text/calendar;charset=utf-8"),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="class-timetable.ics";a.click();URL.revokeObjectURL(url);
 }
 function init(){const nav=$("#sideNav"),portal=$("#portal");if(!nav||!portal)return;const add=()=>{if(portal.hidden||nav.querySelector("[data-calendar-export]"))return;const b=document.createElement("button");b.type="button";b.dataset.calendarExport="1";b.textContent="Export Timetable";nav.append(b)};new MutationObserver(add).observe(nav,{childList:true,attributes:true});new MutationObserver(add).observe(portal,{attributes:true,attributeFilter:["hidden"]});add();nav.addEventListener("click",e=>{if(e.target.closest("[data-calendar-export]")){if(db)exportCalendar();else alert("Configure Supabase first.")}})}
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
