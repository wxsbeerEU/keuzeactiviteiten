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
    // Kerkers & Draken
    { id: "a-kd1", kampId: "k-1", naam: "D&D Roleplay Introductie", periodes: ["voormiddag"] },
    { id: "a-kd2", kampId: "k-1", naam: "Echte Zwaarden Maken", periodes: ["namiddag1"] },
    { id: "a-kd3", kampId: "k-1", naam: "Kasteel Larp & Speurtocht", periodes: ["namiddag2"] },
    { id: "a-kd4", kampId: "k-1", naam: "Nachtelijke Drakenjacht", periodes: ["avond"] },

    // Surfen
    { id: "a-su1", kampId: "k-2", naam: "Golfsurfen Basis", periodes: ["voormiddag", "namiddag1"] },
    { id: "a-su2", kampId: "k-2", naam: "Bodyboarden & Waves", periodes: ["namiddag1", "namiddag2"] },
    { id: "a-su3", kampId: "k-2", naam: "Stand Up Paddle (SUP)", periodes: ["voormiddag", "namiddag2"] },
    { id: "a-su4", kampId: "k-2", naam: "Strandfeest & Surfmovie", periodes: ["avond"] },

    // Z.E.E.
    { id: "a-ze1", kampId: "k-3", naam: "Garnaalvissen & Biologie", periodes: ["voormiddag"] },
    { id: "a-ze2", kampId: "k-3", naam: "Duin-expeditie & Survival", periodes: ["namiddag1"] },
    { id: "a-ze3", kampId: "k-3", naam: "Zeekajakken & Raften", periodes: ["namiddag2"] },
    { id: "a-ze4", kampId: "k-3", naam: "Kampvuur aan het Strand", periodes: ["avond"] },

    // Think Tech
    { id: "a-tt1", kampId: "k-4", naam: "3D-Printen & Ontwerpen", periodes: ["voormiddag"] },
    { id: "a-tt2", kampId: "k-4", naam: "Robotica Challenge", periodes: ["namiddag1"] },
    { id: "a-tt3", kampId: "k-4", naam: "Drone Parcoers Vliegen", periodes: ["namiddag2"] },
    { id: "a-tt4", kampId: "k-4", naam: "VR Tech Night", periodes: ["avond"] },

    // Gaming
    { id: "a-gm1", kampId: "k-5", naam: "Esports Toernooi (Rocket League)", periodes: ["voormiddag"] },
    { id: "a-gm2", kampId: "k-5", naam: "Retro Gaming Arcade", periodes: ["namiddag1"] },
    { id: "a-gm3", kampId: "k-5", naam: "Real-Life Mario Kart", periodes: ["namiddag2"] },
    { id: "a-gm4", kampId: "k-5",
