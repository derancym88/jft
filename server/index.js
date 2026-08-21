const path = require('node:path');
const express = require('express');

const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const prayersRoutes = require('./routes/prayers');
const ordersRoutes = require('./routes/orders');
const announcementsRoutes = require('./routes/announcements');
const notificationsRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/prayers', prayersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// dotfiles: 'allow' is needed so /.well-known/assetlinks.json (Digital Asset
// Links, for a TWA/Android APK wrapper to verify as "trusted" and drop the
// browser address bar) actually gets served instead of silently ignored.
app.use(express.static(PUBLIC_DIR, { dotfiles: 'allow' }));
app.get('/*splat', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

const PORT = process.env.PORT || 8765;
app.listen(PORT, () => console.log(`灵一守玄坛 server running on http://localhost:${PORT}`));
