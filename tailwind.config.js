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
                primary: '#ededed',
                'light-100': '#dbc291',
                'light-200': '#debe79',
                'light-300': '#e1b066',
                'light-400': '#ffc870',
                'light-red': '#eb4d3d',
                'light-green': '#50ecb0',
                'skill-num': '#ef9b38',
                keypoint: '#f29e38',
                // DamageType.json
                physical: '#ffffff',
                fire: '#f84f36',
                ice: '#47c7fd',
                thunder: '#c75de2',
                wind: '#00ff9c',
                quantum: '#7788ff',
                imaginary: '#f4d258',
                'rarity-0a': '#5fbed3',
                'rarity-0b': '#267ab0',
                'rarity-1a': '#ceced8',
                'rarity-1b': '#8e8e9a',
                'rarity-2a': '#89e0e2',
                'rarity-2b': '#427f80',
                'rarity-3a': '#73b1f3',
                'rarity-3b': '#547bba',
                'rarity-4a': '#c298fd',
                'rarity-4b': '#8b65c6',
                'rarity-5a': '#ffc870',
                'rarity-5b': '#b68c61',
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
