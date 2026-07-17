import PizZip from 'pizzip'
import * as cheerio from 'cheerio'

/**
 * Extrait le texte d'un fichier XML de paragraphe Word (w:p -> w:t).
 */
function extractTextFromXml(xmlContent: string): string {
  const $ = cheerio.load(xmlContent, { xmlMode: true })
  const paragraphs: string[] = []
  
  $('w\\:p').each((_, pElem) => {
    const pText: string[] = []
    $(pElem).find('w\\:t').each((_, tElem) => {
      pText.push($(tElem).text())
    })
    paragraphs.push(pText.join(''))
  })
  
  return paragraphs.join('\n')
}

/**
 * Extrait le texte d'un fichier Word (.docx) en combinant les en-têtes,
 * le corps principal du document et les pieds de page.
 */
export function extractDocxText(buffer: Buffer): string {
  try {
    const zip = new PizZip(buffer)
    const files = Object.keys(zip.files)
    
    // Identifier les fichiers d'en-tête et de pied de page
    const headerFiles = files.filter(f => f.startsWith("word/header") && f.endsWith(".xml")).sort()
    const footerFiles = files.filter(f => f.startsWith("word/footer") && f.endsWith(".xml")).sort()
    
    const sections: string[] = []
    
    // 1. Extraire les en-têtes
    for (const hFile of headerFiles) {
      const xml = zip.file(hFile)?.asText()
      if (xml) {
        const text = extractTextFromXml(xml)
        if (text.trim()) {
          sections.push(`[En-tête: ${hFile.replace('word/', '')}]\n${text}`)
        }
      }
    }
    
    // 2. Extraire le corps du document
    const docXml = zip.file("word/document.xml")?.asText()
    if (docXml) {
      const text = extractTextFromXml(docXml)
      if (text.trim()) {
        sections.push(text)
      }
    }
    
    // 3. Extraire les pieds de page
    for (const fFile of footerFiles) {
      const xml = zip.file(fFile)?.asText()
      if (xml) {
        const text = extractTextFromXml(xml)
        if (text.trim()) {
          sections.push(`[Pied de page: ${fFile.replace('word/', '')}]\n${text}`)
        }
      }
    }
    
    return sections.join('\n\n')
  } catch (error) {
    console.error('[extractDocxText] Erreur lors de l\'extraction du texte du fichier DOCX :', error)
    return ""
  }
}
