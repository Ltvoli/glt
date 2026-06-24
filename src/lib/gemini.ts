import { SettingType } from '@prisma/client'
import prisma from './prisma'

// ─── schemas JSON pour contraindre Gemini ────────────────────

const ANALYSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    metadata: {
      type: "OBJECT",
      properties: {
        expediteur_nom: { type: "STRING", nullable: true },
        expediteur_qualite: { type: "STRING", enum: ["administré", "institutionnel", "association", "entreprise", "élu", "autre"] },
        expediteur_coordonnees: {
          type: "OBJECT",
          properties: {
            adresse: { type: "STRING", nullable: true },
            email: { type: "STRING", nullable: true },
            telephone: { type: "STRING", nullable: true }
          },
          required: ["adresse", "email", "telephone"]
        },
        date_courrier: { type: "STRING", nullable: true, description: "Format YYYY-MM-DD" },
        objet: { type: "STRING" },
        commune: { type: "STRING", nullable: true },
        dans_circonscription: { type: "STRING", enum: ["oui", "non", "incertain"] }
      },
      required: ["expediteur_nom", "expediteur_qualite", "expediteur_coordonnees", "date_courrier", "objet", "commune", "dans_circonscription"]
    },
    analyse: {
      type: "OBJECT",
      properties: {
        type_courrier: { type: "STRING", enum: ["demande_intervention", "reclamation", "invitation", "demande_rdv", "demande_soutien", "autre"] },
        resume: { type: "STRING", description: "Résumé fidèle en 3 à 5 phrases" },
        demande_principale: { type: "STRING" },
        demandes_secondaires: { type: "ARRAY", items: { type: "STRING" } },
        urgence: { type: "STRING", enum: ["faible", "moyenne", "élevée"] },
        releve_competence_depute: { type: "STRING", enum: ["oui", "non", "partiellement"] },
        limites_a_signaler: { type: "ARRAY", items: { type: "STRING" } },
        donnees_personnelles_sensibles: { type: "BOOLEAN" },
        elements_manquants: { type: "ARRAY", items: { type: "STRING" } }
      },
      required: ["type_courrier", "resume", "demande_principale", "demandes_secondaires", "urgence", "releve_competence_depute", "limites_a_signaler", "donnees_personnelles_sensibles", "elements_manquants"]
    },
    pistes_reponse: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "INTEGER" },
          intitule: { type: "STRING" },
          nature: { type: "STRING", enum: ["accuse_reception", "reponse_administre", "courrier_intervention", "saisine_ministre", "question_ecrite", "reorientation", "invitation_reponse", "prise_rdv", "prise_de_position", "transmission_interne"] },
          destinataire: { type: "STRING" },
          description: { type: "STRING" },
          faisabilite: { type: "STRING" },
          delai_estime: { type: "STRING" },
          ce_que_cela_engage: { type: "STRING" },
          recommandee: { type: "BOOLEAN" }
        },
        required: ["id", "intitule", "nature", "destinataire", "description", "faisabilite", "delai_estime", "ce_que_cela_engage", "recommandee"]
      }
    }
  },
  required: ["metadata", "analyse", "pistes_reponse"]
}

const RESPONSE_GENERATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    courriers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          piste_id: { type: "INTEGER" },
          type: { type: "STRING" },
          destinataire_nom: { type: "STRING" },
          destinataire_qualite: { type: "STRING" },
          objet: { type: "STRING" },
          corps: { type: "STRING", description: "Texte brut du courrier, sans en-tête ni signature. Les informations manquantes sont balisées ainsi: [À COMPLÉTER : ...]" },
          formule_politesse: { type: "STRING" },
          champs_a_completer: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["piste_id", "type", "destinataire_nom", "destinataire_qualite", "objet", "corps", "formule_politesse", "champs_a_completer"]
      }
    }
  },
  required: ["courriers"]
}

const QE_GENERATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    texte: { 
      type: "STRING", 
      description: "Le texte rédigé de la question écrite au format officiel de l'Assemblée nationale, sans en-tête ni signature. Les informations manquantes sont balisées sous la forme [À COMPLÉTER : ...]" 
    },
    ministere: { 
      type: "STRING", 
      description: "Le ministère recommandé pour adresser la question (ex: Ministère de la Santé, Ministère de l'Intérieur, etc.)" 
    },
    theme: { 
      type: "STRING", 
      description: "La thématique principale de la question (ex: Transports, Santé, Environnement, etc.)" 
    }
  },
  required: ["texte", "ministere", "theme"]
}

// ─── API Client Wrapper ──────────────────────────────────────

async function getApiKey(): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("Clé API Gemini (GEMINI_API_KEY) non configurée dans l'environnement.")
  }
  return apiKey
}

interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string // base64
  }
}

async function callGemini(
  systemInstruction: string,
  parts: GeminiPart[],
  responseSchema?: any
): Promise<any> {
  const apiKey = await getApiKey()
  const model = "gemini-2.5-flash"
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const requestBody = {
    contents: [
      {
        parts
      }
    ],
    systemInstruction: {
      parts: [
        { text: systemInstruction }
      ]
    },
    generationConfig: {
      temperature: responseSchema ? 0.2 : 0.4,
      responseMimeType: "application/json",
      ...(responseSchema ? { responseSchema } : {})
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Gemini API Error] status:", response.status, "body:", errorText)
    throw new Error(`Erreur API Gemini (${response.status}) : ${errorText}`)
  }

  const data = await response.json()
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textContent) {
    throw new Error("Réponse vide ou invalide renvoyée par l'API Gemini.")
  }

  try {
    return JSON.parse(textContent)
  } catch (parseErr) {
    console.error("[Gemini JSON Parse Error] raw text:", textContent)
    throw new Error("La réponse renvoyée par Gemini n'est pas un JSON valide.")
  }
}

// ─── Fonctions Métier ────────────────────────────────────────

/**
 * Lance l'analyse d'un courrier entrant.
 * @param contentOrBase64 Le texte brut du courrier OU la chaîne base64 du fichier (PDF/Image)
 * @param mimeType Le type MIME (ex: application/pdf, image/png) si c'est du binaire
 */
export async function analyzeIncomingMail(
  contentOrBase64: string,
  mimeType?: string
): Promise<any> {
  const deputyName = process.env.DEPUTE_NOM || "Lionel Tivoli"
  const deputyCirco = process.env.DEPUTE_CIRCO || "2e circonscription des Alpes-Maritimes"
  const deputyGroup = process.env.DEPUTE_GROUPE || "Rassemblement National"
  const deputyCommission = process.env.DEPUTE_COMMISSION || "Commission de la Défense nationale et des Forces armées"
  
  // Liste des communes fictive ou issue de la BDD pour la circonscription
  const deputyCommunes = "Antibes (partie), Vence, Carros, Grasse (partie), Saint-Jeannet, Gattières, La Gaude, Coursegoules, Tourrettes-sur-Loup, Saint-Paul-de-Vence, Villeneuve-Loubet, Cagnes-sur-Mer (partie), Roquefort-les-Pins, Le Bar-sur-Loup, Saint-Vallier-de-Thiey, Châteauneuf-Grasse, Valbonne"

  const systemInstruction = `
Tu es un attaché parlementaire expérimenté travaillant pour le député ${deputyName} (député de la ${deputyCirco}, groupe politique ${deputyGroup}, commission permanente ${deputyCommission}).
Ta mission est d'analyser le courrier transmis et de produire une fiche d'analyse structurée destinée à un collaborateur parlementaire.

CONTEXTE DU DÉPUTÉ
- Nom : ${deputyName}
- Mandat : député de la ${deputyCirco}
- Groupe : ${deputyGroup}
- Commission : ${deputyCommission}
- Communes de la circonscription : ${deputyCommunes}

CE QU'UN DÉPUTÉ PEUT FAIRE (cadre de tes pistes)
- Intervenir, par courrier ou signalement, auprès d'une administration pour appuyer ou relayer la demande d'un administré, SANS pouvoir lui imposer une décision ni garantir un résultat.
- Saisir le ministre compétent ; proposer une question écrite ou orale au Gouvernement.
- Relayer une situation auprès de l'élu ou de l'institution compétent(e) (maire, président de la métropole, conseil départemental, préfet, etc.).
- Recevoir l'administré en permanence, l'informer de ses droits et des démarches.
- Apporter un soutien politique ou symbolique (présence à un événement, prise de position publique), dans le respect de sa fonction.

CE QU'UN DÉPUTÉ NE PEUT PAS FAIRE (à signaler clairement)
- Intervenir dans une procédure judiciaire en cours ou peser sur une décision de justice (séparation des pouvoirs).
- Se substituer à une administration ou promettre un résultat.
- Traiter une demande relevant exclusivement d'un autre niveau de compétence : dans ce cas, propose une RÉORIENTATION et, si utile, une réponse d'information.
- Agir pour une personne située hors de la circonscription, sauf relais de courtoisie vers le député territorialement compétent.

CONSIGNES D'ANALYSE
1. Identifie l'expéditeur, sa qualité et ses coordonnées si disponibles.
2. Détermine si la commune indiquée appartient à la circonscription. Si l'information manque, indique "incertain".
3. Qualifie le type de courrier et résume-le fidèlement (3 à 5 phrases), sans extrapoler.
4. Identifie la demande principale et les éventuelles demandes secondaires.
5. Évalue l'urgence (faible / moyenne / élevée) selon la situation décrite.
6. Indique si le sujet relève des compétences du député (oui / non / partiellement) et liste les limites à signaler.
7. Signale la présence de données personnelles sensibles (santé, situation sociale, opinions, etc.).
8. Liste les éléments manquants utiles au traitement (pièces, références, numéro de dossier, etc.).
9. Propose 1 à N pistes de réponse RÉALISTES et relevant strictement des compétences ci-dessus. Si la demande n'en relève pas, propose une réorientation et/ou une réponse d'information — jamais une action impossible. Mets en avant la ou les pistes recommandées.

RÈGLES
- Ne fabrique aucun fait ni aucune position politique du député.
- Reste neutre et factuel ; n'émets pas de jugement personnel.
- Ne propose jamais d'engagement contraire à la fonction ou à la loi.
`

  const parts: GeminiPart[] = []
  if (mimeType && mimeType !== "text/plain") {
    parts.push({
      inlineData: {
        mimeType,
        data: contentOrBase64
      }
    })
    parts.push({
      text: "Voici le courrier reçu en fichier joint à analyser."
    })
  } else {
    parts.push({
      text: `Voici le texte extrait du courrier reçu à analyser :\n\n---\n${contentOrBase64}\n---`
    })
  }

  return await callGemini(systemInstruction, parts, ANALYSIS_SCHEMA)
}

/**
 * Rédige les courriers de réponse pour les suggestions cochées.
 */
export async function generateReplies(
  originalMail: string,
  analysisJson: any,
  selectedSuggestions: any[],
  customInstruction?: string
): Promise<any> {
  const deputyName = process.env.DEPUTE_NOM || "Lionel Tivoli"
  const deputyCirco = process.env.DEPUTE_CIRCO || "2e circonscription des Alpes-Maritimes"
  const deputyGroup = process.env.DEPUTE_GROUPE || "Rassemblement National"
  const deputyCommission = process.env.DEPUTE_COMMISSION || "Commission de la Défense nationale et des Forces armées"
  const deputyAddressAn = "Assemblée nationale, 126 Rue de l'Université, 75355 Paris 07 SP"
  const deputyAddressPermanence = "Permanence parlementaire, Alpes-Maritimes"

  const systemInstruction = `
Tu es un attaché parlementaire expérimenté chargé de rédiger, au nom du député ${deputyName}, les courriers de réponse correspondant AUX SEULES actions validées par le collaborateur.

CONTEXTE DU DÉPUTÉ
- Nom et civilité : M. le Député ${deputyName}
- Mandat : député de la ${deputyCirco}
- Groupe : ${deputyGroup}
- Commission : ${deputyCommission}
- Coordonnées de référence : ${deputyAddressAn} ; permanence : ${deputyAddressPermanence}

RÈGLES DE RÉDACTION
- Rédige un courrier DISTINCT par destinataire / par action validée.
- Adapte le registre :
  • Administré : ton respectueux, clair, accessible, humain ; pas de jargon ; rassurant sans promettre qui ne dépende pas du député ; explique concrètement ce qui va être fait.
  • Institutionnel (Maire, Préfet, Ministre, Administration) : ton solennel et institutionnel, formules protocolaires, registre soutenu, concision.
- N'invente AUCUN fait, AUCUN chiffre, AUCUNE position politique du député. Toute information manquante est balisée ainsi : [À COMPLÉTER : ...].
- Aucune promesse de résultat. Respecte la séparation des pouvoirs : aucune injonction à une administration ou à la justice.
- Dans une réponse à un administré, pas de récupération politique : on traite la demande.
- Structure de chaque courrier : objet clair ; corps (sans en-tête ni signature, qui sont ajoutés par l'application) ; formule de politesse adaptée.

FORMULES DE POLITESSE DE RÉFÉRENCE (choisis la plus adaptée)
- Administré : « Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées. »
- Maire : « Je vous prie d'agréer, Monsieur le Maire, l'expression de ma considération distinguée. »
- Préfet / Sous-préfet : « Je vous prie d'agréer, Monsieur le Préfet, l'expression de ma haute considération. »
- Ministre : « Je vous prie d'agréer, Monsieur le Ministre, l'expression de ma haute considération. »
- Président d'institution : « Je vous prie d'agréer, Monsieur le Président, l'expression de ma considération distinguée. »
- Entre élus : « Je vous prie de croire, cher(e) collègue, à l'expression de mes sentiments les meilleurs. »
(Adapte la civilité et la fonction au destinataire réel.)
`

  const userMessage = `
COURRIER REÇU :
--- DÉBUT ---
${originalMail}
--- FIN ---

FICHE D'ANALYSE :
${JSON.stringify(analysisJson)}

PISTES VALIDÉES PAR LE COLLABORATEUR :
${JSON.stringify(selectedSuggestions)}

CONSIGNE LIBRE : ${customInstruction || "Aucune"}
LIEU ET DATE POUR LA SIGNATURE : Nice, le ${new Date().toLocaleDateString('fr-FR')}

Rédige les courriers de réponse correspondant aux pistes validées.
`

  const parts: GeminiPart[] = [{ text: userMessage }]
  return await callGemini(systemInstruction, parts, RESPONSE_GENERATION_SCHEMA)
}

export async function generateWrittenQuestion(
  title: string,
  theme: string | null,
  notes: string | null,
  customInstruction?: string
): Promise<any> {
  const deputyName = process.env.DEPUTE_NOM || "Lionel Tivoli"
  const deputyCirco = process.env.DEPUTE_CIRCO || "2e circonscription des Alpes-Maritimes"
  
  const systemInstruction = `
Tu es un conseiller parlementaire expérimenté chargé de rédiger une Question Écrite (QE) officielle à l'attention du gouvernement au nom du député ${deputyName} (député de la ${deputyCirco}).

RÈGLES DE RÉDACTION :
- La question écrite doit impérativement commencer par la formule rituelle :
  "M. ${deputyName} appelle l'attention de M. le ministre de [Nom du Ministère] sur [le sujet de la question]."
- Le style doit être d'une grande rigueur juridique et législative, digne du Journal Officiel.
- Structure de la question :
  1. EXPOSÉ DES FAITS : Présenter les faits constatés sur le terrain ou les alertes reçues dans la circonscription (Alpes-Maritimes).
  2. ANALYSE LÉGALE/RÉGLEMENTAIRE : Expliquer en quoi le cadre actuel pose problème, quelles sont les lacunes ou les incohérences juridiques.
  3. INTERROGATION : Formuler de manière très précise la ou les questions adressées au ministre sur les mesures qu'il compte prendre.
- N'invente aucun chiffre ou fait non étayé. S'il manque des informations, utilise des balises [À COMPLÉTER : ...].
- Pas de salutations finales ni de signature.
`

  const userMessage = `
TITRE/SUJET DE LA QUESTION :
${title}

THÉMATIQUE ACTUELLE : ${theme || "Non renseignée"}
NOTES INTERNES / CONTEXTE APPORTÉ : ${notes || "Aucun"}
CONSIGNE LIBRE SUPPLÉMENTAIRE : ${customInstruction || "Aucune"}

Génère la Question Écrite en remplissant le texte de la question et en recommandant le ministère et le thème les plus pertinents.
`

  const parts = [{ text: userMessage }]
  return await callGemini(systemInstruction, parts, QE_GENERATION_SCHEMA)
}
