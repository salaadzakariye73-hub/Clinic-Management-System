const $ = id => document.getElementById(id);
let patients = [];

// 1. Diiwaangelinta iyo Soo saarista xogta LocalStorage
function load() {
    try {
        const saved = localStorage.getItem('patients');
        patients = (saved && saved !== "undefined") ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Error reading localStorage:", e);
        patients = [];
    }
    render();
}

function savePatients() {
    localStorage.setItem('patients', JSON.stringify(patients));
    render();
}

const today = new Date(); 
$('today').textContent = today.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});

function render(){
    const waiting = patients.filter(p=>p.status==='Waiting').length;
    const consulting = patients.filter(p=>p.status==='In Consultation').length;
    const completed = patients.filter(p=>p.status==='Completed').length;
    
    $('total').textContent = patients.length;
    $('waiting').textContent = waiting;
    $('consulting').textContent = consulting;
    $('completed').textContent = completed;

    const rows = patients.map(p=>`<tr><td><span class="queue-tag">${p.queue_no}</span></td><td><b>${esc(p.name)}</b></td><td>${esc(p.reason||'—')}</td><td><span class="status ${p.status==='Completed'?'done':p.status==='In Consultation'?'consult':''}">${p.status}</span></td><td>${p.status==='Waiting'?`<button class="action" onclick="callPatient(${p.id})">Call patient</button>`:p.status==='In Consultation'?`<button class="action" onclick="finishPatient(${p.id})">Complete</button>`:'—'}</td></tr>`).join('');
    $('patientRows').innerHTML = rows;
    
    $('allRows').innerHTML = patients.map(p=>`<tr><td><span class="queue-tag">${p.queue_no}</span></td><td><b>${esc(p.name)}</b></td><td>${esc(p.phone||'—')}</td><td>${esc(p.reason||'—')}</td><td><span class="status ${p.status==='Completed'?'done':p.status==='In Consultation'?'consult':''}">${p.status}</span></td></tr>`).join('');
    $('empty').classList.toggle('hidden', patients.length > 0);

    const current = patients.find(p=>p.status==='In Consultation');
    $('currentNumber').textContent = current?.queue_no || '---';
    $('currentName').textContent = current?.name || 'No patient called';
    $('currentReason').textContent = current?.reason || 'Call the next patient in line';
    
    $('queueCards').innerHTML = patients.filter(p=>p.status!=='Completed').map(p=>`<div class="queue-card"><span class="queue-tag">${p.queue_no}</span><b>${esc(p.name)}</b><small>${esc(p.reason||'General visit')} · ${p.status}</small>${p.status==='Waiting'?`<button class="primary" onclick="callPatient(${p.id})">Call patient</button>`:`<button class="secondary" onclick="finishPatient(${p.id})">Complete visit</button>`}</div>`).join('') || '<div class="empty">No patients in the queue.</div>';
}

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(s){$('toast').textContent=s;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2600)}

function openModal(){$('modal').classList.remove('hidden')}
function closeModal(){$('modal').classList.add('hidden');$('patientForm').reset()}

$('addBtn').onclick = openModal;
$('addBtn2').onclick = openModal;
$('closeModal').onclick = closeModal;
$('cancelBtn').onclick = closeModal;

// 2. Marka la diiwaangeliyo bukaan cusub
$('patientForm').onsubmit = e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const newPatient = {
        id: Date.now(),
        queue_no: `A-${patients.length + 1}`,
        name: data.name || data.fullname || 'Unknown',
        phone: data.phone || '',
        reason: data.reason || '',
        status: 'Waiting'
    };
    
    patients.push(newPatient);
    savePatients();
    closeModal();
    toast(`Patient registered. Queue number: ${newPatient.queue_no}`);
};

// 3. Beddelida xaaladaha bukaanada (Call & Complete)
function callPatient(id){
    const p = patients.find(x => x.id === id);
    if(p) {
        p.status = 'In Consultation';
        savePatients();
    }
}

function finishPatient(id){
    const p = patients.find(x => x.id === id);
    if(p) {
        p.status = 'Completed';
        savePatients();
    }
}

function callNext(){
    const p = patients.find(x => x.status === 'Waiting');
    if(!p){
        toast('There are no waiting patients.');
        return;
    }
    callPatient(p.id);
}

$('nextBtn').onclick = callNext;
$('nextBtn2').onclick = callNext;

document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const v = b.dataset.view;
    $('overviewView').classList.toggle('hidden',v!=='overview');
    $('patientsView').classList.toggle('hidden',v!=='patients');
    $('queueView').classList.toggle('hidden',v!=='queue');
    $('pageTitle').textContent = v==='overview'?'Overview':v==='patients'?'Patients':'Queue Management';
});

// Soo rogo xogta marka boggu furmo
load();
