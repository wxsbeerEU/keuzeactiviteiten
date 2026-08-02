import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// firebaseConfig met jouw gegevens uit het screenshot
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

const STANDAARD_DATA = {
  deelkampen: [
    { id: "k-1", naam: "Kerkers & Draken" },
    { id: "k-2", naam: "Surfen" },
    { id: "k-3", naam: "Z.E.E." },
    { id: "k-4", naam: "Think Tech" },
    { id: "k-5", naam: "Gaming" }
  ],
  deelnemers: [
    { id: 101, naam: "Lucas De Smet", kampId: "k-1" },
    { id: 102, naam: "Emma Janssens", kampId: "k-1" },
    { id: 201, naam: "Liam Peeters", kampId: "k-2" },
    { id: 202, naam: "Sophie Willems", kampId: "k-2" },
    { id: 301, naam: "Noah Maes", kampId: "k-3" },
    { id: 401, naam: "Arthur Jacobs", kampId: "k-4" },
    { id: 501, naam: "Milan Mertens", kampId: "k-5" }
  ],
  activiteiten: [
    { id: "a-kd1", kampId: "k-1", naam: "D&D Roleplay Introductie", periodes: ["voormiddag"] },
    { id: "a-kd2", kampId: "k-1", naam: "Echte Zwaarden Maken", periodes: ["namiddag1"] },
    { id: "a-kd3", kampId: "k-1", naam: "Kasteel Larp & Speurtocht", periodes: ["namiddag2"] },
    { id: "a-kd4", kampId: "k-1", naam: "Nachtelijke Drakenjacht", periodes: ["avond"] },

    { id: "a-su1", kampId: "k-2", naam: "Golfsurfen Basis", periodes: ["voormiddag", "namiddag1"] },
    { id: "a-su2", kampId: "k-2", naam: "Bodyboarden & Waves", periodes: ["namiddag1", "namiddag2"] },
    { id: "a-su3", kampId: "k-2", naam: "Stand Up Paddle (SUP)", periodes: ["voormiddag", "namiddag2"] },
    { id: "a-su4", kampId: "k-2", naam: "Strandfeest & Surfmovie", periodes: ["avond"] },

    { id: "a-ze1", kampId: "k-3", naam: "Garnaalvissen & Biologie", periodes: ["voormiddag"] },
    { id: "a-ze2", kampId: "k-3", naam: "Duin-expeditie & Survival", periodes: ["namiddag1"] },
    { id: "a-ze3", kampId: "k-3", naam: "Zeekajakken & Raften", periodes: ["namiddag2"] },
    { id: "a-ze4", kampId: "k-3", naam: "Kampvuur aan het Strand", periodes: ["avond"] },

    { id: "a-tt1", kampId: "k-4", naam: "3D-Printen & Ontwerpen", periodes: ["voormiddag"] },
    { id: "a-tt2", kampId: "k-4", naam: "Robotica Challenge", periodes: ["namiddag1"] },
    { id: "a-tt3", kampId: "k-4", naam: "Drone Parcoers Vliegen", periodes: ["namiddag2"] },
    { id: "a-tt4", kampId: "k-4", naam: "VR Tech Night", periodes: ["avond"] },

    { id: "a-gm1", kampId: "k-5", naam: "Esports Toernooi", periodes: ["voormiddag"] },
    { id: "a-gm2", kampId: "k-5", naam: "Retro Gaming Arcade", periodes: ["namiddag1"] },
    { id: "a-gm3", kampId: "k-5", naam: "Real-Life Mario Kart", periodes: ["namiddag2"] },
    { id: "a-gm4", kampId: "k-5", naam: "LAN-Party & Pizza", periodes: ["avond"] }
  ],
  keuzes: {}
};

let appData = { ...STANDAARD_DATA };

async function laadFirebaseData() {
  const dbRef = ref(db);
  try {
    const snapshot = await get(child(dbRef, 'topvakantie'));
    if (snapshot.exists()) {
      appData = snapshot.val();
      if (!appData.keuzes) appData.keuzes = {};
    } else {
      await set(ref(db, 'topvakantie'), STANDAARD_DATA);
    }
    initApp();
  } catch (error) {
    console.error(error);
    showModal("Fout bij laden", "Kon geen verbinding maken met Firebase.");
  }
}

function initApp() {
  vulDropdowns();
  updateOverzicht();
}

function vulDropdowns() {
  const kampSelect = document.getElementById('kampSelect');
  const overzichtSelect = document.getElementById('overzichtKampSelect');
  const nieuwKampSelect = document.getElementById('nieuwDeelnemerKamp');

  kampSelect.innerHTML = '<option value="">-- Selecteer een Deelkamp --</option>';
  overzichtSelect.innerHTML = '<option value="">-- Alle Deelkampen --</option>';
  nieuwKampSelect.innerHTML = '';

  appData.deelkampen.forEach(kamp => {
    kampSelect.innerHTML += `<option value="${kamp.id}">${kamp.naam}</option>`;
    overzichtSelect.innerHTML += `<option value="${kamp.id}">${kamp.naam}</option>`;
    nieuwKampSelect.innerHTML += `<option value="${kamp.id}">${kamp.naam}</option>`;
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
  badge.textContent = kamp.naam;
  actionsBar.style.display = 'flex';

  const deelnemers = appData.deelnemers.filter(d => d.kampId === kampId);

  if (deelnemers.length === 0) {
    container.innerHTML = '<div class="empty-state">Geen deelnemers gevonden in dit kamp.</div>';
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
      const mogelijkeAct = appData.activiteiten.filter(a => a.kampId === kampId && a.periodes.includes(p.id));
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
    showModal("Opgeslagen!", "De keuzes zijn live opgeslagen in Firebase.");
    updateOverzicht();
  } catch (err) {
    showModal("Fout", "Er is iets misgegaan bij het opslaan in Firebase.");
  }
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
};

window.voegDeelnemerToe = async function() {
  const naamInput = document.getElementById('nieuwDeelnemerNaam');
  const kampId = document.getElementById('nieuwDeelnemerKamp').value;

  if (!naamInput.value.trim()) {
    showModal("Fout", "Vul een naam in.");
    return;
  }

  const nieuw = {
    id: Date.now(),
    naam: naamInput.value.trim(),
    kampId: kampId
  };

  appData.deelnemers.push(nieuw);
  await set(ref(db, 'topvakantie/deelnemers'), appData.deelnemers);
  
  naamInput.value = '';
  showModal("Toegevoegd", "Deelnemer is succesvol toegevoegd!");
  if (document.getElementById('kampSelect').value === kampId) {
    window.onKampChange();
  }
};

window.resetDatabase = async function() {
  await set(ref(db, 'topvakantie'), STANDAARD_DATA);
  appData = { ...STANDAARD_DATA };
  initApp();
  showModal("Reset voltooid", "Firebase is teruggezet naar de standaarddata.");
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
