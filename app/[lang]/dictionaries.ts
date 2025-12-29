import 'server-only'

const dictionaries = {
  'en-US': () => import('../../dictionaries/en.json').then((module) => module.default),
  'da': () => import('../../dictionaries/da.json').then((module) => module.default),
}

export const getDictionary = async (locale: keyof typeof dictionaries) => dictionaries[locale]()

