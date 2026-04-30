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

const grilla_usuarios = document.getElementById('grilla-usuarios')
const badge_origen    = document.getElementById('badge-origen')
const notif_enviada   = document.getElementById('notif-enviada')
const texto_enviada   = document.getElementById('texto-enviada')
const btn_salir       = document.getElementById('btn-salir')
const pantalla_alerta = document.getElementById('pantalla-alerta')
const origen_alerta   = document.getElementById('origen-alerta')
const nombre_alerta   = document.getElementById('nombre-alerta')
const btn_confirmar   = document.getElementById('btn-confirmar')

const colores_rol = {
    mozo:   '#FF6B00',
    barra:  '#42A5F5',
    caja:   '#66BB6A',
    cocina: '#AB47BC'
}

const etiquetas_rol = {
    mozo:   'Mozos',
    barra:  'Barra',
    caja:   'Caja',
    cocina: 'Cocina'
}

let origen_usuario      = 'cocina'
let nombre_usuario      = ''
let uid_usuario         = null
let timer_notif         = null
let alerta_activa       = null
let listener_alertas    = null
let cola_alertas        = []
let procesando          = false
let intervalo_vibracion = null

btn_salir.addEventListener('click', () => {
    if (listener_alertas) listener_alertas()
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
    uid_usuario = usuario.uid
    db.collection('usuarios').doc(usuario.uid).get().then(doc => {
        if (!doc.exists) { window.location.replace('index.html'); return }
        const rol = (doc.data().rol || '').toLowerCase()
        if (!['cocina', 'barra', 'caja'].includes(rol)) {
            window.location.replace('index.html')
            return
        }
        origen_usuario = rol
        nombre_usuario = doc.data().nombre || rol
        badge_origen.textContent = rol.charAt(0).toUpperCase() + rol.slice(1)
    })
    registrar_fcm()
    cargar_usuarios()
    escuchar_alertas(usuario.uid)
})

function registrar_fcm() {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const Push = window.Capacitor.Plugins.PushNotifications
        Push.requestPermissions().then(r => {
            if (r.receive === 'granted') Push.register()
        })
        Push.addListener('registration', tok => {
            if (uid_usuario) db.collection('usuarios').doc(uid_usuario).update({ token_fcm: tok.value })
        })
        Push.addListener('pushNotificationReceived', notif => {
            const origen = (notif.data && notif.data.origen) || 'llamada'
            const nombre = (notif.data && notif.data.nombre_origen) || ''
            mostrar_alerta_entrante(origen, nombre)
        })
        return
    }
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/firebase-messaging-sw.js').then(registro => {
        mensajeria.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registro })
            .then(token => {
                if (token && uid_usuario) {
                    db.collection('usuarios').doc(uid_usuario).update({ token_fcm: token })
                }
            })
            .catch(() => {})
    }).catch(() => {})
}

function cargar_usuarios() {
    db.collection('usuarios').onSnapshot(snap => {
        grilla_usuarios.innerHTML = ''
        const grupos = {}
        snap.forEach(doc => {
            const datos = doc.data()
            const rol   = (datos.rol || '').toLowerCase()
            if (rol === 'admin' || doc.id === uid_usuario) return
            if (!grupos[rol]) grupos[rol] = []
            grupos[rol].push({ id: doc.id, ...datos })
        })

        const orden = ['mozo', 'barra', 'caja', 'cocina']
        let hay_contenido = false

        orden.forEach(rol => {
            if (!grupos[rol] || grupos[rol].length === 0) return
            hay_contenido = true
            const color = colores_rol[rol] || '#FF6B00'

            const seccion = document.createElement('div')
            seccion.className = 'seccion-rol'

            const titulo = document.createElement('p')
            titulo.className = 'titulo-seccion'
            titulo.textContent = etiquetas_rol[rol] || rol
            titulo.style.color = color
            seccion.appendChild(titulo)

            const fila = document.createElement('div')
            fila.className = 'fila-botones'

            grupos[rol].forEach(persona => {
                const btn = document.createElement('button')
                btn.className = 'btn-usuario'
                btn.style.setProperty('--color-rol', color)
                btn.innerHTML = `<span class="nombre-btn">${persona.nombre}</span>`
                btn.addEventListener('click', () => {
                    enviar_alerta(persona.id, persona.nombre, persona.token_fcm, btn)
                })
                fila.appendChild(btn)
            })

            seccion.appendChild(fila)
            grilla_usuarios.appendChild(seccion)
        })

        if (!hay_contenido) {
            grilla_usuarios.innerHTML = '<p class="estado-vacio">No hay otros usuarios disponibles.</p>'
        }
    })
}

function enviar_alerta(destino_id, nombre_destino, token_fcm, btn) {
    btn.classList.add('enviando')
    db.collection('alertas').add({
        mozo_id: destino_id,
        nombre_mozo: nombre_destino,
        origen: origen_usuario,
        nombre_origen: nombre_usuario,
        marca_tiempo: firebase.firestore.FieldValue.serverTimestamp(),
        leida: false
    }).then(() => {
        mostrar_confirmacion(nombre_destino)
        if (token_fcm) enviar_push(token_fcm, nombre_destino)
    }).finally(() => {
        setTimeout(() => btn.classList.remove('enviando'), 900)
    })
}

function enviar_push(token_fcm, nombre_destino) {
    fetch('/api/notificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token_fcm,
            titulo: 'NotiFast — Te llaman',
            cuerpo: `${nombre_usuario} (${origen_usuario}) llama a ${nombre_destino}`,
            origen: origen_usuario,
            nombre_origen: nombre_usuario
        })
    }).catch(() => {})
}

function mostrar_confirmacion(nombre) {
    texto_enviada.textContent = `✓ Alerta enviada a ${nombre}`
    notif_enviada.classList.remove('oculto')
    clearTimeout(timer_notif)
    timer_notif = setTimeout(() => notif_enviada.classList.add('oculto'), 2600)
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
    mostrar_alerta_entrante(alerta.origen, alerta.nombre_origen || alerta.origen)
}

function mostrar_alerta_entrante(origen, nombre) {
    origen_alerta.textContent = origen.toUpperCase()
    nombre_alerta.textContent = nombre
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
