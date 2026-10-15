/** Route paths for every screen. FS ticket in comments. */
export const routes = {
  signIn: '/sign-in', // FS-70
  welcome: '/welcome', // FS-71 — redirects to Sign in until FA-23 (device unlock)
  home: '/', // FS-72
  requests: '/requests', // FS-73
  history: '/requests/past', // FS-74
  credits: '/credits', // FS-75
  chatStart: '/chat', // FS-76
  /** FS-77 (change) / FS-78 (new page): the thread decides which. */
  thread: (id: number | string = ':id') => `/chat/${id}`,
  review: (id: number | string = ':id') => `/requests/${id}/review`, // FS-79
  signOff: (id: number | string = ':id') => `/chat/${id}/sign-off`, // FS-84
  preview: (id: number | string = ':id') => `/requests/${id}/preview`, // FS-80
  progress: (id: number | string = ':id') => `/requests/${id}`, // FS-81
  noCredits: (id: number | string = ':id') => `/chat/${id}/not-enough-credits`, // FS-82
  states: '/states', // FS-83
  kit: '/kit', // FS-69 component sheet (dev only)
} as const;
