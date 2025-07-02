const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const git = simpleGit();

async function makeCommitAndPR() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const isoTimestamp = new Date().toISOString();
    const branchName = `daily-update-${timestamp}`;
    const filePath = path.join(__dirname, 'daily_update.txt');

    try {
        // Buat branch baru
        await git.checkoutLocalBranch(branchName);

        // Set konfigurasi user Git
        await git.addConfig('user.name', 'sayyidazizii');
        await git.addConfig('user.email', 'sayyidsyafiq234@gmail.com');

        // Tambahkan update awal ke file
        const initialText = `Update on ${isoTimestamp} UTC - Processing...\n`;
        fs.appendFileSync(filePath, initialText);
        console.log('Appended initial log:', initialText);

        // Cek status git
        const status = await git.status();
        console.log('Git Status:', status);

        const diff = await git.diff();
        console.log('Git Diff:\n', diff);

        // Jika tidak ada perubahan, hentikan
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

        // Commit dan push
        await git.add(['-A']);
        await git.commit('Daily update');
        await git.push('origin', branchName);
        console.log(`Pushed to ${branchName}`);

        const repo = process.env.GITHUB_REPOSITORY;
        const token = process.env.GITHUB_TOKEN;
        const [owner, repoName] = repo.split('/');

        // Buat PR
        const prRes = await axios.post(
            `https://api.github.com/repos/${owner}/${repoName}/pulls`,
            {
                title: `Daily update ${isoTimestamp}`,
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

        const prUrl = prRes.data.html_url;
        console.log('Pull request created:', prUrl);

        // Tulis log keberhasilan ke file
        const successText = `Update on ${isoTimestamp} UTC - Success: PR created at ${prUrl}\n`;
        fs.appendFileSync(filePath, successText);
        console.log('Appended success log:', successText);

        // Commit log terakhir
        await git.add(filePath);
        await git.commit('Log success to file');
        await git.push('origin', branchName);

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
        const errMsg = error.response?.data?.message || error.message;
        console.error('Error during commit/PR:', errMsg);

        // Tulis log error ke file
        const errorText = `Update on ${new Date().toISOString()} UTC - ERROR: ${errMsg}\n`;
        fs.appendFileSync(filePath, errorText);
        console.log('Appended error log:', errorText);
    }
}

makeCommitAndPR();
