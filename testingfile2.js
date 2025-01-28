// This is our testing file

const express = require('express');
const axios = require('axios');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = process.env.PORT || 3000;
app.use('/swagger-custom.css', express.static(path.join(__dirname, 'swagger-custom.css')));

app.use('/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCssUrl: '/swagger-custom.css',
}));


const GITHUB_API_URL = 'https://api.github.com';
const OWNER = 'pandas-dev';
const REPO = 'pandas';
const GITHUB_TOKEN = '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';
const FILE_LIMIT = 20;

const SONAR_PROJECT_KEY = 'username9896_pandas';
const SONAR_ORGANIZATION_KEY = 'username9896';
const SONAR_TOKEN = 'd1645277bf64d8031518d291f9454da6c1bed588';
const SONAR_API_BASE_URL = `https://sonarcloud.io/api`;
const OPENAI_API_KEY = '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';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


app.post('/ask-chatgpt', async (req, res) => {
    const { question } = req.body;

    const messages = [
        {
            role: "system",
            content: "You are a helpful assistant.",
        },
        {
            role: "user",
            content: question,
        },
    ];

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo-16k",
                messages,
                max_tokens: 300,
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );

        const choices = response.data.choices;
        const answer = choices && choices.length > 0 && choices[0].message.content.trim();

        if (!answer) {
            throw new Error('No valid response received from OpenAI API');
        }

        res.json({ answer });
    } catch (error) {
        console.error('Error communicating with ChatGPT:', error.message);
        res.status(500).json({ answer: 'Sorry, something went wrong. Please try again later.' });
    }
});

app.post('/upload-file', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        const filePath = req.file.path;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileName = req.file.originalname;

        console.log(`Analyzing uploaded file: ${fileName}`);

        const messages = [
            {
                role: "system",
                content: "You are a code reviewer providing actionable feedback.",
            },
            {
                role: "user",
                content: `Please review the following file content:\n\n${fileContent}`,
            },
        ];

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo-16k",
                messages,
                max_tokens: 500,
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );

        const feedback = response.data.choices[0].message.content.trim();

        fs.unlinkSync(filePath); // Clean up uploaded file

        res.json({
            fileName,
            feedback,
        });
    } catch (error) {
        console.error('Error processing uploaded file:', error.message);
        res.status(500).json({ error: 'Failed to analyze the uploaded file.' });
    }
});

async function fetchPythonFiles(directory = 'pandas', analysisType, analysisResults = []) {
    if (analysisResults.length >= FILE_LIMIT) {
        return analysisResults;
    }

    try {
        const response = await fetch(`${GITHUB_API_URL}/repos/${OWNER}/${REPO}/contents/${directory}`, {
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
            },
        });

        if (!response.ok) {
            console.error('GitHub API request failed:', response.status, response.statusText);
            return analysisResults;
        }

        const files = await response.json();

        for (const file of files) {
            if (analysisResults.length >= FILE_LIMIT) break;

            if (file.type === 'dir') {
                await fetchPythonFiles(file.path, analysisType, analysisResults);
            } else if (file.name.endsWith('.py')) {
                const fileResponse = await fetch(file.download_url);
                const fileContent = await fileResponse.text();

                if (analysisType === 'complexity') {
                    const result = await analyzeComplexity(fileContent, file.path);
                    analysisResults.push(result);
                } else if (analysisType === 'maintainability') {
                    const result = await analyzeMaintainability(fileContent, file.path);
                    analysisResults.push(result);
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
        const tempFilePath = path.join(os.tmpdir(), `${path.basename(fileName)}.py`);
        fs.writeFileSync(tempFilePath, fileContent);

        exec(`radon cc -j ${tempFilePath}`, async (error, stdout) => {
            let complexity = [];
            if (!error) {
                try {
                    const radonOutput = JSON.parse(stdout);
                    complexity = radonOutput[tempFilePath] || [];
                } catch (parseError) {
                    console.error('Error parsing Radon output:', stdout, parseError);
                }
            }

            fs.unlinkSync(tempFilePath);

            const isHighComplexity = complexity.some(c => c.complexity > 15);
            if (isHighComplexity) {
                await sendFeedbackToChatGPT(fileName, { complexity });
            }

            resolve({ fileName, complexity });
        });
    });
}

function analyzeMaintainability(fileContent, fileName) {
    return new Promise((resolve) => {
        console.log(`Analyzing maintainability for file: ${fileName}`);
        const tempFilePath = path.join(os.tmpdir(), `${path.basename(fileName)}.py`);
        fs.writeFileSync(tempFilePath, fileContent);

        exec(`radon mi -j ${tempFilePath}`, async (error, stdout) => {
            let maintainabilityIndex = null;
            if (!error) {
                try {
                    const radonOutput = JSON.parse(stdout);
                    maintainabilityIndex = radonOutput[tempFilePath] || { mi: 0, rank: 'N/A' };
                } catch (parseError) {
                    console.error('Error parsing Radon output:', stdout, parseError);
                }
            }

            fs.unlinkSync(tempFilePath);

            const isLowMaintainability = maintainabilityIndex.mi < 20;
            if (isLowMaintainability) {
                await sendFeedbackToChatGPT(fileName, { maintainabilityIndex });
            }

            resolve({ fileName, maintainabilityIndex });
        });
    });
}

async function fetchSonarDuplicity() {
    const apiUrl = `${SONAR_API_BASE_URL}/measures/component?component=${SONAR_PROJECT_KEY}&metricKeys=duplicated_lines_density`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                Authorization: `Basic ${Buffer.from(SONAR_TOKEN + ':').toString('base64')}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch SonarCloud data: ${response.statusText}`);
        }

        const data = await response.json();
        const duplicityMeasure = data.component.measures.find((m) => m.metric === 'duplicated_lines_density');
        return duplicityMeasure ? duplicityMeasure.value : 0;
    } catch (error) {
        console.error('Error fetching SonarCloud duplicity:', error);
        return 0;
    }
}

async function sendFeedbackToChatGPT(fileName, metrics) {
    const messages = [
        {
            role: "system",
            content: "You are a concise code reviewer. Provide actionable feedback based on metrics.",
        },
        {
            role: "user",
            content: `
                File Name: ${fileName}
                Metrics: ${JSON.stringify(metrics)}

                Provide a single actionable suggestion to improve the code. Be concise (one to two sentences).
            `,
        },
    ];

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo-16k",
                messages,
                max_tokens: 100,
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );

        const feedback = response.data.choices[0].message.content.trim();
        console.log(`Feedback for ${fileName}: ${feedback}`);
        return feedback;
    } catch (error) {
        console.error(`Error generating feedback for ${fileName}:`, error.message);
        return 'Error generating feedback.';
    }
}

async function analyzeFilesAndGenerateFeedback() {
    const files = await fetchPythonFiles();
    const feedbackResults = [];

    for (const file of files) {
        try {
            const { fileContent, fileName } = file;

            // Generate feedback using ChatGPT
            const feedback = await sendFeedbackToChatGPT(fileName, {});

            feedbackResults.push({
                fileName,
                feedback: feedback || 'No feedback available.',
            });
        } catch (error) {
            console.error(`Error processing file ${file.fileName}:`, error.message);
        }
    }

    return feedbackResults;
}


app.get('/generate-feedback', async (req, res) => {
    try {
        const feedbackResults = await analyzeFilesAndGenerateFeedback();
        res.json(feedbackResults);
    } catch (error) {
        console.error('Error generating feedback:', error.message);
        res.status(500).json({ error: 'Failed to generate feedback.' });
    }
});


app.get('/complexity-feedback', async (req, res) => {
    try {
        const results = await fetchPythonFiles('pandas', 'complexity');
        res.json(results);
    } catch (error) {
        console.error('Error generating complexity feedback:', error.message);
        res.status(500).json({ error: 'Failed to generate complexity feedback.' });
    }
});

app.get('/maintainability-feedback', async (req, res) => {
    try {
        const results = await fetchPythonFiles('pandas', 'maintainability');
        res.json(results);
    } catch (error) {
        console.error('Error generating maintainability feedback:', error.message);
        res.status(500).json({ error: 'Failed to generate maintainability feedback.' });
    }
});

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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/documentation`);
});
