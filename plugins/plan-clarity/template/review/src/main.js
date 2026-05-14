import './shared/tokens.css';
import { mount } from 'svelte';
import yaml from 'js-yaml';
import App from './App.svelte';

const configRaw = import.meta.glob('/*.config.yaml', { eager: true, query: '?raw', import: 'default' });
const configs = {};
for (const [path, raw] of Object.entries(configRaw)) {
  const type = path.replace('/', '').replace('.config.yaml', '');
  configs[type] = yaml.load(raw);
}
const types = Object.keys(configs);

mount(App, { target: document.getElementById('app'), props: { configs, initialType: types[0] } });
