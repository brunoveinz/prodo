'use client';

import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { setLocaleAction } from '@/actions/locale';
import { Locale } from '@/i18n/config';

export default function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const router = useRouter();

  const toggleLocale = () => {
    const nextLocale = locale === 'en' ? 'es' : 'en';
    startTransition(async () => {
      await setLocaleAction(nextLocale as Locale);
      router.refresh();
    });
  };

  return (
    <button
      onClick={toggleLocale}
      disabled={isPending}
      className={`rounded-md px-2.5 py-1 text-xs font-bold transition hover:bg-black/10 dark:hover:bg-white/10 ${isPending ? 'opacity-50' : 'opacity-100'}`}
    >
      {locale === 'en' ? 'ES' : 'EN'}
    </button>
  );
}
