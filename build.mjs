// Builds the two self-hosted bundles into dist/.
//   node build.mjs                      -> dist/noah-headboard-preview.js (no Wix API calls)
//   APP_ID=<app id> node build.mjs sdk  -> also dist/noah-headboard-preview.sdk.js
import { build } from 'esbuild';

const banner = {
  js: '/* Noah headboard preview - Wix Stores product page site plugin. Tag: <noah-headboard-preview>. Edit src/config.js and rebuild, or edit the HEADBOARDS block below. */',
};

await build({
  entryPoints: ['src/entry-standalone.js'],
  outfile: 'dist/noah-headboard-preview.js',
  bundle: true,
  format: 'iife',
  target: ['es2019'],
  charset: 'utf8',
  legalComments: 'none',
  banner,
});
console.log('built dist/noah-headboard-preview.js');

if (process.argv.includes('sdk')) {
  const appId = process.env.APP_ID || '';
  if (!appId) console.warn('WARNING: APP_ID is empty - set APP_ID=<your app id> (app dashboard > OAuth / app ID).');
  await build({
    entryPoints: ['src/entry-standalone-sdk.js'],
    outfile: 'dist/noah-headboard-preview.sdk.js',
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2019'],
    charset: 'utf8',
    legalComments: 'none',
    define: { __NOAH_APP_ID__: JSON.stringify(appId) },
    banner,
  });
  console.log('built dist/noah-headboard-preview.sdk.js (APP_ID=' + (appId || '<empty>') + ')');
}
