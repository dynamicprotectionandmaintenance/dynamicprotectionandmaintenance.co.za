import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.2';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
const COMPANY={
  registration:'2026/759039/07',
  vat:'9147047303',
  address:'28 Silver Oak Avenue, Mount Edgecombe, Durban, KwaZulu-Natal, 4302',
  phone:'+27629706019',
  email:'admin.dynamicmaintenance@gmail.com'
};
const TERMS_URL='https://dynamicprotectionandmaintenance.co.za/invoicing/terms.html';
const addDays=(date,days=7)=>{
  const [y,m,d]=String(date).split('-').map(Number);
  if(!y||!m||!d)return '';
  const value=new Date(Date.UTC(y,m-1,d+days));
  return value.toISOString().slice(0,10);
};
const app=document.querySelector('#app');
const sb=createClient(SUPABASE_URL,SUPABASE_KEY);
let user=null,profile=null,invoices=[],users=[],tab='invoices',editing=null,message='';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const blank=()=>({invoice_number:`DPM-${Date.now()}`,issue_date:today(),due_date:addDays(today()),client_name:'',client_email:'',client_address:'',reference:'',notes:'',vat_rate:15,status:'Draft',items:[{description:'',quantity:1,unit_price:0}]});
const rand=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(Number(n||0));
const calc=i=>{const subtotal=(i.items||[]).reduce((s,x)=>s+Number(x.quantity||0)*Number(x.unit_price||0),0),vat=subtotal*Number(i.vat_rate||0)/100;return {subtotal,vat,total:subtotal+vat}};
const alertMsg=e=>{message=String(e?.message||e);render()};
function shell(inner){app.innerHTML=`<header><div class="brand"><img src="./assets/logo.png"><div><b>DYNAMIC PROTECTION AND MAINTENANCE (PTY) LTD</b><small>Protecting Your Assets. Minimising Downtime.</small></div></div><div class="row"><small>${esc(profile?.full_name||user.email)} · ${esc(profile?.role)}</small><button id="logout">Sign out</button></div></header><main><nav><button data-tab="invoices" class="${tab==='invoices'?'active':''}">Invoices</button>${profile?.role==='admin'?`<button data-tab="users" class="${tab==='users'?'active':''}">Manage users</button>`:''}</nav>${message?`<div class="error">${esc(message)} <button class="secondary" id="dismiss">Dismiss</button></div>`:''}${inner}</main>`;document.querySelector('#logout').onclick=()=>sb.auth.signOut();document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=async()=>{tab=b.dataset.tab;editing=null;message='';if(tab==='users')await loadUsers();render()});document.querySelector('#dismiss')?.addEventListener('click',()=>{message='';render()})}
function render(){if(!user){app.innerHTML=`<div class="panel login"><img src="./assets/logo.png"><h1>Private Invoicing Portal</h1><p class="muted" style="text-align:center">Authorised company users only</p>${message?`<div class="error">${esc(message)}</div>`:''}<form id="login"><label>Email address<input name="email" type="email" required autocomplete="username"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><button>Secure sign in</button></form></div>`;document.querySelector('#login').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)alertMsg(error)};return}if(!profile){app.innerHTML='<main class="panel">Your account is not authorised. Please contact the administrator. <button id="logout">Sign out</button></main>';document.querySelector('#logout').onclick=()=>sb.auth.signOut();return}if(tab==='users'&&profile.role==='admin')return renderUsers();if(editing)return renderEditor();renderInvoices()}
async function loadInvoices(){const {data,error}=await sb.from('invoices').select('*').order('created_at',{ascending:false});if(error)message=error.message;else invoices=data||[]}
async function loadUsers(){const {data,error}=await sb.from('profiles').select('id,email,full_name,role,active').order('created_at',{ascending:false});if(error)message=error.message;else users=data||[]}
function renderInvoices(){shell(`<div class="row between"><h1>Invoice register</h1><button id="new">+ New invoice</button></div><section class="panel tablewrap"><table><thead><tr><th>Invoice</th><th>Client</th><th>Issue date</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead><tbody>${invoices.map(i=>`<tr><td>${esc(i.invoice_number)}</td><td>${esc(i.client_name)}</td><td>${esc(i.issue_date)}</td><td>${esc(i.status)}</td><td>${rand(calc(i).total)}</td><td><div class="actions"><button class="secondary" data-edit="${i.id}">Edit</button><button data-pdf="${i.id}">PDF</button><button class="danger" data-del="${i.id}">Delete</button></div></td></tr>`).join('')||'<tr><td colspan="6">No invoices yet.</td></tr>'}</tbody></table></section>`);document.querySelector('#new').onclick=()=>{editing=blank();render()};document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=structuredClone(invoices.find(i=>i.id===b.dataset.edit));render()});document.querySelectorAll('[data-pdf]').forEach(b=>b.onclick=()=>pdf(invoices.find(i=>i.id===b.dataset.pdf)).catch(alertMsg));document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Permanently delete this invoice?'))return;const {error}=await sb.from('invoices').delete().eq('id',b.dataset.del);if(error)alertMsg(error);else{await loadInvoices();render()}})}
const field=(label,name,val,type='text')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(val)}" ${name==='client_name'||name==='invoice_number'?'required':''}></label>`;
function renderEditor(){const i=editing,t=calc(i);shell(`<div class="row between"><h1>${i.id?'Edit':'New'} invoice</h1><button class="secondary" id="back">Back</button></div><form class="panel" id="invoice"><div class="grid3">${field('Invoice number','invoice_number',i.invoice_number)}${field('Issue date','issue_date',i.issue_date,'date')}${field('Due date','due_date',i.due_date,'date')}</div><p class="muted">Payment due 7 calendar days after issue date. Due date updates when you change the issue date.</p><h3>Company details</h3><p class="muted">Registration: ${COMPANY.registration} · VAT: ${COMPANY.vat}<br>${esc(COMPANY.address)}<br>${esc(COMPANY.phone)} · ${esc(COMPANY.email)}</p><p><a href="./terms.html" target="_blank" rel="noopener noreferrer">View Terms &amp; Conditions</a></p><h3>Client details</h3><div class="grid">${field('Client name','client_name',i.client_name)}${field('Client email','client_email',i.client_email,'email')}</div><label>Billing address<textarea name="client_address" rows="2">${esc(i.client_address)}</textarea></label>${field('Reference','reference',i.reference)}<label>Status<select name="status">${['Draft','Sent','Paid','Overdue','Cancelled'].map(s=>`<option ${i.status===s?'selected':''}>${s}</option>`).join('')}</select></label><h3>Line items</h3><div id="items">${i.items.map((x,j)=>`<div class="items"><label>Description<input data-item="${j}" data-key="description" value="${esc(x.description)}" required></label><label>Quantity<input type="number" min="0" step="0.01" data-item="${j}" data-key="quantity" value="${esc(x.quantity)}"></label><label>Unit price (R)<input type="number" min="0" step="0.01" data-item="${j}" data-key="unit_price" value="${esc(x.unit_price)}"></label><button class="secondary" type="button" data-remove="${j}">Remove</button></div>`).join('')}</div><button type="button" class="secondary" id="add">+ Add line</button><div class="totals">${field('VAT percentage','vat_rate',i.vat_rate,'number')}<p>Subtotal <b>${rand(t.subtotal)}</b></p><p>VAT <b>${rand(t.vat)}</b></p><p><strong>Total</strong><strong>${rand(t.total)}</strong></p></div><label>Payment terms / banking details / notes<textarea name="notes" rows="3">${esc(i.notes)}</textarea></label><div class="row"><button type="submit">Save invoice</button><button type="button" class="secondary" id="pdf">Download PDF</button></div></form>`);document.querySelector('[name="issue_date"]').addEventListener('change',e=>{
  document.querySelector('[name="due_date"]').value=addDays(e.target.value);
});document.querySelector('#back').onclick=()=>{editing=null;render()};document.querySelectorAll('[data-item]').forEach(el=>el.oninput=()=>{editing.items[+el.dataset.item][el.dataset.key]=el.value});document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{if(editing.items.length>1){editing.items.splice(+el.dataset.remove,1);capture();render()}});document.querySelector('#add').onclick=()=>{capture();editing.items.push({description:'',quantity:1,unit_price:0});render()};document.querySelector('#pdf').onclick=()=>{capture();pdf(editing).catch(alertMsg)};document.querySelector('#invoice').onsubmit=async e=>{e.preventDefault();capture();const payload={...editing,created_by:user.id};delete payload.created_at;delete payload.updated_at;let r;if(editing.id)r=await sb.from('invoices').update(payload).eq('id',editing.id).select().single();else{delete payload.id;r=await sb.from('invoices').insert(payload).select().single()}if(r.error){alertMsg(r.error);return}editing=null;message='Invoice saved successfully';await loadInvoices();render()}}
function capture(){const f=new FormData(document.querySelector('#invoice'));for(const [k,v] of f)editing[k]=v;document.querySelectorAll('[data-item]').forEach(el=>editing.items[+el.dataset.item][el.dataset.key]=el.value)}
function renderUsers(){shell(`<h1>Manage authorised users</h1><div class="grid"><section class="panel"><h2>Create a user</h2><p class="muted">Only administrators can create accounts. Public signup must be disabled in Supabase.</p><form id="create">${field('Full name','full_name','')}${field('Email','email','','email')}<label>Temporary password (12+ characters)<input type="password" name="password" minlength="12" required></label><button>Create user</button></form></section><section class="panel"><h2>Users</h2>${users.map(u=>`<div class="row between" style="border-bottom:1px solid #eee;padding:12px 0"><div><b>${esc(u.full_name||u.email)}</b><small>${esc(u.email)} · ${esc(u.role)} · ${u.active?'Active':'Disabled'}</small></div>${u.id!==user.id?`<button class="secondary" data-toggle="${u.id}">${u.active?'Deactivate':'Activate'}</button>`:''}</div>`).join('')}</section></div>`);document.querySelector('#create').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const {data,error}=await sb.functions.invoke('create-user',{body:f});if(error||data?.error){alertMsg(data?.error||error);return}message='User created';await loadUsers();render()};document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=async()=>{const u=users.find(x=>x.id===b.dataset.toggle);const {error}=await sb.from('profiles').update({active:!u.active}).eq('id',u.id);if(error)alertMsg(error);else{await loadUsers();render()}})}
async function pdf(i){
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const img=new Image();
  img.src='./assets/logo.png';
  await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(new Error('Logo could not be loaded'))});
  const canvas=document.createElement('canvas');
  canvas.width=img.naturalWidth;
  canvas.height=img.naturalHeight;
  canvas.getContext('2d').drawImage(img,0,0);
  doc.addImage(canvas.toDataURL('image/png'),'PNG',15,12,33,38);

  doc.setFont('helvetica','bold');doc.setFontSize(13);
  doc.text('DYNAMIC PROTECTION AND',54,18);
  doc.text('MAINTENANCE (PTY) LTD',54,25);
  doc.setFont('helvetica','normal');doc.setFontSize(8);
  doc.text('Protecting Your Assets. Minimising Downtime.',54,31);
  const details=[
    `Registration: ${COMPANY.registration}  |  VAT: ${COMPANY.vat}`,
    COMPANY.address,
    `Tel: ${COMPANY.phone}  |  Email: ${COMPANY.email}`
  ];
  let hy=37;
  for(const line of details){
    for(const part of doc.splitTextToSize(line,140)){doc.text(part,54,hy);hy+=4;}
  }
  const headerBottom=Math.max(57,hy+4);
  doc.setDrawColor(150);doc.line(15,headerBottom,195,headerBottom);
  let y=headerBottom+11;
  doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text('INVOICE',15,y);
  y+=10;doc.setFont('helvetica','normal');doc.setFontSize(10);
  doc.text(`Invoice: ${i.invoice_number||''}`,15,y);y+=7;
  doc.text(`Issued: ${i.issue_date||''}`,15,y);y+=7;
  doc.text(`Due: ${i.due_date||addDays(i.issue_date)||''}`,15,y);y+=7;
  doc.setFont('helvetica','bold');doc.text('BILL TO',15,y);y+=7;
  doc.setFont('helvetica','normal');
  const client=[i.client_name||'',i.client_address||'',i.client_email||''].filter(Boolean);
  for(const entry of client){
    for(const line of doc.splitTextToSize(entry,175)){doc.text(line,15,y);y+=5;}
  }
  y+=8;
  const page=()=>{doc.addPage();y=20;};
  const ensure=(height)=>{if(y+height>275)page();};
  ensure(16);
  doc.setFont('helvetica','bold');doc.setFontSize(9);
  doc.text('Description',15,y);doc.text('Qty',116,y);
  doc.text('Unit price',135,y);doc.text('Amount',172,y);
  doc.line(15,y+3,195,y+3);y+=11;
  doc.setFont('helvetica','normal');
  const money=n=>`R ${Number(n||0).toFixed(2)}`;
  for(const item of i.items||[]){
    const lines=doc.splitTextToSize(item.description||'',93);
    const height=Math.max(9,lines.length*5+3);
    ensure(height);
    doc.text(lines,15,y);
    doc.text(String(item.quantity||0),116,y);
    doc.text(money(item.unit_price),135,y);
    doc.text(money(Number(item.quantity||0)*Number(item.unit_price||0)),172,y);
    y+=height;
  }
  ensure(40);y+=7;
  const totals=calc(i);
  doc.text(`Subtotal: ${money(totals.subtotal)}`,125,y);y+=7;
  doc.text(`VAT (${i.vat_rate||0}%): ${money(totals.vat)}`,125,y);y+=8;
  doc.setFont('helvetica','bold');doc.text(`TOTAL: ${money(totals.total)}`,125,y);
  y+=13;ensure(25);
  doc.setFont('helvetica','bold');doc.setFontSize(10);
  doc.text('PAYMENT TERMS',15,y);y+=6;
  doc.setFont('helvetica','normal');doc.setFontSize(9);
  doc.text('Payment is due within 7 calendar days of the invoice issue date.',15,y);
  y+=9;
  if(i.notes){
    const noteLines=doc.splitTextToSize(String(i.notes),175);
    ensure(12);doc.setFont('helvetica','bold');doc.text('Notes / payment details:',15,y);y+=6;
    doc.setFont('helvetica','normal');
    for(const line of noteLines){ensure(6);doc.text(line,15,y);y+=5;}
    y+=4;
  }
  ensure(18);
  doc.setFont('helvetica','bold');doc.setFontSize(10);
  doc.text('TERMS & CONDITIONS',15,y);y+=6;
  doc.setFont('helvetica','normal');doc.setFontSize(9);
  doc.setTextColor(25,85,170);
  doc.textWithLink('Click here to read the full Terms & Conditions',15,y,{url:TERMS_URL});
  doc.setDrawColor(25,85,170);doc.line(15,y+1,104,y+1);
  doc.setTextColor(0,0,0);
  doc.save(`${String(i.invoice_number||'DPM-Invoice').replace(/[^a-zA-Z0-9_-]/g,'_')}.pdf`);
}
async function init(){const {data:{session}}=await sb.auth.getSession();await sync(session);sb.auth.onAuthStateChange((_event,s)=>{setTimeout(()=>sync(s),0)})}async function sync(session){user=session?.user||null;profile=null;if(user){const {data,error}=await sb.from('profiles').select('id,email,full_name,role,active').eq('id',user.id).single();if(error||!data?.active){message='Your account is not active or not configured';render();return}profile=data;await loadInvoices()}render()}init().catch(alertMsg);
