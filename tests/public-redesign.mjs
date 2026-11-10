import {command,evaluate,navigate,viewport,screenshot,waitFor,check,finish,errors} from './cdp.mjs';
try{
  await command('Network.clearBrowserCookies');
  for(const width of [390,768,1024,1440]){
    await viewport(width);await navigate('/','document.querySelectorAll(".topic-card").length===10');
    check(await evaluate('document.querySelector("h1").textContent.replace(/\\s+/g," ").includes("Find yourpeople in tech.")||document.querySelector("h1").textContent.includes("people")'),'Student landing renders at '+width);
    check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Landing fits '+width);
    check(await evaluate('!document.querySelector(".cursor,.orb")&&getComputedStyle(document.body).cursor!=="none"'),'Native cursor, no glowing orb at '+width);
    check(await evaluate('document.querySelector(".hero-image img").complete&&document.querySelector(".hero-image img").naturalWidth>0'),'Local hero photograph loaded at '+width);
    check(await evaluate('document.fonts.check("16px Inter")'),'Local Inter font loaded');
    await screenshot('landing-'+width);
  }
  check(await evaluate('(async()=>{const c=await(await fetch("/api/public/communities")).json();return c.length===10&&c.every(x=>typeof x.member_count==="number"&&!Object.hasOwn(x,"leader_name")&&!Object.hasOwn(x,"members"));})()'),'Public community counts come from restricted database projection');
  await navigate('/explore.html?id=6','document.querySelector(".community-header")!==null');
  check(await evaluate('document.querySelector("main").textContent.includes("Mobile Development")'),'Preview preserves actual Mobile Development category');
  for(const path of ['/register.html','/login.html']){
    await viewport(390);await navigate(path,'document.querySelector("form")!==null');
    check(await evaluate('!document.querySelector("form").checkValidity()'),'Required authentication fields at '+path);
    check(await evaluate('Array.from(document.querySelectorAll("input")).every(i=>document.querySelector(`label[for="${i.id}"]`))'),'Labels for every field at '+path);
    await evaluate('document.querySelector("[data-password=password]").click()');
    check(await evaluate('document.querySelector("#password").type==="text"'),'Password visibility toggle at '+path);
    check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Authentication fits mobile at '+path);
  }
  await navigate('/','document.querySelectorAll(".topic-card").length===10');
  await evaluate('document.querySelector("[data-theme-toggle]").click()');
  check(await evaluate('document.documentElement.dataset.theme==="dark"'),'Dark theme works');
  await navigate('/','document.querySelectorAll(".topic-card").length===10');
  check(await evaluate('document.documentElement.dataset.theme==="dark"'),'Theme survives navigation');
  await evaluate('document.querySelector("[data-theme-toggle]").click()');
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  check(await evaluate('getComputedStyle(document.querySelector(".btn")).transitionDuration==="0s"'),'Reduced motion removes transitions');
  await evaluate('document.querySelector(".hero-image img").dispatchEvent(new Event("error"))');
  check(await evaluate('document.querySelector(".hero-image").classList.contains("image-missing")&&getComputedStyle(document.querySelector(".hero-image .image-fallback")).display==="grid"'),'Unavailable photo shows fallback');
  check(errors.length===0,'No public browser console errors: '+errors.join('; '));
}finally{finish();}
