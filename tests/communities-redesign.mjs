import {evaluate,navigate,viewport,waitFor,check,finish,errors,command,screenshot} from './cdp.mjs';
try{
  await command('Network.clearBrowserCookies');await viewport(1440);await navigate('/login.html','document.documentElement.dataset.authReady==="true"');
  await evaluate('document.querySelector("#login").value="jason";document.querySelector("#password").value="Demo123!";document.querySelector("form").requestSubmit()');
  await waitFor('location.pathname==="/dashboard.html"&&document.querySelector("#content h1")!==null');
  await navigate('/communities.html','document.querySelector("#community-results .community-card")!==null');
  check(await evaluate('document.querySelectorAll(".community-cover img").length>0'),'Communities have local photograph covers');
  await evaluate('document.querySelector("#community-query").value="Mobile";document.querySelector("#community-query").dispatchEvent(new Event("input",{bubbles:true}))');
  check(await evaluate('document.querySelectorAll(".community-card").length===1&&document.querySelector(".community-card").textContent.includes("Mobile Development")'),'Community search uses actual category names');
  await navigate('/community.html?id=1','document.querySelector("#post-form")!==null');
  const title='Browser discussion '+Date.now();
  await evaluate(`document.querySelector('#title').value=${JSON.stringify(title)};document.querySelector('#body').value='A student project question for browser verification.';document.querySelector('#post-form').requestSubmit()`);
  await waitFor('document.querySelector("#my-submissions").textContent.includes('+JSON.stringify(title)+')');
  check(await evaluate('document.querySelector("#my-submissions").textContent.includes("Waiting for review")'),'Author receives persistent pending review feedback');
  check(!await evaluate('Array.from(document.querySelectorAll("[data-post-card] h3")).some(h=>h.textContent==='+JSON.stringify(title)+')'),'Pending post stays outside approved discussions');
  const before=await evaluate('document.querySelector(".comments summary").textContent');
  await evaluate('document.querySelector(".comments").open=true;document.querySelector(".comment-form input").value="Thanks — happy to study together.";document.querySelector(".comment-form").requestSubmit()');
  await waitFor('document.querySelector("#content .comment")!==null');
  await navigate('/feed.html','document.querySelector("#feed-posts [data-post-card]")!==null');
  check(await evaluate('document.querySelectorAll(".post-meta .person-row").length>0'),'Community feed renders authors and real posts');
  for(const width of [390,768,1024,1440]){await viewport(width);check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Community feed fits '+width);await screenshot('feed-'+width);}
  await navigate('/community.html?id=9','document.querySelector(".community-header")!==null');
  await waitFor('document.querySelector("#content h1")!==null');
  const joined=await evaluate('document.querySelector("#post-form")!==null');
  if(!joined){await evaluate('document.querySelector("[data-action=join]").click()');await waitFor('document.querySelector("#post-form")!==null');check(true,'Join community updates membership UI');await evaluate('document.querySelector("[data-action=leave]").click()');await waitFor('document.querySelector("#confirm-yes")!==null');await evaluate('document.querySelector("#confirm-yes").click()');await waitFor('document.querySelector("#post-form")===null&&document.querySelector("[data-action=join]")!==null');check(true,'Leave confirmation updates membership UI');}
  check(errors.length===0,'No community browser console errors: '+errors.join('; '));
}finally{finish();}
