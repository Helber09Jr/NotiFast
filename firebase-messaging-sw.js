importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
    apiKey: "AIzaSyAkmPu1YR7JfrASRebvXjiGPSPQgThlQms",
    authDomain: "notifast-2cfdb.firebaseapp.com",
    projectId: "notifast-2cfdb",
    storageBucket: "notifast-2cfdb.firebasestorage.app",
    messagingSenderId: "219642603892",
    appId: "1:219642603892:web:b4e6626dd51b487f4a6421"
})

const mensajeria = firebase.messaging()

mensajeria.onBackgroundMessage(payload => {
    const titulo = (payload.notification && payload.notification.title)
        || (payload.data && payload.data.titulo)
        || 'NotiFast — Te llaman'
    const cuerpo = (payload.notification && payload.notification.body)
        || (payload.data && payload.data.cuerpo)
        || 'Tienes una nueva alerta'

    return self.registration.showNotification(titulo, {
        body: cuerpo,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [400, 100, 400, 100, 400, 100, 400],
        tag: 'notifast-alerta',
        renotify: true,
        requireInteraction: true,
        silent: false
    })
})

self.addEventListener('notificationclick', e => {
    e.notification.close()
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
            for (const cliente of lista) {
                if ('focus' in cliente) return cliente.focus()
            }
            return clients.openWindow('/')
        })
    )
})
