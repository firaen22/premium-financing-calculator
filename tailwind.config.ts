import type { Config } from 'tailwindcss'

export default {
    // index.tsx sits at the repo ROOT, not in src/ — a src-only glob silently
    // stops covering it the moment a class is added there.
    content: ['./index.html', './index.tsx', './src/**/*.{ts,tsx}'],
    theme: { extend: {} },
} satisfies Config
