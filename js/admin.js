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

const app_aux = firebase.initializeApp(config_firebase, 'auxiliar')
const auth_aux = app_aux.auth()

const btn_salir = document.getElementById('btn-salir')
const form_nuevo = document.getElementById('form-nuevo')
const nombre_nuevo = document.getElementById('nombre-nuevo')
const rol_nuevo = document.getElementById('rol-nuevo')
const email_nuevo = document.getElementById('email-nuevo')
const pass_nuevo = document.getElementById('pass-nuevo')
const btn_crear = document.getElementById('btn-crear')
const msg_crear = document.getElementById('msg-crear')
const lista_mozos = document.getElementById('lista-mozos')
const lista_alertas = document.getElementById('lista-alertas')

auth.onAuthStateChanged(usuario => {
    if (!usuario) {
        window.location.href = 'index.html'
        return
    }
    db.collection('usuarios').doc(usuario.uid).get().then(doc => {
        if (!doc.exists || doc.data().rol !== 'admin') {
            auth.signOut()
            window.location.href = 'index.html'
        }
    })
    cargar_mozos()
    cargar_historial()
})

btn_salir.addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = 'index.html')
})

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('activo'))
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('activo'))
        tab.classList.add('activo')
        document.getElementById('panel-' + tab.dataset.tab).classList.add('activo')
    })
})

form_nuevo.addEventListener('submit', e => {
    e.preventDefault()
    msg_crear.textContent = ''
    msg_crear.className = 'mensaje-estado'
    btn_crear.disabled = true
    btn_crear.textContent = 'Creando...'

    const nombre = nombre_nuevo.value.trim()
    const rol = rol_nuevo.value
    const email = email_nuevo.value.trim()
    const clave = pass_nuevo.value

    auth_aux.createUserWithEmailAndPassword(email, clave)
        .then(cred => {
            const uid = cred.user.uid
            const lote = db.batch()
            lote.set(db.collection('usuarios').doc(uid), { nombre, rol })
            if (rol === 'mozo') {
                lote.set(db.collection('mozos').doc(uid), { nombre, activo: true })
            }
            return lote.commit().then(() => auth_aux.signOut())
        })
        .then(() => {
            msg_crear.textContent = 'Usuario creado correctamente.'
            msg_crear.className = 'mensaje-estado ok'
            form_nuevo.reset()
        })
        .catch(err => {
            const texto = err.code === 'auth/email-already-in-use'
                ? 'El correo ya está registrado.'
                : 'Error al crear el usuario.'
            msg_crear.textContent = texto
            msg_crear.className = 'mensaje-estado error'
        })
        .finally(() => {
            btn_crear.disabled = false
            btn_crear.textContent = 'Crear usuario'
        })
})

function cargar_mozos() {
    db.collection('mozos').onSnapshot(snap => {
        lista_mozos.innerHTML = ''
        if (snap.empty) {
            lista_mozos.innerHTML = '<p class="estado-vacio">No hay mozos registrados.</p>'
            return
        }
        snap.forEach(doc => {
            const datos = doc.data()
            const item = document.createElement('div')
            item.className = 'item-mozo'
            item.innerHTML = `
                <div class="info-mozo">
                    <span class="nombre-item">${datos.nombre}</span>
                    <span class="rol-item">Mozo</span>
                </div>
                <button class="btn-eliminar" data-id="${doc.id}">Eliminar</button>
            `
            item.querySelector('.btn-eliminar').addEventListener('click', () => eliminar_mozo(doc.id, datos.nombre))
            lista_mozos.appendChild(item)
        })
    })
}

function eliminar_mozo(mozo_id, nombre) {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return
    const lote = db.batch()
    lote.delete(db.collection('mozos').doc(mozo_id))
    lote.delete(db.collection('usuarios').doc(mozo_id))
    lote.commit()
}

function cargar_historial() {
    db.collection('alertas')
        .orderBy('marca_tiempo', 'desc')
        .limit(50)
        .onSnapshot(snap => {
            lista_alertas.innerHTML = ''
            if (snap.empty) {
                lista_alertas.innerHTML = '<p class="estado-vacio">No hay alertas registradas.</p>'
                return
            }
            snap.forEach(doc => {
                const datos = doc.data()
                const hora = datos.marca_tiempo
                    ? datos.marca_tiempo.toDate().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                    : '--:--'
                const item = document.createElement('div')
                item.className = 'item-alerta'
                item.innerHTML = `
                    <div class="detalle-alerta">
                        <span class="nombre-alerta">${datos.nombre_mozo || 'Mozo'}</span>
                        <span class="sub-alerta">llamado desde <strong>${datos.origen}</strong></span>
                    </div>
                    <div class="meta-alerta">
                        <span class="badge-origen badge-${datos.origen}">${datos.origen}</span>
                        <span class="hora-alerta">${hora}</span>
                    </div>
                `
                lista_alertas.appendChild(item)
            })
        })
}
