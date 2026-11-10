// Only environment photographs are stock. Member portraits come from their own upload.
export const interestImages = {1:'workshop',2:'study',3:'security',4:'project',5:'web',6:'mobile',7:'data',8:'network',9:'cloud',10:'project'};
const descriptions = {hero:'Students sharing ideas around a table with laptops',study:'People studying together',project:'A team working on a project',workshop:'A collaborative workshop',ai:'A person working at a shared table',ml:'Hands reviewing information on a laptop',security:'Technology equipment',software:'Software source code',web:'Web analytics on a laptop',mobile:'A mobile application on a phone',data:'Charts and data',network:'Electronic networking components',cloud:'Computing infrastructure',devops:'A shared project workspace'};
const escape = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function photo(key='workshop',className='',eager=false){
  if(!Object.hasOwn(descriptions,key))key='workshop';
  return `<div class="photo ${escape(className)}"><img src="/assets/images/photos/${key}-1280.webp" srcset="/assets/images/photos/${key}-640.webp 640w, /assets/images/photos/${key}-1280.webp 1280w" sizes="(max-width:650px) 100vw, (max-width:1000px) 50vw, 600px" width="1280" height="850" alt="${descriptions[key]}" loading="${eager?'eager':'lazy'}" decoding="async"${eager?' fetchpriority="high"':''}><span class="image-fallback" aria-hidden="true">Photo unavailable</span></div>`;
}
export function cover(community,className='community-cover'){return photo(interestImages[community.interest_id]||'workshop',className);}
document.addEventListener('error',event=>{
  if(event.target instanceof HTMLImageElement){event.target.hidden=true;event.target.closest('.photo,.avatar')?.classList.add('image-missing');}
},true);
