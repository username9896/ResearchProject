// The final Main code file

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
const FILE_LIMIT = 15;

const SONAR_PROJECT_KEY = 'username9896_pandas';
const SONAR_ORGANIZATION_KEY = 'username9896';
const SONAR_TOKEN = 'd1645277bf64d8031518d291f9454da6c1bed588';
const SONAR_API_BASE_URL = `https://sonarcloud.io/api`;
const OPENAI_API_KEY = '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';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Additional code: Helper function to get files, including nested folders
const FILES_DIR = path.join(__dirname, 'files');
const getFilesRecursively = (dirPath) => {
    let results = [];
    const list = fs.readdirSync(dirPath);

    list.forEach((file) => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            // Recursively get files in subdirectories
            results = results.concat(getFilesRecursively(filePath));
        } else {
            // Add file path relative to FILES_DIR
            results.push(path.relative(FILES_DIR, filePath));
        }
    });

    return results;
};

// Additional code: API to get the list of files (supports nested folders)
app.get('/api/files', (req, res) => {
    try {
        const files = getFilesRecursively(FILES_DIR);
        res.json(files);
    } catch (error) {
        console.error('Error fetching files:', error.message);
        res.status(500).json({ error: 'Unable to fetch files.' });
    }
});

app.get('/api/analyze-file/*', async (req, res) => {
    const filename = req.params[0]; // Capture the full path after `/api/analyze-file/`
    const filePath = path.join(FILES_DIR, filename); // Resolve full path

    console.log('Analyzing file:', filePath); // Log the resolved file path

    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return res.status(404).json({ error: 'File not found.' });
    }

    try {
        const analysis = await analyzeFile(filePath); // Call analysis function
        res.json(analysis);
    } catch (error) {
        console.error('Error analyzing file:', error.message);
        res.status(500).json({ error: 'Failed to analyze file.' });
    }
});


async function analyzeFile(filePath) {
    return new Promise((resolve, reject) => {
        const tempFilePath = path.join(os.tmpdir(), path.basename(filePath));
        fs.copyFileSync(filePath, tempFilePath);

        exec(`radon cc -j ${tempFilePath}`, (err, ccOutput) => {
            if (err) return reject(err);

            exec(`radon mi -j ${tempFilePath}`, async (err, miOutput) => {
                if (err) return reject(err);

                // Cyclomatic Complexity
                const ccData = JSON.parse(ccOutput);
                const complexities = ccData[tempFilePath] || [];
                const totalComplexity = complexities.reduce(
                    (sum, fn) => sum + fn.complexity,
                    0
                );
                const highestComplexity = Math.max(
                    0,
                    ...complexities.map(fn => fn.complexity)
                );
                const rank = assignRank(highestComplexity);

                // Maintainability Index
                const miData = JSON.parse(miOutput);
                const maintainabilityIndex =
                    miData[tempFilePath]?.mi || 0;

                // Lines of Code
                const loc = fs.readFileSync(tempFilePath, 'utf8').split('\n')
                    .length;

                // Duplicity (mocked - replace with actual SonarQube API integration if required)
                const duplicityPercentage = Math.random() * 10;

                // Generate AI Recommendations
                const recommendations = await generateAIRecommendations({
                    complexity: totalComplexity,
                    maintainabilityIndex,
                    loc,
                    duplicityPercentage,
                });

                fs.unlinkSync(tempFilePath);
                resolve({
                    fileName: path.basename(filePath),
                    complexity: totalComplexity,
                    rank,
                    maintainabilityIndex,
                    loc,
                    duplicityPercentage,
                    recommendations,
                });
            });
        });
    });
}

// Helper to assign rank based on highest complexity
function assignRank(highestComplexity) {
    if (highestComplexity > 20) return 'F';
    if (highestComplexity > 15) return 'E';
    if (highestComplexity > 10) return 'D';
    if (highestComplexity > 5) return 'C';
    return 'A';
}


async function generateAIRecommendations(metrics) {
    const prompt = `
      Analyze the following metrics for a code file and provide recommendations:
      - Cyclomatic Complexity: ${metrics.complexity}
      - Maintainability Index: ${metrics.maintainabilityIndex}
      - Lines of Code: ${metrics.loc}
      - Duplicity Percentage: ${metrics.duplicityPercentage}
      
      Provide actionable recommendations to improve these metrics.
    `;

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo-16k',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant for code analysis.' },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 200,
                temperature: 0.7,
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error generating AI recommendations:', error.message);
        return 'Failed to generate recommendations.';
    }
}


app.get('/api/analyze-file/:filename', async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(FILES_DIR, filename); // Resolve full path

    console.log('Analyzing file:', filePath); // Log the resolved file path

    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return res.status(404).json({ error: 'File not found.' });
    }

    try {
        const analysis = await analyzeFile(filePath); // Call analysis function
        res.json(analysis);
    } catch (error) {
        console.error('Error analyzing file:', error.message);
        res.status(500).json({ error: 'Failed to analyze file.' });
    }
});


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

async function sendFeedbackToChatGPT(fileName) {
    const messages = [
        {
            role: "system",
            content: "You are a code reviewer. Provide actionable feedback based on the file name.",
        },
        {
            role: "user",
            content: `Provide feedback for the file: ${fileName}.`,
        },
    ];

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: "gpt-3.5-turbo-16k",
                messages,
                max_tokens: 150,
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );

        const feedback = response.data.choices?.[0]?.message?.content?.trim();
        if (!feedback) {
            console.error(`No feedback received for file: ${fileName}`);
            return 'No feedback available.';
        }

        console.log(`Feedback for ${fileName}: ${feedback}`);
        return feedback;
    } catch (error) {
        console.error(`Error generating feedback for ${fileName}:`, error.message);
        return 'Failed to generate feedback due to an API error.';
    }
}

async function analyzeFilesAndGenerateFeedback() {
    const files = await fetchPythonFiles(); // Fetch Python files
    const feedbackResults = [];

    for (const file of files) {
        try {
            const { fileName } = file;

            // Generate feedback using ChatGPT
            const feedback = await sendFeedbackToChatGPT(fileName);

            // Prepare results
            feedbackResults.push({
                fileName,
                feedback: feedback || 'No feedback available.',
            });
        } catch (error) {
            console.error(`Error processing file ${file.fileName}:`, error.message);
            feedbackResults.push({
                fileName: file.fileName,
                feedback: 'Failed to generate feedback due to an error.',
            });
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
        const files = await fetchPythonFiles('pandas', 'complexity');

        // Summarize feedback for each file
        const summarizedFeedback = files.map(file => {
            const totalComplexity = file.complexity.reduce(
                (sum, fn) => sum + fn.complexity,
                0
            );
            const highestComplexity = Math.max(
                0,
                ...file.complexity.map(fn => fn.complexity)
            );
            const rank = assignRank(highestComplexity);

            return {
                fileName: file.fileName,
                totalComplexity,
                rank,
                feedback: `Complexity: ${totalComplexity}, Rank: ${rank}`,
            };
        });

        res.json(summarizedFeedback);
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
