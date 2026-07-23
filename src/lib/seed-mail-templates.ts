import prisma from '@/lib/prisma'

export async function seedMailTemplates() {
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPERADMIN', 'ADMINISTRATEUR'] }, isActive: true }
  })

  if (!adminUser) {
    console.log('[Seed Templates] Aucun utilisateur admin trouvé pour la création.')
    return
  }

  const templatesData = [
    {
      code: 'TMPL_FELICITATION',
      name: 'Courrier de Félicitations Officielles',
      category: 'FELICITATION',
      description: 'Courrier institutionnel adressé lors d\'une nomination, distinction ou décoration.',
      version: 1,
      status: 'PUBLIE',
      requiredVariables: ['CONTACT_CIVILITE', 'CONTACT_TITRE', 'CONTACT_NOM', 'DEPUTE_NOM', 'DEPUTE_CIRCONCRIPTION'],
      bodyStructure: `{{CONTACT_CIVILITE}} {{CONTACT_TITRE}},

C'est avec une grande joie que j'ai appris votre récente nomination.

Je tenais à vous adresser personnellement, ainsi qu'au nom de l'ensemble de mon équipe parlementaire, mes plus chaleureuses félicitations pour cette belle distinction qui vient couronner votre engagement constant au service de nos concitoyens.

Sachant pouvoir compter sur votre précieux dévouement sur notre territoire, je vous prie d'agréer, {{CONTACT_CIVILITE}} {{CONTACT_TITRE}}, l'expression de mes sentiments les plus distingués.`
    },
    {
      code: 'TMPL_SOLLICITATION_CITOYENNE',
      name: 'Réponse à Sollicitation d\'un Administré',
      category: 'CITOYENNETE',
      description: 'Réponse officielle à une demande ou saisine individuelle d\'un habitant de la circonscription.',
      version: 1,
      status: 'PUBLIE',
      requiredVariables: ['CONTACT_CIVILITE', 'CONTACT_NOM', 'CONTACT_ADRESSE', 'CONTACT_VILLE', 'DATE_DU_JOUR'],
      bodyStructure: `{{CONTACT_CIVILITE}},

J'ai bien reçu votre courrier en date du {{DATE_DU_JOUR}} attirant mon attention sur votre situation personnelle.

Sensible aux difficultés dont vous me faites part, j'ai immédiatement saisi les services compétents afin qu'un examen attentif et bienveillant soit porté à votre dossier.

Mes collaborateurs parlementaires et moi-même restons à votre entière disposition pour suivre l'évolution de votre démarche.

Je vous prie d'agréer, {{CONTACT_CIVILITE}}, l'assurance de ma considération distinguée.`
    },
    {
      code: 'TMPL_INTERPELLATION_MINISTERIELLE',
      name: 'Interpellation Ministérielle',
      category: 'MINISTERIEL',
      description: 'Courrier adressé à un Ministre ou Directeur d\'administration centrale.',
      version: 1,
      status: 'PUBLIE',
      requiredVariables: ['DEPUTE_NOM', 'DEPUTE_CIRCONCRIPTION'],
      bodyStructure: `Monsieur le Ministre,

J'ai été saisi par plusieurs concitoyens et acteurs économiques locaux de ma circonscription au sujet d'une problématique majeure concernant notre territoire.

Cette situation suscite de vives inquiétudes légitimes. C'est pourquoi je souhaite solliciter votre haute attention afin de connaître les mesures que le Gouvernement entend déployer pour y répondre efficacement.

En vous remerciant par avance de la suite attentive que vous voudrez bien réserver à cette démarche, je vous prie d'agréer, Monsieur le Ministre, l'assurance de ma haute considération.`
    },
    {
      code: 'TMPL_INVITATION_OFFICIELLE',
      name: 'Invitation Officielle Parlementaire',
      category: 'INVITATION',
      description: 'Invitation à une cérémonie, inauguration ou réunion publique du Député.',
      version: 1,
      status: 'PUBLIE',
      requiredVariables: ['CONTACT_CIVILITE', 'CONTACT_TITRE', 'CONTACT_NOM', 'CONTACT_VILLE'],
      bodyStructure: `{{CONTACT_CIVILITE}} {{CONTACT_TITRE}},

J'ai le plaisir de vous inviter à participer à la prochaine réunion publique d'information parlementaire qui se tiendra prochainement à {{CONTACT_VILLE}}.

Ce moment d'échange privilégié sera l'occasion d'évoquer l'actualité législative à l'Assemblée nationale ainsi que les dossiers structurants pour notre circonscription.

Dans l'attente du plaisir de vous y rencontrer, je vous prie d'agréer, {{CONTACT_CIVILITE}} {{CONTACT_TITRE}}, l'expression de mes salutations distinguées.`
    },
    {
      code: 'TMPL_SUBVENTION_ASSOCIATION',
      name: 'Soutien à une Demande Associative',
      category: 'SUBVENTION',
      description: 'Accusé de réception et appui de dossier pour une association locale.',
      version: 1,
      status: 'PUBLIE',
      requiredVariables: ['CONTACT_CIVILITE', 'CONTACT_TITRE', 'CONTACT_ORGANISATION'],
      bodyStructure: `{{CONTACT_CIVILITE}} {{CONTACT_TITRE}},

J'ai bien pris connaissance du dossier transmis au nom de l'association {{CONTACT_ORGANISATION}}.

Je salue le travail remarquable accompli quotidiennement par vos bénévoles au service du lien social et du dynamisme de notre circonscription. Votre démarche a retenu toute mon attention et fait l'objet d'un soutien attentif auprès des organismes partenaires.

Je vous prie d'agréer, {{CONTACT_CIVILITE}} {{CONTACT_TITRE}}, mes salutations les plus cordiales.`
    }
  ]

  for (const tmpl of templatesData) {
    const existing = await prisma.mailTemplate.findUnique({
      where: { code: tmpl.code }
    })
    if (!existing) {
      await prisma.mailTemplate.create({
        data: {
          ...tmpl,
          createdById: adminUser.id
        }
      })
      console.log(`[Seed Templates] Modèle créé : ${tmpl.name}`)
    }
  }
}
