/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: '#fffafc',
          surface: '#ffffff',
          primary: '#e08aa3',
          'primary-dark': '#b05570',
          secondary: '#f7c1d0',
          'secondary-light': '#fff2f6',
          'secondary-dark': '#d17e92',
          text: '#4a3038',
          muted: '#b592a0',
          gold: '#f2b8c6',
          'gold-light': '#f9dde5',
          border: 'rgba(176, 85, 112, 0.2)',
          'border-inner': 'rgba(176, 85, 112, 0.12)',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Lora', 'Georgia', 'serif'],
        label: ['"Josefin Sans"', 'sans-serif'],
        script: ['"Kaushan Script"', 'cursive'],
        kaushan: ['"Kaushan Script"', 'cursive'],
        arabic: ['Amiri', 'serif'],
      },
      boxShadow: {
        'card-3d': '0 20px 40px -15px rgba(176, 85, 112, 0.15), 0 0 1px 1px rgba(176, 85, 112, 0.1)',
        'card-hover': '0 30px 60px -15px rgba(176, 85, 112, 0.25), 0 0 1px 1px rgba(176, 85, 112, 0.2)',
        'portal-glow': '0 0 80px 20px rgba(232, 164, 180, 0.35)',
        'monogram-glow': '0 0 35px rgba(176, 85, 112, 0.3)',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-8px) rotate(2deg)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
          '50%': { opacity: 0.8, transform: 'scale(1.05)' },
        },
      },
      animation: {
        shimmer: 'shimmer 7s infinite linear',
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulseSlow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
