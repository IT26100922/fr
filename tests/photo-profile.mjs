import path from 'node:path';
import {evaluate,navigate,viewport,waitFor,check,finish,errors,command,screenshot} from './cdp.mjs';
try{
  await command('Network.clearBrowserCookies');await viewport(1440);await navigate('/login.html','document.documentElement.dataset.authReady==="true"');
  await evaluate('document.querySelector("#login").value="jason";document.querySelector("#password").value="Demo123!";document.querySelector("form").requestSubmit()');await waitFor('location.pathname==="/dashboard.html"&&document.querySelector("#content h1")!==null');
  await navigate('/profile.html','document.querySelector("#photo-file")!==null');
  const doc=await command('DOM.getDocument');const input=await command('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#photo-file'});
  await command('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[path.resolve('test-results/photo-valid.png')]});
  await evaluate('document.querySelector("#photo-form").requestSubmit()');
  await waitFor('document.querySelector(".profile-banner img")?.naturalWidth>0');
  check(true,'Profile photo uploaded through real authenticated UI');
  check(await evaluate('document.querySelector("#sidebar .avatar img")?.naturalWidth>0'),'Sidebar uses uploaded member photo');
  await navigate('/profile.html','document.querySelector(".profile-banner img")?.naturalWidth>0');
  check(true,'Uploaded photo survives navigation and profile reload');
  const oldName=await evaluate('document.querySelector("#fullName").value');
  await evaluate('document.querySelector("#bio").value="Learning Java and looking for a study partner. <script>not markup</script>";document.querySelector("#profile-form").requestSubmit()');
  await waitFor('document.querySelector(".post-body").textContent.includes("Learning Java")');
  check(await evaluate('!document.querySelector(".post-body script")&&document.querySelector(".post-body").textContent.includes("<script>")'),'Profile editing persists and escapes text');
  for(const width of [390,768,1024,1440]){await viewport(width);check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Profile fits '+width);await screenshot('profile-'+width);}
  await evaluate('document.querySelector("[data-action=remove-photo]").click()');await waitFor('document.querySelector("#confirm-yes")!==null');await evaluate('document.querySelector("#confirm-yes").click()');
  await waitFor('!document.querySelector(".profile-banner img")&&!document.querySelector("dialog[open]")');
  check(await evaluate('document.querySelector(".profile-banner .avatar span").textContent==="JP"'),'Removing photo restores initials fallback');
  check(errors.length===0,'No photo/profile browser console errors: '+errors.join('; '));
}finally{finish();}
