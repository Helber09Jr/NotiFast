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

    try {
        await admin.messaging().send({
            token: token_fcm,
            notification: {
                title: titulo || 'NotiFast',
                body: cuerpo || 'Nueva alerta'
            },
            android: {
                priority: 'high',
                notification: { channelId: 'notifast', sound: 'default' }
            },
            apns: {
                payload: { aps: { sound: 'default', badge: 1 } },
                headers: { 'apns-priority': '10' }
            }
        })
        res.status(200).json({ ok: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}
