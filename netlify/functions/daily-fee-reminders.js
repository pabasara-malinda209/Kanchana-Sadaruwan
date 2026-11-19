const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
const headers=key=>({apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"});
async function send(channel,student,invoice,env){
 const message="Fee reminder: Invoice "+invoice.invoice_number+" for "+student.full_name+" (LKR "+Number(invoice.amount).toLocaleString("en-LK")+") is due on "+invoice.due_on+". Please contact the class if you need assistance.";
 if(channel==="email"){
  const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:env.EMAIL_FROM,to:[student.parent_email],subject:"Class fee reminder — "+invoice.invoice_number,text:message})});
  const out=await res.json();if(!res.ok)throw new Error(out.message||"Email provider failed");return out.id||null;
 }
 if(channel==="sms"){
  const form=new URLSearchParams({From:env.TWILIO_FROM_NUMBER,To:student.parent_phone,Body:message});
  const auth=Buffer.from(env.TWILIO_ACCOUNT_SID+":"+env.TWILIO_AUTH_TOKEN).toString("base64");
  const res=await fetch("https://api.twilio.com/2010-04-01/Accounts/"+env.TWILIO_ACCOUNT_SID+"/Messages.json",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/x-www-form-urlencoded"},body:form});
  const out=await res.json();if(!res.ok)throw new Error(out.message||"SMS provider failed");return out.sid||null;
 }
 const res=await fetch("https://graph.facebook.com/v22.0/"+env.WHATSAPP_PHONE_NUMBER_ID+"/messages",{method:"POST",headers:{Authorization:"Bearer "+env.WHATSAPP_ACCESS_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:student.parent_phone,type:"template",template:{name:env.WHATSAPP_REMINDER_TEMPLATE_NAME,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE},components:[{type:"body",parameters:[{type:"text",text:invoice.invoice_number},{type:"text",text:student.full_name},{type:"text",text:Number(invoice.amount).toLocaleString("en-LK")},{type:"text",text:invoice.due_on}]}]}})});
 const out=await res.json();if(!res.ok)throw new Error(out.error?.message||"WhatsApp provider failed");return out.messages?.[0]?.id||null;
}
exports.handler=async()=>{
 const env=process.env,url=env.SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return json(503,{error:"Reminder service is not configured"});
 try{
  const today=new Date().toISOString().slice(0,10),tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
  const res=await fetch(url+"/rest/v1/invoices?status=eq.unpaid&due_on=eq."+tomorrow+"&select=id,invoice_number,amount,due_on,student_id&limit=40",{headers:headers(key)});
  const invoices=await res.json();if(!res.ok)return json(502,{error:"Could not load due invoices"});
  const counts={sent:0,skipped:0,failed:0};
  await Promise.all((invoices||[]).map(async invoice=>{
   const sres=await fetch(url+"/rest/v1/students?id=eq."+encodeURIComponent(invoice.student_id)+"&select=id,full_name,parent_phone,parent_email,email_opt_in,sms_opt_in,whatsapp_opt_in",{headers:headers(key)});
   const students=await sres.json(),student=students[0];if(!sres.ok||!student)return;
   const channels=[
    ["email",student.email_opt_in&&student.parent_email&&env.RESEND_API_KEY&&env.EMAIL_FROM],
    ["sms",student.sms_opt_in&&student.parent_phone&&env.TWILIO_ACCOUNT_SID&&env.TWILIO_AUTH_TOKEN&&env.TWILIO_FROM_NUMBER],
    ["whatsapp",student.whatsapp_opt_in&&student.parent_phone&&env.WHATSAPP_ACCESS_TOKEN&&env.WHATSAPP_PHONE_NUMBER_ID&&env.WHATSAPP_REMINDER_TEMPLATE_NAME&&env.WHATSAPP_TEMPLATE_LANGUAGE]
   ];
   await Promise.all(channels.map(async([channel,enabled])=>{
    if(!enabled)return;
    const log=await fetch(url+"/rest/v1/reminder_logs",{method:"POST",headers:{...headers(key),Prefer:"return=minimal"},body:JSON.stringify({invoice_id:invoice.id,student_id:student.id,channel,reminder_date:today,status:"pending"})});
    if(log.status===409){counts.skipped++;return}if(!log.ok){counts.failed++;return}
    try{
     const providerId=await send(channel,student,invoice,env);
     await fetch(url+"/rest/v1/reminder_logs?invoice_id=eq."+encodeURIComponent(invoice.id)+"&channel=eq."+channel+"&reminder_date=eq."+today,{method:"PATCH",headers:{...headers(key),Prefer:"return=minimal"},body:JSON.stringify({status:"sent",provider_message_id:providerId,error_message:null})});
     counts.sent++;
    }catch(err){
     await fetch(url+"/rest/v1/reminder_logs?invoice_id=eq."+encodeURIComponent(invoice.id)+"&channel=eq."+channel+"&reminder_date=eq."+today,{method:"PATCH",headers:{...headers(key),Prefer:"return=minimal"},body:JSON.stringify({status:"failed",error_message:String(err.message).slice(0,240)})});
     counts.failed++;
    }
   }));
  }));
  return json(200,{date:today,due_date:tomorrow,...counts});
 }catch(e){return json(500,{error:"Reminder run failed"});}
};
exports.config={schedule:"0 3 * * *"};
