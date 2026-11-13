/**
 * Figma-Designed Vector Assets for Chess.com Free Game Review & Match Simulator
 * - 12 Staunton / Neo Vector Chess Pieces (White & Black)
 * - 10 Move Classification Badges (Brilliant !!, Great !, Best ★, Excellent, Good, Book, Inaccuracy ?!, Mistake ?, Blunder ??, Miss ×)
 */

window.CHESS_ASSETS = {
  badges: {
    brilliant: {
      label: "Brilliant",
      symbol: "!!",
      color: "#1BADA6",
      textColor: "#FFFFFF",
      bgAlpha: "rgba(27, 173, 166, 0.22)",
      svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#1BADA6" stroke="#21201D" stroke-width="3"/>
        <text x="24" y="32" text-anchor="middle" fill="#FFFFFF" font-family="Inter, sans-serif" font-size="22" font-weight="800">!!</text>
      </svg>`
    },
    great: {
      label: "Great",
      symbol: "!",
      color: "#5C8BB0",
      textColor: "#FFFFFF",
      bgAlpha: "rgba(92, 139, 176, 0.22)",
      svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#5C8BB0" stroke="#21201D" stroke-width="3"/>
        <text x="24" y="32" text-anchor="middle" fill="#FFFFFF" font-family="Inter, sans-serif" font-size="24" font-weight="800">!</text>
      </svg>`
    },
    best: {
      label: "Best",
      symbol: "★",
      color: "#81B64C",
      textColor: "#FFFFFF",
      bgAlpha: "rgba(129, 182, 76, 0.22)",
      svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#81B64C" stroke="#21201D" stroke-width="3"/>
        <path d="M24 11L27.9 19L36.7 20.3L30.3 26.5L31.8 35.3L24 31.1L16.2 35.3L17.7 26.5L11.3 20.3L20.1 19L24 11Z" fill="#FFFFFF"/>
      </svg>`
    },
    excellent: {
      label: "Excellent",
      symbol: "👍",
      color: "#96BC4B",
      textColor: "#FFFFFF",
      bgAlpha: "rgba(150, 188, 75, 0.20)",
      svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#96BC4B" stroke="#21201D" stroke-width="3"/>
        <path d="M18 23H14V33H18V23ZM20 33H29.2C30.1 33 30.9 32.4 31.1 31.5L32.8 24.9C33.1 23.6 32.1 22.4 30.8 22.4H25.5L26.4 17.7C26.5 17.1 26.3 16.5 25.8 16.1L24.8 15.2L19.4 20.8C19.1 21.1 19 21.6 19 22V32C19 32.6 19.4 33 20 33Z" fill="#FFFFFF"/>
      </svg>`
    },
    good: {
      label: "Good",
      symbol: "✓",
      color: "#95AF8A",
      textColor: "#FFFFFF",
      bgAlpha: "rgba(149, 175, 138, 0.20)",
      svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#95AF8A" stroke="#21201D" stroke-width="3"/>
        <path d="M15 24.5L21 30.5L33.5 18" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    },
    book: {
      label: "Book",
      symbol: "📖",
      color: "#A88865",
      textColor: "#FFFFFF",
      bgAlpha: "rgba(168, 136, 101, 0.22)",
      svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#A88865" stroke="#21201D" stroke-width="3"/>
        <path d="M14 17C14 15.9 14.9 15 16 15H22.5V32H16C14.9 32 14 31.1 14 30V17ZM25.5 15H32C33.1 15 34 15.9 34 17V30C34 31.1 33.1 32 32 32H25.5V15Z" fill="#FFFFFF"/>
      </svg>`
    },
    inaccuracy: {
      label: "Inaccuracy",
      symbol: "?!",
      color: "#F7C631",
      textColor: "#21201D",
      bgAlpha: "rgba(247, 198, 49, 0.22)",
      svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#F7C631" stroke="#21201D" stroke-width="3"/>
        <text x="24" y="32" text-anchor="middle" fill="#21201D" font-family="Inter, sans-serif" font-size="20" font-weight="800">?!</text>
      </svg>`
    },
    mistake: {
      label: "Mistake",
      symbol: "?",
      color: "#FFA459",
      textColor: "#FFFFFF",
      bgAlpha: "rgba(255, 164, 89, 0.22)",
      svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#FFA459" stroke="#21201D" stroke-width="3"/>
        <text x="24" y="32" text-anchor="middle" fill="#FFFFFF" font-family="Inter, sans-serif" font-size="22" font-weight="800">?</text>
      </svg>`
    },
    blunder: {
      label: "Blunder",
      symbol: "??",
      color: "#FA412D",
      textColor: "#FFFFFF",
      bgAlpha: "rgba(250, 65, 45, 0.24)",
      svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#FA412D" stroke="#21201D" stroke-width="3"/>
        <text x="24" y="32" text-anchor="middle" fill="#FFFFFF" font-family="Inter, sans-serif" font-size="20" font-weight="800">??</text>
      </svg>`
    },
    miss: {
      label: "Miss",
      symbol: "×",
      color: "#FF7769",
      textColor: "#FFFFFF",
      bgAlpha: "rgba(255, 119, 105, 0.22)",
      svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#FF7769" stroke="#21201D" stroke-width="3"/>
        <path d="M17 17L31 31M31 17L17 31" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
      </svg>`
    }
  },

  pieces: {
    wP: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#FFFFFF" stroke="#262522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    bP: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#2A2825" stroke="#141311" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    wR: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#FFFFFF" stroke="#262522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5"/><path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23" fill="none"/></g></svg>`,
    bR: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#2A2825" stroke="#141311" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z"/><path d="M14 29.5v-13h17v13H14z"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"/><path d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23" fill="none" stroke="#C8C5BE" stroke-width="1.2"/></g></svg>`,
    wN: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#FFFFFF" stroke="#262522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><circle cx="15" cy="15.5" r="1.2" fill="#262522"/></g></svg>`,
    bN: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#2A2825" stroke="#141311" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><circle cx="15" cy="15.5" r="1.2" fill="#D5D2CB" stroke="none"/><path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 38.5l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34-2.37-4.49-5.79-6.64-9.19-7.16l-.51-.1z" fill="#C8C5BE" stroke="none"/></g></svg>`,
    wB: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#FFFFFF" stroke="#262522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><circle cx="22.5" cy="8" r="2.5"/><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" fill="none"/></g></svg>`,
    bB: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#2A2825" stroke="#141311" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><circle cx="22.5" cy="8" r="2.5"/><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" fill="none" stroke="#C8C5BE" stroke-width="1.4"/></g></svg>`,
    wQ: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#FFFFFF" stroke="#262522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke-width="1.3"/></g></svg>`,
    bQ: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#2A2825" stroke="#141311" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path d="M11 29c3.5-1 19.5-1 23 0M12 32.5c6-1 15-1 21 0M11.5 35.5c5.5-1 16.5-1 22 0" fill="none" stroke="#C8C5BE" stroke-width="1.2"/></g></svg>`,
    wK: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#FFFFFF" stroke="#262522" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" fill="none"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/><path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" fill="none" stroke-width="1.3"/></g></svg>`,
    bK: `<svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg"><g fill="#2A2825" stroke="#141311" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" fill="none" stroke-width="2"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"/><path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" fill="none" stroke="#C8C5BE" stroke-width="1.2"/></g></svg>`
  }
};
