// Sets up jsdom globals then runs the bundled mount test.
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = dom.window.localStorage;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.IS_REACT_ACT_ENVIRONMENT = true;
if (!dom.window.matchMedia) {
  dom.window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} });
}
global.matchMedia = dom.window.matchMedia;

const { run } = require('/tmp/mount-test-bundle.cjs');
run().then((failed) => {
  if (failed) { console.log('\nSMOKE TEST FAILED'); process.exit(1); }
  console.log('\nSMOKE TEST PASSED'); process.exit(0);
}).catch((e) => { console.log('RUNNER ERROR:', e.stack || e); process.exit(1); });
