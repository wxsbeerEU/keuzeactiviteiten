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
    { id: "a-kd2", kampId: "k-1", naam: "Echte Zwaarden Maken (Knutselen)", periodes: ["namiddag1"] },
    { id: "a-kd3", kampId: "k-1", naam: "Kasteel Larp & Speurtocht", periodes: ["namiddag2"] },
    { id: "a-kd4", kampId: "k-1", naam: "Nachtelijke Drakenjacht", periodes: ["avond"] },

    // Surfen
    { id: "a-su1", kampId: "k-2", naam: "Golfsurfen Basis", periodes: ["voormiddag", "namiddag1"] },
    { id: "a-su2", kampId: "k-2",
