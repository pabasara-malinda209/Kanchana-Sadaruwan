const crypto = require("crypto");
const md5 = value => crypto.createHash("md5").update(String(value)).digest("hex").toUpperCase();
const json = (statusCode, body) => ({ statusCode, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: JSON.stringify(body) });
exports.handler = async event => {
  if (event.httpMethod !== "POST") return json(405,{error:"Method not allowed"});
  const env=process.env, url=env.SUPABASE_URL, anon=env.SUPABASE_ANON_KEY, service=env.SUPABASE_SERVICE_ROLE_KEY;
  const merchant=env.PAYHERE_MERCHANT_ID, secret=env.PAYHERE_MERCHANT_SECRET;
  if(!url||!anon||!service||!merchant||!secret) return json(503,{error:"Payment service is not configured"});
  const token=(event.headers.authorization||event.headers.Authorization||"").replace(/^Bearer\s+/i,"");
  if(!token) return json(401,{error:"Sign in required"});
  try{
    const userRes=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:"Bearer "+token}});
    if(!userRes.ok) return json(401,{error:"Invalid session"});
    const user=await userRes.json(), body=JSON.parse(event.body||"{}");
    const invoiceId=String(body.invoice_id||"");
    if(!/^[0-9a-f-]{36}$/i.test(invoiceId)) return json(400,{error:"Invalid invoice"});
    const invRes=await fetch(url+"/rest/v1/invoices?id=eq."+encodeURIComponent(invoiceId)+"&select=id,invoice_number,description,amount,status,student_id",{headers:{apikey:anon,Authorization:"Bearer "+token}});
    const invoices=await invRes.json(), invoice=Array.isArray(invoices)?invoices[0]:null;
    if(!invRes.ok||!invoice) return json(404,{error:"Invoice not found or access denied"});
    if(invoice.status!=="unpaid") return json(409,{error:"Invoice is not payable"});
    const required=["first_name","last_name","phone","address","city","country"];
    for(const k of required) if(!String(body[k]||"").trim()) return json(400,{error:"Missing "+k.replace("_"," ")});
    const amount=Number(invoice.amount).toFixed(2),currency="LKR",orderId=crypto.randomUUID();
    await fetch(url+"/rest/v1/payment_transactions?invoice_id=eq."+encodeURIComponent(invoice.id)+"&status=in.(created,pending)&expires_at=lt."+encodeURIComponent(new Date().toISOString()),{method:"PATCH",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({status:"cancelled",updated_at:new Date().toISOString()})});
    const insert=await fetch(url+"/rest/v1/payment_transactions",{method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({invoice_id:invoice.id,student_id:invoice.student_id,order_id:orderId,amount,currency,status:"created"})});
    if(!insert.ok) return json(insert.status===409?409:500,{error:insert.status===409?"A checkout is already active for this invoice. Try again in 30 minutes.":"Could not create payment record"});
    const fields={
      merchant_id:merchant,return_url:env.PAYHERE_RETURN_URL||env.PUBLIC_SITE_URL,
      cancel_url:env.PAYHERE_CANCEL_URL||env.PUBLIC_SITE_URL,
      notify_url:env.PAYHERE_NOTIFY_URL||(env.URL?env.URL+"/.netlify/functions/payhere-notify":""),
      order_id:orderId,items:"Invoice "+invoice.invoice_number,
      currency,amount,first_name:String(body.first_name),last_name:String(body.last_name),
      email:user.email,phone:String(body.phone),address:String(body.address),city:String(body.city),country:String(body.country),
      custom_1:invoice.id
    };
    fields.hash=md5(merchant+orderId+amount+currency+md5(secret));
    const action=env.PAYHERE_MODE==="live"?"https://www.payhere.lk/pay/checkout":"https://sandbox.payhere.lk/pay/checkout";
    return json(200,{action,fields});
  }catch(e){return json(400,{error:"Unable to start payment"});}
};
