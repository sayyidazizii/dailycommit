if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config(); // hanya load .env di lokal
}

const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const git = simpleGit();

// === ENV CONFIG ===
const instanceId = process.env.ULTRA_MSG_INSTANCE_ID;
const ultraMsgToken = process.env.ULTRA_MSG_TOKEN;
const whatsappNumber = process.env.WHATSAPP_NUMBER;

const githubToken = process.env._TOKEN;
const githubOwner = process.env._OWNER;
const githubRepo = process.env._REPO;
const baseBranch = process.env._BASE_BRANCH || 'main';

// === VALIDASI ENV ===
const requiredEnv = {
    _TOKEN: githubToken,
    _OWNER: githubOwner,
    _REPO: githubRepo,
    _BASE_BRANCH: baseBranch,
    ULTRA_MSG_INSTANCE_ID: instanceId,
    ULTRA_MSG_TOKEN: ultraMsgToken,
    WHATSAPP_NUMBER: whatsappNumber,
};


const missing = Object.entries(requiredEnv).filter(([_, val]) => !val);
if (missing.length > 0) {
    console.error('❌ ENV tidak lengkap! Harap isi variabel berikut:');
    missing.forEach(([key]) => console.error(`- ${key}`));
    process.exit(1);
}

// === HELPER ===
function getRandomCommitMessage() {
    const messages = [
        "📦 Update harian data", "📝 Auto-commit: just in time", "✨ Progress pushed!",
        "🔄 Syncing with the repo", "📅 Daily bot commit", "✅ Done and committed!",
        "🚀 Let’s go update!", "📂 File updated automatically", "📌 Auto record update", "🧠 Smart update done"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

function getBranchName() {
    const now = new Date();
    return `auto-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

        await sleep(1000);
        await mergePullRequest(prNumber);
        await sleep(1000);
        await deleteBranch(branchName);

    } catch (err) {
        console.error('❌ Gagal buat PR:', err.response?.data || err.message);
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
        if (err.response?.status === 422 && err.response?.data?.message === 'Reference does not exist') {
            console.warn(`⚠️ Branch '${branchName}' sudah tidak ada. Mungkin sudah dihapus otomatis.`);
            await sendWhatsAppNotif(`⚠️ Branch *${branchName}* sudah dihapus (oleh GitHub atau sebelumnya).`);
        } else {
            console.error('❌ Gagal hapus branch:', err.response?.data || err.message);
            await sendWhatsAppNotif(`❌ Gagal hapus branch: ${branchName}`);
        }
    }
}


async function makeCommit() {
    const filePath = path.join(__dirname, 'daily_update.txt');
    const branchName = getBranchName();
    const commitMessage = getRandomCommitMessage();

    try {
        fs.appendFileSync(filePath, `Update on ${new Date().toLocaleString()}\n`);
        console.log('📝 File updated:', filePath);

        await git.addConfig('user.name', 'Sayyid Aziz');
        await git.addConfig('user.email', 'sayyid@example.com');

        await git.checkout(baseBranch);
        await git.pull();

        await git.checkoutLocalBranch(branchName);
        await git.add('./*');
        await git.commit(commitMessage);
        await git.push('origin', branchName);

        await createPullRequest(branchName, commitMessage);
    } catch (err) {
        console.error('❌ Commit Gagal:', err);
        await sendWhatsAppNotif(`❌ Commit gagal:\n${err.message}`);
    }
}

// 🚀 Jalankan
makeCommit();
