const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const git = simpleGit();

async function makeCommitAndPR() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `daily-update-${timestamp}`;
    const filePath = path.join(__dirname, 'daily_update.txt');

    // Update isi file dengan timestamp yang selalu unik
    const updateText = `Update on ${new Date().toISOString()} UTC\n`;
    console.log('Appending file:', filePath);
    fs.appendFileSync(filePath, updateText);
    console.log('Appended text:', updateText);

    try {
        // Buat branch baru
        await git.checkoutLocalBranch(branchName);

        // Set konfigurasi user Git
        await git.addConfig('user.name', 'sayyidazizii');
        await git.addConfig('user.email', 'sayyidsyafiq234@gmail.com');

        // Cek status git
        const status = await git.status();
        console.log('Git Status:', status);

        // Tambahkan diff log untuk debugging
        const diff = await git.diff();
        console.log('Git Diff:\n', diff);

        // Jika tidak ada perubahan file, keluar dari proses
        if (
            status.not_added.length === 0 &&
            status.created.length === 0 &&
            status.deleted.length === 0 &&
            status.modified.length === 0 &&
            status.renamed.length === 0
        ) {
            console.log('No changes detected, skipping commit and PR.');
            return;
        }

        // Tambahkan dan commit semua perubahan
        await git.add(['-A']);
        await git.commit('Daily update');
        await git.push('origin', branchName);
        console.log(`Pushed to ${branchName}`);

        // Ambil informasi repo dan token
        const repo = process.env.GITHUB_REPOSITORY;
        const token = process.env.GITHUB_TOKEN;
        const [owner, repoName] = repo.split('/');

        // Buat pull request via GitHub API
        const prRes = await axios.post(
            `https://api.github.com/repos/${owner}/${repoName}/pulls`,
            {
                title: `Daily update ${new Date().toISOString()}`,
                head: branchName,
                base: 'main',
                body: 'This is an automated daily update pull request.',
            },
            {
                headers: {
                    Authorization: `token ${token}`,
                    Accept: 'application/vnd.github+json',
                },
            }
        );

        console.log('Pull request created:', prRes.data.html_url);

        // Hapus branch setelah PR dibuat
        await axios.delete(
            `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${branchName}`,
            {
                headers: {
                    Authorization: `token ${token}`,
                    Accept: 'application/vnd.github+json',
                },
            }
        );

        console.log(`Branch ${branchName} deleted after PR.`);
    } catch (error) {
        console.error('Error during commit/PR:', error.response?.data || error.message);
    }
}

makeCommitAndPR();
