/* TechCare - protótipo local. Os dados são guardados no LocalStorage deste navegador. */
(() => {
  'use strict';
  const DB_KEY = 'techcare_db_v1';
  const AUTH_KEY = 'techcare_auth_v1';
  const STATUSES = ['Pendente', 'Em reparação', 'Concluído', 'Entregue', 'Cancelado'];
  const STATUS_CLASS = {'Pendente':'status-pendente','Em reparação':'status-reparacao','Concluído':'status-concluido','Entregue':'status-entregue','Cancelado':'status-cancelado'};
  const PAGE_NAMES = {dashboard:'Painel geral',clients:'Clientes',devices:'Computadores',orders:'Ordens de serviço',reports:'Relatórios'};
  let db = loadDB();
  let editing = null;
  let modalType = null;
  let toastTimer;

  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
  const esc = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const id = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const today = () => new Date().toISOString().slice(0,10);
  const fmtDate = value => { if(!value) return '—'; const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? esc(value) : d.toLocaleDateString('pt-PT'); };
  const initials = name => String(name||'?').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase();
  const money = value => `${Number(value||0).toLocaleString('pt-PT',{minimumFractionDigits:2,maximumFractionDigits:2})} MT`;
  function loadDB() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
      if(parsed && Array.isArray(parsed.clients) && Array.isArray(parsed.devices) && Array.isArray(parsed.orders)) return parsed;
    } catch(error) { console.warn('Não foi possível ler os dados guardados.', error); }
    return {clients:[], devices:[], orders:[]};
  }
  function saveDB() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); return true; }
    catch(error) { showToast('Não foi possível guardar. O armazenamento do navegador pode estar cheio.'); return false; }
  }
  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>toast.classList.remove('show'), 3200);
  }
  function authenticated() { return sessionStorage.getItem(AUTH_KEY) === 'yes'; }
  function showApp() {
    $('#loginScreen').classList.add('hidden'); $('#appShell').classList.remove('hidden');
    $('#currentYear').textContent = new Date().getFullYear(); renderAll();
  }
  function showLogin() { $('#appShell').classList.add('hidden'); $('#loginScreen').classList.remove('hidden'); }
  function goPage(page) {
    if(!PAGE_NAMES[page]) return;
    $$('.page').forEach(el=>el.classList.toggle('active', el.id===`page-${page}`));
    $$('.nav-item').forEach(el=>el.classList.toggle('active', el.dataset.page===page));
    $('#breadcrumbCurrent').textContent = PAGE_NAMES[page];
    $('#sidebar').classList.remove('open');
    window.scrollTo({top:0,behavior:'smooth'});
    if(page==='reports') renderReports();
  }
  function clientName(clientId) { return db.clients.find(c=>c.id===clientId)?.name || 'Cliente removido'; }
  function deviceLabel(deviceId) {
    const d = db.devices.find(x=>x.id===deviceId);
    return d ? `${d.brand} ${d.model}`.trim() : 'Equipamento removido';
  }
  function statusBadge(status) { return `<span class="status-badge ${STATUS_CLASS[status]||''}">${esc(status||'Pendente')}</span>`; }
  function actions(type, recordId, canPrint=false) {
    return `<div class="row-actions">${canPrint?`<button class="action-btn" title="Imprimir ficha" data-action="print-order" data-id="${esc(recordId)}">⎙</button>`:''}<button class="action-btn" title="Editar" data-action="edit-${type}" data-id="${esc(recordId)}">✎</button><button class="action-btn delete" title="Eliminar" data-action="delete-${type}" data-id="${esc(recordId)}">×</button></div>`;
  }
  function renderAll() { renderDashboard(); renderClients(); renderDevices(); renderOrders(); renderReports(); }
  function renderDashboard() {
    $('#metricClients').textContent=db.clients.length;
    $('#metricDevices').textContent=db.devices.length;
    $('#metricActive').textContent=db.orders.filter(o=>['Pendente','Em reparação'].includes(o.status)).length;
    $('#metricDone').textContent=db.orders.filter(o=>['Concluído','Entregue'].includes(o.status)).length;
    const recent=[...db.orders].sort((a,b)=>(b.createdAt||b.date||'').localeCompare(a.createdAt||a.date||'')).slice(0,5);
    $('#recentOrders').innerHTML = recent.length ? `<div class="table-wrap"><table class="recent-table"><thead><tr><th>ORDEM</th><th>CLIENTE / EQUIPAMENTO</th><th>ESTADO</th></tr></thead><tbody>${recent.map(o=>`<tr><td><strong>${esc(o.number)}</strong></td><td><div class="device-cell"><strong>${esc(clientName(o.clientId))}</strong><small>${esc(deviceLabel(o.deviceId))}</small></div></td><td>${statusBadge(o.status)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="recent-empty">Sem ordens registadas. Crie a primeira ordem de serviço.</div>';
    const count=db.orders.length;
    $('#statusOverview').innerHTML=STATUSES.map((s,i)=>{const n=db.orders.filter(o=>o.status===s).length;const pct=count?Math.round(n/count*100):0;const cls=['pending','repair','done','delivered','cancelled'][i];return `<div class="status-line"><div class="status-line-head"><span>${esc(s)}</span><b>${n} <span style="font-weight:400;color:#9aa2b2">(${pct}%)</span></b></div><div class="progress"><span class="${cls}" style="width:${pct}%"></span></div></div>`}).join('');
  }
  function renderClients() {
    const query=($('#clientSearch')?.value||'').toLowerCase().trim();
    const rows=db.clients.filter(c=>[c.name,c.phone,c.email,c.document].some(v=>String(v||'').toLowerCase().includes(query))).sort((a,b)=>a.name.localeCompare(b.name));
    $('#clientCount').textContent=`${rows.length} de ${db.clients.length} registo(s)`;
    $('#clientsTable').innerHTML=rows.map(c=>`<tr><td><div class="person-cell"><span class="person-avatar">${esc(initials(c.name))}</span><div><strong>${esc(c.name)}</strong><small>${esc(c.document||'Sem documento')}</small></div></div></td><td>${esc(c.phone||'—')}</td><td>${esc(c.email||'—')}</td><td>${fmtDate(c.createdDate||today())}</td><td>${actions('client',c.id)}</td></tr>`).join('');
    $('#clientsEmpty').classList.toggle('hidden',rows.length!==0);
  }
  function renderDevices() {
    const query=($('#deviceSearch')?.value||'').toLowerCase().trim();
    const rows=db.devices.filter(d=>[d.brand,d.model,d.serial,d.type,clientName(d.clientId)].some(v=>String(v||'').toLowerCase().includes(query))).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
    $('#deviceCount').textContent=`${rows.length} de ${db.devices.length} registo(s)`;
    $('#devicesTable').innerHTML=rows.map(d=>`<tr><td><div class="device-cell"><strong>${esc(d.brand)} ${esc(d.model)}</strong><small>${esc(d.type||'Computador')} · ${esc(d.os||'SO não indicado')}</small></div></td><td>${esc(clientName(d.clientId))}</td><td><span class="serial">${esc(d.serial||'—')}</span></td><td>${statusBadge(d.condition||'Pendente')}</td><td>${actions('device',d.id)}</td></tr>`).join('');
    $('#devicesEmpty').classList.toggle('hidden',rows.length!==0);
  }
  function renderOrders() {
    const query=($('#orderSearch')?.value||'').toLowerCase().trim(), status=$('#orderStatusFilter')?.value||'';
    const rows=[...db.orders].filter(o=>(!status||o.status===status)&&[o.number,o.problem,o.notes,clientName(o.clientId),deviceLabel(o.deviceId)].some(v=>String(v||'').toLowerCase().includes(query))).sort((a,b)=>(b.createdAt||b.date||'').localeCompare(a.createdAt||a.date||''));
    $('#orderCount').textContent=`${rows.length} de ${db.orders.length} registo(s)`;
    $('#ordersTable').innerHTML=rows.map(o=>`<tr><td><strong>${esc(o.number)}</strong><br><small>${esc(o.priority||'Normal')}</small></td><td><div class="device-cell"><strong>${esc(clientName(o.clientId))}</strong><small>${esc(deviceLabel(o.deviceId))}</small></div></td><td><div class="device-cell"><strong>${esc(o.problem)}</strong><small>${esc(o.technician||'Técnico não atribuído')}</small></div></td><td>${fmtDate(o.date)}</td><td>${statusBadge(o.status)}</td><td>${actions('order',o.id,true)}</td></tr>`).join('');
    $('#ordersEmpty').classList.toggle('hidden',rows.length!==0);
  }
  function renderReports() {
    if(!$('#reportMetrics'))return;
    const revenue=db.orders.filter(o=>['Concluído','Entregue'].includes(o.status)).reduce((sum,o)=>sum+Number(o.cost||0),0);
    $('#reportMetrics').innerHTML=`<div class="report-stat"><span>Total de ordens</span><strong>${db.orders.length}</strong></div><div class="report-stat"><span>Em curso</span><strong>${db.orders.filter(o=>['Pendente','Em reparação'].includes(o.status)).length}</strong></div><div class="report-stat"><span>Valor de serviços concluídos</span><strong style="font-size:20px">${money(revenue)}</strong></div>`;
    $('#reportSummary').innerHTML=STATUSES.map(s=>`<div class="summary-row"><span>${statusBadge(s)}</span><strong>${db.orders.filter(o=>o.status===s).length} ordem(ns)</strong></div>`).join('')+`<div class="summary-row"><span>Clientes registados</span><strong>${db.clients.length}</strong></div><div class="summary-row"><span>Equipamentos registados</span><strong>${db.devices.length}</strong></div>`;
  }
  function field(name,label,value='',type='text',opts={}) {
    const full=opts.full?' full':'', required=opts.required===false?'':' required', placeholder=opts.placeholder?` placeholder="${esc(opts.placeholder)}"`:'';
    let control='';
    if(type==='select') control=`<select id="field-${name}" name="${name}"${required}>${(opts.options||[]).map(o=>`<option value="${esc(o.value)}"${String(value)===String(o.value)?' selected':''}>${esc(o.label)}</option>`).join('')}</select>`;
    else if(type==='textarea') control=`<textarea id="field-${name}" name="${name}"${required}${placeholder}>${esc(value)}</textarea>`;
    else control=`<input id="field-${name}" name="${name}" type="${type}" value="${esc(value)}"${required}${placeholder}${opts.min!==undefined?` min="${opts.min}"`:''}${opts.step?` step="${opts.step}"`:''}>`;
    return `<div class="field${full}"><label for="field-${name}">${label}</label>${control}${opts.hint?`<p class="hint">${esc(opts.hint)}</p>`:''}</div>`;
  }
  function optionsForClients(selected='') {return [{value:'',label:'Seleccione um cliente'},...db.clients.map(c=>({value:c.id,label:c.name}))];}
  function optionsForDevices(selected='') {return [{value:'',label:'Seleccione um equipamento'},...db.devices.map(d=>({value:d.id,label:`${d.brand} ${d.model} — ${clientName(d.clientId)}`}))];}
  function openModal(type, recordId=null) {
    modalType=type;editing=recordId;const record=recordId?findRecord(type,recordId):{};
    const titles={client:recordId?'Editar cliente':'Novo cliente',device:recordId?'Editar equipamento':'Novo equipamento',order:recordId?'Editar ordem de serviço':'Nova ordem de serviço'};
    $('#modalTitle').textContent=titles[type]||'Novo registo';
    let html='';
    if(type==='client'){
      html=field('name','Nome completo',record.name||'','text',{full:true,placeholder:'Nome do cliente'})+
      field('phone','Telefone',record.phone||'','tel',{placeholder:'+258 ...'})+
      field('email','E-mail',record.email||'','email',{required:false,placeholder:'cliente@exemplo.com'})+
      field('document','Documento de identificação',record.document||'','text',{required:false,placeholder:'BI / NUIT'})+
      field('address','Endereço',record.address||'','text',{full:true,required:false,placeholder:'Bairro, cidade'});
    } else if(type==='device'){
      if(!db.clients.length){showToast('Registe primeiro um cliente antes de adicionar equipamento.');return;}
      html=field('clientId','Cliente',record.clientId||'','select',{options:optionsForClients(),full:true})+
      field('type','Tipo de equipamento',record.type||'Portátil','select',{options:['Portátil','Computador de secretária','All-in-one','Servidor','Outro'].map(v=>({value:v,label:v}))})+
      field('brand','Marca',record.brand||'','text',{placeholder:'Ex.: HP'})+
      field('model','Modelo',record.model||'','text',{placeholder:'Ex.: ProBook 450'})+
      field('serial','Número de série',record.serial||'','text',{required:false,placeholder:'Número de série'})+
      field('os','Sistema operativo',record.os||'','text',{required:false,placeholder:'Ex.: Windows 11'})+
      field('condition','Estado do equipamento',record.condition||'Pendente','select',{options:['Pendente','Em reparação','Concluído','Entregue','Cancelado'].map(v=>({value:v,label:v}))})+
      field('notes','Observações',record.notes||'','textarea',{full:true,required:false,placeholder:'Estado físico, acessórios, etc.'});
    } else if(type==='order'){
      if(!db.clients.length){showToast('Registe primeiro um cliente antes de criar uma ordem.');return;}
      if(!db.devices.length){showToast('Registe primeiro um equipamento antes de criar uma ordem.');return;}
      const defaultNumber=`OS-${String(Date.now()).slice(-6)}`;
      html=field('number','Número da ordem',record.number||defaultNumber,'text',{placeholder:'OS-000001'})+
      field('date','Data de entrada',record.date||today(),'date')+
      field('clientId','Cliente',record.clientId||'','select',{options:optionsForClients(),full:true})+
      field('deviceId','Equipamento',record.deviceId||'','select',{options:optionsForDevices(),full:true})+
      field('problem','Descrição do problema',record.problem||'','textarea',{full:true,placeholder:'Descreva a avaria ou pedido'})+
      field('diagnosis','Diagnóstico técnico',record.diagnosis||'','textarea',{full:true,required:false,placeholder:'Diagnóstico identificado'})+
      field('status','Estado da reparação',record.status||'Pendente','select',{options:STATUSES.map(v=>({value:v,label:v}))})+
      field('priority','Prioridade',record.priority||'Normal','select',{options:['Baixa','Normal','Alta','Urgente'].map(v=>({value:v,label:v}))})+
      field('technician','Técnico responsável',record.technician||'','text',{required:false,placeholder:'Nome do técnico'})+
      field('cost','Custo estimado (MT)',record.cost??'','number',{required:false,min:0,step:'0.01',placeholder:'0.00'})+
      field('notes','Observações',record.notes||'','textarea',{full:true,required:false,placeholder:'Peças, recomendações, notas adicionais'});
    }
    $('#modalBody').innerHTML=html;
    $('#modalBackdrop').classList.remove('hidden');
    document.body.style.overflow='hidden';
    setTimeout(()=>$('#modalBody input, #modalBody select, #modalBody textarea')?.focus(),50);
  }
  function findRecord(type, recordId) {const collection=type==='client'?'clients':type==='device'?'devices':'orders';return db[collection].find(x=>x.id===recordId)||{};}
  function closeModal() {$('#modalBackdrop').classList.add('hidden');document.body.style.overflow='';$('#modalForm').reset();editing=null;modalType=null;}
  function saveModal(event) {
    event.preventDefault();const form=new FormData($('#modalForm'));const data=Object.fromEntries(form.entries());
    const collection=modalType==='client'?'clients':modalType==='device'?'devices':'orders';
    const existing=editing?db[collection].find(x=>x.id===editing):null;
    if(modalType==='client'){
      data.name=(data.name||'').trim();data.phone=(data.phone||'').trim();data.email=(data.email||'').trim();
      if(!data.name){showToast('O nome do cliente é obrigatório.');return;}
      if(data.email && db.clients.some(c=>c.email.toLowerCase()===data.email.toLowerCase()&&c.id!==editing)){showToast('Já existe um cliente com este e-mail.');return;}
      if(!existing)data.createdDate=today();
    } else if(modalType==='device'){
      data.brand=(data.brand||'').trim();data.model=(data.model||'').trim();
      if(!data.brand||!data.model||!data.clientId){showToast('Preencha cliente, marca e modelo.');return;}
      if(data.serial && db.devices.some(d=>d.serial.toLowerCase()===data.serial.toLowerCase()&&d.id!==editing)){showToast('Este número de série já está registado.');return;}
    } else {
      data.number=(data.number||'').trim();data.problem=(data.problem||'').trim();data.cost=data.cost===''?0:Number(data.cost||0);
      if(!data.number||!data.clientId||!data.deviceId||!data.problem){showToast('Preencha número, cliente, equipamento e problema.');return;}
      if(data.cost<0||!Number.isFinite(data.cost)){showToast('O custo deve ser um número válido e não negativo.');return;}
      if(db.orders.some(o=>o.number.toLowerCase()===data.number.toLowerCase()&&o.id!==editing)){showToast('Já existe uma ordem com esse número.');return;}
      const device=db.devices.find(d=>d.id===data.deviceId);
      if(!device||device.clientId!==data.clientId){showToast('O equipamento seleccionado não pertence ao cliente escolhido.');return;}
    }
    const saved={...existing,...data,id:editing||id(modalType),createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(existing)db[collection]=db[collection].map(item=>item.id===editing?saved:item);else db[collection].push(saved);
    if(modalType==='order'){
      const device=db.devices.find(d=>d.id===saved.deviceId);if(device)device.condition=saved.status;
    }
    if(saveDB()){closeModal();renderAll();showToast(existing?'Registo actualizado com sucesso.':'Registo guardado com sucesso.');}
  }
  function deleteRecord(type, recordId) {
    const collection=type==='client'?'clients':type==='device'?'devices':'orders';
    const record=db[collection].find(x=>x.id===recordId);if(!record)return;
    if(type==='client'&&(db.devices.some(d=>d.clientId===recordId)||db.orders.some(o=>o.clientId===recordId))){showToast('Não pode eliminar este cliente: existem equipamentos ou ordens associados.');return;}
    if(type==='device'&&db.orders.some(o=>o.deviceId===recordId)){showToast('Não pode eliminar este equipamento: existem ordens de serviço associadas.');return;}
    const label=type==='client'?record.name:type==='device'?`${record.brand} ${record.model}`:record.number;
    if(!confirm(`Tem a certeza de que pretende eliminar "${label}"? Esta acção não pode ser anulada.`))return;
    db[collection]=db[collection].filter(x=>x.id!==recordId);
    if(saveDB()){renderAll();showToast('Registo eliminado.');}
  }
  function printOrder(recordId) {
    const o=db.orders.find(x=>x.id===recordId);if(!o)return;
    const client=db.clients.find(c=>c.id===o.clientId)||{};
    const device=db.devices.find(d=>d.id===o.deviceId)||{};
    const w=window.open('','_blank','width=850,height=750');
    if(!w){showToast('O navegador bloqueou a janela de impressão. Permita pop-ups para este site.');return;}
    const safe=esc;
    w.document.write(`<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><title>Ficha ${safe(o.number)}</title><style>body{font:14px Arial,sans-serif;color:#222;padding:35px;max-width:800px;margin:auto}h1{font-size:24px;margin-bottom:4px;color:#18264b}.muted{color:#777;font-size:12px}.line{border-bottom:1px solid #ddd;padding:12px 0;display:grid;grid-template-columns:180px 1fr;gap:10px}.line b{color:#555}.status{display:inline-block;background:#eef1ff;padding:5px 9px;border-radius:6px}.signature{display:flex;justify-content:space-between;margin-top:70px}.signature div{width:42%;border-top:1px solid #777;padding-top:8px;text-align:center;font-size:12px}@media print{body{padding:0}}</style></head><body><h1>TechCare — Assistência Técnica</h1><p class="muted">Ficha de ordem de serviço</p><hr><div class="line"><b>Número da ordem</b><span>${safe(o.number)}</span></div><div class="line"><b>Data de entrada</b><span>${fmtDate(o.date)}</span></div><div class="line"><b>Cliente</b><span>${safe(client.name||'—')}</span></div><div class="line"><b>Telefone / E-mail</b><span>${safe(client.phone||'—')} / ${safe(client.email||'—')}</span></div><div class="line"><b>Equipamento</b><span>${safe(`${device.brand||''} ${device.model||''}`.trim()||'—')}</span></div><div class="line"><b>Número de série</b><span>${safe(device.serial||'—')}</span></div><div class="line"><b>Problema relatado</b><span>${safe(o.problem)}</span></div><div class="line"><b>Diagnóstico</b><span>${safe(o.diagnosis||'A preencher')}</span></div><div class="line"><b>Estado</b><span class="status">${safe(o.status)}</span></div><div class="line"><b>Técnico responsável</b><span>${safe(o.technician||'—')}</span></div><div class="line"><b>Custo estimado</b><span>${money(o.cost)}</span></div><div class="line"><b>Observações</b><span>${safe(o.notes||'—')}</span></div><div class="signature"><div>Assinatura do cliente</div><div>Assinatura do técnico</div></div><p class="muted" style="margin-top:40px">Documento gerado pelo Sistema Web TechCare.</p><script>window.onload=()=>window.print();<\/script></body></html>`);
    w.document.close();
  }
  function exportCSV() {
    const header=['Número da ordem','Data','Cliente','Equipamento','Problema','Diagnóstico','Estado','Prioridade','Técnico','Custo (MT)'];
    const rows=db.orders.map(o=>[o.number,o.date,clientName(o.clientId),deviceLabel(o.deviceId),o.problem,o.diagnosis,o.status,o.priority,o.technician,o.cost]);
    const quote=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const csv='\ufeff'+[header,...rows].map(row=>row.map(quote).join(';')).join('\r\n');
    downloadBlob(csv,'relatorio-techcare.csv','text/csv;charset=utf-8;');
  }
  function downloadBlob(content,filename,type) {
    const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  function exportBackup() {
    downloadBlob(JSON.stringify({app:'TechCare',version:1,exportedAt:new Date().toISOString(),data:db},null,2),'backup-techcare.json','application/json');
    showToast('Cópia de segurança descarregada.');
  }
  async function importBackup(file) {
    if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());const incoming=parsed.data||parsed;
      if(!incoming||!Array.isArray(incoming.clients)||!Array.isArray(incoming.devices)||!Array.isArray(incoming.orders))throw new Error('Formato inválido');
      if(!confirm(`O backup contém ${incoming.clients.length} clientes, ${incoming.devices.length} equipamentos e ${incoming.orders.length} ordens. A importação substituirá os dados actuais. Continuar?`))return;
      db={clients:incoming.clients,devices:incoming.devices,orders:incoming.orders};
      if(saveDB()){renderAll();showToast('Backup importado com sucesso.');}
    }catch(error){showToast('Não foi possível importar. Seleccione um backup JSON TechCare válido.');}
    finally{$('#importBackup').value='';}
  }

  $('#loginForm').addEventListener('submit',event=>{
    event.preventDefault();const user=$('#loginUser').value.trim();const password=$('#loginPassword').value;
    // Credenciais demonstrativas. Não usar este mecanismo como autenticação de produção.
    if(user==='admin'&&password==='admin123'){sessionStorage.setItem(AUTH_KEY,'yes');$('#loginError').textContent='';showApp();}
    else $('#loginError').textContent='Utilizador ou palavra-passe incorrectos.';
  });
  $('#logoutBtn').addEventListener('click',()=>{sessionStorage.removeItem(AUTH_KEY);showLogin();$('#loginPassword').value='';});
  $('#sidebarToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  $('#closeModal').addEventListener('click',closeModal);$('#cancelModal').addEventListener('click',closeModal);
  $('#modalBackdrop').addEventListener('click',event=>{if(event.target===$('#modalBackdrop'))closeModal();});
  $('#modalForm').addEventListener('submit',saveModal);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#modalBackdrop').classList.contains('hidden'))closeModal();});
  document.addEventListener('click',event=>{
    const pageBtn=event.target.closest('[data-page]');if(pageBtn){event.preventDefault();goPage(pageBtn.dataset.page);return;}
    const btn=event.target.closest('[data-action]');if(!btn)return;
    const action=btn.dataset.action,recordId=btn.dataset.id;
    if(action==='new-client')openModal('client');else if(action==='new-device')openModal('device');else if(action==='new-order')openModal('order');
    else if(action.startsWith('edit-'))openModal(action.slice(5),recordId);
    else if(action.startsWith('delete-'))deleteRecord(action.slice(7),recordId);
    else if(action==='print-order')printOrder(recordId);
  });
  $('#clientSearch').addEventListener('input',renderClients);$('#deviceSearch').addEventListener('input',renderDevices);
  $('#orderSearch').addEventListener('input',renderOrders);$('#orderStatusFilter').addEventListener('change',renderOrders);
  $('#printReport').addEventListener('click',()=>window.print());$('#exportCsv').addEventListener('click',exportCSV);
  $('#exportBackup').addEventListener('click',exportBackup);
  $('#importBackup').addEventListener('change',event=>importBackup(event.target.files?.[0]));
  $('#clearData').addEventListener('click',()=>{
    if(!confirm('ATENÇÃO: pretende eliminar todos os clientes, equipamentos e ordens guardados neste navegador? Esta acção não pode ser anulada. Faça um backup antes de continuar.'))return;
    db={clients:[],devices:[],orders:[]};if(saveDB()){renderAll();showToast('Todos os dados foram eliminados.');}
  });
  if(authenticated())showApp();else showLogin();
})();