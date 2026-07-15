import PizZip from 'pizzip'
import * as cheerio from 'cheerio'

/**
 * Extrait le texte brut d'un fichier Word (.docx) à partir de son buffer.
 * Lit le fichier XML interne 'word/document.xml' et concatène les éléments de texte <w:t>
 * structurés par paragraphes <w:p> pour conserver les sauts de ligne.
 */
export function extractTextFromDocx(buffer: Buffer): string {
  try {
    const zip = new PizZip(buffer)
    const xmlContent = zip.file("word/document.xml")?.asText()
    if (!xmlContent) {
      console.warn('[extractTextFromDocx] Fichier word/document.xml introuvable dans l\'archive DOCX.')
      return ""
    }
    
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
  } catch (error) {
    console.error('[extractTextFromDocx] Erreur lors de l\'extraction du texte du fichier DOCX :', error)
    return ""
  }
}
