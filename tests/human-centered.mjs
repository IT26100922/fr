// Content, responsive layout and state checks for the student community refinement.
import {command,evaluate,navigate,viewport,screenshot,waitFor,check,finish,errors,base} from './cdp.mjs';

const widths=[390,768,1024,1440];
async function login(username){
  await command('Network.clearBrowserCookies');
  await navigate('/login.html','document.documentElement.dataset.authReady==="true"');
  await evaluate(`document.querySelector('#login').value=${JSON.stringify(username)};document.querySelector('#password').value='Demo123!';document.querySelector('form').requestSubmit()`);
  await waitFor('document.documentElement.dataset.appReady==="true"');
}
async function inspect(path,ready){
  for(const width of widths){
    await viewport(width);await navigate(path,ready);
    const facts=await evaluate(`(()=>{
      const visible=e=>e.getClientRects().length>0;
      return {
        fits:document.documentElement.scrollWidth<=innerWidth+1,
        heading:document.querySelectorAll('h1').length===1,
        skip:!!document.querySelector('.skip-link')&&!!document.querySelector('#main'),
        fields:[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(visible).every(e=>e.id&&document.querySelector('label[for="'+e.id+'"]')),
        portraits:[...document.querySelectorAll('.avatar img')].every(i=>i.getAttribute('src').startsWith('/api/photos?')),
        photos:[...document.images].filter(i=>visible(i)&&i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth>0)
      };
    })()`);
    check(facts.fits&&facts.heading&&facts.skip&&facts.fields&&facts.portraits,`${path} at ${width}: layout, heading, skip link, labels, member image source`);
    // Wait for visible images, including lazy images just entering the viewport.
    await waitFor('[...document.images].filter(i=>i.getClientRects().length&&i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth>0)');
    check(true,`${path} at ${width}: visible images loaded`);
    if(width===390||width===1440)await screenshot('humanized-'+path.replace(/[^a-z0-9]/gi,'-')+'-'+width);
  }
}
async function inject(source){return (await command('Page.addScriptToEvaluateOnNewDocument',{source})).identifier;}
async function remove(id){await command('Page.removeScriptToEvaluateOnNewDocument',{identifier:id});}
try{
  await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await command('Network.clearBrowserCookies');
  for(const width of widths){
    await viewport(width);await navigate('/','document.querySelectorAll(".topic-card").length===10');
    check(await evaluate(`document.querySelector('.hero h1').textContent==='Find your people in tech.'&&document.querySelector('.hero p').textContent==='Meet students who share your interests. Study together, make friends, and build projects.'`),'Exact hero heading and description at '+width);
    check(await evaluate(`!document.querySelector('.hero .eyebrow,.hero-note,.photo-caption,.brand small')&&document.querySelectorAll('.hero .btn').length===2`),'Hero has two actions and no removed marketing elements at '+width);
    check(await evaluate(`['Communities','How it works','Log in','Join us'].every(label=>[...document.querySelectorAll('.landing-nav nav a')].some(a=>a.textContent.trim()===label&&a.getClientRects().length&&getComputedStyle(a).display!=='none'))`),'All four navigation links visible at '+width);
    check(await evaluate(`getComputedStyle(document.querySelector('.hero-image')).borderRadius==='16px'&&getComputedStyle(document.querySelector('.hero h1')).fontSize.replace('px','')<=61`),'Moderate image corners and heading scale at '+width);
  }
  await evaluate(`document.querySelector('.landing-nav a[href="/#topics"]').click()`);await waitFor('location.hash==="#topics"');
  check(true,'Communities navigation reaches the directory');
  await evaluate(`document.querySelector('.landing-nav a[href="/#how"]').click()`);await waitFor('location.hash==="#how"');
  check(true,'How it works navigation reaches the steps');
  await inspect('/','document.querySelectorAll(".topic-card").length===10');
  await inspect('/explore.html?id=1','!!document.querySelector(".community-header")');
  await inspect('/credits.html','!!document.querySelector("#credits-list li")');
  for(const path of ['/login.html','/register.html']){
    await inspect(path,'document.documentElement.dataset.authReady==="true"');
    check(await evaluate('!document.querySelector(".auth-story .photo,.auth-form .eyebrow")'),'No decorative photography or labels on '+path);
  }
  let id=await inject(`const original=window.fetch;window.fetch=(url,...args)=>String(url)==='/api/public/communities'?Promise.resolve(new Response('[]',{headers:{'Content-Type':'application/json'}})):original(url,...args);`);
  await navigate('/','document.querySelector("#topic-list").textContent.includes("No active communities")');check(true,'Empty public directory has a clear state');await remove(id);
  id=await inject(`const original=window.fetch;window.fetch=(url,...args)=>String(url)==='/api/public/communities'?Promise.resolve(new Response(JSON.stringify({error:'Communities unavailable'}),{status:503,headers:{'Content-Type':'application/json'}})):original(url,...args);`);
  await navigate('/','document.querySelector("#notice").textContent.includes("Communities unavailable")');
  check(await evaluate('document.querySelector("#topic-list").textContent.includes("Refresh to try again")'),'Directory failure explains recovery');await remove(id);

  await login('jason');
  for(const path of ['/dashboard.html','/discover.html','/friends.html','/profile.html','/communities.html','/community.html?id=1','/feed.html','/messages.html','/settings.html','/questionnaire.html'])await inspect(path,'document.documentElement.dataset.appReady==="true"');
  id=await inject(`const original=window.fetch;window.fetch=(url,...args)=>String(url)==='/api/matches'?Promise.resolve(new Response('[]',{headers:{'Content-Type':'application/json'}})):original(url,...args);`);
  await navigate('/discover.html','document.documentElement.dataset.appReady==="true"');
  check(await evaluate('document.querySelector("#people-results .empty").textContent.includes("No people match")'),'Empty discovery keeps filters and recovery guidance');await remove(id);
  id=await inject(`const original=window.fetch;window.fetch=async(url,...args)=>{if(String(url)==='/api/matches')await new Promise(resolve=>setTimeout(resolve,1800));return original(url,...args);};`);
  await command('Page.navigate',{url:base+'/discover.html'});await waitFor('document.querySelector("#content")?.getAttribute("aria-busy")==="true"');
  check(true,'Delayed discovery marks content busy');await waitFor('document.documentElement.dataset.appReady==="true"');await remove(id);
  id=await inject(`const original=window.fetch;window.fetch=(url,...args)=>String(url)==='/api/matches'?Promise.resolve(new Response(JSON.stringify({error:'Suggestions unavailable'}),{status:503,headers:{'Content-Type':'application/json'}})):original(url,...args);`);
  await navigate('/discover.html','document.querySelector("#notice").textContent.includes("Suggestions unavailable")');
  check(await evaluate('document.querySelector("#content .empty")!==null&&!document.querySelector("#content").hasAttribute("aria-busy")'),'Failed discovery clears busy state and explains failure');await remove(id);

  await login('ai_leader');
  for(const path of ['/leader/dashboard.html','/leader/approvals.html'])await inspect(path,'document.documentElement.dataset.appReady==="true"');
  await login('admin');
  for(const path of ['/admin/dashboard.html','/admin/users.html','/admin/communities.html','/admin/reports.html','/admin/activity.html'])await inspect(path,'document.documentElement.dataset.appReady==="true"');
  await navigate('/admin/dashboard.html','document.documentElement.dataset.appReady==="true"');
  check(await evaluate('document.querySelectorAll(".stat").length===3&&!document.querySelector("#content").textContent.includes("Most active")'),'Admin home keeps basic totals; detailed reporting stays on its page');
  check(errors.length===0,'No unexpected console errors: '+errors.join('; '));
}finally{finish();}
