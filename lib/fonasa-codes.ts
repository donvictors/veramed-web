const FONASA_CODES: Record<string, string> = {
  "acido urico": "0302005",
  albumina: "0302101",
  "alfa-fetoproteina (afp)": "0305003",
  "anticuerpos anti virus hepatitis c": "0306081",
  "anticuerpos anti-dna por elisa": "0305005",
  "antigeno de superficie virus hepatitis b (hbsag)": "0306079",
  "antigeno prostatico especifico (ape)": "0305070",
  "calcio total": "0302015",
  "carga viral vih": "0306086",
  "cinetica de fierro": "0301030",
  "creatinina en sangre": "0302023",
  "cuantificacion de complemento c3": "0305012",
  "cuantificacion de complemento c4": "0305012",
  "cuantificacion de subpoblaciones de linfocitos t (cd3, cd4, cd8)": "0305091",
  "densitometria osea": "0501134",
  "ecografia abdominal": "0404003",
  "electrocardiograma (ecg)": "1701001",
  "electrolitos en sangre (na, k, cl)": "0302032",
  "elisa para vih": "0306169",
  "espirometria basal y post broncodilatador": "1707002",
  "estudio de capacidad de difusion (dlco)": "1707008",
  ferritina: "0301026",
  "folato serico": "0301002",
  "fondo de ojo": "0101204",
  "gases en sangre arterial": "0302046",
  "gases en sangre venosa": "0302046",
  "glucosa en sangre": "0302047",
  "hemoglobina glicosilada (hba1c)": "0301041",
  hemograma: "0301045",
  "holter de presion arterial (mapa)": "1701009",
  inr: "0301059",
  "mamografia bilateral": "0401010",
  "niveles de vitamina b12": "0302077",
  "niveles de vitamina d": "0302078",
  "niveles plasmaticos de acido valproico": "0302035",
  "niveles plasmaticos de antiepileptico (segun farmaco en uso)": "0302035",
  "niveles plasmaticos de carbamazepina": "0302035",
  "niveles plasmaticos de fenitoina": "0302035",
  "niveles plasmaticos de fenobarbital": "0302035",
  "niveles plasmaticos de litio": "0302035",
  "nt-probnp": "0303055",
  "orina completa": "0309022",
  "papanicolau (pap)": "0801001",
  "pcr chlamydia trachomatis y neisseria gonorrhoeae": "0306097",
  "pcr de virus papiloma humano (vph)": "0306123",
  "perfil bioquimico": "0302075",
  "perfil hepatico": "0302076",
  "perfil lipidico": "0302034",
  "proteina c reactiva (pcr)": "0305031",
  "prueba de tolerancia a la glucosa oral (ptgo)": "0302048",
  pth: "0303018",
  "razon albuminuria / creatininuria (rac)": "0308051, 0309010",
  "razon proteinuria / creatininuria (ipc)": "0309028, 0309010",
  "rpr/vdrl": "0306042",
  "t4 libre": "0303026",
  tsh: "0303024",
  urocultivo: "0306011",
};

function normalizeExamName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFonasaCodeByExamName(examName: string) {
  const normalized = normalizeExamName(examName);
  return FONASA_CODES[normalized] ?? "No informado";
}

