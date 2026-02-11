import { createApp } from 'vue'
import App from './App.vue'
import iconUrl from '@assets/icon.svg'

const link = document.createElement('link')
link.rel = 'icon'
link.type = 'image/svg+xml'
link.href = iconUrl
document.head.appendChild(link)

createApp(App).mount('#app')
