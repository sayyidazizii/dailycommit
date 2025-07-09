const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const git = simpleGit();

// Commit message randomizer
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

function getRandomCommitMessage() {
    return messages[Math.floor(Math.random() * messages.length)];
}

// UltraMsg config
const instanceId = 'instance131114';
const token = '5vz4rxz27upbfz0r';

async function sendWhatsAppNotif(message) {
    try {
        const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
        const response = await axios.post(
            `${url}?token=${token}`,
            {
                to: '6285602678871',
                body: message,
                priority: 10
            }
        );

        console.log('✅ WhatsApp notification sent via UltraMsg:', response.data);
    } catch (err) {
        console.error('❌ Failed to send WhatsApp message via UltraMsg:', err.response?.data || err.message);
    }
}

async function makeCommit() {
    const filePath = path.join(__dirname, 'daily_update.txt');
    fs.appendFileSync(filePath, `Update on ${new Date().toLocaleString()}\n`);
    const commitMessage = getRandomCommitMessage();

    try {
        const remote = await git.remote(['-v']);
        console.log('📡 Repository URL:\n' + remote);

        // Setup Git identity
        await git.addConfig('user.name', 'Sayyid Aziz');
        await git.addConfig('user.email', 'sayyid@example.com');

        // Commit process
        await git.add('./*');
        await git.commit(commitMessage);
        await git.push('origin', 'main');

        await sendWhatsAppNotif(`✅ Git update berhasil!\nPesan commit: *${commitMessage}*`);
    } catch (error) {
        console.error('❌ Failed to commit and push changes:', error);
        await sendWhatsAppNotif(`❌ Gagal update Git:\n${error.message}`);
    }
}

// Jalankan bot
makeCommit();
