// src/data/promobar.ts

export interface PromoBarItem {
  text: string
  link?: string
  linkText?: string
}

export const promoBarItems: PromoBarItem[] = [
  {
    text: 'We hebben je hulp nodig! Help ons de parkeerinformatie te verbeteren.',
    link: 'https://github.com/hawkinslabdev/mijnmotorparkeren?tab=readme-ov-file#-contributing',
    linkText: 'Bekijken op GitHub'
  }
]
