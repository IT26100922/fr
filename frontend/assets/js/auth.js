import {api,submit} from './common.js';
const form=document.querySelector('form');
const params=new URLSearchParams(location.search);
try{if(['Study Partners','Project Partners','Friends'].includes(params.get('goal')))sessionStorage.setItem('ff-start-goal',params.get('goal'));if(/^[1-9]\d?$/.test(params.get('interest')||''))sessionStorage.setItem('ff-start-interest',params.get('interest'));}catch{}
document.querySelectorAll('[data-password]').forEach(button=>button.addEventListener('click',()=>{const input=document.getElementById(button.dataset.password);const show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'Hide':'Show';button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',`${show?'Hide':'Show'} ${input.name==='confirmPassword'?'confirmation password':'password'}`);}));
form.querySelector('#confirmPassword')?.addEventListener('input',event=>event.target.setCustomValidity(''));
form.addEventListener('submit',event=>{event.preventDefault();const confirm=form.querySelector('#confirmPassword');if(confirm&&confirm.value!==form.password.value){confirm.setCustomValidity('Passwords do not match.');confirm.reportValidity();return;}submit(form,async data=>{const register=document.body.dataset.page==='register';const result=await api(register?'/register':'/login',data);location.href=register||(!result.user.onboarded&&result.user.role!=='ADMIN')?'/questionnaire.html':result.user.dashboard;});});
document.documentElement.dataset.authReady='true';
