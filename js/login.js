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

const form_login = document.getElementById('form-login')
const email_input = document.getElementById('email-input')
const pass_input = document.getElementById('pass-input')
const btn_ingresar = document.getElementById('btn-ingresar')
const error_login = document.getElementById('error-login')

const destinos = {
    admin:  'admin.html',
    cocina: 'cocina.html',
    barra:  'cocina.html',
    caja:   'cocina.html',
    mozo:   'mozo.html'
}

auth.onAuthStateChanged(usuario => {
    if (!usuario) return
    db.collection('usuarios').doc(usuario.uid).get().then(doc => {
        if (doc.exists && destinos[doc.data().rol]) {
            window.location.href = destinos[doc.data().rol]
        }
    })
})

form_login.addEventListener('submit', e => {
    e.preventDefault()
    error_login.textContent = ''
    btn_ingresar.disabled = true
    btn_ingresar.textContent = 'Ingresando...'

    auth.signInWithEmailAndPassword(
        email_input.value.trim(),
        pass_input.value
    ).catch(() => {
        error_login.textContent = 'Correo o contraseña incorrectos.'
        btn_ingresar.disabled = false
        btn_ingresar.textContent = 'Ingresar'
    })
})
