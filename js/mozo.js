const config_firebase = {
    apiKey: "AIzaSyAkmPu1YR7JfrASRebvXjiGPSPQgThlQms",
    authDomain: "notifast-2cfdb.firebaseapp.com",
    projectId: "notifast-2cfdb",
    storageBucket: "notifast-2cfdb.firebasestorage.app",
    messagingSenderId: "219642603892",
    appId: "1:219642603892:web:b4e6626dd51b487f4a6421"
}

const VAPID_KEY = 'BLRRlbTtLupCY_TM2MZkgWItgjyEscEMGMaNvHf9OOVo4lbhU4zvZKk3nrOlCxSFqPzUoS4nmcv1YqYykm1tmlw'

firebase.initializeApp(config_firebase)
const auth      = firebase.auth()
const db        = firebase.firestore()
const mensajeria = firebase.messaging()

const pantalla_espera = document.getElementById('pantalla-espera')
const pantalla_alerta = document.getElementById('pantalla-alerta')
const nombre_mozo     = document.getElementById('nombre-mozo')
const origen_alerta   = document.getElementById('origen-alerta')
const nombre_alerta   = document.getElementById('nombre-alerta')
const btn_confirmar   = document.getElementById('btn-confirmar')
const btn_salir       = document.getElementById('btn-salir')

let alerta_activa       = null
let listener_alertas    = null
let cola_alertas        = []
let procesando          = false
let wake_lock           = null
let intervalo_vibracion = null

btn_salir.addEventListener('click', () => {
    if (listener_alertas) listener_alertas()
    if (wake_lock) wake_lock.release()
    auth.signOut().then(() => window.location.replace('index.html'))
})

btn_confirmar.addEventListener('click', () => {
    if (!alerta_activa) return
    detener_vibracion()
    db.collection('alertas').doc(alerta_activa).update({ leida: true }).then(() => {
        alerta_activa = null
        pantalla_alerta.classList.add('oculto')
        procesando = false
        procesar_siguiente()
    })
})

auth.onAuthStateChanged(usuario => {
    if (!usuario) { window.location.replace('index.html'); return }
    db.collection('usuarios').doc(usuario.uid).get().then(doc => {
        if (!doc.exists || (doc.data().rol || '').toLowerCase() !== 'mozo') {
            auth.signOut()
            window.location.replace('index.html')
            return
        }
        nombre_mozo.textContent = doc.data().nombre
    })
    activar_wake_lock()
    registrar_fcm(usuario.uid)
    escuchar_alertas(usuario.uid)
})

async function activar_wake_lock() {
    if (!('wakeLock' in navigator)) return
    try {
        wake_lock = await navigator.wakeLock.request('screen')
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && !wake_lock) {
                wake_lock = await navigator.wakeLock.request('screen').catch(() => null)
            }
        })
    } catch {}
}

function registrar_fcm(uid) {
    if (!('serviceWorker' in navigator)) return
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permiso => {
            if (permiso === 'granted') obtener_token(uid)
        })
    } else if (Notification.permission === 'granted') {
        obtener_token(uid)
    }
}

function obtener_token(uid) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js').then(registro => {
        mensajeria.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registro })
            .then(token => {
                if (token) db.collection('usuarios').doc(uid).update({ token_fcm: token })
            })
            .catch(() => {})
    }).catch(() => {})
}

function escuchar_alertas(uid) {
    listener_alertas = db.collection('alertas')
        .where('mozo_id', '==', uid)
        .where('leida', '==', false)
        .onSnapshot(snap => {
            snap.docChanges().forEach(cambio => {
                if (cambio.type !== 'added') return
                cola_alertas.push({ id: cambio.doc.id, ...cambio.doc.data() })
                if (!procesando) procesar_siguiente()
            })
        })
}

function procesar_siguiente() {
    if (cola_alertas.length === 0) { procesando = false; return }
    procesando = true
    const alerta = cola_alertas.shift()
    alerta_activa = alerta.id
    mostrar_alerta(alerta.origen, alerta.nombre_origen || alerta.origen)
}

function mostrar_alerta(origen, nombre_orig) {
    origen_alerta.textContent = origen.toUpperCase()
    nombre_alerta.textContent = nombre_orig
    pantalla_alerta.classList.remove('oculto')
    vibrar_continuo()
}

function vibrar_continuo() {
    if (!('vibrate' in navigator)) return
    detener_vibracion()
    const patron = [700, 250, 700, 250, 700, 600]
    navigator.vibrate(patron)
    intervalo_vibracion = setInterval(() => navigator.vibrate(patron), 3200)
}

function detener_vibracion() {
    clearInterval(intervalo_vibracion)
    intervalo_vibracion = null
    if ('vibrate' in navigator) navigator.vibrate(0)
}
