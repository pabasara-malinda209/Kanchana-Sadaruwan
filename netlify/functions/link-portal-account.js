const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(body)});
exports.handler=async event=>{
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 const env=process.env,url=env.SUPABASE_URL,anon=env.SUPABASE_ANON_KEY,key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!key)return json(503,{error:"Portal account linking is not configured"});
 const token=(event.headers.authorization||event.headers.Authorization||"").replace(/^Bearer\\s+/i,"");
 if(!token)return json(401,{error:"Sign in required"});
 try{
  const auth=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+token}});
  if(!auth.ok)return json(401,{error:"Invalid session"});
  const actor=await auth.json();
  const roleRes=await fetch(url+"/rest/v1/profiles?id=eq."+encodeURIComponent(actor.id)+"&select=role",{headers:{apikey:key,Authorization:"Bearer "+key}});
  const roles=await roleRes.json();if(!roleRes.ok||!roles[0]||!["teacher","admin"].includes(roles[0].role))return json(403,{error:"Teacher permission required"});
  const input=JSON.parse(event.body||"{}"),mode=String(input.mode||""),email=String(input.email||"").trim().toLowerCase(),studentId=String(input.student_id||"");
  if(!["student","parent"].includes(mode)||!email||!/^\\S+@\\S+\\.\\S+$/.test(email)||!/^[0-9a-f-]{36}$/i.test(studentId))return json(400,{error:"Choose a valid account type, email and student"});
  const studentRes=await fetch(url+"/rest/v1/students?id=eq."+encodeURIComponent(studentId)+"&select=id,auth_user_id",{headers:{apikey:key,Authorization:"Bearer "+key}});
  const students=await studentRes.json(),student=students[0];if(!studentRes.ok||!student)return json(404,{error:"Student record not found"});
  let target=null;
  for(let page=1;page<=10&&!target;page++){
   const usersRes=await fetch(url+"/auth/v1/admin/users?page="+page+"&per_page=1000",{headers:{apikey:key,Authorization:"Bearer "+key}});
   if(!usersRes.ok)return json(502,{error:"Could not search user accounts"});
   const users=await usersRes.json();target=(users.users||[]).find(u=>(u.email||"").toLowerCase()===email);
   if((users.users||[]).length<1000)break;
  }
  if(!target)return json(404,{error:"No registered account found for this email. Ask them to sign up first."});
  if(target.id===actor.id)return json(400,{error:"You cannot link your own administrator account."});
  const profileRes=await fetch(url+"/rest/v1/profiles?id=eq."+encodeURIComponent(target.id)+"&select=role",{headers:{apikey:key,Authorization:"Bearer "+key}});
  const targetProfiles=await profileRes.json(),targetRole=targetProfiles[0]?.role;
  if(["teacher","admin"].includes(targetRole))return json(409,{error:"Administrator accounts cannot be linked as learners or parents."});
  if(mode==="student"){
   if(student.auth_user_id&&student.auth_user_id!==target.id)return json(409,{error:"This student already has a different login linked."});
   const update=await fetch(url+"/rest/v1/students?id=eq."+encodeURIComponent(studentId),{method:"PATCH",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({auth_user_id:target.id})});
   if(!update.ok)return json(500,{error:"Could not link student record"});
   const profile=await fetch(url+"/rest/v1/profiles?id=eq."+encodeURIComponent(target.id),{method:"PATCH",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({role:"student",student_id:studentId})});
   if(!profile.ok)return json(500,{error:"Student linked but profile update failed. Contact support."});
  }else{
   const profile=await fetch(url+"/rest/v1/profiles?id=eq."+encodeURIComponent(target.id),{method:"PATCH",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({role:"parent",student_id:null})});
   if(!profile.ok)return json(500,{error:"Could not update parent role"});
   const link=await fetch(url+"/rest/v1/guardian_students",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({guardian_user_id:target.id,student_id:studentId,relationship:String(input.relationship||"Parent").slice(0,40)})});
   if(!link.ok)return json(500,{error:"Parent account updated but child link failed. Contact support."});
  }
  return json(200,{success:true,mode,email});
 }catch(e){return json(500,{error:"Unable to link portal account"});}
};
