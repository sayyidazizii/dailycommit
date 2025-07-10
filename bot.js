const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const git = simpleGit();

// === KONFIGURASI ===
const instanceId = 'instance131114'; // UltraMsg
const ultraMsgToken = '5vz4rxz27upbfz0r'; // UltraMsg Token
const whatsappNumber = '6285602678871';

const githubToken = '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'; // Ganti dengan token GitHub-mu
const githubOwner = 'sayyidazizii'; // Username GitHub
const githubRepo = 'dailycommit';   // Nama repository GitHub
const baseBranch = 'main';

const commitMessages = [
    "📦 Update harian data", "📝 Auto-commit: just in time", "✨ Progress pushed!",
    "🔄 Syncing with the repo", "📅 Daily bot commit", "✅ Done and committed!",
    "🚀 Let’s go update!", "📂 File updated automatically", "📌 Auto record update", "🧠 Smart update done"
];

function getRandomCommitMessage() {
    return commitMessages[Math.floor(Math.random() * commitMessages.length)];
}

function getBranchName() {
    const now = new Date();
    return `auto-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
}

async function sendWhatsAppNotif(message) {
    try {
        const url = `https://api.ultramsg.com/${instanceId}/messages/chat?token=${ultraMsgToken}`;
        await axios.post(url, {
            to: whatsappNumber,
            body: message,
            priority: 10
        });
        console.log('✅ WA Notification sent!');
    } catch (err) {
        console.error('❌ WA error:', err.response?.data || err.message);
    }
}

async function createPullRequest(branchName, commitMessage) {
    const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/pulls`;

    try {
        const response = await axios.post(url, {
            title: commitMessage,
            head: branchName,
            base: baseBranch,
            body: 'Auto-generated pull request from bot.'
        }, {
            headers: {
                Authorization: `token ${githubToken}`,
                Accept: 'application/vnd.github+json'
            }
        });

        const prUrl = response.data.html_url;
        const prNumber = response.data.number;

        console.log('✅ PR created:', prUrl);
        await sendWhatsAppNotif(`✅ Pull Request dibuat:\n${prUrl}`);

        // Merge otomatis
        await mergePullRequest(prNumber);

        // Hapus branch setelah merge
        await deleteBranch(branchName);

    } catch (err) {
        console.error('❌ PR Error:', err.response?.data || err.message);
        await sendWhatsAppNotif(`❌ Gagal membuat PR:\n${err.message}`);
    }
}

async function mergePullRequest(prNumber) {
    const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/pulls/${prNumber}/merge`;

    try {
        await axios.put(url, {
            commit_title: `Auto merge PR #${prNumber}`
        }, {
            headers: {
                Authorization: `token ${githubToken}`,
                Accept: 'application/vnd.github+json'
            }
        });

        console.log(`✅ PR #${prNumber} merged!`);
        await sendWhatsAppNotif(`✅ PR #${prNumber} berhasil di-*merge* otomatis.`);
    } catch (err) {
        console.error('❌ Gagal merge PR:', err.response?.data || err.message);
        await sendWhatsAppNotif(`❌ Gagal merge PR #${prNumber}: ${err.message}`);
    }
}

async function deleteBranch(branchName) {
    const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/refs/heads/${branchName}`;

    try {
        await axios.delete(url, {
            headers: {
                Authorization: `token ${githubToken}`,
                Accept: 'application/vnd.github+json'
            }
        });

        console.log('🗑️ Branch berhasil dihapus:', branchName);
        await sendWhatsAppNotif(`🗑️ Branch *${branchName}* berhasil dihapus setelah merge.`);
    } catch (err) {
        console.error('❌ Gagal hapus branch:', err.response?.data || err.message);
        await sendWhatsAppNotif(`❌ Gagal hapus branch: ${branchName}`);
    }
}

async function makeCommit() {
    const filePath = path.join(__dirname, 'daily_update.txt');
    const branchName = getBranchName();
    const commitMessage = getRandomCommitMessage();

    try {
        // Update file
        fs.appendFileSync(filePath, `Update on ${new Date().toLocaleString()}\n`);

        // Git config
        await git.addConfig('user.name', 'Sayyid Aziz');
        await git.addConfig('user.email', 'sayyid@example.com');

        // Checkout dan buat branch baru
        await git.checkout(baseBranch);
        await git.pull();

        await git.checkoutLocalBranch(branchName);
        await git.add('./*');
        await git.commit(commitMessage);
        await git.push('origin', branchName);

        // Buat PR dan merge + hapus
        await createPullRequest(branchName, commitMessage);

    } catch (err) {
        console.error('❌ Commit Gagal:', err);
        await sendWhatsAppNotif(`❌ Commit gagal:\n${err.message}`);
    }
}

// Jalankan bot
makeCommit();
