// Minimal Rollup config for Svelte + TS + Tailwind
const svelte = require('rollup-plugin-svelte');
const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve').default;
const livereload = require('rollup-plugin-livereload');
const serve = require('rollup-plugin-serve');
const typescript = require('@rollup/plugin-typescript');
const postcss = require('rollup-plugin-postcss');

const production = !process.env.ROLLUP_WATCH;

module.exports = {
  input: 'src/main.ts',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'public/build/bundle.js'
  },
  plugins: [
    svelte({
      emitCss: false
    }),
    resolve({
      browser: true,
      dedupe: ['svelte']
    }),
    commonjs(),
    typescript({ sourceMap: !production }),
    postcss({
      plugins: [require('tailwindcss'), require('autoprefixer')],
      extract: false,
      inject: true
    }),
    !production && serve({ contentBase: 'public', port: 5000, historyApiFallback: true }),
    !production && livereload('public')
  ],
  watch: {
    clearScreen: false
  }
};

