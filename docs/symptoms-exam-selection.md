# Selección dirigida de exámenes por síntomas

La versión `symptoms-exams-v3` separa el nivel de atención de la selección de pruebas. `presencial_priority` y `emergency` advierten al paciente, **sin bloquear la emisión o firma de los exámenes justificados**. La advertencia pide no esperar firma, toma ni resultados para acudir. Una selección vacía también es válida y el médico puede validarla sin firmar un PDF vacío.

## Diagnóstico del comportamiento anterior

- El prompt de selección pedía priorizar sensibilidad y una evaluación amplia. Permitía hasta 20 nombres del catálogo con una justificación común.
- No había hipótesis ni evidencia obligatorias por examen, ni auditoría independiente de pertinencia.
- El respaldo enviaba respuestas adaptativas `q_N` al motor de cuestionarios fijos, que espera identificadores clínicos diferentes. Las respuestas ausentes podían transformarse en falsos negativos.
- El mapper fijaba `continue_flow` y descartaba señales de derivación. Algunas lecturas reponían los sugeridos cuando la selección final estaba vacía; la validación exigía al menos un examen.
- La entrevista no tenía mapa anorrectal y podía confundir secreción anal con un problema genital.

## Recorrido actual

1. La entrevista prioriza datos que cambian urgencia, diferencial o pruebas. El mapa anorrectal aborda fiebre/masa/dolor continuo, defecación/sangrado, evolución, secreción/lesiones, diarrea/tenesmo, riesgos, síntomas urinarios y exposición relevante. El servidor restaura discriminadores omitidos antes del cierre; mantiene el límite de ocho turnos. Los datos desconocidos no se interpretan como negativos.
2. La selección recibe relato, antecedentes, edad/sexo y pares pregunta-respuesta con IDs de fuente. No recibe identidad ni contacto como contexto. Las preguntas y los resúmenes previos no son evidencia positiva.
3. El modelo produce `assessment`: motivo, alarmas, nivel de atención, diferencial breve, candidatos con evidencia, utilidad y justificación individual; screening separado.
4. Protocolos acotados proponen candidatos de acuerdo con manifestaciones explícitas: infección urinaria febril, proctitis tras exposición anal receptiva y cefalea explosiva. Corrigen omisiones y metadatos de esos candidatos; **no eluden la auditoría**. No se activan por una pregunta o por un “sí” ambiguo. No son un clasificador exhaustivo de lenguaje natural.
5. Una segunda llamada, independiente de la generación, contrasta cada candidato con las fuentes y evalúa pertinencia, anatomía, cambio de conducta y redundancia.
6. Un filtro de código exige catálogo, hipótesis, evidencia verificable, los cuatro gates, necesidad actual, prioridad y auditoría. Excluye screening, pruebas opcionales/diferidas y datos clínicos pendientes. Bloquea incompatibilidades anorrectales conocidas aunque el modelo las apruebe; una muestra urinaria/vaginal no sustituye la rectal en proctitis.
7. Se persisten evaluación, auditoría, aceptados y exclusiones en `interviewMetadata.examDecision`, reutilizando el JSON existente (sin migración). Solo el portal médico ve el objeto completo. El paciente recibe indicaciones, nivel de atención y justificación individual.
8. La orden, el PDF y el correo conservan la advertencia. El médico puede modificar la selección y firmar, aun si hay indicación de atención urgente.

Si falla generación o auditoría, el caso queda para revisión médica, sin reutilizar la batería del motor fijo. La ausencia de candidatos en ese caso no significa que no exista enfermedad. Se conserva la entrevista para que el médico pueda decidir y emitir estudios desde el portal.

## Comprobaciones

`npm run test:symptoms-exams` ejecuta pruebas locales del filtro, protocolos y endpoints con servicios externos sustituidos: siete escenarios, exclusiones, evidencia negada/inventada, redundancias, muestra rectal, alarmas no bloqueantes, persistencia y validación con cero pruebas. Estas pruebas verifican lógica reproducible; no miden por sí solas la calidad de un modelo probabilístico.

`node scripts/evaluate-symptoms-exams.mjs --live` es una evaluación explícita con siete relatos sintéticos y el modelo configurado. Consume llamadas de API; no usa pacientes reales ni crea solicitudes, pagos, PDFs o correos. Escribe resultados en `/tmp/veramed-symptoms-exam-evaluation.json`. Permite detectar cambios del modelo que no aparecen en fixtures locales. Los resultados de una corrida no garantizan sensibilidad o especificidad clínica; sigue existiendo revisión médica.

También se mantienen las pruebas de entrevista adaptativa, transición de antecedentes, seguridad y chequeo preventivo.

## Referencias usadas para los criterios acotados

- [ASCRS: fisura anal](https://fascrs.org/Web/Web/Patients/Diseases-and-Conditions/A-Z/Anal-Fissure-Expanded-Information.aspx): dolor/sangrado al defecar y evaluación de presentaciones atípicas.
- [ASCRS: absceso y fístula](https://fascrs.org/Web/Web/Patients/Diseases-and-Conditions/A-Z/Abscess-and-Fistula-Expanded-Information.aspx): papel del examen físico y estudios locales seleccionados. La ecografía abdominal no sustituye el estudio perianal.
- [CDC: proctitis, proctocolitis y enteritis](https://www.cdc.gov/std/treatment-guidelines/proctitis.htm): evaluación microbiológica según sitio, gonococo/clamidia, sífilis y oferta de evaluación de otras ITS. La oportunidad de prueba de VIH queda separada de esta orden por la regla solicitada de no mezclar screening incidental.
- [NICE NG111](https://www.nice.org.uk/guidance/ng111/chapter/Recommendations): cultivo y susceptibilidad en sospecha de infección urinaria alta y criterios para derivación.
- [NICE NG228](https://www.nice.org.uk/guidance/NG228/chapter/recommendations): evaluación urgente y TC sin contraste en sospecha de hemorragia subaracnoidea. La indicación definitiva corresponde a la evaluación clínica en urgencias.
- [NICE CG150](https://www.nice.org.uk/guidance/cg150/chapter/recommendations): evitar neuroimagen rutinaria en cefalea primaria y evaluar señales de alarma.

Los protocolos son apoyos limitados a la decisión; no confirman diagnósticos ni indican tratamiento. La disponibilidad local de muestras debe confirmarse con el centro correspondiente.

## Resultado de la comprobación del cambio

- 60 pruebas locales aprobadas (selección, protocolos, endpoints, entrevista, antecedentes, seguridad y chequeo preventivo), TypeScript y ESLint sin errores en los archivos afectados.
- Corrida final de siete casos sintéticos con `gpt-4o-mini`: 7/7 criterios aprobados. Fisura, cefalea habitual y molestia autolimitada: cero; absceso: presencial sin batería; proctitis: NAAT rectal y RPR/VDRL; urinario febril: orina completa y urocultivo; cefalea explosiva: urgencias y TC.
- Comprobación local en navegador con una preorden sintética: advertencia visible, impresión disponible con urgencia, aviso en PDF sin desbordamiento y salida sin exámenes sin PDF vacío.
