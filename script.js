import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCh9PosNaH57-_jxhqhd-eR2xy0e7qn4eg",
  authDomain: "keuze-activiteiten.firebaseapp.com",
  databaseURL: "https://keuze-activiteiten-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "keuze-activiteiten",
  storageBucket: "keuze-activiteiten.firebasestorage.app",
  messagingSenderId: "17400921565",
  appId: "1:17400921565:web:93b28bc941303400694a34"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Data start leeg
let appData = {
  deelkampen: [],
  deelnemers: [],
  activiteiten: [],
  keuzes: {}
};

async function laadFirebaseData() {
  const dbRef = ref(db);
  try {
    const snapshot = await get(child(dbRef, 'topvakantie'));
    if (snapshot.exists()) {
      appData = snapshot.val();
      if (!appData.deelkampen) appData.deelkampen = [];
      if (!appData.deelnemers) appData.deelnemers = [];
      if (!appData.activiteiten) appData.activiteiten = [];
      if (!appData.keuzes) appData.keuzes = {};
    } else {
      await set(ref(db, 'topvakantie'), appData);
    }
    initApp();
  } catch (error) {
    console.error(error);
    showModal("Fout", "Kon geen verbinding maken met Firebase.");
  }
}

function initApp() {
  vulDropdowns();
  updateOverzicht();
  renderBeheerLijsten();
}

function vulDropdowns() {
  const kampSelect = document.getElementById('kampSelect');
  const overzichtSelect = document.getElementById('overzichtKampSelect');
  const nieuwDeelnemerKamp = document.getElementById('nieuwDeelnemerKamp');
  const nieuwActKamp = document.getElementById('nieuwActKamp');

  kampSelect.innerHTML = '<option value="">-- Selecteer een Deelkamp --</option>';
  overzichtSelect.innerHTML = '<option value="">-- Alle Deelkampen --</option>';
  nieuwDeelnemerKamp.innerHTML = '<option value="">-- Kies Kamp --</option>';
  nieuwActKamp.innerHTML = '<option value="">-- Kies Kamp --</option>';

  appData.deelkampen.forEach(kamp => {
    const opt = `<option value="${kamp.id}">${kamp.naam}</option>`;
    kampSelect.innerHTML += opt;
    overzichtSelect.innerHTML += opt;
    nieuwDeelnemerKamp.innerHTML += opt;
    nieuwActKamp.innerHTML += opt;
  });
}

window.onKampChange = function() {
  const kampId = document.getElementById('kampSelect').value;
  const container = document.getElementById('deelnemersContainer');
  const actionsBar = document.getElementById('actionsBar');
  const badge = document.getElementById('kampBadge');

  container.innerHTML = '';

  if (!kampId) {
    actionsBar.style.display = 'none';
    badge.textContent = 'Selecteer een kamp';
    container.innerHTML = '<div class="empty-state">Kies hierboven een deelkamp om te beginnen.</div>';
    return;
  }

  const kamp = appData.deelkampen.find(k => k.id === kampId);
  badge.textContent = kamp ? kamp.naam : 'Selecteer een kamp';
  actionsBar.style.display = 'flex';

  const deelnemers = appData.deelnemers.filter(d => d.kampId === kampId);

  if (deelnemers.length === 0) {
    container.innerHTML = '<div class="empty-state">Nog geen deelnemers in dit kamp. Voeg ze toe via "Beheer & Data".</div>';
    return;
  }

  const periodes = [
    { id: 'voormiddag', label: 'Voormiddag' },
    { id: 'namiddag1', label: 'Namiddag 1' },
    { id: 'namiddag2', label: 'Namiddag 2' },
    { id: 'avond', label: 'Avond' }
  ];

  deelnemers.forEach(d => {
    const card = document.createElement('div');
    card.className = 'deelnemer-card';

    let gridHtml = '';
    periodes.forEach(p => {
      const mogelijkeAct = appData.activiteiten.filter(a => a.kampId === kampId && a.periodes && a.periodes.includes(p.id));
      const key = `${d.id}_${p.id}`;
      const geselecteerd = appData.keuzes[key] || '';

      let options = '<option value="">-- Geen --</option>';
      mogelijkeAct.forEach(a => {
        options += `<option value="${a.id}" ${geselecteerd === a.id ? 'selected' : ''}>${a.naam}</option>`;
      });

      gridHtml += `
        <div class="periode-box">
          <div class="periode-title">${p.label}</div>
          <select data-deelnemer="${d.id}" data-periode="${p.id}">${options}</select>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="deelnemer-naam">${d.naam}</div>
      <div class="periodes-grid">${gridHtml}</div>
    `;

    container.appendChild(card);
  });
};

window.opslaanKeuzes = async function() {
  const selects = document.querySelectorAll('select[data-deelnemer]');
  selects.forEach(s => {
    const dId = s.dataset.deelnemer;
    const p = s.dataset.periode;
    appData.keuzes[`${dId}_${p}`] = s.value;
  });

  try {
    await set(ref(db, 'topvakantie/keuzes'), appData.keuzes);
    showModal("Opgeslagen!", "Keuzes zijn opgeslagen.");
    updateOverzicht();
  } catch (err) {
    showModal("Fout", "Kon niet opslaan in Firebase.");
  }
};

window.voegKampToe = async function() {
  const input = document.getElementById('nieuwKampNaam');
  const naam = input.value.trim();
  if (!naam) return showModal("Fout", "Vul een kampnaam in.");

  const nieuwKamp = { id: `k-${Date.now()}`, naam: naam };
  appData.deelkampen.push(nieuwKamp);
  
  await set(ref(db, 'topvakantie/deelkampen'), appData.deelkampen);
  input.value = '';
  initApp();
  showModal("Succes", `Kamp "${naam}" toegevoegd!`);
};

window.voegDeelnemerToe = async function() {
  const input = document.getElementById('nieuwDeelnemerNaam');
  const kampId = document.getElementById('nieuwDeelnemerKamp').value;
  const naam = input.value.trim();

  if (!naam || !kampId) return showModal("Fout", "Vul een naam in en kies een kamp.");

  const nieuw = { id: Date.now(), naam: naam, kampId: kampId };
  appData.deelnemers.push(nieuw);

  await set(ref(db, 'topvakantie/deelnemers'), appData.deelnemers);
  input.value = '';
  initApp();
  if (document.getElementById('kampSelect').value === kampId) window.onKampChange();
  showModal("Succes", `Deelnemer "${naam}" toegevoegd!`);
};

window.voegActiviteitToe = async function() {
  const input = document.getElementById('nieuwActNaam');
  const kampId = document.getElementById('nieuwActKamp').value;
  const naam = input.value.trim();

  const checkedPeriodes = Array.from(document.querySelectorAll('.act-periode:checked')).map(cb => cb.value);

  if (!naam || !kampId || checkedPeriodes.length === 0) {
    return showModal("Fout", "Vul de naam in, kies een kamp en vink minstens 1 periode aan.");
  }

  const nieuw = { id: `a-${Date.now()}`, kampId: kampId, naam: naam, periodes: checkedPeriodes };
  appData.activiteiten.push(nieuw);

  await set(ref(db, 'topvakantie/activiteiten'), appData.activiteiten);
  input.value = '';
  document.querySelectorAll('.act-periode').forEach(cb => cb.checked = false);
  initApp();
  if (document.getElementById('kampSelect').value === kampId) window.onKampChange();
  showModal("Succes", `Activiteit "${naam}" toegevoegd!`);
};

function renderBeheerLijsten() {
  const container = document.getElementById('beheerLijstContainer');
  let html = `
    <h4>Overzicht Deelkampen (${appData.deelkampen.length})</h4>
    <table class="admin-table">
      <tr><th>Kampnaam</th><th>Actie</th></tr>
      ${appData.deelkampen.map(k => `
        <tr>
          <td>${k.naam}</td>
          <td><button class="btn btn-danger btn-sm" onclick="verwijderKamp('${k.id}')">Verwijderen</button></td>
        </tr>
      `).join('')}
    </table>
  `;
  container.innerHTML = html;
}

window.verwijderKamp = async function(id) {
  appData.deelkampen = appData.deelkampen.filter(k => k.id !== id);
  await set(ref(db, 'topvakantie/deelkampen'), appData.deelkampen);
  initApp();
  window.onKampChange();
};

window.exportCSV = function() {
  let csv = 'Deelnemer,Kamp,Voormiddag,Namiddag 1,Namiddag 2,Avond\n';
  appData.deelnemers.forEach(d => {
    const kamp = appData.deelkampen.find(k => k.id === d.kampId);
    const getActNaam = (p) => {
      const actId = appData.keuzes[`${d.id}_${p}`];
      const act = appData.activiteiten.find(a => a.id === actId);
      return act ? `"${act.naam}"` : 'Geen';
    };
    csv += `"${d.naam}","${kamp ? kamp.naam : ''}",${getActNaam('voormiddag')},${getActNaam('namiddag1')},${getActNaam('namiddag2')},${getActNaam('avond')}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'Topvakantie_Keuzes.csv';
  link.click();
};

window.updateOverzicht = function() {
  const filterKamp = document.getElementById('overzichtKampSelect').value;
  const container = document.getElementById('overzichtContainer');
  container.innerHTML = '';

  const gefilterdeAct = filterKamp 
    ? appData.activiteiten.filter(a => a.kampId === filterKamp)
    : appData.activiteiten;

  if (gefilterdeAct && gefilterdeAct.length > 0) {
    gefilterdeAct.forEach(act => {
      const ingeschreven = [];
      appData.deelnemers.forEach(d => {
        ['voormiddag', 'namiddag1', 'namiddag2', 'avond'].forEach(p => {
          if (appData.keuzes[`${d.id}_${p}`] === act.id) {
            ingeschreven.push(`${d.naam} (${p})`);
          }
        });
      });

      const card = document.createElement('div');
      card.className = 'overzicht-card';
      card.innerHTML = `
        <h3>${act.naam}</h3>
        <p><strong>Aantal inschrijvingen:</strong> ${ingeschreven.length}</p>
        <div class="deelnemers-tags">
          ${ingeschreven.length > 0 
            ? ingeschreven.map(n => `<span class="tag">${n}</span>`).join('') 
            : '<em>Nog geen inschrijvingen</em>'}
        </div>
      `;
      container.appendChild(card);
    });
  } else {
    container.innerHTML = '<div class="empty-state">Geen activiteiten gevonden.</div>';
  }
};

window.openTab = function(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById(`tab-${tabName}`).classList.add('active');
  event.currentTarget.classList.add('active');
};

function showModal(title, msg) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').textContent = msg;
  document.getElementById('customModal').style.display = 'flex';
}

window.closeModal = function() {
  document.getElementById('customModal').style.display = 'none';
};

laadFirebaseData();
