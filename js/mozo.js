const config_firebase = {
    apiKey: "AIzaSyAkmPu1YR7JfrASRebvXjiGPSPQgThlQms",
    authDomain: "notifast-2cfdb.firebaseapp.com",
    projectId: "notifast-2cfdb",
    storageBucket: "notifast-2cfdb.firebasestorage.app",
    messagingSenderId: "219642603892",
    appId: "1:219642603892:web:b4e6626dd51b487f4a6421"
}

firebase.initializeApp(config_firebase)
const auth = firebase.auth()
const db = firebase.firestore()

const pantalla_espera = document.getElementById('pantalla-espera')
const pantalla_alerta = document.getElementById('pantalla-alerta')
const nombre_mozo = document.getElementById('nombre-mozo')
const origen_alerta = document.getElementById('origen-alerta')
const btn_confirmar = document.getElementById('btn-confirmar')
const btn_salir = document.getElementById('btn-salir')

let alerta_activa = null
let listener_alertas = null
let cola_alertas = []
let procesando = false

btn_salir.addEventListener('click', () => {
    if (listener_alertas) listener_alertas()
    auth.signOut().then(() => window.location.href = 'index.html')
})

btn_confirmar.addEventListener('click', () => {
    if (!alerta_activa) return
    db.collection('alertas').doc(alerta_activa).update({ leida: true }).then(() => {
        alerta_activa = null
        pantalla_alerta.classList.add('oculto')
        procesando = false
        procesar_siguiente()
    })
})

auth.onAuthStateChanged(usuario => {
    if (!usuario) {
        window.location.href = 'index.html'
        return
    }
    db.collection('usuarios').doc(usuario.uid).get().then(doc => {
        if (!doc.exists || doc.data().rol !== 'mozo') {
            auth.signOut()
            window.location.href = 'index.html'
            return
        }
        nombre_mozo.textContent = doc.data().nombre
    })
    pedir_permiso()
    escuchar_alertas(usuario.uid)
})

function pedir_permiso() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
    }
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
    if (cola_alertas.length === 0) {
        procesando = false
        return
    }
    procesando = true
    const alerta = cola_alertas.shift()
    alerta_activa = alerta.id
    mostrar_alerta(alerta.origen)
}

function mostrar_alerta(origen) {
    origen_alerta.textContent = origen.toUpperCase()
    pantalla_alerta.classList.remove('oculto')
    vibrar()
    notificar(origen)
}

function vibrar() {
    if ('vibrate' in navigator) {
        navigator.vibrate([400, 100, 400, 100, 400])
    }
}

function notificar(origen) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('NotiFast', {
            body: `Te llaman desde ${origen}`,
            tag: 'alerta',
            renotify: true
        })
    }
}
