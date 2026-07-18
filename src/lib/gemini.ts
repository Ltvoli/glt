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

const COLUMN_MAPPING_SCHEMA = {
  type: "OBJECT",
  properties: {
    gender: { type: "STRING", description: "Nom exact de la colonne contenant le genre ou la civilité" },
    firstName: { type: "STRING", description: "Nom exact de la colonne contenant le prénom" },
    lastName: { type: "STRING", description: "Nom exact de la colonne contenant le nom de famille" },
    email: { type: "STRING", description: "Nom exact de la colonne contenant l'adresse email" },
    phone: { type: "STRING", description: "Nom exact de la colonne contenant le téléphone fixe" },
    mobilePhone: { type: "STRING", description: "Nom exact de la colonne contenant le téléphone portable" },
    streetNumber: { type: "STRING", description: "Nom exact de la colonne contenant le numéro de rue" },
    streetName: { type: "STRING", description: "Nom exact de la colonne contenant le nom de rue" },
    adresse1: { type: "STRING", description: "Nom exact de la colonne contenant l'adresse complète 1" },
    adresse2: { type: "STRING", description: "Nom exact de la colonne contenant le complément d'adresse" },
    postalCode: { type: "STRING", description: "Nom exact de la colonne contenant le code postal" },
    city: { type: "STRING", description: "Nom exact de la colonne contenant la ville ou commune" },
    profession: { type: "STRING", description: "Nom exact de la colonne contenant la profession" },
    supportLevel: { type: "STRING", description: "Nom exact de la colonne contenant le niveau de soutien" },
    department: { type: "STRING", description: "Nom exact de la colonne contenant le département" },
    territory: { type: "STRING", description: "Nom exact de la colonne contenant la circonscription ou le territoire" },
    tags: { type: "STRING", description: "Nom exact de la colonne contenant les étiquettes ou mots-clés" },
    newsletter: { type: "STRING", description: "Nom exact de la colonne contenant l'opt-in de la newsletter" },
    notes: { type: "STRING", description: "Nom exact de la colonne contenant les notes ou remarques" }
  },
  required: []
}

export async function getColumnMapping(headers: string[]): Promise<Record<string, string>> {
  const systemInstruction = `
Tu es un expert en traitement de données et intégration de fichiers.
Ton but est d'analyser une liste de noms de colonnes provenant d'un fichier Excel ou CSV importé et de les faire correspondre au schéma cible de notre base de données CRM.

CHAMPS CIBLE :
- gender : Le genre ou la civilité (M, Mme, M., Civilité, etc.)
- firstName : Le prénom
- lastName : Le nom de famille
- email : L'adresse de messagerie électronique
- phone : Le téléphone fixe/maison
- mobilePhone : Le téléphone portable/mobile/GSM
- streetNumber : Le numéro de la rue/voie uniquement (ex: "Numéro", "N°")
- streetName : Le nom de la rue uniquement (ex: "Rue / Voie", "Rue", "Nom de rue")
- adresse1 : L'adresse complète (ex: "Adresse 1", "Adresse")
- adresse2 : Le complément d'adresse (ex: "Adresse 2")
- postalCode : Le code postal (ex: "Code postal", "CP", "Zip")
- city : La ville ou commune (ex: "Ville", "Commune", "City")
- profession : Le métier ou profession
- supportLevel : Le niveau de soutien (ex: "Niveau de soutien", "Engagement", "Support")
- department : Le département (ex: "Département")
- territory : Le territoire ou circonscription (ex: "Territoire", "Circonscription", "Territory")
- tags : Les étiquettes, tags ou mots-clés (ex: "Tags", "Mots clés", "Mots-clés")
- newsletter : L'opt-in de communication ou newsletter (ex: "Newsletter", "Abonné")
- notes : Les notes ou remarques de l'électeur (ex: "Notes", "Commentaires")

Pour chaque champ cible, trouve s'il existe une colonne correspondante parmi les colonnes du fichier.
Renvoie un objet JSON associant le champ cible au nom exact de la colonne dans le fichier. Si aucun nom de colonne ne correspond, n'associe rien (renvoie null ou omet la propriété).
`

  const userMessage = `Voici les colonnes trouvées dans le fichier importé :\n${headers.map(h => `- "${h}"`).join('\n')}`
  const parts = [{ text: userMessage }]

  try {
    const result = await callGemini(systemInstruction, parts, COLUMN_MAPPING_SCHEMA)
    return result || {}
  } catch (err) {
    console.error("[Gemini Column Mapping Error] Error :", err)
    return {}
  }
}

const TEMPLATE_CONVERSION_SCHEMA = {
  type: "OBJECT",
  properties: {
    htmlContent: {
      type: "STRING",
      description: "Le code HTML propre, stylisé et responsive représentant le modèle de courrier avec les balises de fusion CRM adaptées."
    },
    templateName: {
      type: "STRING",
      description: "Un nom suggéré pour ce modèle de document (ex: Courrier d'intervention, Accusé de réception, etc.) basé sur le contenu."
    }
  },
  required: ["htmlContent", "templateName"]
}

export async function convertDocxTextToHtmlTemplate(docxText: string): Promise<{ htmlContent: string, templateName: string }> {
  const systemInstruction = `
Tu es un expert en conception de modèles de courriers et en intégration HTML/CSS.
Ton but est de convertir le texte brut extrait d'un document Word (.docx) en un modèle HTML de courrier propre, responsive, moderne et stylisé avec les balises de fusion CRM appropriées.

CONSIGNES DE CONVERSION :
1. Analyse la structure du courrier d'origine.
2. Remplace les informations dynamiques détectées par les balises du CRM adaptées :
   - L'en-tête de l'élu (ex: "Lionel Tivoli, Député...", "Assemblée Nationale...") par la balise unique : {en_tete_officielle}
   - Les coordonnées du destinataire (nom, adresse de l'administré/administration...) par : {expediteur_adresse}
   - La formule d'appel (ex: "Monsieur le Maire,", "Madame, Monsieur,") par : {civilite_expediteur}
   - L'objet (ex: "Objet : Demande de logement") par : Objet : {objet}
   - La référence (ex: "Réf : LT/AB/2026-042") par : Réf : {reference}
   - La date (ex: "Fait à Nice, le 15 avril 2026", "Le 12/04/2026") par : {date_courrier}
   - Le corps de réponse type ou le message principal par : {corps_reponse}
   - Le bloc de signature de l'élu en bas (nom, qualité, image de signature...) par : {signature_elu}
3. Produis un code HTML propre, stylisé et responsive représentant le modèle de courrier.
   - Utilise du CSS en ligne (inline styles) propre pour garantir la compatibilité lors de la génération de PDF ou de l'envoi d'e-mails.
   - Choisis une typographie moderne, des marges aérées (par exemple, 1.5cm ou 2cm sur les côtés pour faire "papier à en-tête officiel"), et un style professionnel.
   - Assure-toi que les balises de fusion CRM sont placées exactement aux bons endroits structurels dans le HTML (par exemple, {en_tete_officielle} tout en haut, {date_courrier} en haut à droite, {expediteur_adresse} en haut à gauche/droite sous la date, Objet et Réf bien alignés, le corps {corps_reponse} au centre, et {signature_elu} en bas à droite).
4. Suggère également un nom court et pertinent pour le modèle (par exemple: "Courrier de saisine Préfet", "Accusé de réception standard", "Lettre d'appui logement").

RÈGLES D'OR :
- Conserve les éléments statiques importants s'il y en a (comme des mentions légales ou des structures fixes) mais remplace tout le contenu dynamique par les balises CRM indiquées.
- Le HTML généré doit être complet et valide (avec des balises structurantes ou des conteneurs <div> bien agencés), et ne contenir aucun texte brut qui devrait être dynamique.
`

  const userMessage = `Voici le texte brut extrait du document Word :\n\n---\n${docxText}\n---`
  const parts = [{ text: userMessage }]

  return await callGemini(systemInstruction, parts, TEMPLATE_CONVERSION_SCHEMA)
}

const SINGLE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    text: {
      type: "STRING",
      description: "Le corps de la réponse rédigé en français, structuré avec des balises HTML de base (<p>, <br>, <strong>) pour la mise en forme. Sans en-tête ni signature officielle."
    }
  },
  required: ["text"]
}

export async function generateSingleResponse(
  incomingMailContent: string,
  instruction: string
): Promise<{ text: string }> {
  const deputyName = process.env.DEPUTE_NOM || "Lionel Tivoli"
  const deputyCirco = process.env.DEPUTE_CIRCO || "2e circonscription des Alpes-Maritimes"
  const deputyGroup = process.env.DEPUTE_GROUPE || "Rassemblement National"
  const deputyCommission = process.env.DEPUTE_COMMISSION || "Commission de la Défense nationale et des Forces armées"

  const systemInstruction = `
Tu es un attaché parlementaire expérimenté chargé de rédiger, au nom du député ${deputyName} (député de la ${deputyCirco}, groupe politique ${deputyGroup}, commission permanente ${deputyCommission}), une réponse au courrier reçu en fonction de la consigne donnée par l'utilisateur.

RÈGLES DE RÉDACTION
- Rédige un projet de réponse poli et fluide.
- Le texte rédigé doit être sous format HTML simple (ex: avec des balises <p>, <br>, <strong>). N'inclus pas d'en-tête ni de signature (elles sont gérées par ailleurs dans l'application).
- N'invente aucun fait ni chiffre. Les informations manquantes sont balisées ainsi: [À COMPLÉTER : ...].
- Aucune promesse de résultat ni injonction contraire à la séparation des pouvoirs.
`

  const userMessage = `
COURRIER REÇU :
--- DÉBUT ---
${incomingMailContent}
--- FIN ---

CONSIGNE DE RÉDACTION :
${instruction}

Rédige le projet de réponse correspondant.
`

  const parts = [{ text: userMessage }]
  return await callGemini(systemInstruction, parts, SINGLE_RESPONSE_SCHEMA)
}


