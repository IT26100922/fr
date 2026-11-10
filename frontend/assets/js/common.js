import './images.js';
// Never send form contents through a native GET during module/loading races.
document.addEventListener('submit',event=>{event.preventDefault();if(event.target.closest('#content[aria-busy="true"]')){event.stopImmediatePropagation();toast('This page is still loading. Please try again in a moment.');}},true);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const initials = name => String(name || '?').split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase();
export const avatar = (person,large=false) => {
  const user=typeof person==='object'&&person!==null?person:{full_name:person};
  const url=/^\/api\/photos\?userId=\d+&v=[a-f0-9-]+$/.test(user.photo_url||'')?user.photo_url:'';
  return `<div class="avatar${large?' large':''}" aria-hidden="true"><span>${esc(initials(user.full_name))}</span>${url?`<img src="${esc(url)}" alt="" width="160" height="160" loading="lazy">`:''}</div>`;
};
export const tags = values => `<div class="tags">${values.map(value=>`<span class="tag">${esc(typeof value==='object'?value.name:value)}</span>`).join('')}</div>`;
export const empty = text => `<div class="empty">${esc(text)}</div>`;
export const date = value => { if(!value)return ''; const source=String(value).replace(' ','T');const parsed=new Date(/[Zz]$|[+-]\d\d:\d\d$/.test(source)?source:source+'Z'); return Number.isNaN(parsed.getTime())?String(value):parsed.toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
export async function api(path,data) {
  const response=await fetch('/api'+path,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
  const result=await response.json();
  if(!response.ok){const error=new Error(result.error||'Something went wrong');error.status=response.status;throw error;}
  return result;
}
export function notice(message,success=false,target=document.querySelector('#notice')){if(target){target.className='notice'+(success?' success':'');target.textContent=message;}}
export function toast(message){let box=document.querySelector('#toast');if(!box){box=document.createElement('div');box.id='toast';box.className='toast notice success';box.setAttribute('role','status');document.body.append(box);}box.textContent=message;clearTimeout(box.timer);box.timer=setTimeout(()=>box.textContent='',4500);}
export async function submit(form,work){const button=form.querySelector('button[type=submit]');const target=form.querySelector('.form-notice')||form.closest('dialog')?.querySelector('.notice')||document.querySelector('#notice');const label=button?.textContent;if(button){button.disabled=true;button.textContent='Saving…';}form.setAttribute('aria-busy','true');notice('',false,target);try{await work(Object.fromEntries(new FormData(form)));}catch(error){notice(error.message,false,target);}finally{form.removeAttribute('aria-busy');if(button){button.disabled=false;button.textContent=label;}}}
// Keep the native pointer; motion is limited to CSS state transitions.
export function setTheme(theme){
  const value=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=value;
  try{localStorage.setItem('ff-theme',value);}catch{}
  document.querySelectorAll('[data-theme-toggle]').forEach(b=>{b.textContent=value==='dark'?'Light theme':'Dark theme';b.setAttribute('aria-label',`Switch to ${value==='dark'?'light':'dark'} theme`);});
}
let savedTheme='light';try{savedTheme=localStorage.getItem('ff-theme')||'light';}catch{}
setTheme(savedTheme);
document.addEventListener('click',e=>{if(e.target.closest('[data-theme-toggle]'))setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');});
export const themeButton=()=>`<button class="btn small" type="button" data-theme-toggle aria-label="Switch theme">${document.documentElement.dataset.theme==='dark'?'Light theme':'Dark theme'}</button>`;
export function icon(name){const paths={home:'M3 10 12 3 21 10v11h-6v-7H9v7H3z',people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9',community:'M3 21V7l9-4 9 4v14M7 21v-6h10v6M7 9h1m4 0h1m4 0h1',chat:'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5',profile:'M20 21a8 8 0 0 0-16 0M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',feed:'M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5',settings:'M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2 2m8.8 8.8 2 2M5.6 18.4l2-2m8.8-8.8 2-2'};return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.home}"/></svg>`;}
