const config_firebase = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
}

firebase.initializeApp(config_firebase)
const auth = firebase.auth()
const db = firebase.firestore()

const grilla_mozos = document.getElementById('grilla-mozos')
const badge_origen = document.getElementById('badge-origen')
const notif_enviada = document.getElementById('notif-enviada')
const texto_enviada = document.getElementById('texto-enviada')
const btn_salir = document.getElementById('btn-salir')

let origen_usuario = 'cocina'
let timer_notif = null

btn_salir.addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'index.html')
})

auth.onAuthStateChanged(usuario => {
    if (!usuario) {
        window.location.href = 'index.html'
        return
    }
    db.collection('usuarios').doc(usuario.uid).get().then(doc => {
        if (!doc.exists) {
            window.location.href = 'index.html'
            return
        }
        const rol = doc.data().rol
        if (!['cocina', 'barra', 'caja'].includes(rol)) {
            window.location.href = 'index.html'
            return
        }
        origen_usuario = rol
        badge_origen.textContent = rol.charAt(0).toUpperCase() + rol.slice(1)
    })
    cargar_mozos()
})

function cargar_mozos() {
    db.collection('mozos').where('activo', '==', true).onSnapshot(snap => {
        grilla_mozos.innerHTML = ''
        if (snap.empty) {
            grilla_mozos.innerHTML = '<p class="estado-vacio">No hay mozos disponibles.</p>'
            return
        }
        snap.forEach(doc => {
            const datos = doc.data()
            const btn = document.createElement('button')
            btn.className = 'btn-mozo'
            btn.textContent = datos.nombre
            btn.addEventListener('click', () => enviar_alerta(doc.id, datos.nombre, btn))
            grilla_mozos.appendChild(btn)
        })
    })
}

function enviar_alerta(mozo_id, nombre_mozo, btn) {
    btn.classList.add('enviando')
    db.collection('alertas').add({
        mozo_id,
        nombre_mozo,
        origen: origen_usuario,
        marca_tiempo: firebase.firestore.FieldValue.serverTimestamp(),
        leida: false
    }).then(() => {
        mostrar_confirmacion(nombre_mozo)
    }).finally(() => {
        setTimeout(() => btn.classList.remove('enviando'), 900)
    })
}

function mostrar_confirmacion(nombre) {
    texto_enviada.textContent = `✓ Alerta enviada a ${nombre}`
    notif_enviada.classList.remove('oculto')
    clearTimeout(timer_notif)
    timer_notif = setTimeout(() => notif_enviada.classList.add('oculto'), 2600)
}
