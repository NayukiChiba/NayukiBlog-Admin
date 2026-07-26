/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主题色 — 雾蓝（与博客端「素雅灰蓝」设计系统一致，低饱和不抢眼）
        primary: {
          50: '#f5f7fa',
          100: '#eaeef4',
          200: '#dbe2eb',
          300: '#bcc8d9',
          400: '#93a9c9',
          500: '#4c5670',
          600: '#414a61',
          700: '#373e51',
          800: '#2e3443',
          900: '#262b37',
          950: '#191c24',
        },
        // 辅助点缀 — 淡雾蓝
        accent: {
          50: '#f6f9fc',
          100: '#e9f0f8',
          200: '#d4e2f0',
          300: '#c2d4e8',
          400: '#a9c2de',
          500: '#93a9c9',
          600: '#7690b4',
          700: '#5f7699',
        },
        // 中性色 — 冷调灰
        dark: {
          50: '#fafbfd',
          100: '#f2f4f8',
          200: '#e6e8ee',
          300: '#d0d4de',
          400: '#9096a5',
          500: '#6d7383',
          600: '#4b5162',
          700: '#373d4c',
          800: '#252a35',
          900: '#1a1d24',
          950: '#101218',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        // 雾蓝窄幅渐变 — 仅少量装饰使用；大面积底色请用纯色 primary-500
        'aurora': 'linear-gradient(135deg, #4c5670, #67799c)',
        'aurora-soft': 'linear-gradient(135deg, rgba(76, 86, 112, 0.08), rgba(147, 169, 201, 0.1))',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(26, 29, 36, 0.05), 0 8px 22px -8px rgba(26, 29, 36, 0.07)',
        'card': '0 0 0 1px rgba(26, 29, 36, 0.04), 0 1px 3px rgba(26, 29, 36, 0.05)',
        'lift': '0 14px 32px -14px rgba(26, 29, 36, 0.14)',
        'glow': '0 10px 24px -10px rgba(76, 86, 112, 0.35)',
      },
      borderRadius: {
        'xl2': '1.125rem',
      },
      transitionTimingFunction: {
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
