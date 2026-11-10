import {evaluate,navigate,viewport,waitFor,check,finish,errors,command,screenshot} from './cdp.mjs';

const login=async username=>{
  await navigate('/login.html','document.documentElement.dataset.authReady==="true"');
  await evaluate(`fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login:${JSON.stringify(username)},password:'Demo123!'})}).then(r=>{if(!r.ok)throw new Error('Login failed')})`);
};
const selectPhotos=async(id,count)=>evaluate(`(async()=>{
  const canvas=document.createElement('canvas');canvas.width=120;canvas.height=90;
  const context=canvas.getContext('2d');context.fillStyle='#79a4c2';context.fillRect(0,0,120,90);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  const transfer=new DataTransfer();for(let i=0;i<${count};i++)transfer.items.add(new File([blob],'team-'+i+'.png',{type:'image/png'}));
  const input=document.querySelector('#${id} input');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
})()`);
try{
  await command('Network.clearBrowserCookies');await viewport(1280);await login('jason');
  const cid=await evaluate(`fetch('/api/conversations/private',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:5})}).then(r=>r.json()).then(r=>r.id)`);
  await navigate('/messages.html?conversation='+cid,'document.querySelector("#message-form")!==null');
  await selectPhotos('message-photos',1);
  check(await evaluate('document.querySelectorAll("#message-photos .photo-preview img").length===1&&!document.querySelector("#message-input").required'),'Chat preview permits photo-only sending');
  await evaluate('document.querySelector("#message-photos .photo-preview button").click()');
  check(await evaluate('!document.querySelector("#message-photos .photo-preview")&&document.querySelector("#message-input").required'),'Removing photo restores text requirement');
  await selectPhotos('message-photos',1);
  // Hold the request so busy controls and duplicate-event handling can be observed.
  await evaluate(`window.photoFetch=window.fetch;window.photoRequests=0;window.fetch=(url,options)=>{if(url==='/api/messages/with-photo'){window.photoRequests++;return new Promise((resolve,reject)=>{window.releasePhoto=()=>window.photoFetch(url,options).then(resolve,reject);});}return window.photoFetch(url,options);};document.querySelector('#message-form').requestSubmit();document.querySelector('#message-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));`);
  check(await evaluate('window.photoRequests===1&&document.querySelector("#message-form button[type=submit]").disabled&&document.querySelector("#message-state").textContent.includes("Uploading")&&document.querySelector("#message-photos .add-photos").disabled'),'Uploading state disables controls and prevents duplicates');
  await evaluate('window.releasePhoto()');
  await waitFor('document.querySelector("#message-state").textContent==="Message sent."&&document.querySelector("#message-form").getAttribute("aria-busy")!=="true"');
  await evaluate('window.fetch=window.photoFetch');
  await waitFor('!!document.querySelector(".bubble .attachment-photo")');
  check(await evaluate('!document.querySelector("#message-photos .photo-preview")'),'Successful send clears preview');
  await evaluate('Array.from(document.querySelectorAll(".bubble .attachment-open")).at(-1).click()');
  await waitFor('document.querySelector(".photo-viewer .attachment-photo")?.naturalWidth>0');
  check(true,'Conversation photo opens in larger viewer');
  await evaluate('document.querySelector(".photo-viewer-close").click()');
  await selectPhotos('message-photos',1);
  check(await evaluate('document.querySelectorAll("#message-photos .photo-preview").length===1'),'Retry fixture selected after previous upload completes');
  await evaluate(`window.fetch=(url,options)=>url==='/api/messages/with-photo'?Promise.reject(new TypeError('Simulated upload failure')):window.photoFetch(url,options);document.querySelector('#message-input').value='Keep caption';document.querySelector('#message-form').requestSubmit();`);
  await waitFor('document.querySelector("#message-state").textContent.includes("not sent")');
  check(await evaluate('document.querySelector("#message-input").value==="Keep caption"&&!!document.querySelector("#message-photos .photo-preview")&&!document.querySelector("#message-form button[type=submit]").disabled'),'Failed upload preserves caption/photo and allows retry');
  await evaluate('window.fetch=window.photoFetch');
  await navigate('/community.html?id=1','document.querySelector("#post-form")!==null');
  await selectPhotos('post-photos',4);
  check(await evaluate('document.querySelectorAll("#post-photos .photo-preview").length===4&&!document.querySelector("#title").required&&!document.querySelector("#body").required'),'Community accepts four previews and photo-only post');
  await selectPhotos('post-photos',1);
  check(await evaluate('document.querySelectorAll("#post-photos .photo-preview").length===4&&document.querySelector(".photo-picker-error").textContent.includes("at most")'),'Fifth photo rejected without losing selection');
  await evaluate('document.querySelector("#post-photos .photo-preview button").click()');
  check(await evaluate('document.querySelectorAll("#post-photos .photo-preview").length===3'),'Individual community photo can be removed');
  const marker='UI attachment '+Date.now();
  await evaluate(`document.querySelector('#title').value=${JSON.stringify(marker)};document.querySelector('#body').value='Caption from composer';document.querySelector('#post-form').requestSubmit()`);
  await waitFor('document.querySelector("#my-submissions").textContent.includes('+JSON.stringify(marker)+')');
  const pid=await evaluate(`fetch('/api/posts/mine').then(r=>r.json()).then(rows=>rows.find(p=>p.title===${JSON.stringify(marker)}).id)`);
  check(await evaluate('!document.querySelector("#post-photos .photo-preview")&&document.querySelector("#my-submissions").textContent.includes("Waiting for review")'),'Submitted post shows pending status and clears previews');
  await login('ai_leader');await navigate('/leader/approvals.html','document.querySelector("#content h1")!==null');
  await waitFor('Array.from(document.querySelectorAll(".post")).some(p=>p.textContent.includes('+JSON.stringify(marker)+')&&p.querySelectorAll(".attachment-photo").length===3)');
  check(true,'Assigned leader sees pending photo preview');
  await evaluate(`document.querySelector('[data-action=approve][data-id="${pid}"]').click()`);
  await waitFor('!document.querySelector(\'[data-action=approve][data-id="'+pid+'"]\')');
  await login('nethmi');await navigate('/community.html?id=1','document.querySelector("#post-form")!==null');
  await waitFor('document.querySelector(\'[data-post-card="'+pid+'"] .attachment-photo\')?.naturalWidth>0');
  check(await evaluate('document.querySelector(\'[data-post-card="'+pid+'"]\').querySelectorAll(".attachment-photo").length===3'),'Recipient sees approved photo grid');
  for(const width of [390,768,1280]){
    await viewport(width);check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Community attachments fit '+width);
  }
  await viewport(390);await screenshot('attachment-community-mobile');
  await navigate('/messages.html?conversation='+cid,'document.querySelector("#message-form")!==null');
  await viewport(390);
  check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Chat attachments fit mobile');
  await screenshot('attachment-chat-mobile');
  check(errors.length===0,'No unexpected browser console errors: '+errors.join('; '));
}finally{finish();}
