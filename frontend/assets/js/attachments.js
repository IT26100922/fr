import {esc} from './common.js';

const pickers=new Set();
const imagePlus='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H4v17h17V10M4 16l5-5 5 5 3-3 4 4M18 2v6m-3-3h6"/><circle cx="8" cy="7" r="1"/></svg>';
export function photoPickerMarkup(id,max) {
  return `<div class="photo-picker" id="${id}"><input class="photo-file-input" type="file" accept="image/jpeg,image/png,image/webp" ${max>1?'multiple':''} aria-label="Choose photos" hidden><button class="btn small add-photos" type="button">${imagePlus}<span>${max===1?'Attach photo':'Add photos'}</span></button><small class="muted">${max===1?'One photo':'Up to '+max+' photos'} · JPEG, PNG or WebP · 5 MB each</small><div class="photo-previews" aria-label="Selected photos"></div><p class="photo-picker-error notice" role="alert"></p></div>`;
}
export function mountPhotoPicker(id,max,onChange=()=>{}) {
  const root=document.getElementById(id),input=root.querySelector('input'),previews=root.querySelector('.photo-previews'),error=root.querySelector('.photo-picker-error');
  let selected=[],urls=[],busy=false;
  const release=()=>{urls.forEach(url=>URL.revokeObjectURL(url));urls=[];};
  const render=()=>{
    release();previews.replaceChildren();
    selected.forEach((file,index)=>{
      const item=document.createElement('div');item.className='photo-preview';
      const image=document.createElement('img');image.src=URL.createObjectURL(file);urls.push(image.src);image.alt='Selected photo '+(index+1);
      const remove=document.createElement('button');remove.type='button';remove.className='btn small';remove.textContent='Remove';remove.disabled=busy;remove.setAttribute('aria-label','Remove photo '+(index+1));
      remove.onclick=()=>{if(busy)return;selected.splice(index,1);render();};
      item.append(image,remove);previews.append(item);
    });
    onChange(selected.length);
  };
  root.querySelector('.add-photos').onclick=()=>{if(!busy)input.click();};
  input.onchange=()=>{
    const files=Array.from(input.files);input.value='';error.textContent='';
    if(busy)return;
    if(selected.length+files.length>max){error.textContent='Choose at most '+max+' photo'+(max===1?'':'s')+'.';return;}
    if(files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size===0||file.size>5*1024*1024)){error.textContent='Choose nonempty JPEG, PNG or WebP photos up to 5 MB each.';return;}
    selected.push(...files);render();
  };
  const picker={
    files:()=>selected.slice(),
    clear:()=>{selected=[];error.textContent='';render();},
    setBusy:value=>{busy=value;root.querySelectorAll('button,input').forEach(control=>control.disabled=value);},
    setVisible:value=>{root.hidden=!value;if(!value)picker.clear();},
    destroy:()=>{release();pickers.delete(picker);}
  };
  pickers.add(picker);return picker;
}
export function releasePhotoPreviews(){for(const picker of [...pickers])picker.destroy();}
export async function uploadPhotos(path,fields,files){
  const data=new FormData();for(const [key,value] of Object.entries(fields))data.append(key,String(value));
  files.forEach(file=>data.append('photos',file));
  const response=await fetch('/api'+path,{method:'POST',credentials:'same-origin',body:data});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Photo upload failed.');return result;
}
export function attachmentImages(photos=[]){
  if(!photos.length)return '';
  return `<div class="attachment-grid${photos.length===1?' single':''}">${photos.map(photo=>{
    const id=Number(photo.id);if(!Number.isSafeInteger(id)||id<1)return '';
    return `<button type="button" class="attachment-open" data-photo-id="${id}" aria-label="Open photo at larger size"><img class="attachment-photo" src="/api/attachments/${id}" loading="lazy" alt="Attached photo"></button>`;
  }).join('')}</div>`;
}
document.addEventListener('error',event=>{
  if(!event.target.matches?.('.attachment-photo'))return;
  const image=event.target;image.hidden=true;
  const text=document.createElement('span');text.className='muted';text.textContent='Photo unavailable';image.after(text);
},true);
document.addEventListener('click',event=>{
  const button=event.target.closest('.attachment-open');if(!button)return;
  const id=Number(button.dataset.photoId);if(!Number.isSafeInteger(id)||id<1)return;
  const dialog=document.createElement('dialog');dialog.className='photo-viewer';
  dialog.setAttribute('aria-label','Attached photo');
  dialog.innerHTML=`<button class="btn small photo-viewer-close" type="button" autofocus>Close photo</button><img class="attachment-photo" src="/api/attachments/${esc(id)}" alt="Attached photo at larger size">`;
  dialog.querySelector('button').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{dialog.remove();if(button.isConnected)button.focus();});
  dialog.onclick=e=>{if(e.target===dialog)dialog.close();};document.body.append(dialog);dialog.showModal();
});
