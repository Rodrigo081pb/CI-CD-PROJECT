// oi
const fs = require('fs');
const path = require('path');
const axios = require('axios');
let marked;
async function loadMarked() {
    if (!marked) {
        marked = (await import('marked')).marked;
    }
}
const { ArgumentParser } = require('argparse');
const { exit } = require('process');

const parser = new ArgumentParser({
    description: 'URL Checker'
});
parser.add_argument('-t', '--timeout', { help: 'The timeout in seconds for each request' });
parser.add_argument('-d', '--directory', { help: 'The path to the posts directory' });
const args = parser.parse_args();
const timeoutSeconds = args.timeout * 1000 || 5000;
const postsDir = args.dir || __dirname + '/../src/posts';

const walkSync = (dir, filelist = []) => {
    fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            filelist = walkSync(filePath, filelist);
        } else {
            if (filePath.endsWith('.md')) {
                filelist = [...filelist, filePath];
            }
        }
    });
    return filelist;
}

// Read a list of file paths, parse the markdown and return all the URLs
const getUrls = async (filePaths) => {
    let urls = [];
    await loadMarked();
    for (const filePath of filePaths) {
        const markdown = fs.readFileSync(filePath, { encoding: 'utf-8' });
        const tokens = marked.lexer(markdown);
        // Recursively go through the tokens to find all the links
        const findLinks = (token) => {
            if (token.type === 'link') {
                urls = [...urls, token.href];
            }
            if (token.tokens) {
                token.tokens.forEach(findLinks);
            }
        }
        tokens.forEach(findLinks);
    }
    return urls;
}

// Call each URL and if the status code is 404, print an error and exit with non 0
const checkUrl = async (url) => {
    try {
        const response = await axios.get(url, { timeoutSeconds });
        console.log(`${response.status} - ${url}`);
    }
    catch (error) {
        console
            .error(`404 - ${url}`);
        exit(1);
    }
}

// Run
async function main() {
    const filePaths = walkSync(postsDir);
    const urls = await getUrls(filePaths);
    for (const url of urls) {
        await checkUrl(url);
    }
    console.log('All URLs are valid');
}
main();