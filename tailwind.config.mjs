/** @type {import('tailwindcss').Config} */
export default {
    // darkMode: 'class',
    plugins: [],
    content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
    theme: {
        screens: {
            sm: '576px',
            md: '768px',
            lg: '992px',
            xl: '1200px',
            '2xl': '1366px',
            '3xl': '1600px',
        },
        extend: {
            colors: {
                light: '#e3cc99',
            },
            dropShadow: {
                '1px': '1px 1px 0px #000',
                inline: '1px 1px 1px #000',
            },
            width: {
                13: '3.25rem',
                15: '3.75rem',
                18: '4.5rem',
                19: '4.75rem',
                22: '5.5rem',
            },
            height: {
                13: '3.25rem',
                15: '3.75rem',
                18: '4.5rem',
                19: '4.75rem',
                22: '5.5rem',
            },
            spacing: {
                22: '5.5rem',
            },
            padding: {
                22: '5.5rem',
            },
            animation: {
                'spin-10s': 'spin 10s linear infinite',
            },
            transitionProperty: {
                height: 'height',
            },
        },
    },
    corePlugins: {
        preflight: false,
        container: false,
    },
};
