import { Locale } from '../../core/i18n/locale';

export interface FaqItem {
  q: string;
  a: string;
}

/** All copy for the home keynote, per language. */
export interface HomeCopy {
  skip: string;
  navInstall: string;
  navOpen: string;

  heroEyebrow: string;
  heroTitleA: string;
  heroTitleHl: string;
  heroLede: string;
  ctaOpen: string;
  ctaTour: string;
  proof: string[];
  scroll: string;

  bacEyebrow: string;
  bacTitle: string;
  bacLede: string;
  bacLabel: string;

  ckEyebrow: string;
  ckTitle: string;
  ckLede: string;
  /** Floating blurbs, in cocktail order. */
  ckBlurbs: string[];
  ckCta: string;

  crewEyebrow: string;
  crewTitle: string;
  crewLede: string;
  chips: string[];
  lbHead: string;
  lbYou: string;

  gamesEyebrow: string;
  gamesTitle: string;
  gamesLede: string;
  gamesCta: string;

  installEyebrow: string;
  installTitle: string;
  installLede: string;
  installCta: string;
  installLabel: string;

  faqEyebrow: string;
  faqTitle: string;
  faq: FaqItem[];

  footerTagline: string;

  seoTitle: string;
  seoDescription: string;
}

const EN: HomeCopy = {
  skip: 'Skip to content',
  navInstall: 'Home screen',
  navOpen: 'Open app',

  heroEyebrow: 'Live now · Free · No app store',
  heroTitleA: 'Your whole night out,',
  heroTitleHl: 'one tap away.',
  heroLede:
    'Salut is your night-out app: track your drinks and BAC, browse 15 cocktail recipes, climb the leaderboard and play drinking games with your crew — live in your browser, and on your home screen.',
  ctaOpen: 'Open Salut',
  ctaTour: 'Take the tour',
  proof: ['Free forever', 'iPhone & Android', 'Nothing to download'],
  scroll: 'Scroll',

  bacEyebrow: 'Your night, measured',
  bacTitle: 'A live BAC & promille tracker.',
  bacLede:
    "Log a round and your blood-alcohol gauge rises in real time — the same Widmark formula a promille calculator uses — counting down to when you'll be sober again.",
  bacLabel: 'Live BAC · time till sober',

  ckEyebrow: 'Pour something better',
  ckTitle: '15 cocktail recipes worth trying.',
  ckLede:
    'A built-in cocktail recipe book from Negroni to Espresso Martini — filter by spirit or taste, then follow the ingredients and steps. No tab-hopping.',
  ckBlurbs: ['Italian classic', 'Bright & bubbly', 'Salt & lime', 'Velvety, rich', 'Mint & lime', 'Tart & pink'],
  ckCta: 'Browse the bar →',

  crewEyebrow: 'Better together',
  crewTitle: 'Settle who runs the night.',
  crewLede:
    'Every drink scores. Climb the leaderboard, see what your crew is pouring in the live feed, and add friends with a code.',
  chips: ['Friends by code', 'Live drink feed', 'History & stats', 'Impostor party game'],
  lbHead: 'Leaderboard · Tonight',
  lbYou: 'You',

  gamesEyebrow: 'When the table needs deciding',
  gamesTitle: 'Drinking games, built in.',
  gamesLede:
    'Spin the Lucky Wheel or call out the Impostor. Pass the phone around and let Salut run the round — no extra apps.',
  gamesCta: 'Play a round →',

  installEyebrow: 'Make it feel native',
  installTitle: 'Lives on your home screen.',
  installLede:
    'Salut is a progressive web app — add it once and it launches full-screen with its own icon. No app store, no download, always up to date.',
  installCta: 'Open Salut',
  installLabel: 'Add to home screen',

  faqEyebrow: 'Good to know',
  faqTitle: 'Frequently asked questions',
  faq: [
    {
      q: 'What is Salut?',
      a: 'Salut is a free night-out app for your phone and browser. It tracks your drinks and blood-alcohol level (BAC / promille), has 15 cocktail recipes, a points leaderboard, friends and built-in drinking games.',
    },
    {
      q: 'How accurate is the BAC / promille tracker?',
      a: 'Salut estimates your blood-alcohol level with the Widmark formula — the same method behind most promille calculators — from your drinks, body weight and time. It is a guide, not a substitute for a breathalyser. Never drink and drive.',
    },
    {
      q: 'Is Salut free?',
      a: 'Yes. Salut is free to use, with no app-store download required.',
    },
    {
      q: 'Do I need to install anything from the App Store?',
      a: 'No. Salut runs in your browser and can be added to your home screen as an app (a PWA) in two taps — on both iPhone and Android.',
    },
    {
      q: 'How do I add Salut to my home screen?',
      a: 'Open the app, then use “Add to Home Screen” (iPhone / Safari) or “Install app” (Android / Chrome). It then opens full-screen, just like a native app.',
    },
    {
      q: 'Which cocktail recipes are included?',
      a: '15 classics and modern favourites — Negroni, Aperol Spritz, Margarita, Espresso Martini, Mojito, Cosmopolitan and more — filterable by spirit and taste.',
    },
  ],

  footerTagline: 'Please drink responsibly.',

  seoTitle: 'Salut — Night-out app: BAC tracker, cocktails & drinking games',
  seoDescription:
    'Salut is a free night-out app: track your drinks and BAC (promille), browse 15 cocktail recipes, climb the leaderboard and play drinking games. No download — add it to your home screen.',
};

const DE: HomeCopy = {
  skip: 'Zum Inhalt springen',
  navInstall: 'Homescreen',
  navOpen: 'App öffnen',

  heroEyebrow: 'Jetzt live · Gratis · Ohne App-Store',
  heroTitleA: 'Dein ganzer Abend —',
  heroTitleHl: 'in einer App.',
  heroLede:
    'Salut ist deine Ausgeh-App: tracke deine Drinks und deinen Promille-Wert, entdecke 15 Cocktail-Rezepte, klettere im Leaderboard nach oben und spiele Trinkspiele mit deiner Crew — live im Browser und auf dem Homescreen.',
  ctaOpen: 'Salut öffnen',
  ctaTour: 'Tour ansehen',
  proof: ['Für immer gratis', 'iPhone & Android', 'Kein Download'],
  scroll: 'Scrollen',

  bacEyebrow: 'Dein Abend, gemessen',
  bacTitle: 'Live-Promille-Rechner.',
  bacLede:
    'Logge eine Runde und dein Promille-Wert steigt in Echtzeit — mit der Widmark-Formel, die auch jeder Promille-Rechner nutzt — inklusive Countdown, bis du wieder nüchtern bist.',
  bacLabel: 'Live-Promille · Zeit bis nüchtern',

  ckEyebrow: 'Gönn dir was Besseres',
  ckTitle: '15 Cocktail-Rezepte zum Ausprobieren.',
  ckLede:
    'Ein eingebautes Cocktail-Rezeptbuch von Negroni bis Espresso Martini — filtere nach Spirituose oder Geschmack und folge Zutaten und Schritten. Ohne Tab-Wirrwarr.',
  ckBlurbs: [
    'Italienischer Klassiker',
    'Spritzig & frisch',
    'Salz & Limette',
    'Samtig & kräftig',
    'Minze & Limette',
    'Herb & pink',
  ],
  ckCta: 'Zur Bar →',

  crewEyebrow: 'Gemeinsam besser',
  crewTitle: 'Klärt, wer den Abend regiert.',
  crewLede:
    'Jeder Drink zählt. Klettere im Leaderboard, sieh im Live-Feed, was deine Crew trinkt, und füge Freunde per Code hinzu.',
  chips: ['Freunde per Code', 'Live-Drink-Feed', 'Verlauf & Statistiken', 'Impostor-Partyspiel'],
  lbHead: 'Leaderboard · Heute',
  lbYou: 'Du',

  gamesEyebrow: 'Wenn der Tisch entscheiden muss',
  gamesTitle: 'Trinkspiele inklusive.',
  gamesLede:
    'Dreh das Glücksrad oder enttarne den Impostor. Reich das Handy herum und lass Salut die Runde leiten — ohne extra App.',
  gamesCta: 'Runde spielen →',

  installEyebrow: 'Fühlt sich nativ an',
  installTitle: 'Direkt auf deinem Homescreen.',
  installLede:
    'Salut ist eine Progressive Web App — einmal hinzufügen und sie startet im Vollbild mit eigenem Icon. Kein App-Store, kein Download, immer aktuell.',
  installCta: 'Salut öffnen',
  installLabel: 'Zum Homescreen hinzufügen',

  faqEyebrow: 'Gut zu wissen',
  faqTitle: 'Häufige Fragen',
  faq: [
    {
      q: 'Was ist Salut?',
      a: 'Salut ist eine gratis Ausgeh-App für Handy und Browser. Sie trackt deine Drinks und deinen Promille-Wert (BAC), bietet 15 Cocktail-Rezepte, ein Punkte-Leaderboard, Freunde und eingebaute Trinkspiele.',
    },
    {
      q: 'Wie genau ist der Promille-Rechner?',
      a: 'Salut schätzt deinen Promille-Wert mit der Widmark-Formel — der Methode hinter den meisten Promille-Rechnern — anhand deiner Drinks, deines Körpergewichts und der Zeit. Das ist ein Richtwert, kein Ersatz für einen Alkomat. Fahr nie alkoholisiert.',
    },
    {
      q: 'Ist Salut kostenlos?',
      a: 'Ja. Salut ist gratis nutzbar, ganz ohne App-Store-Download.',
    },
    {
      q: 'Muss ich etwas aus dem App-Store installieren?',
      a: 'Nein. Salut läuft im Browser und lässt sich in zwei Tipps zum Homescreen hinzufügen (als PWA) — auf iPhone und Android.',
    },
    {
      q: 'Wie füge ich Salut zum Homescreen hinzu?',
      a: 'Öffne die App und nutze „Zum Home-Bildschirm“ (iPhone / Safari) bzw. „App installieren“ (Android / Chrome). Salut startet danach im Vollbild wie eine native App.',
    },
    {
      q: 'Welche Cocktail-Rezepte sind dabei?',
      a: '15 Klassiker und moderne Favoriten — Negroni, Aperol Spritz, Margarita, Espresso Martini, Mojito, Cosmopolitan und mehr — filterbar nach Spirituose und Geschmack.',
    },
  ],

  footerTagline: 'Bitte trink verantwortungsvoll.',

  seoTitle: 'Salut — Ausgeh-App: Promille-Rechner, Cocktails & Trinkspiele',
  seoDescription:
    'Salut ist die gratis Ausgeh-App: tracke Drinks und Promille, entdecke 15 Cocktail-Rezepte, klettere im Leaderboard und spiel Trinkspiele. Kein Download — einfach zum Homescreen hinzufügen.',
};

export const HOME_COPY: Record<Locale, HomeCopy> = { de: DE, en: EN };
