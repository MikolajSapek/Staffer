import 'server-only'

const dictionaries = {
  'en-US': () => import('../../dictionaries/en.json').then((module) => module.default),
  'en': () => import('../../dictionaries/en.json').then((module) => module.default),
  'da': () => import('../../dictionaries/da.json').then((module) => module.default),
}

type LocaleKey = keyof typeof dictionaries

const defaultLocale: LocaleKey = 'en-US'
const availableLocales = Object.keys(dictionaries) as LocaleKey[]

/**
 * Extracts the base language code from a locale string.
 * Examples: 'en-US' -> 'en', 'da-DK' -> 'da', 'en' -> 'en'
 */
function getBaseLanguage(locale: string): string {
  return locale.split('-')[0]
}

/**
 * Gets a dictionary with fallback mechanism.
 * 1. Tries exact locale match
 * 2. Tries base language match (e.g., 'en' from 'en-US')
 * 3. Falls back to default locale
 * Logs warnings when fallbacks occur.
 */
export async function getDictionary(locale: string) {
  // Try exact match first
  if (locale in dictionaries && typeof dictionaries[locale as LocaleKey] === 'function') {
    return await dictionaries[locale as LocaleKey]()
  }

  // Try base language match
  const baseLanguage = getBaseLanguage(locale)
  if (baseLanguage !== locale && baseLanguage in dictionaries && typeof dictionaries[baseLanguage as LocaleKey] === 'function') {
    console.warn(
      `[getDictionary] Locale '${locale}' not found. Falling back to base language '${baseLanguage}'.`
    )
    return await dictionaries[baseLanguage as LocaleKey]()
  }

  // Also try the reverse: if we got 'en', try 'en-US'
  if (baseLanguage === locale && locale === 'en' && 'en-US' in dictionaries) {
    console.warn(
      `[getDictionary] Locale '${locale}' not found. Trying 'en-US' as fallback.`
    )
    return await dictionaries['en-US']()
  }

  // Final fallback to default locale
  if (locale !== defaultLocale) {
    console.warn(
      `[getDictionary] Locale '${locale}' not found and no base language match. Falling back to default locale '${defaultLocale}'.`
    )
  }
  
  if (!(defaultLocale in dictionaries) || typeof dictionaries[defaultLocale] !== 'function') {
    // Last resort: use the first available locale
    const firstAvailable = availableLocales[0]
    console.error(
      `[getDictionary] Default locale '${defaultLocale}' is not available. Using first available locale '${firstAvailable}'.`
    )
    return await dictionaries[firstAvailable]()
  }

  return await dictionaries[defaultLocale]()
}
