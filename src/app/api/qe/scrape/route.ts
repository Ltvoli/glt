import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const number = searchParams.get('number')
  const legislature = searchParams.get('legislature') || '17'

  if (!number) {
    return new NextResponse('Numéro manquant', { status: 400 })
  }

  const url = `https://questions.assemblee-nationale.fr/q${legislature}/${legislature}-${number}QE.htm`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return new NextResponse('Question introuvable sur le site de l\'Assemblée', { status: 404 })
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Selectors are based on the typical structure of questions.assemblee-nationale.fr
    // Usually, the title is in a block, ministry in another.

    // A more robust way to parse questions from AN:
    const contentText = $('.contenu_loi, .reponse_QE, .texte').text().trim() || $('.question_reponse').text().trim()
    const ministry = $('strong:contains("Ministère interrogé")').parent().text().replace('Ministère interrogé :', '').trim() 
      || $('strong:contains("Ministère attributaire")').parent().text().replace('Ministère attributaire :', '').trim()
    
    // The title or "Rubrique" is often listed as "Rubrique : ..."
    let title = $('strong:contains("Rubrique")').parent().text().replace('Rubrique :', '').replace('>', '').trim()
    if (!title) {
      // Fallback
      title = `Question écrite n°${number}`
    }

    // Attempt to extract the actual text of the question
    // Often it starts after "Texte de la question" or within a specific div.
    let text = ''
    const questionTextElement = $('strong:contains("Texte de la question")').parent()
    if (questionTextElement.length) {
      text = questionTextElement.text().replace('Texte de la question :', '').trim()
    } else {
      text = contentText.substring(0, 500) + '...' // Fallback
    }

    return NextResponse.json({
      title,
      ministry,
      text,
      url
    })

  } catch (error) {
    console.error('Erreur scraping QE:', error)
    return new NextResponse('Erreur lors du scraping', { status: 500 })
  }
}
