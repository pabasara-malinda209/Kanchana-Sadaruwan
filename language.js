/* Functional public-site language selector for the main navigation and page content. */
(() => {
 const $=s=>document.querySelector(s);
 const original=new Map();
 const map={
  si:{
   ".topbar span:first-child":"ගුණාත්මක අධ්‍යාපනය • 1–11 ශ්‍රේණි",
   ".topbar span:last-child":"ශ්‍රී ලංකාව | සිංහල • English • தமிழ்",
   ".nav nav a:nth-child(1)":"මුල් පිටුව",".nav nav a:nth-child(2)":"විෂයයන්",".nav nav a:nth-child(3)":"ශ්‍රේණි",".nav nav a:nth-child(4)":"අධ්‍යයන සම්පත්",".nav nav a:nth-child(5)":"අධ්‍යාපන පද්ධතිය",".nav nav a:nth-child(6)":"පුවත් සහ යාවත්කාලීන",".nav nav a:nth-child(7)":"සම්බන්ධ වන්න",
   ".hero .pill":"ඉගෙන ගන්න • දියුණු වෙන්න • ජයගන්න",
   ".hero h1":"ඔබේ අනාගතයට ශක්තිමත් පදනමක් ගොඩනගන්න",
   ".hero p":"ගණිතය, විද්‍යාව සහ ඉංග්‍රීසි විෂයයන් සඳහා 1–11 ශ්‍රේණි දක්වා සිංහල, English සහ தமிழ் මාධ්‍යයෙන් ගුණාත්මක අධ්‍යාපනයක්.",
   ".hero .btn.primary":"පන්ති බලන්න →",".hero .btn.light":"දැන් ලියාපදිංචි වන්න",
   "#subjects .heading h2":"ඔබේ හැකියාවන් සොයාගන්න","#subjects .heading p":"සෑම පාඩමක්ම පැහැදිලිව අවබෝධ කරගෙන විශ්වාසයෙන් ඉදිරියට යන්න.",
   "#classes .heading h2":"ඔබේ ශ්‍රේණිය තෝරන්න","#classes .heading p":"1 සිට 11 ශ්‍රේණිය දක්වා අධ්‍යාපන සහාය.",
   "#resources .heading h2":"වඩා හොඳින් ඉගෙනීමට අවශ්‍ය සියල්ල",
   "#platform .heading h2":"සම්පූර්ණ අධ්‍යාපන සහ පන්ති කළමනාකරණ පද්ධතිය",
   "#events .heading h2":"වැඩසටහන්, යාවත්කාලීන සහ ජයග්‍රහණ",
   "#contact .cta h2":"ඉගෙනීම ආරම්භ කිරීමට සූදානම්ද?","#contact .cta p":"පන්ති කාලසටහන්, ගාස්තු සහ ලියාපදිංචිය සඳහා අප අමතන්න.",
   "#contact .cta button":"ශිෂ්‍ය ලියාපදිංචිය →",
   "footer .copyright":"© 2026 Kanchana Sadaruwan Education. සියලු හිමිකම් ඇවිරිණි."
  },
  ta:{
   ".topbar span:first-child":"தரமான கல்வி • வகுப்புகள் 1–11",
   ".topbar span:last-child":"இலங்கை | සිංහල • English • தமிழ்",
   ".nav nav a:nth-child(1)":"முகப்பு",".nav nav a:nth-child(2)":"பாடங்கள்",".nav nav a:nth-child(3)":"வகுப்புகள்",".nav nav a:nth-child(4)":"கற்றல் வளங்கள்",".nav nav a:nth-child(5)":"கல்வி தளம்",".nav nav a:nth-child(6)":"புதுப்பிப்புகள்",".nav nav a:nth-child(7)":"தொடர்பு",
   ".hero .pill":"கற்க • வளர • வெற்றி பெற",
   ".hero h1":"உங்கள் எதிர்காலத்திற்கு வலுவான அடித்தளத்தை உருவாக்குங்கள்",
   ".hero p":"1–11 ஆம் வகுப்புகளுக்கான கணிதம், அறிவியல் மற்றும் ஆங்கிலப் பாடங்கள் சிங்களம், ஆங்கிலம் மற்றும் தமிழ் माध्यमங்களில்.",
   ".hero .btn.primary":"வகுப்புகளைப் பார்க்க →",".hero .btn.light":"இப்போது பதிவு செய்யுங்கள்",
   "#subjects .heading h2":"உங்கள் திறனை கண்டறியுங்கள்",
   "#classes .heading h2":"உங்கள் வகுப்பைத் தேர்ந்தெடுக்கவும்",
   "#resources .heading h2":"சிறப்பாகக் கற்க தேவையான அனைத்தும்",
   "#platform .heading h2":"முழுமையான கல்வி மற்றும் வகுப்பு மேலாண்மை தளம்",
   "#events .heading h2":"நிகழ்வுகள், புதுப்பிப்புகள் மற்றும் சாதனைகள்",
   "#contact .cta h2":"கற்கத் தொடங்க தயாரா?","#contact .cta p":"வகுப்பு நேரங்கள், கட்டணங்கள் மற்றும் பதிவுக்கு எங்களைத் தொடர்புகொள்ளுங்கள்.",
   "#contact .cta button":"மாணவர் பதிவு →"
  }
 };
 function apply(lang){
  document.documentElement.lang=lang;
  for(const [selector,value] of Object.entries(map[lang]||{})){const el=$(selector);if(el)el.textContent=value}
  if(lang==="en"){for(const [selector,value] of original){const el=$(selector);if(el)el.innerHTML=value}}
 }
 function init(){
  Object.keys(map.si).forEach(s=>{const el=$(s);if(el)original.set(s,el.innerHTML)});
  const select=$("#language");if(!select)return;
  select.onchange=()=>apply(select.value);
  apply(select.value||"si");
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
