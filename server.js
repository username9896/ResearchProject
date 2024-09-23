const express = require('express');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;


const GITHUB_API_URL = 'https://api.github.com';
const OWNER = 'pandas-dev';
const REPO = 'pandas';
const GITHUB_TOKEN = '';
const FILE_LIMIT = 10;


const SONAR_PROJECT_KEY = 'username9896_pandas';
const SONAR_ORGANIZATION_KEY = 'username9896';
const SONAR_TOKEN = 'd1645277bf64d8031518d291f9454da6c1bed588';
const SONAR_API_BASE_URL = `https://sonarcloud.io/api`;


app.use(express.static(path.join(__dirname, 'public')));


async function fetchPythonFiles(directory = 'pandas', analysisType, analysisResults = []) {
    if (analysisResults.length >= FILE_LIMIT) {
        return analysisResults;
    }

    try {
        const response = await fetch(`${GITHUB_API_URL}/repos/${OWNER}/${REPO}/contents/${directory}`, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`
            }
        });

        if (!response.ok) {
            console.error('GitHub API request failed:', response.status, response.statusText);
            return analysisResults;
        }

        const files = await response.json();

        for (const file of files) {
            if (analysisResults.length >= FILE_LIMIT) {
                break;
            }

            if (file.type === 'dir') {
                await fetchPythonFiles(file.path, analysisType, analysisResults);
            } else if (file.name.endsWith('.py')) {
                const fileResponse = await fetch(file.download_url);
                const fileContent = await fileResponse.text();

                if (analysisType === 'complexity') {
                    const result = await analyzeComplexity(fileContent, file.name);
                    analysisResults.push(result);
                } else if (analysisType === 'maintainability') {
                    const result = await analyzeMaintainability(fileContent, file.name);
                    analysisResults.push(result);
                }

                if (analysisResults.length >= FILE_LIMIT) {
                    break;
                }
            }
        }
    } catch (error) {
        console.error('Error fetching files:', error.message);
    }

    return analysisResults;
}

function analyzeComplexity(fileContent, fileName) {
    return new Promise((resolve) => {
        console.log(`Analyzing complexity for file: ${fileName}`);
        const tempFilePath = path.join(os.tmpdir(), `${fileName}.py`);
        fs.writeFileSync(tempFilePath, fileContent);

        exec(`radon cc -j ${tempFilePath}`, (error, stdout) => {
            let complexity = [];
            if (!error) {
                const radonOutput = JSON.parse(stdout);
                complexity = radonOutput[tempFilePath] || [];
            }

            fs.unlinkSync(tempFilePath);

            resolve({ fileName, complexity });
        });
    });
}

function analyzeMaintainability(fileContent, fileName) {
    return new Promise((resolve) => {
        console.log(`Analyzing maintainability for file: ${fileName}`);
        const tempFilePath = path.join(os.tmpdir(), `${fileName}.py`);
        fs.writeFileSync(tempFilePath, fileContent);

        exec(`radon mi -j ${tempFilePath}`, (error, stdout) => {
            let maintainabilityIndex = null;
            if (!error) {
                const radonOutput = JSON.parse(stdout);
                maintainabilityIndex = radonOutput[tempFilePath] || { mi: 0, rank: 'N/A' };
            }

            fs.unlinkSync(tempFilePath);

            resolve({ fileName, maintainabilityIndex });
        });
    });
}

async function fetchSonarDuplicity() {
    const apiUrl = `${SONAR_API_BASE_URL}/measures/component?component=${SONAR_PROJECT_KEY}&metricKeys=duplicated_lines_density`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                Authorization: `Basic ${Buffer.from(SONAR_TOKEN + ':').toString('base64')}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch SonarCloud data: ${response.statusText}`);
        }

        const data = await response.json();
        const duplicityMeasure = data.component.measures.find(m => m.metric === 'duplicated_lines_density');
        return duplicityMeasure ? duplicityMeasure.value : 0;
    } catch (error) {
        console.error('Error fetching SonarCloud duplicity:', error);
        return 0;
    }
}

app.get('/analyze-complexity', async (req, res) => {
    const results = await fetchPythonFiles('pandas', 'complexity');
    res.json(results);
});

app.get('/analyze-maintainability', async (req, res) => {
    const results = await fetchPythonFiles('pandas', 'maintainability');
    res.json(results);
});

app.get('/fetch-duplicity', async (req, res) => {
    const duplicity = await fetchSonarDuplicity();
    res.json({ duplicity });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
