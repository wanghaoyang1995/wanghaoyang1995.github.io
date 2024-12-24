//import './assets/main.css'

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import KeKeListening from './KeKeListening.vue'
import 'element-plus/dist/index.css'

import VueDiff from 'vue-diff'
import 'vue-diff/dist/index.css'

const keke_app = createApp(KeKeListening);
keke_app.use(ElementPlus, { size: 'small', zIndex: 3000 });
keke_app.use(VueDiff);
keke_app.mount('#app');
