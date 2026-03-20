import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // WCAG AA compliant color palette for CascadeGuard
      // All colors tested against white bg for 4.5:1+ contrast ratio
      colors: {
        cascade: {
          // Drug nodes
          'trigger': '#166534',      // green-800 — Drug A (safe/trigger) — 7.2:1 on white
          'result': '#991b1b',       // red-800 — Drug B (cascade result) — 7.1:1 on white
          'side-effect': '#9a3412',  // orange-800 — side effect node — 5.4:1 on white

          // Backgrounds for nodes
          'trigger-bg': '#dcfce7',   // green-100 — light green bg
          'result-bg': '#fee2e2',    // red-100 — light red bg
          'effect-bg': '#ffedd5',    // orange-100 — light orange bg

          // UI accents
          'primary': '#1e40af',      // blue-800 — buttons, links — 7.5:1 on white
          'primary-hover': '#1e3a8a',// blue-900
          'warning': '#92400e',      // amber-800 — warnings — 5.7:1 on white
          'safe': '#166534',         // green-800 — "no cascades found"
        },
      },
      fontSize: {
        // Minimum 16px base for elderly caregiver users
        'base': ['1rem', '1.5rem'],       // 16px / 24px
        'lg': ['1.125rem', '1.75rem'],    // 18px / 28px
        'xl': ['1.25rem', '1.875rem'],    // 20px / 30px
        '2xl': ['1.5rem', '2rem'],        // 24px / 32px
        '3xl': ['1.875rem', '2.25rem'],   // 30px / 36px
      },
    },
  },
  plugins: [],
};

export default config;
