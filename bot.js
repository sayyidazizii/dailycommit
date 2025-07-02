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

    let prUrl = '';

    try {
        // Set Git user config
        await git.addConfig('user.name', 'sayyidazizii');
        await git.addConfig('user.email', 'sayyidsyafiq234@gmail.com');

        // Create new branch
        await git.checkoutLocalBranch(branchName);

        // Prepare update log
        const updateText = `Update on ${isoTimestamp} UTC - Log created\n`;
        fs.appendFileSync(filePath, updateText);
        console.log('Appended:', updateText);

        // Stage and commit BEFORE push
        await git.add(['-A']);
        await git.commit('Daily update (log written)');

        // Push to origin
        await git.push('origin', branchName);
        console.log(`Pushed to ${branchName}`);

        // Create PR
        const repo = process.env.GITHUB_REPOSITORY;
        const token = process.env.GITHUB_TOKEN;
        const [owner, repoName] = repo.split('/');

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

        prUrl = prRes.data.html_url;
        console.log('Pull request created:', prUrl);

        // Tambahkan PR URL ke file lalu commit **lagi** dan push
        const successText = `Update on ${isoTimestamp} UTC - PR created: ${prUrl}\n`;
        fs.appendFileSync(filePath, successText);
        await git.add(filePath);
        await git.commit('Log PR URL');
        await git.push('origin', branchName);

        // Hapus branch setelah PR
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
    } catch (err) {
        const errMsg = err.response?.data?.message || err.message;
        console.error('❌ Error:', errMsg);

        // Tuliskan log error ke file dan commit
        const errorText = `Update on ${new Date().toISOString()} UTC - ERROR: ${errMsg}\n`;
        fs.appendFileSync(filePath, errorText);
        try {
            await git.add(filePath);
            await git.commit('Log ERROR');
            await git.push('origin', branchName);
        } catch (err2) {
            console.warn('Failed to push error log:', err2.message);
        }
    }
}

makeCommitAndPR();
