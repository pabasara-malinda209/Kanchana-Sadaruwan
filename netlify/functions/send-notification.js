const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(body)});
exports.handler=async event=>{
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 const env=process.env,url=env.SUPABASE_URL,anon=env.SUPABASE_ANON_KEY,service=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service)return json(503,{error:"Notification service is not configured"});
 const token=(event.headers.authorization||event.headers.Authorization||"").replace(/^Bearer\\s+/i,"");
 if(!token)return json(401,{error:"Sign in required"});
 try{
  const auth=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+token}});
  if(!auth.ok)return json(401,{error:"Invalid session"});
  const user=await auth.json();
  const roleRes=await fetch(url+"/rest/v1/profiles?id=eq."+encodeURIComponent(user.id)+"&select=role",{headers:{apikey:service,Authorization:"Bearer "+service}});
  const roles=await roleRes.json();
  if(!roleRes.ok||!roles[0]||!["teacher","admin"].includes(roles[0].role))return json(403,{error:"Teacher permission required"});
  const recent=await fetch(url+"/rest/v1/notification_logs?actor_user_id=eq."+encodeURIComponent(user.id)+"&created_at=gte."+encodeURIComponent(new Date(Date.now()-60*60*1000).toISOString())+"&select=id",{headers:{apikey:service,Authorization:"Bearer "+service}});
  const recentRows=await recent.json();if(recent.ok&&Array.isArray(recentRows)&&recentRows.length>=30)return json(429,{error:"Hourly sending limit reached"});
  const input=JSON.parse(event.body||"{}"),channel=String(input.channel||"");
  const recipient=String(input.recipient||"").trim(),body=String(input.body||"").trim(),subject=String(input.subject||"Class update").trim();
  if(!["email","sms","whatsapp"].includes(channel)||!recipient||!body||body.length>3000)return json(400,{error:"Check channel, recipient and message"});
  let providerId="",failure="";
  if(channel==="email"){
   if(!env.RESEND_API_KEY||!env.EMAIL_FROM)return json(503,{error:"Configure RESEND_API_KEY and EMAIL_FROM"});
   const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:env.EMAIL_FROM,to:[recipient],subject,text:body})});
   const out=await res.json();if(!res.ok)failure=out.message||"Email provider error";else providerId=out.id||"";
  }else if(channel==="sms"){
   if(!env.TWILIO_ACCOUNT_SID||!env.TWILIO_AUTH_TOKEN||!env.TWILIO_FROM_NUMBER)return json(503,{error:"Configure Twilio account, token and sender"});
   const form=new URLSearchParams({From:env.TWILIO_FROM_NUMBER,To:recipient,Body:body});
   const basic=Buffer.from(env.TWILIO_ACCOUNT_SID+":"+env.TWILIO_AUTH_TOKEN).toString("base64");
   const res=await fetch("https://api.twilio.com/2010-04-01/Accounts/"+env.TWILIO_ACCOUNT_SID+"/Messages.json",{method:"POST",headers:{Authorization:"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded"},body:form});
   const out=await res.json();if(!res.ok)failure=out.message||"SMS provider error";else providerId=out.sid||"";
  }else{
   if(!env.WHATSAPP_ACCESS_TOKEN||!env.WHATSAPP_PHONE_NUMBER_ID)return json(503,{error:"Configure WhatsApp Cloud API credentials"});
   const waMessage=env.WHATSAPP_MESSAGE_TEMPLATE_NAME?{messaging_product:"whatsapp",to:recipient,type:"template",template:{name:env.WHATSAPP_MESSAGE_TEMPLATE_NAME,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE||"en"},components:[{type:"body",parameters:[{type:"text",text:body}]}]}}:{messaging_product:"whatsapp",to:recipient,type:"text",text:{body}};
   const res=await fetch("https://graph.facebook.com/v22.0/"+env.WHATSAPP_PHONE_NUMBER_ID+"/messages",{method:"POST",headers:{Authorization:"Bearer "+env.WHATSAPP_ACCESS_TOKEN,"Content-Type":"application/json"},body:JSON.stringify(waMessage)});
   const out=await res.json();if(!res.ok)failure=out.error?.message||"WhatsApp provider error";else providerId=out.messages?.[0]?.id||"";
  }
  await fetch(url+"/rest/v1/notification_logs",{method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({actor_user_id:user.id,channel,recipient,subject,body_preview:body.slice(0,240),provider_message_id:providerId||null,status:failure?"failed":"sent",error_message:failure||null})});
  return failure?json(502,{error:failure}):json(200,{sent:true,provider_message_id:providerId});
 }catch(e){return json(500,{error:"Notification could not be sent"});}
};
