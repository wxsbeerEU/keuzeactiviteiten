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
  periodeAanbod: {},
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
  if (!Array.isArray(array)) return [];
  return array.filter(item => item && item.naam).sort((a, b) => {
    const naamA = String(a.naam || '');
    const naamB = String(b.naam || '');
    return naamA.localeCompare(naamB, 'nl', { sensitivity: 'base' });
  });
}

function converteerNaarArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(Boolean);
  return Object.keys(data).map(key => {
    const val = data[key];
    if (typeof val === 'object' && val !== null) {
      return { id: val.id || key, ...val };
    }
    return null;
  }).filter(Boolean);
}

async function laadFirebaseData() {
  const dbRef = ref(db);
  try {
    const snapshot = await get(child(dbRef, 'topvakantie'));
    if (snapshot.exists()) {
      const rawData = snapshot.val();
      
      appData.deelkampen = sorteerOpNaam(converteerNaarArray(rawData.deelkampen));
      appData.deelnemers = sorteerOpNaam(converteerNaarArray(rawData.deelnemers));
      appData.masterActiviteiten = sorteerOpNaam(converteerNaarArray(rawData.masterActiviteiten));
      appData.periodeAanbod = rawData.periodeAanbod || {};
      appData.keuzes = rawData.keuzes || {};
      appData.adminHash = rawData.adminHash || STANDAARD_HASH;
    } else {
      await set(ref(db, 'topvakantie'), appData);
    }
    initApp();
  } catch (error) {
    console.error("Firebase Laad Fout:", error);
    showModal("Fout bij laden", "Kon geen verbinding maken met de database. Controleer de Firebase Rules instellingen.");
  }
}

function initApp() {
  vulDropdowns();
  updateOverzicht();
  updateStats();
}

function vulDropdowns() {
  const kampSelect = document.getElementById('kampSelect');
  const overzichtSelect = document.getElementById('overzichtKampSelect');
  const nieuwDeelnemerKamp = document.getElementById('nieuwDeelnemerKamp');
  const csvStandaardKampSelect = document.getElementById('csvStandaardKampSelect');

  if (kampSelect) kampSelect.innerHTML = '<option value="">-- Selecteer een Deelkamp --</option>';
  if (overzichtSelect) overzichtSelect.innerHTML = '<option value="">-- Alle Deelkampen Samen --</option>';
  if (nieuwDeelnemerKamp) nieuwDeelnemerKamp.innerHTML = '<option value="">-- Kies Kamp --</option>';
  if (csvStandaardKampSelect) csvStandaardKampSelect.innerHTML = '<option value="">-- Uit CSV Lezen --</option>';

  appData.deelkampen.forEach(kamp => {
    const opt = `<option value="${kamp.id}">${kamp.naam}</option>`;
    if (kampSelect) kampSelect.innerHTML += opt;
    if (overzichtSelect) overzichtSelect.innerHTML += opt;
    if (nieuwDeelnemerKamp) nieuwDeelnemerKamp.innerHTML += opt;
    if (csvStandaardKampSelect) csvStandaardKampSelect.innerHTML += opt;
  });
}

function updateStats() {
  if (!isAdminIngelogd) return;
  const statKampen = document.getElementById('statKampen');
  const statDeelnemers = document.getElementById('statDeelnemers');
  const statMasterAct = document.getElementById('statMasterAct');
  const statKeuzes = document.getElementById('statKeuzes');

  if (statKampen) statKampen.textContent = appData.deelkampen.length;
  if (statDeelnemers) statDeelnemers.textContent = appData.deelnemers.length;
  if (statMasterAct) statMasterAct.textContent = appData.masterActiviteiten.length;
  if (statKeuzes) statKeuzes.textContent = Object.keys(appData.keuzes).length;
}

function getAantalActievePeriodes(kampId) {
  const kampAanbod = appData.periodeAanbod[kampId] || {};
  let actiefCount = 0;
  ['voormiddag', 'namiddag1', 'namiddag2', 'avond'].forEach(p => {
    const items = kampAanbod[p] || [];
    if (items.length > 0) actiefCount++;
  });
  return actiefCount;
}

// 1. KEUZES INVOEREN
window.onKampChange = function() {
  const kampSelect = document.getElementById('kampSelect');
  if (!kampSelect) return;
  const kampId = kampSelect.value;
  
  const container = document.getElementById('deelnemersContainer');
  const actionsBar = document.getElementById('actionsBar');
  const selectieHeader = document.getElementById('selectieHeader');
  const badge = document.getElementById('kampBadge');

  container.innerHTML = '';

  if (!kampId) {
    if (actionsBar) actionsBar.style.display = 'none';
    if (selectieHeader) selectieHeader.style.display = 'none';
    if (badge) badge.textContent = 'Selecteer een kamp';
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
        <h3>Geen Deelkamp Geselecteerd</h3>
        <p>Kies hierboven een deelkamp om de lijst van deelnemers te openen en hun keuzes in te voeren.</p>
      </div>
    `;
    return;
  }

  const kamp = appData.deelkampen.find(k => k.id === kampId);
  if (badge) badge.textContent = kamp ? kamp.naam : 'Selecteer een kamp';
  if (actionsBar) actionsBar.style.display = 'flex';
  if (selectieHeader) selectieHeader.style.display = 'flex';

  renderDeelnemersFormulier(kampId);
};

function berekenAantallen(kampId) {
  const aantallen = {};
  const deelnemersInKamp = appData.deelnemers.filter(d => d.kampId === kampId);

  deelnemersInKamp.forEach(d => {
    ['voormiddag', 'namiddag1', 'namiddag2', 'avond'].forEach(p => {
      const actId = appData.keuzes[`${d.id}_${p}`];
      if (actId && actId !== 'unselected') {
        const sleutel = `${p}_${actId}`;
        aantallen[sleutel] = (aantallen[sleutel] || 0) + 1;
      }
    });
  });

  return aantallen;
}

function renderDeelnemersFormulier(kampId) {
  const container = document.getElementById('deelnemersContainer');
  let deelnemers = appData.deelnemers.filter(d => d.kampId === kampId);
  deelnemers = sorteerOpNaam(deelnemers);

  const kampAanbod = appData.periodeAanbod[kampId] || {};
  const huidigeAantallen = berekenAantallen(kampId);
  const maxPeriodesVoorKamp = getAantalActievePeriodes(kampId);

  const zoekTerm = document.getElementById('deelnemerZoekInput')?.value.toLowerCase().trim() || '';
  if (zoekTerm) {
    deelnemers = deelnemers.filter(d => d.naam && d.naam.toLowerCase().includes(zoekTerm));
  }

  updateVoortgangsBalk(kampId);

  if (deelnemers.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Geen deelnemers gevonden voor dit kamp. Voeg ze toe via "Beheer & Data".</p></div>';
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

    let ingevuldePeriodes = 0;
    let gridHtml = '';

    periodes.forEach(p => {
      const toegestaneItems = kampAanbod[p.id] || [];
      const heeftAanbod = toegestaneItems.length > 0;
      const key = `${d.id}_${p.id}`;

      let options = '';

      if (!heeftAanbod) {
        options = `<option value="unselected" selected disabled>-- Geen Aanbod --</option>`;
      } else {
        const geselecteerdActId = appData.keuzes[key] !== undefined ? appData.keuzes[key] : 'unselected';

        if (geselecteerdActId && geselecteerdActId !== 'unselected') {
          ingevuldePeriodes++;
        }

        options = `<option value="unselected" ${geselecteerdActId === 'unselected' ? 'selected' : ''}>-- Kies Activiteit --</option>`;

        const mogelijkeMasterAct = appData.masterActiviteiten.filter(a => toegestaneItems.some(item => item.actId === a.id));
        sorteerOpNaam(mogelijkeMasterAct);

        mogelijkeMasterAct.forEach(act => {
          const item = toegestaneItems.find(i => i.actId === act.id);
          const teller = huidigeAantallen[`${p.id}_${act.id}`] || 0;
          const max = parseInt(item ? item.max : 0) || 0;
          const isVol = max > 0 && teller >= max && geselecteerdActId !== act.id;
          
          let capLabel = max > 0 ? ` (${teller}/${max})` : '';
          if (isVol) capLabel += ' [VOL]';

          options += `<option value="${act.id}" ${geselecteerdActId === act.id ? 'selected' : ''} ${isVol ? 'disabled' : ''}>${act.naam}${capLabel}</option>`;
        });
      }

      gridHtml += `
        <div class="periode-box ${!heeftAanbod ? 'periode-disabled' : ''}">
          <div class="periode-title">${p.label}</div>
          <select class="form-control" data-deelnemer="${d.id}" data-periode="${p.id}" ${!heeftAanbod ? 'disabled' : ''} onchange="onKeuzeChange('${kampId}')">${options}</select>
        </div>
      `;
    });

    const isVolledig = maxPeriodesVoorKamp === 0 || ingevuldePeriodes >= maxPeriodesVoorKamp;
    const statusBadge = isVolledig 
      ? `<span class="status-tag complete">✓ ${ingevuldePeriodes}/${maxPeriodesVoorKamp} Ingesteld</span>` 
      : `<span class="status-tag incomplete">⚠️ ${ingevuldePeriodes}/${maxPeriodesVoorKamp} Ingesteld</span>`;

    card.innerHTML = `
      <div class="deelnemer-header">
        <span class="deelnemer-naam">${d.naam}</span>
        ${statusBadge}
      </div>
      <div class="periodes-grid">${gridHtml}</div>
    `;

    container.appendChild(card);
  });
}

function updateVoortgangsBalk(kampId) {
  const deelnemers = appData.deelnemers.filter(d => d.kampId === kampId);
  const maxPeriodesVoorKamp = getAantalActievePeriodes(kampId);
  const totaalKeuzes = deelnemers.length * maxPeriodesVoorKamp;
  
  let ingevuld = 0;
  let volledigAantal = 0;

  deelnemers.forEach(d => {
    let dIngevuld = 0;
    ['voormiddag', 'namiddag1', 'namiddag2', 'avond'].forEach(p => {
      const toegestaneItems = (appData.periodeAanbod[kampId] || {})[p] || [];
      if (toegestaneItems.length > 0) {
        const val = appData.keuzes[`${d.id}_${p}`];
        if (val && val !== 'unselected') {
          ingevuld++;
          dIngevuld++;
        }
      }
    });
    if (maxPeriodesVoorKamp === 0 || dIngevuld >= maxPeriodesVoorKamp) volledigAantal++;
  });

  const percentage = totaalKeuzes > 0 ? Math.round((ingevuld / totaalKeuzes) * 100) : (deelnemers.length > 0 ? 100 : 0);
  
  const textElem = document.getElementById('progressText');
  const subTextElem = document.getElementById('progressSubText');
  const fillElem = document.getElementById('progressBarFill');

  if (textElem) textElem.textContent = `${ingevuld} / ${totaalKeuzes} keuzes (${percentage}%)`;
  if (subTextElem) subTextElem.textContent = `${volledigAantal} van de ${deelnemers.length} deelnemers volledig ingesteld`;
  if (fillElem) fillElem.style.width = `${percentage}%`;
}

window.filterDeelnemersLijst = function() {
  const clearBtn = document.getElementById('searchClearBtn');
  const input = document.getElementById('deelnemerZoekInput');
  if (clearBtn && input) clearBtn.style.display = input.value ? 'block' : 'none';

  const kampId = document.getElementById('kampSelect').value;
  if (kampId) renderDeelnemersFormulier(kampId);
};

window.clearSearchInput = function() {
  const input = document.getElementById('deelnemerZoekInput');
  if (input) {
    input.value = '';
    filterDeelnemersLijst();
  }
};

window.onKeuzeChange = function(kampId) {
  const selects = document.querySelectorAll('select[data-deelnemer]');
  selects.forEach(s => {
    const dId = s.dataset.deelnemer;
    const p = s.dataset.periode;
    if (s.value && s.value !== 'unselected') {
      appData.keuzes[`${dId}_${p}`] = s.value;
    } else {
      delete appData.keuzes[`${dId}_${p}`];
    }
  });

  renderDeelnemersFormulier(kampId);
};

window.opslaanKeuzes = async function() {
  const selects = document.querySelectorAll('select[data-deelnemer]');

  selects.forEach(s => {
    const dId = s.dataset.deelnemer;
    const p = s.dataset.periode;
    if (s.value && s.value !== 'unselected') {
      appData.keuzes[`${dId}_${p}`] = s.value;
    } else {
      delete appData.keuzes[`${dId}_${p}`];
    }
  });

  // Schoon alle ongedefinieerde/lege keuzes op voor opslag
  const schoneKeuzes = {};
  Object.keys(appData.keuzes).forEach(k => {
    if (appData.keuzes[k] && appData.keuzes[k] !== 'unselected') {
      schoneKeuzes[k] = appData.keuzes[k];
    }
  });

  try {
    await set(ref(db, 'topvakantie/keuzes'), schoneKeuzes);
    appData.keuzes = schoneKeuzes;
    showModal("Opgeslagen!", "Keuzes van de deelnemers zijn succesvol opgeslagen.");
    updateOverzicht();
    updateStats();
  } catch (err) {
    console.error("Firebase Opslaan Fout:", err);
    showModal("Fout bij opslaan", "Kon keuzes niet opslaan. Controleer of Firebase Rules op 'read: true, write: true' staan.");
  }
};

window.resetKeuzesVanKamp = async function() {
  const kampId = document.getElementById('kampSelect').value;
  if (!kampId) return;

  const kamp = appData.deelkampen.find(k => k.id === kampId);
  const bevestig = confirm(`Weet je zeker dat je alle gekozen activiteiten voor het kamp "${kamp ? kamp.naam : ''}" wilt resetten?`);

  if (bevestig) {
    const deelnemersInKamp = appData.deelnemers.filter(d => d.kampId === kampId);
    
    deelnemersInKamp.forEach(d => {
      ['voormiddag', 'namiddag1', 'namiddag2', 'avond'].forEach(p => {
        delete appData.keuzes[`${d.id}_${p}`];
      });
    });

    try {
      await set(ref(db, 'topvakantie/keuzes'), appData.keuzes);
      renderDeelnemersFormulier(kampId);
      updateOverzicht();
      showModal("Reset Voltooid", `Alle keuzes voor "${kamp ? kamp.naam : ''}" zijn gewist.`);
    } catch (err) {
      showModal("Fout", "Kon keuzes niet resetten.");
    }
  }
};

// 2. BEHEER: CHECKBOXES AANBOD & CSV IMPORT
function renderBeheerKampCheckboxes() {
  const grid = document.getElementById('beheerKampCheckboxesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (appData.deelkampen.length === 0) {
    grid.innerHTML = '<em>Nog geen deelkampen aangemaakt.</em>';
    return;
  }

  appData.deelkampen.forEach(kamp => {
    grid.innerHTML += `
      <label class="checkbox-label">
        <input type="checkbox" class="beheer-kamp-cb" value="${kamp.id}" onchange="onBeheerKampSelectionChange()">
        ${kamp.naam}
      </label>
    `;
  });
}

window.selecteerAlleBeheerKampen = function(selecteer) {
  document.querySelectorAll('.beheer-kamp-cb').forEach(cb => cb.checked = selecteer);
  window.onBeheerKampSelectionChange();
};

window.onBeheerKampSelectionChange = function() {
  const geselecteerdeKampIds = Array.from(document.querySelectorAll('.beheer-kamp-cb:checked')).map(cb => cb.value);
  const panel = document.getElementById('beheerAanbodPanel');

  if (geselecteerdeKampIds.length === 0) {
    if (panel) panel.style.display = 'none';
    return;
  }

  if (panel) panel.style.display = 'block';
  const periodes = ['voormiddag', 'namiddag1', 'namiddag2', 'avond'];
  const primairKampId = geselecteerdeKampIds[0];
  const primairAanbod = appData.periodeAanbod[primairKampId] || {};

  periodes.forEach(p => {
    const box = document.getElementById(`beheer-aanbod-${p}`);
    if (!box) return;

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
            <input type="checkbox" class="cb-beheer-${p}" value="${act.id}" ${isChecked}>
            <strong>${act.naam}</strong>
          </div>
          <div class="max-input-group">
            <label>Max. pers. (0 = ∞):</label>
            <input type="number" min="0" class="max-beheer-${p}" data-act="${act.id}" value="${maxVal}">
          </div>
        </div>
      `;
    }).join('');
  });
};

window.importeerDeelnemersCSV = function() {
  const fileInput = document.getElementById('csvFileInput');
  const gekozenKampId = document.getElementById('csvStandaardKampSelect').value;

  if (!fileInput.files || fileInput.files.length === 0) {
    return showModal("Fout", "Selecteer een CSV-bestand.");
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async function(e) {
    const text = e.target.result;
    const lijnen = text.split(/\r\n|\n/);
    let toegevoegdAantal = 0;

    lijnen.forEach(lijn => {
      if (!lijn.trim()) return;
      const delen = lijn.split(',');
      const naam = delen[0].replace(/"/g, '').trim();
      let kampNaam = delen[1] ? delen[1].replace(/"/g, '').trim() : '';

      if (naam && naam.toLowerCase() !== 'naam' && naam.toLowerCase() !== 'deelnemer') {
        let doelKampId = gekozenKampId;

        if (!doelKampId && kampNaam) {
          const gevondenKamp = appData.deelkampen.find(k => k.naam.toLowerCase() === kampNaam.toLowerCase());
          if (gevondenKamp) doelKampId = gevondenKamp.id;
        }

        if (doelKampId) {
          appData.deelnemers.push({ id: `d-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, naam: naam, kampId: doelKampId });
          toegevoegdAantal++;
        }
      }
    });

    if (toegevoegdAantal > 0) {
      appData.deelnemers = sorteerOpNaam(appData.deelnemers);
      await set(ref(db, 'topvakantie/deelnemers'), appData.deelnemers);
      initApp();
      renderBeheerLijsten();
      updateStats();
      showModal("Import Succesvol", `${toegevoegdAantal} deelnemers geïmporteerd!`);
      fileInput.value = '';
    } else {
      showModal("Fout", "Geen geldige deelnemers gevonden of gekoppeld kamp niet herkend.");
    }
  };

  reader.readAsText(file);
};

window.opslaanBeheerAanbodMulti = async function() {
  const geselecteerdeKampIds = Array.from(document.querySelectorAll('.beheer-kamp-cb:checked')).map(cb => cb.value);
  const periodes = ['voormiddag', 'namiddag1', 'namiddag2', 'avond'];

  if (geselecteerdeKampIds.length === 0) {
    return showModal("Fout", "Selecteer minstens één kamp.");
  }

  for (const kampId of geselecteerdeKampIds) {
    if (!appData.periodeAanbod[kampId]) appData.periodeAanbod[kampId] = {};

    periodes.forEach(p => {
      const cbs = document.querySelectorAll(`.cb-beheer-${p}:checked`);
      const items = [];

      cbs.forEach(cb => {
        const actId = cb.value;
        const maxInput = document.querySelector(`.max-beheer-${p}[data-act="${actId}"]`);
        const maxVal = parseInt(maxInput ? maxInput.value : 0) || 0;
        items.push({ actId: actId, max: maxVal });
      });

      appData.periodeAanbod[kampId][p] = items;
    });

    await set(ref(db, `topvakantie/periodeAanbod/${kampId}`), appData.periodeAanbod[kampId]);
  }

  showModal("Opgeslagen", "Het activiteitenaanbod en de capaciteit zijn opgeslagen.");

  const huidigGeselecteerdKamp = document.getElementById('kampSelect').value;
  if (huidigGeselecteerdKamp && geselecteerdeKampIds.includes(huidigGeselecteerdKamp)) {
    renderDeelnemersFormulier(huidigGeselecteerdKamp);
  }
};

window.resetAanbodVanGeselecteerdeKampen = async function() {
  const geselecteerdeKampIds = Array.from(document.querySelectorAll('.beheer-kamp-cb:checked')).map(cb => cb.value);

  if (geselecteerdeKampIds.length === 0) {
    return showModal("Fout", "Selecteer eerst minstens één kamp.");
  }

  const bevestig = confirm("Weet je zeker dat je het dagaanbod voor de geselecteerde kampen wilt wissen?");
  if (bevestig) {
    for (const kampId of geselecteerdeKampIds) {
      delete appData.periodeAanbod[kampId];
      await set(ref(db, `topvakantie/periodeAanbod/${kampId}`), null);
    }

    onBeheerKampSelectionChange();
    
    const huidigKamp = document.getElementById('kampSelect').value;
    if (huidigKamp && geselecteerdeKampIds.includes(huidigKamp)) {
      renderDeelnemersFormulier(huidigKamp);
    }

    showModal("Reset Voltooid", "Het dagaanbod voor de geselecteerde kampen is gewist.");
  }
};

window.resetAlleKeuzesGlobal = async function() {
  const bevestig = confirm("WEET JE ZEKER dat je ALLE keuzes van ALLE deelnemers wilt wissen?");
  if (bevestig) {
    appData.keuzes = {};
    await set(ref(db, 'topvakantie/keuzes'), appData.keuzes);

    const huidigKamp = document.getElementById('kampSelect').value;
    if (huidigKamp) renderDeelnemersFormulier(huidigKamp);
    updateOverzicht();
    updateStats();
    showModal("Reset Voltooid", "Alle geselecteerde keuzes van alle deelnemers zijn gewist.");
  }
};

// 3. BEHEER & LOGIN
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
    renderBeheerKampCheckboxes();
    renderBeheerLijsten();
    updateStats();
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
  updateStats();
  if (document.querySelectorAll('.beheer-kamp-cb:checked').length > 0) {
    onBeheerKampSelectionChange();
  }
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
  renderBeheerKampCheckboxes();
  renderBeheerLijsten();
  updateStats();
  showModal("Succes", `Kamp "${naam}" toegevoegd!`);
};

window.voegDeelnemerToe = async function() {
  const input = document.getElementById('nieuwDeelnemerNaam');
  const kampId = document.getElementById('nieuwDeelnemerKamp').value;
  const naam = input.value.trim();

  if (!naam || !kampId) return showModal("Fout", "Vul een naam in en kies een kamp.");

  const nieuw = { id: `d-${Date.now()}`, naam: naam, kampId: kampId };
  appData.deelnemers.push(nieuw);
  appData.deelnemers = sorteerOpNaam(appData.deelnemers);

  await set(ref(db, 'topvakantie/deelnemers'), appData.deelnemers);
  input.value = '';
  initApp();
  renderBeheerLijsten();
  updateStats();
  showModal("Succes", `Deelnemer "${naam}" toegevoegd!`);
};

function renderBeheerLijsten() {
  const container = document.getElementById('beheerLijstContainer');
  if (!container) return;

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
  updateStats();
};

window.verwijderKamp = async function(id) {
  appData.deelkampen = appData.deelkampen.filter(k => k.id !== id);
  await set(ref(db, 'topvakantie/deelkampen'), appData.deelkampen);
  initApp();
  renderBeheerKampCheckboxes();
  renderBeheerLijsten();
  updateStats();
};

// 4. OVERZICHT & EXPORT
window.updateOverzicht = function() {
  const filterKamp = document.getElementById('overzichtKampSelect').value;
  const container = document.getElementById('overzichtContainer');
  if (!container) return;
  container.innerHTML = '';

  const periodes = [
    { id: 'voormiddag', label: 'Voormiddag' },
    { id: 'namiddag1', label: 'Namiddag 1' },
    { id: 'namiddag2', label: 'Namiddag 2' },
    { id: 'avond', label: 'Avond' }
  ];

  let erIsMinstensEenInschrijving = false;

  periodes.forEach(p => {
    let periodeHtml = '';
    let aantalInscriptiesInPeriode = 0;

    appData.masterActiviteiten.forEach(act => {
      const deelnemersLijst = sorteerOpNaam([...appData.deelnemers]);
      const ingeschreven = deelnemersLijst.filter(d => {
        const isKampMatch = !filterKamp || d.kampId === filterKamp;
        return isKampMatch && appData.keuzes[`${d.id}_${p.id}`] === act.id;
      });

      if (ingeschreven.length > 0) {
        aantalInscriptiesInPeriode += ingeschreven.length;
        erIsMinstensEenInschrijving = true;

        periodeHtml += `
          <div class="overzicht-card">
            <h4>${act.naam}</h4>
            <p>${ingeschreven.length} deelnemer(s)</p>
            <div class="deelnemers-tags">
              ${ingeschreven.map(d => `<span class="tag">${d.naam}</span>`).join('')}
            </div>
          </div>
        `;
      }
    });

    if (aantalInscriptiesInPeriode > 0) {
      const sectie = document.createElement('div');
      sectie.className = 'tijdsstip-sectie';
      sectie.innerHTML = `
        <h3 class="tijdsstip-titel">${p.label}</h3>
        <div class="overzicht-grid">${periodeHtml}</div>
      `;
      container.appendChild(sectie);
    }
  });

  if (!erIsMinstensEenInschrijving) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg class="empty-svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg></div><h3>Geen Keuzes Gevonden</h3><p>Er zijn nog geen inschrijvingen opgeslagen voor dit filter.</p></div>';
  }
};

window.exportCSV = function() {
  const filterKamp = document.getElementById('kampSelect').value;
  
  const periodes = [
    { id: 'voormiddag', label: 'Voormiddag' },
    { id: 'namiddag1', label: 'Namiddag 1' },
    { id: 'namiddag2', label: 'Namiddag 2' },
    { id: 'avond', label: 'Avond' }
  ];

  let excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Keuzeactiviteiten</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        th { background-color: #70b22a; color: white; font-weight: bold; border: 1px solid #5d9622; padding: 8px; text-align: left; }
        td { border: 1px solid #dbe4d5; padding: 6px; font-family: Arial, sans-serif; }
        .period-header { background-color: #004b87; color: white; font-size: 14pt; font-weight: bold; }
        .act-header { background-color: #f0f7e8; color: #004b87; font-weight: bold; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="3" style="font-size: 16pt; font-weight: bold; color: #004b87;">Topvakantie Keuzeactiviteiten Overzicht</td></tr>
        <tr><td></td></tr>
  `;

  periodes.forEach(p => {
    let heeftData = false;
    let periodBlock = `<tr><td colspan="3" class="period-header">${p.label}</td></tr>`;
    periodBlock += `<tr><th>Activiteit</th><th>Deelnemer</th><th>Kamp</th></tr>`;

    appData.masterActiviteiten.forEach(act => {
      const deelnemersLijst = sorteerOpNaam([...appData.deelnemers]);
      const ingeschreven = deelnemersLijst.filter(d => {
        const isKampMatch = !filterKamp || d.kampId === filterKamp;
        return isKampMatch && appData.keuzes[`${d.id}_${p.id}`] === act.id;
      });

      if (ingeschreven.length > 0) {
        heeftData = true;
        ingeschreven.forEach(d => {
          const kamp = appData.deelkampen.find(k => k.id === d.kampId);
          periodBlock += `
            <tr>
              <td class="act-header">${act.naam}</td>
              <td>${d.naam}</td>
              <td>${kamp ? kamp.naam : ''}</td>
            </tr>
          `;
        });
      }
    });

    if (heeftData) {
      excelHtml += periodBlock + `<tr><td></td></tr>`;
    }
  });

  excelHtml += `</table></body></html>`;

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Topvakantie_Keuzes_Geformatteerd.xls`;
  link.click();
};

window.onbeforeprint = function() {
  const printContainer = document.getElementById('printContainer');
  const filterKamp = document.getElementById('kampSelect').value;

  let html = '';

  const periodes = [
    { id: 'voormiddag', label: 'Voormiddag' },
    { id: 'namiddag1', label: 'Namiddag 1' },
    { id: 'namiddag2', label: 'Namiddag 2' },
    { id: 'avond', label: 'Avond' }
  ];

  periodes.forEach(p => {
    appData.masterActiviteiten.forEach(act => {
      const deelnemersLijst = sorteerOpNaam([...appData.deelnemers]);
      const ingeschreven = deelnemersLijst.filter(d => {
        const isKampMatch = !filterKamp || d.kampId === filterKamp;
        return isKampMatch && appData.keuzes[`${d.id}_${p.id}`] === act.id;
      });

      if (ingeschreven.length > 0) {
        html += `
          <div class="print-page">
            <div class="print-header">
              <span class="print-period-badge">${p.label}</span>
              <div class="print-act-title">${act.naam}</div>
              <div class="print-count">Totaal inschrijvingen: ${ingeschreven.length} deelnemer(s)</div>
            </div>

            <table class="print-table">
              <thead>
                <tr>
                  <th class="print-checkbox-col">Aanw.</th>
                  <th>#</th>
                  <th>Naam Deelnemer</th>
                  <th>Kamp</th>
                </tr>
              </thead>
              <tbody>
                ${ingeschreven.map((d, index) => {
                  const kamp = appData.deelkampen.find(k => k.id === d.kampId);
                  return `
                    <tr>
                      <td class="print-checkbox-col"><span class="print-checkbox-box"></span></td>
                      <td>${index + 1}</td>
                      <td><strong>${d.naam}</strong></td>
                      <td>${kamp ? kamp.naam : ''}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    });
  });

  if (!html) {
    html = `<div class="print-page"><p>Er zijn geen inschrijvingen gevonden om af te drukken.</p></div>`;
  }

  printContainer.innerHTML = html;
};

window.openTab = function(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const tabElem = document.getElementById(`tab-${tabName}`);
  if (tabElem) tabElem.classList.add('active');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
};

function showModal(title, msg) {
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const customModal = document.getElementById('customModal');

  if (modalTitle) modalTitle.textContent = title;
  if (modalMessage) modalMessage.textContent = msg;
  if (customModal) customModal.style.display = 'flex';
}

window.closeModal = function() {
  const customModal = document.getElementById('customModal');
  if (customModal) customModal.style.display = 'none';
};

laadFirebaseData();
