const crypto=require("crypto");
const md5=value=>crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();
const reply=(statusCode,body)=>({statusCode,headers:{"content-type":"text/plain"},body});
exports.handler=async event=>{
 if(event.httpMethod!=="POST")return reply(405,"Method not allowed");
 const env=process.env,url=env.SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY,secret=env.PAYHERE_MERCHANT_SECRET,merchant=env.PAYHERE_MERCHANT_ID;
 if(!url||!key||!secret||!merchant)return reply(503,"Not configured");
 try{
  const p=new URLSearchParams(event.body||"");
  const v=Object.fromEntries(p.entries());
  const expected=md5(v.merchant_id+v.order_id+v.payhere_amount+v.payhere_currency+v.status_code+md5(secret));
  if(v.merchant_id!==merchant||expected!==String(v.md5sig||"").toUpperCase())return reply(400,"Invalid signature");
  const lookup=await fetch(url+"/rest/v1/payment_transactions?order_id=eq."+encodeURIComponent(v.order_id)+"&select=id,invoice_id,student_id,amount,currency,status",{headers:{apikey:key,Authorization:"Bearer "+key}});
  const rows=await lookup.json(),tx=rows[0];
  if(!lookup.ok||!tx)return reply(404,"Unknown order");
  if(Number(v.payhere_amount).toFixed(2)!==Number(tx.amount).toFixed(2)||v.payhere_currency!==tx.currency)return reply(400,"Amount mismatch");
  const success=v.status_code==="2";
  const status=success?"success":v.status_code==="-1"?"cancelled":"failed";
  const update=await fetch(url+"/rest/v1/payment_transactions?order_id=eq."+encodeURIComponent(v.order_id)+"&status=neq.success&select=id",{method:"PATCH",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({status,gateway_payment_id:v.payment_id||null,updated_at:new Date().toISOString()})});
  if(!update.ok)return reply(500,"Could not update payment record");
  const changed=await update.json();
  if(success&&Array.isArray(changed)&&changed.length>0){
   await fetch(url+"/rest/v1/invoices?id=eq."+encodeURIComponent(tx.invoice_id),{method:"PATCH",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({status:"paid"})});
   await fetch(url+"/rest/v1/payments",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({student_id:tx.student_id,amount:tx.amount,paid_on:new Date().toISOString().slice(0,10),month:new Date().toISOString().slice(0,7),note:"PayHere payment "+v.payment_id})});
  }
  return reply(200,"OK");
 }catch(e){return reply(500,"Processing error");}
};
