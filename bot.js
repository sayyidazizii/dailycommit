const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const git = simpleGit();

// Daftar pesan commit acak
const messages = [
    "📦 Update harian data",
    "📝 Auto-commit: just in time",
    "✨ Progress pushed!",
    "🔄 Syncing with the repo",
    "📅 Daily bot commit",
    "✅ Done and committed!",
    "🚀 Let’s go update!",
    "📂 File updated automatically",
    "📌 Auto record update",
    "🧠 Smart update done"
];

// Ambil pesan commit secara acak
function getRandomCommitMessage() {
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
}

// Kirim notifikasi WhatsApp via UltraMsg
async function sendWhatsAppNotif(message) {
    try {
        const response = await axios.post(
            'https://api.ultramsg.com/instance131114/messages/chat',
            {
                to: '6285602678871', // Ganti dengan nomor tujuan
                body: message
            }
        );

        console.log('✅ WhatsApp notification sent via UltraMsg:', response.data);
    } catch (err) {
        console.error('❌ Failed to send WhatsApp message via UltraMsg:', err.response?.data || err.message);
    }
}

// Proses commit dan push Git
async function makeCommit() {
    const filePath = path.join(__dirname, 'daily_update.txt');

    // Tambahkan catatan ke file
    fs.appendFileSync(filePath, `Update on ${new Date().toLocaleString()}\n`);

    const commitMessage = getRandomCommitMessage();

    try {
        const remote = await git.remote(['-v']);
        console.log('📡 Repository URL:\n' + remote);

        await git.add('./*');
        await git.commit(commitMessage);
        await git.push('origin', 'main');

        // Kirim notifikasi sukses
        await sendWhatsAppNotif(`✅ Git update berhasil!\nPesan commit: *${commitMessage}*`);
    } catch (error) {
        console.error('❌ Failed to commit and push changes:', error);
        await sendWhatsAppNotif(`❌ Gagal update Git:\n${error.message}`);
    }
}

// Jalankan script
makeCommit();
