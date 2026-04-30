const admin = require('firebase-admin')

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
        })
    })
}

module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') return res.status(200).end()
    if (req.method !== 'POST') return res.status(405).end()

    const { token_fcm, titulo, cuerpo } = req.body
    if (!token_fcm) return res.status(400).json({ error: 'token_fcm requerido' })

    const titulo_final = titulo || 'NotiFast — Te llaman'
    const cuerpo_final = cuerpo || 'Nueva alerta'

    try {
        const resultado = await admin.messaging().send({
            token: token_fcm,
            webpush: {
                headers: { Urgency: 'high' },
                notification: {
                    title: titulo_final,
                    body: cuerpo_final,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    vibrate: [400, 100, 400, 100, 400, 100, 400],
                    requireInteraction: true,
                    tag: 'notifast-alerta',
                    renotify: true,
                    silent: false
                },
                fcmOptions: { link: '/' }
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'notifast',
                    sound: 'default',
                    priority: 'max',
                    vibrateTimingsMillis: [400, 100, 400, 100, 400]
                }
            },
            apns: {
                headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
                payload: { aps: { sound: 'default', badge: 1 } }
            }
        })
        res.status(200).json({ ok: true, id: resultado })
    } catch (err) {
        console.error('FCM error:', err.code, err.message)
        res.status(500).json({ error: err.message, code: err.code })
    }
}
