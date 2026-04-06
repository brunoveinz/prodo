'use server';

import { setUserLocale } from '@/services/locale';
import { Locale } from '@/i18n/config';

export async function setLocaleAction(locale: Locale) {
  await setUserLocale(locale);
}
