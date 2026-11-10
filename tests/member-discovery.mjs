import {evaluate,navigate,viewport,screenshot,waitFor,check,finish,errors,command} from './cdp.mjs';
try{
  await command('Network.clearBrowserCookies');await viewport(1440);
  await navigate('/login.html','document.documentElement.dataset.authReady==="true"');
  await evaluate('document.querySelector("#login").value="jason";document.querySelector("#password").value="Demo123!";document.querySelector("form").requestSubmit()');
  await waitFor('location.pathname==="/dashboard.html"&&document.querySelector("#content h1")!==null');
  check(await evaluate('document.querySelector("#content").textContent.includes("Jason")'),'Member login reaches personalized dashboard');
  for(const width of [390,768,1024,1440]){
    await viewport(width);await navigate('/discover.html','document.querySelector("#people-results")!==null');
    check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'People discovery fits '+width);
    check(await evaluate('document.querySelectorAll("[data-person]").length>0'),'Real recommended profiles at '+width);
    check(await evaluate('document.querySelectorAll(".match-details").length===document.querySelectorAll("[data-person]").length'),'Actual match factors available at '+width);
    await screenshot('discovery-'+width);
  }
  await evaluate('document.querySelector("#filter-experience").value="Beginner";document.querySelector("#filter-experience").dispatchEvent(new Event("change",{bubbles:true}))');
  check(await evaluate('Array.from(document.querySelectorAll(".people-details>small")).every(x=>x.textContent.includes("Beginner"))'),'Experience filter changes displayed people');
  await evaluate('document.querySelector("#clear-filters").click()');
  const originalCount=await evaluate('document.querySelectorAll("[data-person]").length');
  await evaluate('document.querySelector("#filter-goal").value="Mentorship";document.querySelector("#filter-goal").dispatchEvent(new Event("change",{bubbles:true}))');
  check(await evaluate('Array.from(document.querySelectorAll(".goal-line")).every(x=>x.textContent.includes("Mentorship"))'),'Goal filter uses saved preferences');
  await evaluate('document.querySelector("#clear-filters").click()');
  check(await evaluate('document.querySelectorAll("[data-person]").length')===originalCount,'Clearing filters restores suggestions');
  await evaluate('document.querySelector("[data-action=focus-person]").click()');
  check(await evaluate('document.querySelector("dialog[open] .focus-profile")!==null'),'Focused profile dialog works');
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await waitFor('!document.querySelector("dialog[open]")');
  await navigate('/profile.html','document.querySelector("#profile-form")!==null');
  check(await evaluate('document.querySelector("h1").textContent.includes("Jason")'),'Own profile renders stored identity');
  await navigate('/settings.html','document.querySelector(".settings-list")!==null');
  check(await evaluate('document.querySelector("[data-theme-toggle]")!==null'),'Settings uses functional theme controls');
  check(errors.length===0,'No member-discovery console errors: '+errors.join('; '));
}finally{finish();}
