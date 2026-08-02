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

const STANDAARD_HASH = "b46be1c02ff4b9f2913f6312a149c9528643efc62cfd3bf49557457497d51ee2";

let appData = {
  deelkampen: [],
  deelnemers: [],
  masterActiviteiten: [],
  periodeAanbod: {}, // { kampId: { voormiddag: [ { actId: "...", max: 10 } ] } }
  keuzes: {},
  adminHash: STANDAARD_HASH
};

let isAdminIngelogd = false;

async function hashWachtwoord(wachtwoord) {
  const encoder = new TextEncoder();
  const data = encoder.encode(wachtwoord);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function sorteerOpNaam(array) {
  return array.sort((a, b) => a.naam.localeCompare(b.naam, 'nl', { sensitivity: 'base' }));
}

async function laadFirebaseData() {
  const dbRef = ref(db);
  try {
    const snapshot = await get(child(dbRef, 'topvakantie'));
    if (snapshot.exists()) {
      appData = snapshot.val();
      if (!appData.deelkampen) appData.deelkampen = [];
      if (!appData.deelnemers) appData.deelnemers = [];
      if (!appData.masterActiviteiten) appData.masterActiviteiten = [];
      if (!appData.periodeAanbod) appData.periodeAanbod = {};
      if (!appData.keuzes) appData.keuzes = {};
      if (!appData.adminHash) appData.adminHash = STANDAARD_HASH;

      appData.deelkampen = sorteerOpNaam(appData.deelkampen);
      appData.deelnemers = sorteerOpNaam(appData.deelnemers);
      appData.masterActiviteiten = sorteerOpNaam(appData.masterActiviteiten);
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
  vulKampCheckboxes();
  vulDropdowns();
  updateOverzicht();
}

function vulKampCheckboxes() {
  const grid = document.getElementById('kampCheckboxesGrid');
  grid.innerHTML = '';

  if (appData.deelkampen.length === 0) {
    grid.innerHTML = '<em>Nog geen deelkampen aangemaakt. Voeg ze toe via "Beheer & Data".</em>';
    return;
  }

  appData.deelkampen.forEach(kamp => {
    grid.innerHTML += `
      <label class="checkbox-label">
        <input type="checkbox" class="kamp-select-cb" value="${kamp.id}" onchange="onKampSelectionChange()">
        ${kamp.naam}
      </label>
    `;
  });
}

function vulDropdowns() {
  const overzichtSelect = document.getElementById('overzichtKampSelect');
  const nieuwDeelnemerKamp = document.getElementById('nieuwDeelnemerKamp');

  overzichtSelect.innerHTML = '<option value="">-- Alle Deelkampen --</option>';
  nieuwDeelnemerKamp.innerHTML = '<option value="">-- Kies Kamp --</option>';

  appData.deelkampen.forEach(kamp => {
    const opt = `<option value="${kamp.id}">${kamp.naam}</option>`;
    overzichtSelect.innerHTML += opt;
    nieuwDeelnemerKamp.innerHTML += opt;
  });
}

// 1. KAMP SELECTIE EN AANBOD PERIODE INSTELLEN
window.onKampSelectionChange = function() {
  const geselecteerdeKampIds = Array.from(document.querySelectorAll('.kamp-select-cb:checked')).map(cb => cb.value);
  const container = document.getElementById('deelnemersContainer');
  const actionsBar = document.getElementById('actionsBar');
  const badge = document.getElementById('kampBadge');
  const instellingenSectie = document.getElementById('instellingenSectie');

  container.innerHTML = '';

  if (geselecteerdeKampIds.length === 0) {
    actionsBar.style.display = 'none';
    instellingenSectie.style.display = 'none';
    badge.textContent = 'Geen kampen geselecteerd';
    container.innerHTML = '<div class="empty-state">Vink hierboven één of meerdere deelkampen aan om te beginnen.</div>';
    return;
  }

  const kampNamen = geselecteerdeKampIds.map(id => {
    const k = appData.deelkampen.find(x => x.id === id);
    return k ? k.naam : '';
  }).join(', ');

  badge.textContent = kampNamen;
  actionsBar.style.display = 'flex';
  instellingenSectie.style.display = 'block';

  renderAanbodCheckboxesMulti(geselecteerdeKampIds);
  renderDeelnemersFormulierMulti(geselecteerdeKampIds);
};

window.toggleAanbodPaneel = function() {
  const paneel = document.getElementById('aanbodPaneel');
  paneel.style.display = paneel.style.display === 'none' ? 'block' : 'none';
};

function renderAanbodCheckboxesMulti(geselecteerdeKampIds) {
  const periodes = ['voormiddag', 'namiddag1', 'namiddag2', 'avond'];
  const primairKampId = geselecteerdeKampIds[0];
  const primairAanbod = appData.periodeAanbod[primairKampId] || {};

  periodes.forEach(p => {
    const box = document.getElementById(`aanbod-${p}`);
    const geselecteerdeItems = primairAanbod[p] || [];

    if (appData.masterActiviteiten.length === 0) {
      box.innerHTML = '<em>Geen activiteiten in Master-database.</em>';
      return;
    }

    box.innerHTML = appData.masterActiviteiten.map(act => {
      const bestaand = geselecteerdeItems.find(i => i.actId === act.id);
      const isChecked = !!bestaand;
      const maxVal = bestaand ? (bestaand.max || 0) : 0;

      return `
        <div class="beheer-item">
          <div class="beheer-item-row">
            <input type="checkbox" class="cb-aanbod-${p}" value="${act.id}" ${isChecked}>
            <strong>${act.naam}</strong>
          </div>
          <div class="max-input-group">
            <label>Max. pers. (0 = $\infty$):</label>
            <input type="number" min="0" class="max-aanbod-${p}" data-act="${act.id}" value="${maxVal}">
          </div>
        </div>
      `;
    }).join('');
  });
}

window.opslaanAanbodMulti = async function() {
  const geselecteerdeKampIds = Array.from(document.querySelectorAll('.kamp-select-cb:checked')).map(cb => cb.value);
  const periodes = ['voormiddag', 'namiddag1', 'namiddag2', 'avond'];

  for (const kampId of geselecteerdeKampIds) {
    if (!appData.periodeAanbod[kampId]) appData.periodeAanbod[kampId] = {};

    periodes.forEach(p => {
      const cbs = document.querySelectorAll(`.cb-aanbod-${p}:checked`);
      const items = [];

      cbs.forEach(cb => {
        const actId = cb.value;
        const maxInput = document.querySelector(`.max-aanbod-${p}[data-act="${actId}"]`);
        const maxVal = parseInt(maxInput ? maxInput.value : 0) || 0;
        items.push({ actId: actId, max: maxVal });
      });

      appData.periodeAanbod[kampId][p] = items;
    });

    await set(ref(db, `topvakantie/periodeAanbod/${kampId}`), appData.periodeAanbod[kampId]);
  }

  showModal("Opgeslagen", "Het activiteitenaanbod en de capaciteit zijn opgeslagen voor de geselecteerde kamp(en).");
  document.getElementById('aanbodPaneel').style.display = 'none';
  renderDeelnemersFormulierMulti(geselecteerdeKampIds);
};

// 2. KEUZES FORMULIER
function berekenAantallenMulti(geselecteerdeKampIds) {
  const aantallen = {};
  const deelnemersInKampen = appData.deelnemers.filter(d => geselecteerdeKampIds.includes(d.kampId));

  deelnemersInKampen.forEach(d => {
    ['voormiddag', 'namiddag1', 'namiddag2', 'avond'].forEach(p => {
      const actId = appData.keuzes[`${d.id}_${p}`];
      if (actId) {
        const sleutel = `${d.kampId}_${p}_${actId}`;
        aantallen[sleutel] = (aantallen[sleutel] || 0) + 1;
      }
    });
  });

  return aantallen;
}

function renderDeelnemersFormulierMulti(geselecteerdeKampIds) {
  const container = document.getElementById('deelnemersContainer');
  let deelnemers = appData.deelnemers.filter(d => geselecteerdeKampIds.includes(d.kampId));
  
  deelnemers = sorteerOpNaam(deelnemers);
  const huidigeAantallen = berekenAantallenMulti(geselecteerdeKampIds);

  if (deelnemers.length === 0) {
    container.innerHTML = '<div class="empty-state">Geen deelnemers gevonden in de geselecteerde kampen. Voeg ze toe via "Beheer & Data".</div>';
    return;
  }

  const periodes = [
    { id: 'voormiddag', label: 'Voormiddag' },
    { id: 'namiddag1', label: 'Namiddag 1' },
    { id: 'namiddag2', label: 'Namiddag 2' },
    { id: 'avond', label: 'Avond' }
  ];

  container.innerHTML = '';

  deelnemers.forEach(d => {
    const card = document.createElement('div');
    card.className = 'deelnemer-card';

    const kampObj = appData.deelkampen.find(k => k.id === d.kampId);
    const kampNaam = kampObj ? kampObj.naam : '';

    const kampAanbod = appData.periodeAanbod[d.kampId] || {};

    let gridHtml = '';
    periodes.forEach(p => {
      const toegestaneItems = kampAanbod[p.id] || [];
      const key = `${d.id}_${p.id}`;
      const geselecteerdActId = appData.keuzes[key] || '';

      let options = '<option value="">-- Geen --</option>';
      
      const mogelijkeMasterAct = appData.masterActiviteiten.filter(a => toegestaneItems.some(item => item.actId === a.id));
      sorteerOpNaam(mogelijkeMasterAct);

      mogelijkeMasterAct.forEach(act => {
        const item = toegestaneItems.find(i => i.actId === act.id);
        const teller = huidigeAantallen[`${d.kampId}_${p.id}_${act.id}`] || 0;
        const max = parseInt(item ? item.max : 0) || 0;
        const isVol = max > 0 && teller >= max && geselecteerdActId !== act.id;
        
        let capLabel = max > 0 ? ` (${teller}/${max})` : '';
        if (isVol) capLabel += ' [VOL]';

        options += `<option value="${act.id}" ${geselecteerdActId === act.id ? 'selected' : ''} ${isVol ? 'disabled' : ''}>${act.naam}${capLabel}</option>`;
      });

      gridHtml += `
        <div class="periode-box">
          <div class="periode-title">${p.label}</div>
          <select data-deelnemer="${d.id}" data-periode="${p.id}" onchange="onKeuzeChangeMulti()">${options}</select>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="deelnemer-header">
        <span class="deelnemer-naam">${d.naam}</span>
        <span class="kamp-tag-small">${kampNaam}</span>
      </div>
      <div class="periodes-grid">${gridHtml}</div>
    `;

    container.appendChild(card);
  });
}

window.onKeuzeChangeMulti = function() {
  const selects = document.querySelectorAll('select[data-deelnemer]');
  selects.forEach(s => {
    const dId = s.dataset.deelnemer;
    const p = s.dataset.periode;
    appData.keuzes[`${dId}_${p}`] = s.value;
  });

  const geselecteerdeKampIds = Array.from(document.querySelectorAll('.kamp-select-cb:checked')).map(cb => cb.value);
  renderDeelnemersFormulierMulti(geselecteerdeKampIds);
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
    showModal("Opgeslagen!", "Keuzes van de deelnemers zijn opgeslagen.");
    updateOverzicht();
  } catch (err) {
    showModal("Fout", "Kon niet opslaan in Firebase.");
  }
};

// 3. BEHEER & WACHTWOORD
window.verifieerWachtwoord = async function() {
  const input = document.getElementById('adminWachtwoordInput').value.trim();
  if (!input) return showModal("Toegang Geweigerd", "Vul een wachtwoord in.");

  const ingevoerdeHash = await hashWachtwoord(input);
  const isStandaardWachtwoord = input.toLowerCase() === "topvakantie123";
  const isHashCorrect = appData.adminHash && (ingevoerdeHash === appData.adminHash);

  if (isStandaardWachtwoord || isHashCorrect) {
    isAdminIngelogd = true;
    document.getElementById('loginFormCard').style.display = 'none';
    document.getElementById('beheerInhoud').style.display = 'grid';
    renderBeheerLijsten();
  } else {
    showModal("Toegang Geweigerd", "Onjuist wachtwoord. Gebruik: topvakantie123");
  }
};

window.wijzigWachtwoord = async function() {
  const w1 = document.getElementById('nieuwWachtwoord1').value.trim();
  const w2 = document.getElementById('nieuwWachtwoord2').value.trim();

  if (!w1 || w1 !== w2) return showModal("Fout", "Wachtwoorden komen niet overeen.");

  const nieuweHash = await hashWachtwoord(w1);
  appData.adminHash = nieuweHash;
  await set(ref(db, 'topvakantie/adminHash'), nieuweHash);

  document.getElementById('nieuwWachtwoord1').value = '';
  document.getElementById('nieuwWachtwoord2').value = '';
  showModal("Succes", "Nieuw beheerderswachtwoord opgeslagen!");
};

window.voegMasterActiviteitToe = async function() {
  const input = document.getElementById('nieuwActNaam');
  const naam = input.value.trim();

  if (!naam) return showModal("Fout", "Vul een naam in.");

  const nieuw = { id: `mact-${Date.now()}`, naam: naam };
  appData.masterActiviteiten.push(nieuw);
  appData.masterActiviteiten = sorteerOpNaam(appData.masterActiviteiten);

  await set(ref(db, 'topvakantie/masterActiviteiten'), appData.masterActiviteiten);
  input.value = '';
  renderBeheerLijsten();
  showModal("Succes", `Activiteit "${naam}" toegevoegd aan Master-Database!`);
};

window.voegKampToe = async function() {
  const input = document.getElementById('nieuwKampNaam');
  const naam = input.value.trim();
  if (!naam) return showModal("Fout", "Vul een kampnaam in.");

  const nieuwKamp = { id: `k-${Date.now()}`, naam: naam };
  appData.deelkampen.push(nieuwKamp);
  appData.deelkampen = sorteerOpNaam(appData.deelkampen);

  await set(ref(db, 'topvakantie/deelkampen'), appData.deelkampen);
  input.value = '';
  initApp();
  renderBeheerLijsten();
  showModal("Succes", `Kamp "${naam}" toegevoegd!`);
};

window.voegDeelnemerToe = async function() {
  const input = document.getElementById('nieuwDeelnemerNaam');
  const kampId = document.getElementById('nieuwDeelnemerKamp').value;
  const naam = input.value.trim();

  if (!naam || !kampId) return showModal("Fout", "Vul een naam in en kies een kamp.");

  const nieuw = { id: Date.now(), naam: naam, kampId: kampId };
  appData.deelnemers.push(nieuw);
  appData.deelnemers = sorteerOpNaam(appData.deelnemers);

  await set(ref(db, 'topvakantie/deelnemers'), appData.deelnemers);
  input.value = '';
  initApp();
  renderBeheerLijsten();
  showModal("Succes", `Deelnemer "${naam}" toegevoegd!`);
};

function renderBeheerLijsten() {
  const container = document.getElementById('beheerLijstContainer');
  let html = `
    <h4>Totale Master Activiteiten Database (${appData.masterActiviteiten.length})</h4>
    <table class="admin-table">
      <tr><th>Activiteitnaam</th><th>Actie</th></tr>
      ${appData.masterActiviteiten.map(a => `
        <tr>
          <td>${a.naam}</td>
          <td><button class="btn btn-danger btn-sm" onclick="verwijderMasterAct('${a.id}')">Wissen</button></td>
        </tr>
      `).join('')}
    </table>

    <h4 class="margin-top">Deelkampen (${appData.deelkampen.length})</h4>
    <table class="admin-table">
      <tr><th>Kampnaam</th><th>Actie</th></tr>
      ${appData.deelkampen.map(k => `
        <tr>
          <td>${k.naam}</td>
          <td><button class="btn btn-danger btn-sm" onclick="verwijderKamp('${k.id}')">Wissen</button></td>
        </tr>
      `).join('')}
    </table>
  `;
  container.innerHTML = html;
}

window.verwijderMasterAct = async function(id) {
  appData.masterActiviteiten = appData.masterActiviteiten.filter(a => a.id !== id);
  await set(ref(db, 'topvakantie/masterActiviteiten'), appData.masterActiviteiten);
  renderBeheerLijsten();
};

window.verwijderKamp = async function(id) {
  appData.deelkampen = appData.deelkampen.filter(k => k.id !== id);
  await set(ref(db, 'topvakantie/deelkampen'), appData.deelkampen);
  initApp();
  renderBeheerLijsten();
};

// 4. OVERZICHT & EXPORT
window.updateOverzicht = function() {
  const filterKamp = document.getElementById('overzichtKampSelect').value;
  const container = document.getElementById('overzichtContainer');
  container.innerHTML = '';

  const gefilterdeAct = appData.masterActiviteiten;

  if (gefilterdeAct && gefilterdeAct.length > 0) {
    gefilterdeAct.forEach(act => {
      const ingeschreven = [];
      const deelnemersLijst = sorteerOpNaam([...appData.deelnemers]);

      deelnemersLijst.forEach(d => {
        if (!filterKamp || d.kampId === filterKamp) {
          ['voormiddag', 'namiddag1', 'namiddag2', 'avond'].forEach(p => {
            if (appData.keuzes[`${d.id}_${p}`] === act.id) {
              ingeschreven.push(`${d.naam} (${p})`);
            }
          });
        }
      });

      if (ingeschreven.length > 0) {
        const card = document.createElement('div');
        card.className = 'overzicht-card';
        card.innerHTML = `
          <h3>${act.naam}</h3>
          <p><strong>Aantal inschrijvingen:</strong> ${ingeschreven.length}</p>
          <div class="deelnemers-tags">
            ${ingeschreven.map(n => `<span class="tag">${n}</span>`).join('')}
          </div>
        `;
        container.appendChild(card);
      }
    });
  } else {
    container.innerHTML = '<div class="empty-state">Geen inschrijvingen gevonden.</div>';
  }
};

window.exportCSV = function() {
  let csv = `Deelnemer,Kamp,Voormiddag,Namiddag 1,Namiddag 2,Avond\n`;
  const deelnemersLijst = sorteerOpNaam([...appData.deelnemers]);

  deelnemersLijst.forEach(d => {
    const kamp = appData.deelkampen.find(k => k.id === d.kampId);
    const getActNaam = (p) => {
      const actId = appData.keuzes[`${d.id}_${p}`];
      const act = appData.masterActiviteiten.find(a => a.id === actId);
      return act ? `"${act.naam}"` : 'Geen';
    };
    csv += `"${d.naam}","${kamp ? kamp.naam : ''}",${getActNaam('voormiddag')},${getActNaam('namiddag1')},${getActNaam('namiddag2')},${getActNaam('avond')}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Topvakantie_Keuzes.csv`;
  link.click();
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
