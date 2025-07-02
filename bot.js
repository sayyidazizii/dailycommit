const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const git = simpleGit();

async function makeCommitAndPR() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `daily-update-${timestamp}`;
    const filePath = path.join(__dirname, 'daily_update.txt');

    // Tambahkan log dan update file
    console.log('Appending file:', filePath);
    fs.appendFileSync(filePath, `Update on ${new Date()}\n`);
    console.log('File updated:\n', fs.readFileSync(filePath, 'utf-8'));

    try {
        await git.checkoutLocalBranch(branchName);

        // Konfigurasi git
        await git.addConfig('user.name', 'sayyidazizii');
        await git.addConfig('user.email', 'sayyidsyafiq234@gmail.com');

        const status = await git.status();
        if (status.modified.length === 0 && status.created.length === 0) {
            console.log('No changes detected, skipping commit and PR.');
            return;
        }

        await git.add('./*');
        await git.commit('Daily update');
        await git.push('origin', branchName);
        console.log(`Pushed to ${branchName}`);

        const repo = process.env.GITHUB_REPOSITORY;
        const token = process.env.GITHUB_TOKEN;
        const [owner, repoName] = repo.split('/');

        // Buat Pull Request
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
