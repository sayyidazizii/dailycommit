const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const git = simpleGit();

async function makeCommitAndPR() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `daily-update-${timestamp}`;

    // File update
    const filePath = path.join(__dirname, 'daily_update.txt');
    fs.appendFileSync(filePath, `Update on ${new Date()}\n`);

    try {
        // Create new branch
        await git.checkoutLocalBranch(branchName);

        // Set Git user config (needed in GitHub Actions)
        await git.addConfig('user.name', 'sayyidazizii');
        await git.addConfig('user.email', 'sayyidsyafiq234@gmail.com');

        // Commit and push
        await git.add('./*');
        await git.commit('Daily update');
        await git.push('origin', branchName);

        console.log(`Pushed to ${branchName}`);

        // Create Pull Request via GitHub API
        const repo = process.env.GITHUB_REPOSITORY; // owner/repo
        const token = process.env.GITHUB_TOKEN;

        const [owner, repoName] = repo.split('/');

        const pr = await axios.post(
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

        console.log('Pull request created:', pr.data.html_url);
    } catch (error) {
        console.error('Error during commit/PR:', error.response?.data || error.message);
    }
}

makeCommitAndPR();
