import {api,esc,notice} from './common.js';
import {photo,cover} from './images.js';
const paths=[['study','Find a study partner','Revise together or work through a topic.','Study Partners'],['project','Find project partners','Find students to work on a project with.','Project Partners']];
const container=document.querySelector('#paths');
if(container)container.innerHTML=paths.map(([key,title,description,goal])=>`<article class="path-card">${photo(key)}<div class="path-content"><h3>${title}</h3><p>${description}</p><a href="${key==='workshop'?'#topics':'/register.html?goal='+encodeURIComponent(goal)}">${key==='study'?'Find study partners':'Find project partners'} →</a></div></article>`).join('');
try{
  const rows=await api('/public/communities');
  const list=document.querySelector('#topic-list');
  if(list)list.innerHTML=rows.length?rows.map(c=>`<article class="topic-card">${cover(c)}<div class="topic-info"><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><small>${Number(c.member_count)} members</small><a class="text-link" href="/explore.html?id=${c.id}">Explore community ↗</a></div></article>`).join(''):'<p>No active communities yet.</p>';
  const preview=document.querySelector('#community-preview');
  if(preview){const id=Number(new URLSearchParams(location.search).get('id'));const c=rows.find(row=>row.id===id);if(!c)throw new Error('This community is unavailable or archived.');preview.innerHTML=`${cover(c,'community-header')}<h1>${esc(c.name)}</h1><p>${esc(c.description)}</p><p>${Number(c.member_count)} members · Member discussions are available after login.</p><div class="button-row"><a class="btn primary" href="/register.html?interest=${c.interest_id||''}">Join community</a><a class="btn" href="/community.html?id=${c.id}">Log in</a><a class="btn" href="/#topics">All communities</a></div>`;}
}catch(error){notice(error.message);const list=document.querySelector('#topic-list');if(list)list.innerHTML='<p>Communities could not load. Refresh to try again.</p>';}
