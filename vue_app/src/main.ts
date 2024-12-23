//import './assets/main.css'

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import KeKeListening from './KeKeListening.vue'

const keke_app = createApp(KeKeListening)
keke_app.use(ElementPlus, { size: 'small', zIndex: 3000 })
keke_app.mount('#app')
