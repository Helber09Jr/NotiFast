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

const btn_salir       = document.getElementById('btn-salir')
const form_nuevo      = document.getElementById('form-nuevo')
const nombre_nuevo    = document.getElementById('nombre-nuevo')
const rol_nuevo       = document.getElementById('rol-nuevo')
const email_nuevo     = document.getElementById('email-nuevo')
const pass_nuevo      = document.getElementById('pass-nuevo')
const btn_crear       = document.getElementById('btn-crear')
const msg_crear       = document.getElementById('msg-crear')
const lista_usuarios  = document.getElementById('lista-usuarios')
const lista_alertas   = document.getElementById('lista-alertas')
const modal_editar    = document.getElementById('modal-editar')
const edit_nombre     = document.getElementById('edit-nombre')
const btn_guardar_edit  = document.getElementById('btn-guardar-edit')
const btn_cancelar_edit = document.getElementById('btn-cancelar-edit')

const colores_rol = {
    mozo:   '#FF6B00',
    cocina: '#AB47BC',
    barra:  '#42A5F5',
    caja:   '#66BB6A',
    admin:  '#78909C'
}

let uid_editando = null

auth.onAuthStateChanged(usuario => {
    if (!usuario) { window.location.replace('index.html'); return }
    db.collection('usuarios').doc(usuario.uid).get().then(doc => {
        if (!doc.exists || (doc.data().rol || '').toLowerCase() !== 'admin') {
            auth.signOut()
            window.location.replace('index.html')
        }
    })
    cargar_usuarios()
    cargar_historial()
})

btn_salir.addEventListener('click', () => {
    auth.signOut().then(() => window.location.replace('index.html'))
})

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('activo'))
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('activo'))
        tab.classList.add('activo')
        document.getElementById('panel-' + tab.dataset.tab).classList.add('activo')
    })
})

btn_cancelar_edit.addEventListener('click', cerrar_modal)
modal_editar.addEventListener('click', e => { if (e.target === modal_editar) cerrar_modal() })

btn_guardar_edit.addEventListener('click', () => {
    if (!uid_editando) return
    const nombre = edit_nombre.value.trim()
    if (!nombre) return
    db.collection('usuarios').doc(uid_editando).update({ nombre }).then(() => {
        db.collection('mozos').doc(uid_editando).get().then(doc => {
            if (doc.exists) doc.ref.update({ nombre })
        })
        cerrar_modal()
    })
})

form_nuevo.addEventListener('submit', e => {
    e.preventDefault()
    msg_crear.textContent = ''
    msg_crear.className = 'mensaje-estado'
    btn_crear.disabled = true
    btn_crear.textContent = 'Creando...'

    const nombre = nombre_nuevo.value.trim()
    const rol    = rol_nuevo.value
    const email  = email_nuevo.value.trim()
    const clave  = pass_nuevo.value

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

function cargar_usuarios() {
    db.collection('usuarios').onSnapshot(snap => {
        lista_usuarios.innerHTML = ''
        if (snap.empty) {
            lista_usuarios.innerHTML = '<p class="estado-vacio">No hay usuarios registrados.</p>'
            return
        }
        snap.forEach(doc => {
            const datos  = doc.data()
            const rol    = (datos.rol || 'sin rol').toLowerCase()
            const color  = colores_rol[rol] || '#888'
            const inicial = (datos.nombre || '?').charAt(0).toUpperCase()

            const item = document.createElement('div')
            item.className = 'item-usuario'
            item.innerHTML = `
                <div class="avatar-usuario" style="background:${color}1A;color:${color}">
                    ${inicial}
                </div>
                <div class="info-usuario">
                    <span class="nombre-item">${datos.nombre || '—'}</span>
                    <span class="badge-rol" style="background:${color}1A;color:${color}">${rol}</span>
                </div>
                <div class="acciones-usuario">
                    <select class="select-rol">
                        <option value="mozo"   ${rol === 'mozo'   ? 'selected' : ''}>Mozo</option>
                        <option value="cocina" ${rol === 'cocina' ? 'selected' : ''}>Cocina</option>
                        <option value="barra"  ${rol === 'barra'  ? 'selected' : ''}>Barra</option>
                        <option value="caja"   ${rol === 'caja'   ? 'selected' : ''}>Caja</option>
                        <option value="admin"  ${rol === 'admin'  ? 'selected' : ''}>Admin</option>
                    </select>
                    <button class="btn-accion btn-editar-u" title="Editar nombre">✏</button>
                    <button class="btn-accion btn-eliminar-u" title="Eliminar">✕</button>
                </div>
            `

            item.querySelector('.select-rol').addEventListener('change', e => {
                cambiar_rol(doc.id, rol, e.target.value, datos.nombre)
            })
            item.querySelector('.btn-editar-u').addEventListener('click', () => {
                abrir_modal(doc.id, datos.nombre)
            })
            item.querySelector('.btn-eliminar-u').addEventListener('click', () => {
                eliminar_usuario(doc.id, datos.nombre, rol)
            })

            lista_usuarios.appendChild(item)
        })
    })
}

function cambiar_rol(uid, rol_viejo, rol_nuevo, nombre) {
    const lote = db.batch()
    lote.update(db.collection('usuarios').doc(uid), { rol: rol_nuevo })
    if (rol_viejo === 'mozo') lote.delete(db.collection('mozos').doc(uid))
    if (rol_nuevo === 'mozo') lote.set(db.collection('mozos').doc(uid), { nombre, activo: true })
    lote.commit()
}

function abrir_modal(uid, nombre) {
    uid_editando    = uid
    edit_nombre.value = nombre || ''
    modal_editar.classList.remove('oculto')
    edit_nombre.focus()
}

function cerrar_modal() {
    uid_editando = null
    modal_editar.classList.add('oculto')
}

function eliminar_usuario(uid, nombre, rol) {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return
    const lote = db.batch()
    lote.delete(db.collection('usuarios').doc(uid))
    if (rol === 'mozo') lote.delete(db.collection('mozos').doc(uid))
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
                const hora  = datos.marca_tiempo
                    ? datos.marca_tiempo.toDate().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
                    : '--:--'
                const item = document.createElement('div')
                item.className = 'item-alerta'
                item.innerHTML = `
                    <div class="detalle-alerta">
                        <span class="nombre-alerta">${datos.nombre_mozo || 'Usuario'}</span>
                        <span class="sub-alerta">llamado por <strong>${datos.nombre_origen || datos.origen}</strong></span>
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
