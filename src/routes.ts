/** Route paths for every screen. FS ticket in comments. */
export const routes = {
  signIn: '/sign-in', // FS-70
  welcome: '/welcome', // FS-71 — PIN only, on a remembered device (FA-23)
  home: '/', // FS-72
  requests: '/requests', // FS-73
  history: '/requests/past', // FS-74
  credits: '/credits', // FS-75
  chatStart: '/chat', // FS-76
  /** FS-77 (change) / FS-78 (new page): the thread decides which. */
  thread: (id = ':id') => `/chat/${id}`,
  review: (id = ':id') => `/requests/${id}/review`, // FS-79
  signOff: (id = ':id') => `/chat/${id}/sign-off`, // FS-84
  preview: (id = ':id') => `/requests/${id}/preview`, // FS-80
  progress: (id = ':id') => `/requests/${id}`, // FS-81
  noCredits: (id = ':id') => `/chat/${id}/not-enough-credits`, // FS-82
  states: '/states', // FS-83
  kit: '/kit', // FS-69 component sheet (dev only)
} as const;
