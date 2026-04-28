# NotiFast

**Sistema de notificaciones instantáneas para restaurantes**
*Diseñado y desarrollado por Hjunior*

---

## Descripción

NotiFast permite que Caja, Cocina o Barra avisen a mozos específicos con un solo toque. El mozo recibe la alerta en su celular en menos de 300ms — sin llamadas, sin mensajes de texto.

## Arquitectura

```
[Cocina / Barra / Caja]
         |
         | db.collection('alertas').add(...)
         ▼
  Firebase Firestore
         |
         | onSnapshot (listener en tiempo real)
         ▼
      [Mozo]
   Notification API + Vibration API
```

La comunicación es unidireccional y en tiempo real mediante listeners de Firestore (`onSnapshot`). No hay backend propio — toda la lógica pasa por Firebase.

---

## Stack

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura de cada pantalla |
| CSS3 | Estilos por pantalla |
| JavaScript ES6 | Lógica por pantalla (vanilla, sin frameworks) |
| Firebase Auth | Autenticación de usuarios |
| Firebase Firestore | Base de datos en tiempo real |
| Notification API | Notificaciones del navegador |
| Vibration API | Vibración del dispositivo |

---

## Estructura de archivos

```
NotiFast/
├── index.html          ← login (raíz para despliegue en Vercel)
├── admin.html
├── cocina.html
├── mozo.html
├── css/
│   ├── login.css
│   ├── admin.css
│   ├── cocina.css
│   └── mozo.css
├── js/
│   ├── login.js
│   ├── admin.js
│   ├── cocina.js
│   └── mozo.js
└── README.md
```

Los HTML están en la raíz para que Vercel los sirva directamente como rutas limpias (`/admin`, `/cocina`, `/mozo`). Los CSS van en `css/` y los JS en `js/`.

Cada pantalla es completamente independiente: su propio HTML, CSS y JS. No existen archivos de lógica global compartidos.

---

## Pantallas

### `index.html` — Acceso
Formulario de email y contraseña. Al autenticarse, redirige automáticamente según el rol del usuario:

| Rol | Destino |
|---|---|
| `admin` | `admin.html` |
| `cocina` | `cocina.html` |
| `barra` | `cocina.html` |
| `caja` | `cocina.html` |
| `mozo` | `mozo.html` |

### `admin.html` — Administración
Panel con dos secciones:
- **Mozos**: crear usuarios (mozo, cocina, barra, caja), ver lista, eliminar
- **Historial**: últimas 50 alertas enviadas

### `cocina.html` — Panel de llamada
Usada por roles `cocina`, `barra` y `caja`. Muestra una grilla de botones con el nombre de cada mozo activo. Un toque envía la alerta de forma instantánea.

### `mozo.html` — Pantalla de espera
Pantalla completa en modo escucha. Al recibir una alerta:
1. Muestra pantalla roja con el origen (COCINA / BARRA / CAJA)
2. Vibra el dispositivo
3. Muestra notificación del navegador (si el permiso fue otorgado)
4. El mozo confirma con un toque para cerrar la alerta

---

## Modelo de datos (Firestore)

### Colección `usuarios`
```
usuarios/{uid}
  nombre: string
  rol:    'admin' | 'cocina' | 'barra' | 'caja' | 'mozo'
```

### Colección `mozos`
```
mozos/{uid}
  nombre: string
  activo: boolean
```
Solo contiene documentos de usuarios con rol `mozo`. El `uid` del documento coincide con el `uid` de Firebase Auth.

### Colección `alertas`
```
alertas/{auto_id}
  mozo_id:     string    (uid del mozo destinatario)
  nombre_mozo: string    (nombre guardado al momento del envío)
  origen:      'cocina' | 'barra' | 'caja'
  marca_tiempo: Timestamp
  leida:       boolean
```

---

## Instalación

### 1. Crear proyecto en Firebase

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear nuevo proyecto
3. Activar **Authentication** → Método de inicio de sesión: **Correo electrónico/contraseña**
4. Activar **Firestore Database** (modo producción)

### 2. Configurar credenciales

En cada archivo `.js` de las cuatro pantallas, reemplazar el objeto `config_firebase` con los datos del proyecto:

```javascript
const config_firebase = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
}
```

Los archivos con este bloque son: `js/login.js`, `js/admin.js`, `js/cocina.js`, `js/mozo.js`.

### 3. Reglas de seguridad de Firestore

Copiar en **Firestore → Reglas**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function es_admin() {
      return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'admin';
    }

    function rol_usuario() {
      return get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol;
    }

    match /usuarios/{uid} {
      allow read: if request.auth != null && (request.auth.uid == uid || es_admin());
      allow write: if es_admin();
    }

    match /mozos/{uid} {
      allow read: if request.auth != null;
      allow write: if es_admin();
    }

    match /alertas/{alerta} {
      allow read: if request.auth != null &&
                    (request.auth.uid == resource.data.mozo_id || es_admin());
      allow create: if request.auth != null &&
                      ['cocina','barra','caja'].hasAny([rol_usuario()]);
      allow update: if request.auth != null &&
                      request.auth.uid == resource.data.mozo_id;
    }
  }
}
```

### 4. Índice compuesto en Firestore

La pantalla del mozo usa una query con dos filtros (`mozo_id` + `leida`). Firestore lo requerirá la primera vez que se abra la pantalla del mozo y mostrará un enlace en la consola del navegador para crearlo automáticamente. También se puede crear manualmente:

**Firestore → Índices → Compuesto → Agregar**
- Colección: `alertas`
- Campo 1: `mozo_id` (Ascendente)
- Campo 2: `leida` (Ascendente)

### 5. Crear el primer usuario administrador

La primera cuenta admin se crea desde Firebase Console (no desde el sistema):

1. Ir a **Firebase Console → Authentication → Usuarios → Agregar usuario**
2. Ingresar email y contraseña del administrador
3. Copiar el **UID** generado
4. Ir a **Firestore → usuarios → Agregar documento**
   - ID del documento: el UID copiado
   - Campos: `nombre` (string), `rol: "admin"` (string)
5. Iniciar sesión en `login/login.html` con esa cuenta
6. Desde el panel admin, crear el resto de los usuarios

### 6. Servir los archivos

Firebase Auth requiere `localhost` o un dominio (no funciona con `file://`).

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js
npx serve .

# Con VS Code: extensión Live Server
```

Abrir: `http://localhost:8000/login/login.html`

---

## Convenciones de código

### Separadores según contexto

| Contexto | Separador | Ejemplo |
|---|---|---|
| Variables JS | guion bajo `_` | `mozo_id`, `btn_enviar` |
| Funciones JS | guion bajo `_` | `enviar_alerta()`, `cargar_mozos()` |
| Clases CSS | guion medio `-` | `.btn-mozo`, `.lista-mozos` |
| IDs HTML | guion medio `-` | `#form-login`, `#grilla-mozos` |

### Máximo 2 palabras por identificador

```javascript
const mozo_id = '...'         // correcto
const alerta_nueva = {}       // correcto
function enviar_alerta() {}   // correcto

const mozosNotificationHandler = ...  // incorrecto (3+ palabras)
const btnEnviarAlertaAMozo = ...      // incorrecto (4+ palabras)
```

### Sin comentarios en el código

El nombre del identificador es documentación suficiente.

### Cada pantalla es completamente independiente

Ningún JS importa de otro JS. Cada pantalla tiene su propio `config_firebase`, su propia inicialización de Firebase y su propio ciclo de vida.

---

## Notas operativas

- La pantalla del mozo debe mantenerse abierta y con la pestaña visible para recibir alertas. Si la pestaña se minimiza, la vibración y las notificaciones del sistema operativo seguirán funcionando, pero el listener de Firestore puede pausarse en algunos dispositivos móviles de baja memoria.
- Las notificaciones del navegador requieren que el mozo acepte el permiso la primera vez que abre la pantalla.
- La vibración solo funciona en dispositivos móviles.
- Eliminar un mozo desde el panel admin borra sus registros en Firestore pero no su cuenta de Firebase Auth (borrar cuentas Auth requiere Firebase Admin SDK desde un servidor).
