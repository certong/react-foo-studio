import type { MockData, PageBlock, ReviewChange, Session } from './types';

export const session: Session = {
  name: 'Mei',
  fullName: 'Mei Ling Tan',
  initials: 'MT',
  email: 'mei@kopilane.com',
  business: 'Kopi Lane',
  site: 'kopilane.com',
};

/** Prices shown on Credits and used by every action that spends credits. */
export const PRICES = {
  change: 20,
  extraPreview: 10,
  extraRound: 10,
  draftDropped: 15,
  newPageRm: 100,
  topUpCredits: 100,
  topUpRm: 20,
  freePreviews: 5,
  maxChanges: 10,
} as const;

/** Past months for the Credits trend chart: monthly credits used, top-up credits used, RM paid for top-ups. */
export const usage = [
  { month: 'May', used: 60, topUpUsed: 0, topUpRm: 0 },
  { month: 'Jun', used: 90, topUpUsed: 0, topUpRm: 0 },
  { month: 'Jul', used: 80, topUpUsed: 0, topUpRm: 0 },
  { month: 'Aug', used: 200, topUpUsed: 5, topUpRm: 20 },
  { month: 'Sep', used: 185, topUpUsed: 0, topUpRm: 0 },
];

const openingHours: ReviewChange[] = [
  {
    kind: 'text',
    where: 'Home · Opening hours',
    rows: [
      { lang: 'English', now: 'Open 8am–6pm daily', after: 'Open 7am–7pm · Closed Tuesdays' },
      { lang: 'Malay', now: 'Buka 8 pagi–6 petang setiap hari', after: 'Buka 7 pagi–7 malam · Tutup hari Selasa' },
    ],
  },
  {
    kind: 'text',
    where: 'Visit us · Opening hours',
    rows: [
      { lang: 'English', now: '8am–6pm, every day', after: '7am–7pm, closed Tuesdays' },
      { lang: 'Malay', now: '8 pagi–6 petang, setiap hari', after: '7 pagi–7 malam, tutup hari Selasa' },
    ],
  },
  {
    kind: 'text',
    where: 'All pages · WhatsApp button',
    rows: [{ lang: 'Link', now: 'wa.me/60123000111', after: 'wa.me/60123456789' }],
  },
];

const storyBlocks: PageBlock[] = [
  { kind: 'Banner', title: 'Since 2019 on Jalan Telawi' },
  { kind: 'Text', title: 'How Kopi Lane started' },
  { kind: 'Text', title: 'Our beans' },
  { kind: 'WhatsApp button', title: 'Say hi' },
];

/** Workshops plan from the chat, before a sketch is uploaded. */
export const workshopPlan: PageBlock[] = [
  { kind: 'Banner', title: 'Latte art workshops', words: '12 words' },
  { kind: 'Image with text', title: "What you'll learn", words: '140 words' },
  { kind: 'Text', title: 'Dates and price', words: '90 words' },
  { kind: 'WhatsApp button', title: 'Book a seat', words: '3 words' },
];

/** What agent-ba matches the uploaded sketch to. The gallery isn't one of the site's blocks. */
export const sketchPlan: PageBlock[] = [
  ...workshopPlan,
  { kind: 'Photo gallery', title: 'not a block on your site yet', unmatched: true },
];

export function seedData(): MockData {
  return {
    // State B from the spec sheet: 220 free = 125 monthly + 95 top-up left from August.
    credits: { monthly: 200, free: 220, setAside: 20, used: 55, topUp: 95, resetDate: '2026-11-01', topUpRequest: 'none' },
    ledger: [
      { id: 'l1', date: '2026-10-01', text: 'Monthly credits', amount: 200, kind: 'add' },
      { id: 'l0', date: '2026-10-01', text: 'Top-up carried over', amount: 95, kind: 'add' },
      { id: 'l2', date: '2026-10-03', text: '#38 Change · Menu prices', amount: -20, kind: 'spend' },
      { id: 'l3', date: '2026-10-07', text: '#39 Page draft dropped · Gift cards', amount: -15, kind: 'spend' },
      { id: 'l4', date: '2026-10-10', text: '#40 Change · About us text', amount: -20, kind: 'spend' },
      { id: 'l5', date: '2026-10-14', text: '#43 Set aside · Opening hours', amount: 20, kind: 'held' },
    ],
    requests: [
      {
        id: 43,
        type: 'change',
        title: 'Opening hours and WhatsApp',
        shortTitle: 'Opening hours',
        status: 'uat',
        closeReason: null,
        replyBy: null,
        creditsHeld: 20,
        updatedAt: '2026-10-14T01:00:00.000Z',
        note: '3 changes · 20 credits set aside',
        changeCount: 3,
        credits: 20,
        changes: openingHours,
        timeline: [
          { when: '14 Oct', detail: 'Planned with agent-ba · 20 credits set aside' },
          { when: '14 Oct', detail: 'Automatic checks passed' },
          { when: 'now', detail: 'You check the before and after' },
          { when: 'after you approve', detail: 'Goes live straight away' },
        ],
      },
      {
        id: 41,
        type: 'new_page',
        title: 'Catering',
        status: 'uat',
        closeReason: null,
        replyBy: '2026-10-20',
        creditsHeld: 0,
        updatedAt: '2026-10-14T01:00:00.000Z',
        note: 'Reply by 20 Oct · 1 free change round',
        credits: null,
        previewUrl: '/staging/catering.html',
        freeRounds: 1,
        roundsUsed: 0,
        signedOff: '2026-10-08',
        blocks: [
          { kind: 'Banner', title: 'Catering by Kopi Lane' },
          { kind: 'Text', title: 'What we bring' },
          { kind: 'WhatsApp button', title: 'Ask on WhatsApp' },
        ],
        timeline: [
          { when: '8 Oct', detail: 'Signed off 8 Oct' },
          { when: '8–11 Oct', detail: 'Built 11 Oct' },
          { when: '13 Oct', detail: 'Automatic checks passed' },
          { when: '20 Oct', estimate: true, detail: 'You check the preview · 7 days to reply' },
          { when: 'after you approve', detail: 'Goes live after you approve' },
        ],
      },
      {
        id: 42,
        type: 'new_page',
        title: 'Our Story',
        status: 'building',
        closeReason: null,
        replyBy: null,
        creditsHeld: 0,
        updatedAt: '2026-10-14T01:00:00.000Z',
        note: 'Ready by 16 Oct',
        credits: null,
        signedOff: '2026-10-13',
        blocks: storyBlocks,
        timeline: [
          { when: '13 Oct', detail: 'Signed off 13 Oct' },
          { when: '13–16 Oct', detail: 'Started 13 Oct · ready by 16 Oct' },
          { when: '16 Oct', detail: 'Automatic checks' },
          { when: '23 Oct', estimate: true, detail: 'You check the preview · 7 days to reply' },
          { when: 'after you approve', detail: 'Goes live after you approve' },
        ],
      },
      {
        id: 37,
        type: 'new_page',
        title: 'Events',
        status: 'pending_chi',
        closeReason: null,
        stoppedAt: 'checking',
        replyBy: null,
        creditsHeld: 0,
        updatedAt: '2026-10-14T01:00:00.000Z',
        note: "A check didn't pass. Chi is on it. Nothing went live.",
        credits: null,
        signedOff: '2026-10-02',
        chiNote: "A check didn't pass, so nothing went live. Chi is fixing it and will message you by 16 Oct.",
        blocks: [
          { kind: 'Banner', title: 'Events at Kopi Lane' },
          { kind: 'Text', title: 'Private bookings' },
          { kind: 'WhatsApp button', title: 'Book the space' },
        ],
        timeline: [
          { when: '2 Oct', detail: 'Signed off 2 Oct' },
          { when: '2–6 Oct', detail: 'Built 6 Oct' },
          { when: '7 Oct', detail: "The booking button didn't open WhatsApp on phones" },
          { when: '16 Oct', estimate: true, detail: 'You check the preview once Chi has fixed it' },
          { when: 'after you approve', detail: 'Goes live after you approve' },
        ],
      },
      {
        id: 40,
        type: 'change',
        title: 'About us text',
        status: 'live',
        closeReason: null,
        replyBy: null,
        creditsHeld: 0,
        updatedAt: '2026-10-14T01:00:00.000Z',
        note: 'Live since 10 Oct · 20 credits',
        credits: 20,
        changes: [
          {
            kind: 'text',
            where: 'About us · Intro',
            rows: [
              { lang: 'English', now: 'A small coffee bar in Bangsar.', after: 'A neighbourhood coffee bar on Jalan Telawi since 2019.' },
              { lang: 'Malay', now: 'Kedai kopi kecil di Bangsar.', after: 'Kedai kopi kejiranan di Jalan Telawi sejak 2019.' },
            ],
          },
        ],
      },
    ],
    history: [
      { id: 40, type: 'change', title: 'About us text', date: '2026-10-10', scope: '1 paragraph · English and Malay', credits: 20, changes: [] },
      {
        id: 38,
        type: 'change',
        title: 'Menu prices for the new season',
        date: '2026-10-03',
        scope: '4 prices · English and Malay',
        credits: 20,
        changes: [
          { kind: 'text', where: 'Menu · Flat white', rows: [{ lang: 'English', now: 'RM 9', after: 'RM 10' }] },
          { kind: 'text', where: 'Menu · Iced latte', rows: [{ lang: 'English', now: 'RM 11', after: 'RM 12' }] },
        ],
      },
      { id: 36, type: 'new_page', title: 'New page: Seasonal menu', date: '2026-10-02', scope: '4 sections', credits: null, changes: [] },
      {
        id: 35,
        type: 'change',
        title: 'Swap the team photo on About',
        date: '2026-09-24',
        scope: '1 photo',
        credits: 20,
        changes: [{ kind: 'visual', where: 'About · Team photo', now: 'existing photo: storefront', after: 'new photo: the team at the bar' }],
      },
      {
        id: 34,
        type: 'change',
        title: 'Fix a typo in the footer',
        date: '2026-09-18',
        scope: '1 line',
        credits: 20,
        changes: [{ kind: 'text', where: 'All pages · Footer', rows: [{ lang: 'English', now: 'Open everyday', after: 'Open every day' }] }],
      },
      { id: 33, type: 'new_page', title: 'New page: Gift cards', date: '2026-09-05', scope: '3 sections', credits: null, changes: [] },
      {
        id: 31,
        type: 'change',
        title: 'Add GrabFood link',
        date: '2026-08-27',
        scope: 'All pages',
        credits: 20,
        changes: [{ kind: 'text', where: 'All pages · Order online', rows: [{ lang: 'Link', now: '(none)', after: 'food.grab.com/my/kopilane' }] }],
      },
      {
        id: 30,
        type: 'change',
        title: 'Merdeka closing notice',
        date: '2026-08-25',
        scope: 'Home banner',
        credits: 20,
        changes: [{ kind: 'text', where: 'Home · Banner', rows: [{ lang: 'English', now: '(none)', after: 'Closed 31 Aug for Merdeka. Selamat Hari Merdeka!' }] }],
      },
    ],
    threads: {
      43: {
        id: 43,
        kind: 'change',
        title: 'Opening hours and WhatsApp',
        savedOn: '2026-10-14',
        composer: '',
        cost: 20,
        setAside: true,
        messages: [
          { id: 'm1', from: 'agent', text: 'Hi Mei! What would you like to change?' },
          { id: 'm2', from: 'me', text: 'Our hours are now 7am to 7pm, closed Tuesdays. Also the WhatsApp button goes to my old number.' },
          { id: 'm3', from: 'agent', text: 'Got it. The hours show on Home and Visit us. What is the new WhatsApp number?' },
          { id: 'm4', from: 'me', text: '+60 12-345 6789' },
          { id: 'm5', from: 'agent', text: "Thanks. I've listed 3 changes. 20 credits are set aside now and only charged when you approve." },
        ],
        changes: [
          { where: 'Home · Opening hours', old: '8am–6pm daily', new: '7am–7pm, closed Tuesdays' },
          { where: 'Visit us · Opening hours', old: '8am–6pm daily', new: '7am–7pm, closed Tuesdays' },
          { where: 'All pages · WhatsApp button', old: 'wa.me/60123000111', new: 'wa.me/60123456789' },
        ],
      },
      44: {
        id: 44,
        kind: 'new_page',
        title: 'Workshops',
        savedOn: '2026-10-14',
        composer: '',
        cost: 0,
        setAside: false,
        changes: [],
        plan: workshopPlan,
        previewsUsed: 1,
        messages: [
          { id: 'p1', from: 'agent', text: 'What should the new page be about?' },
          { id: 'p2', from: 'me', text: 'Our latte art workshops. Saturdays, RM 85 per person, booking on WhatsApp.' },
          { id: 'p3', from: 'agent', text: "Here's a plan with 4 sections built from your site's blocks. Add more if you like, then see a preview." },
        ],
      },
      45: {
        id: 45,
        kind: 'change',
        title: 'Menu prices',
        summary: '4 prices · English and Malay',
        savedOn: '2026-10-14',
        composer: '',
        cost: 20,
        setAside: false,
        messages: [
          { id: 'q1', from: 'agent', text: 'Hi Mei! What would you like to change?' },
          { id: 'q2', from: 'me', text: 'New prices: flat white RM 10, iced latte RM 12, kaya toast RM 7, nasi lemak RM 13. English and Malay menus.' },
          { id: 'q3', from: 'agent', text: "Got it. I've listed 4 price changes on the Menu page, in English and Malay. Send when you're ready and I'll set aside 20 credits." },
        ],
        changes: [
          { where: 'Menu · Flat white', old: 'RM 9', new: 'RM 10' },
          { where: 'Menu · Iced latte', old: 'RM 11', new: 'RM 12' },
          { where: 'Menu · Kaya toast', old: 'RM 6', new: 'RM 7' },
          { where: 'Menu · Nasi lemak', old: 'RM 12', new: 'RM 13' },
        ],
      },
    },
  };
}
