import {evaluate,navigate,viewport,waitFor,check,finish,errors,command,screenshot} from './cdp.mjs';
try{
  await command('Network.clearBrowserCookies');await viewport(1440);await navigate('/login.html','document.documentElement.dataset.authReady==="true"');
  await evaluate('document.querySelector("#login").value="jason";document.querySelector("#password").value="Demo123!";document.querySelector("form").requestSubmit()');await waitFor('location.pathname==="/dashboard.html"&&document.querySelector("#content h1")!==null');
  await navigate('/messages.html','document.querySelector("#message-form")!==null');
  await waitFor('document.querySelector("#chat-title").textContent!=="Choose a conversation"');
  check(await evaluate('document.querySelectorAll("[data-chat-type]").length===3'),'Private/group messaging navigation preserved');
  const name='Browser study group '+Date.now();
  await evaluate('document.querySelector("[data-action=create-group]").click()');await waitFor('document.querySelector("#group-form")!==null');
  await evaluate(`document.querySelector('#group-name').value=${JSON.stringify(name)};document.querySelector('#participant-5').checked=true;document.querySelector('#group-form').requestSubmit()`);
  await waitFor('document.querySelector("#chat-title")?.textContent==='+JSON.stringify(name));
  check(true,'Group created through UI with accepted friend');
  const message='Ready to work on our Java project '+Date.now();
  await evaluate(`document.querySelector('#message-input').value=${JSON.stringify(message)};document.querySelector('#message-input').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#message-form').requestSubmit()`);
  await waitFor('document.querySelector("#chat-messages").textContent.includes('+JSON.stringify(message)+')');
  check(await evaluate('(async()=>{const rows=await(await fetch("/api/conversations")).json();const c=rows.find(x=>x.display_name==='+JSON.stringify(name)+');const data=await(await fetch("/api/messages?conversationId="+c.id)).json();return data.messages.some(m=>m.body==='+JSON.stringify(message)+');})()'),'Sent group message persisted in PostgreSQL');
  await evaluate('window.realFetch=window.fetch;window.fetch=(input,init)=>input==="/api/messages"&&init?.method==="POST"?Promise.reject(new TypeError("Simulated interrupted connection")):window.realFetch(input,init);document.querySelector("#message-input").value="Keep this draft";document.querySelector("#message-form").requestSubmit()');
  await waitFor('document.querySelector("#message-state").textContent.includes("not sent")');
  check(await evaluate('document.querySelector("#message-input").value==="Keep this draft"&&!document.querySelector("#message-form button").disabled'),'Failed send preserves draft and enables explicit retry');
  await evaluate('window.fetch=window.realFetch;delete window.realFetch');
  for(const width of [390,768,1024,1440]){await viewport(width);check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Messages fit '+width);await screenshot('messages-'+width);}
  await evaluate('document.querySelector("[data-chat-type=PRIVATE]").click()');
  check(await evaluate('Array.from(document.querySelectorAll(".chat-choice small")).every(x=>x.textContent.includes("Private"))'),'Private conversations can be browsed separately');
  check(errors.length===0,'No messaging browser console errors: '+errors.join('; '));
}finally{finish();}
