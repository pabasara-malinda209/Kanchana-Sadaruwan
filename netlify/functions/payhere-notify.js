const crypto=require("crypto");
const md5=value=>crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();
const reply=(statusCode,body)=>({statusCode,headers:{"content-type":"text/plain"},body});
exports.handler=async event=>{
 if(event.httpMethod!=="POST")return reply(405,"Method not allowed");
 const env=process.env,url=env.SUPABASE_URL,key=env.SUPABASE_SERVICE_ROLE_KEY,secret=env.PAYHERE_MERCHANT_SECRET,merchant=env.PAYHERE_MERCHANT_ID;
 if(!url||!key||!secret||!merchant)return reply(503,"Not configured");
 try{
  const p=new URLSearchParams(event.body||""),v=Object.fromEntries(p.entries());
  const expected=md5(v.merchant_id+v.order_id+v.payhere_amount+v.payhere_currency+v.status_code+md5(secret));
  if(v.merchant_id!==merchant||expected!==String(v.md5sig||"").toUpperCase())return reply(400,"Invalid signature");
  const amount=Number(v.payhere_amount);
  if(!Number.isFinite(amount)||amount<=0)return reply(400,"Invalid amount");
  const res=await fetch(url+"/rest/v1/rpc/process_payhere_notification",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({p_order_id:v.order_id,p_payment_id:v.payment_id||null,p_amount:amount,p_currency:v.payhere_currency,p_status_code:v.status_code})});
  if(!res.ok)return reply(400,"Payment notification could not be applied");
  return reply(200,"OK");
 }catch(e){return reply(500,"Processing error");}
};
