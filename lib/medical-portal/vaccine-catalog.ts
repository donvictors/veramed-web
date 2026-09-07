export type VaccineCatalogItem = {
  id: string;
  name: string;
  description: string;
  allowsDose?: boolean;
};

export type VaccineCatalogSection = {
  id: string;
  title: string;
  vaccines: readonly VaccineCatalogItem[];
};

export type VaccineCatalogGroup = {
  id: string;
  title: string;
  sections: readonly VaccineCatalogSection[];
};

function vaccine(id: string, name: string, description: string, allowsDose = false): VaccineCatalogItem {
  return { id, name, description, allowsDose };
}

export const VACCINE_CATALOG: readonly VaccineCatalogGroup[] = [
  {
    id: "pni",
    title: "Plan Nacional de Inmunización (PNI)",
    sections: [
      {
        id: "pni-general",
        title: "Grupo general",
        vaccines: [
          vaccine("pni-acthib", "Vacuna Acthib (PNI)", "Vacuna Acthib (PNI)"),
          vaccine("pni-antirrabica", "Vacuna Antirrábica", "Vacuna Antirrábica (PNI)"),
          vaccine("pni-dt", "Antitetánica", "Vacuna Dt (PNI)"),
          vaccine("pni-gardasil", "Virus Papiloma Humano", "Vacuna Gardasil (PNI)"),
          vaccine("pni-bexsero", "Bexsero® (B)", "Vacuna Meningococo Grupo B (PNI)", true),
          vaccine("pni-polio", "Vacuna Polio Inyectable (PNI)", "Vacuna Polio Inyectable (PNI)"),
          vaccine("pni-rotavirus", "Vacuna Rotavirus (PNI)", "Vacuna Rotavirus (PNI)"),
          vaccine("pni-triviral", "Vacuna Tres Vírica", "Vacuna Tres Vírica (PNI)"),
          vaccine("pni-varicela", "Vacuna Varicela (PNI)", "Vacuna Varicela (PNI)"),
        ],
      },
      {
        id: "pni-2m",
        title: "2 meses",
        vaccines: [
          vaccine("pni-2m-bexsero", "Bexsero® (B)", "Vacuna Meningococo Grupo B", true),
          vaccine("pni-2m-hexa", "Vacuna Hexavalente", "Vacuna Hexavalente (PNI)", true),
          vaccine("pni-2m-neumo", "Neumocócica Conjugada", "Vacuna Neumococo 20 Valente (PNI)", true),
        ],
      },
      {
        id: "pni-4m",
        title: "4 meses",
        vaccines: [
          vaccine("pni-4m-hexa", "Vacuna Hexavalente", "Vacuna Hexavalente (PNI)", true),
          vaccine("pni-4m-neumo", "Neumocócica Conjugada", "Vacuna Neumococo 20 Valente (PNI)", true),
          vaccine("pni-4m-bexsero", "Bexsero® (B)", "Vacuna Meningococo Grupo B", true),
        ],
      },
      {
        id: "pni-6m",
        title: "6 meses",
        vaccines: [
          vaccine("pni-6m-hexa", "Vacuna Hexavalente", "Vacuna Hexavalente (PNI)", true),
          vaccine("pni-6m-neumo", "Neumocócica Conjugada", "Vacuna Neumococo 20 Valente (PNI)", true),
        ],
      },
      {
        id: "pni-12m",
        title: "12 meses",
        vaccines: [
          vaccine("pni-12m-meningo", "Meningocócica Conjugada (A-C-Y-W)", "Vacuna Antimeningocócica (PNI)", true),
          vaccine("pni-12m-neumo", "Neumocócica Conjugada", "Vacuna Neumococo 20 Valente (PNI)", true),
          vaccine("pni-12m-triviral", "Vacuna Tres Vírica", "Vacuna Tres Vírica (PNI)", true),
        ],
      },
      {
        id: "pni-18m",
        title: "18 meses",
        vaccines: [
          vaccine("pni-18m-hepa", "Hepatitis A", "Vacuna Hepatitis A (PNI)", true),
          vaccine("pni-18m-hexa", "Vacuna Hexavalente", "Vacuna Hexavalente (PNI)", true),
          vaccine("pni-18m-varicela", "Vacuna Varicela (PNI)", "Vacuna Varicela (PNI)", true),
          vaccine("pni-18m-meningo", "Vacuna Meningococo Grupo B", "Vacuna Meningococo Grupo B", true),
        ],
      },
      {
        id: "pni-36m",
        title: "36 meses",
        vaccines: [
          vaccine("pni-36m-triviral", "Vacuna Tres Vírica", "Vacuna Tres Vírica (PNI)", true),
          vaccine("pni-36m-varicela", "Vacuna Varicela (PNI)", "Vacuna Varicela (PNI)", true),
        ],
      },
      {
        id: "pni-escolar",
        title: "Escolares",
        vaccines: [
          vaccine("pni-1b-dtpa", "1° Básico · Difteria, Tétanos, Pertussis Acelular", "Vacuna Difteria Tétano (PNI)", true),
          vaccine("pni-4b-vph", "4° Básico · Virus Papiloma Humano", "Vacuna Virus Papiloma Humano (PNI)", true),
          vaccine("pni-5b-vph", "5° Básico · Virus Papiloma Humano", "Vacuna Virus Papiloma Humano (PNI)", true),
          vaccine("pni-8b-dtpa", "8° Básico · Difteria, Tétanos, Pertussis Acelular", "Vacuna Difteria Tétano (PNI)", true),
        ],
      },
      {
        id: "pni-especiales",
        title: "Campañas y grupos especiales",
        vaccines: [
          vaccine("pni-mayor-neumo", "Adulto mayor · Neumocócica Polisacárida", "Vacuna Neumococo 23 Valente (PNI)", true),
          vaccine("pni-influenza", "Campaña Influenza", "Vacuna Influenza (PNI)", true),
          vaccine("pni-vrs", "Nirsevimab", "Vacuna Anticuerpos Anti VRS (PNI)", true),
          vaccine("pni-covid", "Vacuna Covid-19", "Vacuna Covid-19 (PNI)", true),
          vaccine("pni-mpox", "Jynneos", "Vacuna Viruela del Mono (PNI)", true),
          vaccine("pni-embarazo-boostrix", "Embarazadas · Difteria, Tétanos y Pertussis Acelular", "Vacuna Boostrix (PNI)", true),
          vaccine("pni-embarazo-dt", "Embarazadas · Difteria, Tétanos, Pertussis Acelular", "Vacuna Difteria Tétano (PNI)", true),
          vaccine("pni-rn-bcg", "Recién nacido · Vacuna BCG", "Vacuna BCG (PNI)", true),
          vaccine("pni-rn-hepb", "Recién nacido · Vacuna Hepatitis B", "Vacuna Hepatitis B (PNI)", true),
        ],
      },
    ],
  },
  {
    id: "complementarias",
    title: "Complementarias",
    sections: [
      {
        id: "comp-dtpa",
        title: "Difteria, Tétanos y Pertussis",
        vaccines: [
          vaccine("comp-adacel", "Difteria, Tétanos y Pertussis Acelular", "Vacuna Adacel", true),
          vaccine("comp-boostrix", "Difteria, Tétanos y Pertussis Acelular", "Vacuna Boostrix", true),
          vaccine("comp-dt", "Difteria, Tétanos, Pertussis Acelular", "Vacuna Difteria Tétano (PNI)", true),
        ],
      },
      { id: "comp-zoster", title: "Herpes Zoster", vaccines: [vaccine("comp-shingrix", "Shingrix", "Vacuna Herpes Zoster", true)] },
      {
        id: "comp-vrs",
        title: "Virus Respiratorio Sincicial",
        vaccines: [
          vaccine("comp-arexvy", "Arexvy", "Vacuna Virus Respiratorio Sincicial", true),
          vaccine("comp-abrysvo", "Abrysvo", "Vacuna Virus Respiratorio Sincicial", true),
        ],
      },
      {
        id: "comp-hepatitis",
        title: "Hepatitis",
        vaccines: [
          vaccine("comp-avaxim-adulto", "Hepatitis A", "Vacuna Avaxim Adulto (Hepatitis A)", true),
          vaccine("comp-avaxim-ped", "Hepatitis A", "Vacuna Avaxim Pediátrica (Hepatitis A)", true),
          vaccine("comp-hepa", "Hepatitis A", "Vacuna Hepatitis A", true),
          vaccine("comp-hepb", "Hepatitis B", "Vacuna Hepatitis B", true),
          vaccine("comp-twinrix", "Hepatitis A + B Twinrix", "Vacuna Hepatitis A y B", true),
          vaccine("comp-vaqta-adulto", "Hepatitis A", "Vacuna Vaqta Adulto (Hepatitis A)", true),
          vaccine("comp-vaqta-infantil", "Hepatitis A", "Vacuna Vaqta Infantil (Hepatitis A)", true),
        ],
      },
      {
        id: "comp-meningo",
        title: "Meningocócica",
        vaccines: [
          vaccine("comp-menactra", "Vacuna Menactra Meningo 4 Valente", "Vacuna Meningo 4 Valente (ACWY)", true),
          vaccine("comp-meningo4", "Vacuna Meningocócica 4 Valente", "Vacuna Meningocócica 4 Valente", true),
          vaccine("comp-bexsero", "Bexsero® (B)", "Vacuna Meningococo Grupo B", true),
          vaccine("comp-menveo", "Menveo", "Vacuna Meningocócica Tetravalente (ACWY)", true),
          vaccine("comp-nimenrix", "Nimenrix® (A-C-Y-W)", "Vacuna Meningocócica Tetravalente (ACWY)", true),
        ],
      },
      {
        id: "comp-neumo",
        title: "Neumocócica",
        vaccines: [
          vaccine("comp-neumo23", "Neumo 23", "Vacuna Neumocócica Polisacárida 23 Serotipos", true),
          vaccine("comp-prevenar13", "Prevenar 13", "Vacuna Neumocócica Conjugada 13 Serotipos", true),
          vaccine("comp-prevenar20", "Prevenar 20", "Vacuna Neumocócica Conjugada 20 Serotipos", true),
        ],
      },
      {
        id: "comp-otras",
        title: "Otras",
        vaccines: [
          vaccine("comp-hib", "Vacuna Haemophilus Influenza B", "Vacuna Act Hib", true),
          vaccine("comp-actacel", "Difteria, Tétanos, Pertussis Acelular + Haemophilus Influenza B", "Vacuna Actacel", true),
          vaccine("comp-influenza4", "Vacuna Influenza Tetravalente", "Vacuna Influenza Tetravalente", true),
          vaccine("comp-inmunorho", "Inmunoglobulina", "Vacuna Inmunorho", true),
          vaccine("comp-polio", "Polio Inactivada (IPV)", "Vacuna Polio IPV", true),
          vaccine("comp-stamaril", "Fiebre Amarilla", "Vacuna Stamaril", true),
          vaccine("comp-tetavax", "Antitetánica", "Vacuna Tetavax", true),
          vaccine("comp-typbar", "Fiebre Tifoídea", "Vacuna Typbar", true),
          vaccine("comp-typhim", "Fiebre Tifoídea", "Vacuna Typhim Vi", true),
          vaccine("comp-verorab", "Antirrábica", "Vacuna Verorab", true),
        ],
      },
      { id: "comp-rotavirus", title: "Rotavirus", vaccines: [vaccine("comp-rotarix", "Rotarix", "Vacuna Rotarix", true), vaccine("comp-rotateq", "Rotateq®", "Vacuna Rotateq", true)] },
      { id: "comp-varicela", title: "Varicela", vaccines: [vaccine("comp-varivax", "Varivax", "Vacuna Varicela", true)] },
      { id: "comp-vph", title: "Virus Papiloma Humano", vaccines: [vaccine("comp-gardasil4", "Virus Papiloma Humano (Gardasil 4)", "Vacuna Gardasil 4", true), vaccine("comp-gardasil9", "Virus Papiloma Humano (Gardasil 9)", "Vacuna Gardasil 9", true)] },
    ],
  },
];
