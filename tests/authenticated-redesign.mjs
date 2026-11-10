import {evaluate,navigate,viewport,waitFor,check,finish,errors,command,screenshot} from './cdp.mjs';
const suffix=String(Date.now()),username='student_'+suffix,name='Browser Student '+suffix.slice(-6);
async function fill(selector,value){await evaluate(`document.querySelector(${JSON.stringify(selector)}).value=${JSON.stringify(value)}`);}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);}
async function login(user){await navigate('/login.html','document.documentElement.dataset.authReady==="true"');await fill('#login',user);await fill('#password','Demo123!');await evaluate('document.querySelector("form").requestSubmit()');await waitFor('location.pathname!=="/login.html"&&document.querySelector("#content h1")!==null');}
async function logout(){await viewport(1440);await click('[data-action=logout]');await waitFor('location.pathname==="/login.html"&&document.documentElement.dataset.authReady==="true"');}
async function userSearch(){await navigate('/admin/users.html','document.querySelector("#search-form")!==null');await fill('#search',username);await evaluate('document.querySelector("#search-form").requestSubmit()');await waitFor('document.querySelectorAll("tbody tr").length===1&&document.querySelector("tbody").textContent.includes('+JSON.stringify(username)+')');}
try{
  await command('Network.clearBrowserCookies');await viewport(1440);await navigate('/register.html','document.documentElement.dataset.authReady==="true"');
  for(const [selector,value] of Object.entries({'#fullName':name,'#username':username,'#email':username+'@example.test','#password':'Demo123!','#confirmPassword':'Demo123!'}))await fill(selector,value);
  await evaluate('document.querySelector("form").requestSubmit()');await waitFor('location.pathname==="/questionnaire.html"&&document.querySelector("#question-form")!==null');
  check(true,'Registration creates real member session and opens questionnaire');
  await fill('#rating-1','5');await evaluate('document.querySelector("#question-form").requestSubmit()');await waitFor('document.querySelector("#question-form h2").textContent==="Your experience"');
  await click('input[value=Intermediate]');await evaluate('document.querySelector("#question-form").requestSubmit()');await waitFor('document.querySelector("#question-form h2").textContent==="Your goals"');
  await click('#back');await waitFor('document.querySelector("#question-form h2").textContent==="Your experience"');
  check(await evaluate('document.querySelector("input[value=Intermediate]").checked'),'Previous step retains selected answer');
  await evaluate('document.querySelector("#question-form").requestSubmit()');await waitFor('document.querySelector("#question-form h2").textContent==="Your goals"');
  await evaluate('document.querySelectorAll("input[type=checkbox]").forEach(i=>i.checked=false);document.querySelector("#question-form").requestSubmit()');
  check(await evaluate('document.querySelector("#question-error").textContent.includes("at least one")'),'Questionnaire validates goals inline');
  await evaluate('document.querySelector("input[value=Friends]").checked=true;document.querySelector("input[value=\\"Project Partners\\"]").checked=true;document.querySelector("#question-form").requestSubmit()');
  await waitFor('document.querySelector("#question-form h2").textContent==="How you collaborate"');await evaluate('document.querySelector("#question-form").requestSubmit()');await waitFor('document.querySelector("#question-form h2").textContent==="How often you take part"');
  for(const width of [390,768,1024,1440]){await viewport(width);check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Questionnaire fits '+width);await screenshot('questionnaire-'+width);}
  await evaluate('document.querySelector("#question-form").requestSubmit()');await waitFor('location.pathname==="/dashboard.html"&&document.querySelector("#content h1")!==null');
  const member=await evaluate('(async()=>await(await fetch("/api/users/me")).json())()');
  check(member.onboarded&&member.interests.length===10&&member.interests.find(i=>i.id===1).rating===5&&member.experience==='Intermediate','All questionnaire steps persist through Java/PostgreSQL');
  await viewport(1440);await navigate('/discover.html','document.querySelector("[data-person=\\"5\\"]")!==null');await click('[data-person="5"] [data-action=friend-request]');await waitFor('!document.querySelector("[data-person=\\"5\\"]")');
  check(true,'Sending friend request updates real recommendation state');
  await logout();await login('nethmi');await navigate('/friends.html','document.querySelector("#content").textContent.includes('+JSON.stringify(name)+')');
  const rid=await evaluate('(async()=>{const r=await(await fetch("/api/friends/requests")).json();return r.find(x=>x.sender_id==='+member.id+').id;})()');
  await click(`[data-action=accept][data-id="${rid}"]`);await waitFor('!document.querySelector("[data-action=accept][data-id=\\"'+rid+'\\"]")');
  check(await evaluate('(async()=>{const f=await(await fetch("/api/friends")).json();return f.some(x=>x.id==='+member.id+');})()'),'Recipient accepts request through UI and friendship persists');
  await logout();await login(username);await navigate('/friends.html','document.querySelector("[data-action=private][data-id=\\"5\\"]")!==null');await click('[data-action=private][data-id="5"]');await waitFor('location.pathname==="/messages.html"&&document.documentElement.dataset.appReady==="true"&&document.querySelector("#message-input")!==null');
  const privateMessage='Hi! Want to study Java this week? '+suffix;
  await fill('#message-input',privateMessage);await evaluate('document.querySelector("#message-form").requestSubmit()');await waitFor('document.querySelector("#chat-messages")?.textContent.includes('+JSON.stringify(privateMessage)+')');
  check(true,'Accepted friends can send a persisted private message through UI');
  await navigate('/community.html?id=1','document.querySelector("[data-action=join]")!==null');await click('[data-action=join]');await waitFor('document.querySelector("#post-form")!==null');
  const titles=['Viva study session '+suffix,'Project idea '+suffix];
  for(const title of titles){await fill('#title',title);await fill('#body','A real browser workflow fixture for leader moderation.');await evaluate('document.querySelector("#post-form").requestSubmit()');await waitFor('document.querySelector("#my-submissions").textContent.includes('+JSON.stringify(title)+')');}
  const mine=await evaluate('(async()=>await(await fetch("/api/posts/mine?communityId=1")).json())()');const ids=titles.map(t=>mine.find(p=>p.title===t).id);
  await logout();await login('ai_leader');await navigate('/leader/approvals.html','document.querySelector("[data-action=approve][data-id=\\"'+ids[0]+'\\"]")!==null');
  await click(`[data-action=approve][data-id="${ids[0]}"]`);await waitFor('!document.querySelector("[data-action=approve][data-id=\\"'+ids[0]+'\\"]")');
  await click(`[data-action=post-reject][data-id="${ids[1]}"]`);await waitFor('document.querySelector("#confirm-yes")!==null');await click('#confirm-yes');await waitFor('!document.querySelector("[data-action=post-reject][data-id=\\"'+ids[1]+'\\"]")');
  check(await evaluate('(async()=>{const posts=await(await fetch("/api/posts")).json();return posts.some(p=>p.id==='+ids[0]+')&&!posts.some(p=>p.id==='+ids[1]+');})()'),'Leader UI approves/rejects and feed publishes only approved content');
  check(await evaluate('Array.from(document.querySelectorAll(".post")).filter(p=>p.textContent.includes("cannot moderate your own")).every(p=>!p.querySelector("[data-action=approve]"))'),'Leader-authored posts have no self-approval control');
  for(const width of [390,768,1024,1440]){await viewport(width);check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Leader moderation fits '+width);await screenshot('leader-'+width);}
  await logout();await login('admin');
  check(await evaluate('(async()=>{const d=await(await fetch("/api/admin/dashboard")).json();return document.querySelector(".stat strong").textContent===String(d.total_users);})()'),'Admin statistics match real database response');
  await userSearch();await click('[data-action=suspend]');await waitFor('document.querySelector("#confirm-yes")!==null');await click('#confirm-yes');await waitFor('document.querySelector("tbody .status").textContent==="Suspended"');
  check(true,'Admin suspends member through confirmed UI action');
  await logout();await fill('#login',username);await fill('#password','Demo123!');await evaluate('document.querySelector("form").requestSubmit()');await waitFor('document.querySelector("#notice").textContent.includes("suspended")');
  check(true,'Suspended member cannot log in through browser');
  // A deliberately rejected login produces one expected HTTP 403 resource log.
  for(let i=errors.length-1;i>=0;i--)if(errors[i].includes('403'))errors.splice(i,1);
  await login('admin');await userSearch();await click('[data-action=reactivate]');await waitFor('document.querySelector("tbody .status").textContent==="Active"');check(true,'Admin reactivates member through UI');
  await navigate('/admin/communities.html','document.querySelector("[data-action=new-community]")!==null');await click('[data-action=new-community]');await waitFor('document.querySelector("#community-name")!==null');
  const cname='Browser project space '+suffix;await fill('#community-name',cname);await fill('#community-description','A disposable browser verification community.');await fill('#community-interest','4');await evaluate('document.querySelector("dialog form").requestSubmit()');await waitFor('!document.querySelector("dialog[open]")&&document.querySelector("#content").textContent.includes('+JSON.stringify(cname)+')');
  const communityId=await evaluate('(async()=>{const rows=await(await fetch("/api/admin/communities")).json();return rows.find(c=>c.name==='+JSON.stringify(cname)+').id;})()');
  await click(`[data-action=assign-leader][data-id="${communityId}"]`);await waitFor('document.querySelector("#leader")!==null');await fill('#leader',String(member.id));await evaluate('document.querySelector("dialog form").requestSubmit()');await waitFor('!document.querySelector("dialog[open]")');check(true,'Admin assigns a real member as community leader');
  await click(`[data-action=edit-community][data-id="${communityId}"]`);await waitFor('document.querySelector("#community-active")!==null');await fill('#community-active','false');await click('#archive-confirm');await evaluate('document.querySelector("dialog form").requestSubmit()');await waitFor('!document.querySelector("dialog[open]")');
  check(await evaluate('(async()=>{const rows=await(await fetch("/api/public/communities")).json();return !rows.some(c=>c.id==='+communityId+');})()'),'Archived community leaves public directory without deleting history');
  await userSearch();for(const width of [390,768,1024,1440]){await viewport(width);check(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Admin user management fits '+width);await screenshot('admin-'+width);}
  await viewport(390);await click('#menu-toggle');check(await evaluate('document.querySelector("#menu-toggle").getAttribute("aria-expanded")==="true"'),'Compact navigation opens accessibly');await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});check(await evaluate('!document.querySelector("#sidebar").classList.contains("open")'),'Escape closes mobile navigation');
  await navigate('/admin/reports.html','document.querySelector("#report-content .stat")!==null');check(await evaluate('document.querySelectorAll("#report-content .stat").length===10'),'Admin report renders persisted event metrics');
  await navigate('/admin/activity.html','document.querySelector("table")!==null');check(!await evaluate('document.querySelector("#content").textContent.includes('+JSON.stringify(privateMessage)+')'),'Admin activity does not reveal private message contents');
  await logout();await login(username);check(await evaluate('document.querySelector("#sidebar").textContent.includes("Leader dashboard")'),'Promoted member retains member capabilities and gets leader navigation');
  check(errors.length===0,'No unexpected authenticated browser console errors: '+errors.join('; '));
}finally{finish();}
