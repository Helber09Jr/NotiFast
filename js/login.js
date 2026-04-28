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
