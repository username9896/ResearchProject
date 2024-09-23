const express = require('express');
const fetch = require('node-fetch');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// GitHub API configuration
const GITHUB_API_URL = 'https://api.github.com';
const OWNER = 'pandas-dev';
const REPO = 'pandas';
const GITHUB_TOKEN = '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'; 
const FILE_LIMIT = 10;
let fileCounter = 0;

// SonarCloud API configuration
const SONAR_PROJECT_KEY = 'username9896_pandas';
const SONAR_ORGANIZATION_KEY = 'username9896';
const SONAR_TOKEN = 'd1645277bf64d8031518d291f9454da6c1bed588';
const SONAR_API_BASE_URL = `https://sonarcloud.io/api`;

// Function to fetch Python files and run all analyses
async function fetchPythonFiles(directory = 'pandas') {
  let analysisResults = [];

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
      if (fileCounter >= FILE_LIMIT) {
        console.log(`File limit of ${FILE_LIMIT} reached. Stopping further fetching.`);
        break;
      }

      if (file.type === 'dir') {
        const subdirectoryFiles = await fetchPythonFiles(file.path); // Recurse into the directory
        analysisResults = analysisResults.concat(subdirectoryFiles);

        if (fileCounter >= FILE_LIMIT) {
          break;
        }
      } else if (file.name.endsWith('.py')) {
        const fileResponse = await fetch(file.download_url);
        const fileContent = await fileResponse.text();
        console.log(`Content of ${file.name}:`, fileContent);

        const result = await analyzeFileContent(fileContent, file.name);
        analysisResults.push(result);
        fileCounter++;

        if (fileCounter >= FILE_LIMIT) {
          console.log(`File limit of ${FILE_LIMIT} reached. Stopping further fetching.`);
          break;
        }
      }
    }

  } catch (error) {
    console.error('Error fetching files:', error.message);
    analysisResults.push({ fileName: "Error", error: error.message });
  }

  return analysisResults;
}

function analyzeFileContent(fileContent, fileName) {
  return new Promise((resolve, reject) => {
    console.log(`Analyzing file: ${fileName}`);

    // Create a temporary file to store the content
    const tempFilePath = path.join(os.tmpdir(), `${fileName}.py`);
    fs.writeFileSync(tempFilePath, fileContent);

    let result = {
      fileName: fileName,
      complexity: [],
      maintainabilityIndex: null
    };

    // Execute Radon command for Cyclomatic Complexity
    exec(`radon cc -j ${tempFilePath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error analyzing Cyclomatic Complexity for ${fileName}:`, error.message);
        result.complexityError = error.message;
      } else {
        // Log the raw Radon output for debugging
        console.log(`Raw Radon Output for ${fileName}:`, stdout);

        try {
          const radonOutput = JSON.parse(stdout);
          const fileComplexity = radonOutput[tempFilePath]; // Get the complexity for this specific file
          if (Array.isArray(fileComplexity)) {
            result.complexity = fileComplexity; // Store the complexity functions
          } else {
            result.complexity = [];
          }
          console.log(`Parsed Complexity for ${fileName}:`, result.complexity); // Log parsed complexity
        } catch (parseError) {
          console.error(`Error parsing JSON for Cyclomatic Complexity: ${parseError.message}`);
          result.complexityError = parseError.message;
        }
      }

      // Execute Radon command for Maintainability Index
      exec(`radon mi -j ${tempFilePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error analyzing Maintainability Index for ${fileName}:`, error.message);
          result.maintainabilityError = error.message;
        } else {
          try {
            result.maintainabilityIndex = JSON.parse(stdout)[tempFilePath] || { mi: 0, rank: 'N/A' }; // Parse JSON output
          } catch (parseError) {
            console.error(`Error parsing JSON for Maintainability Index: ${parseError.message}`);
            result.maintainabilityError = parseError.message;
          }
        }

        // Delete the temporary file after analysis
        fs.unlinkSync(tempFilePath);
        resolve(result); // Resolve with the accumulated analysis output
      });
    });
  });
}

// Function to fetch SonarCloud Duplicity results
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

// Define a route to trigger the fetch and analysis
app.get('/analyze', async (req, res) => {
  try {
    const results = await fetchPythonFiles();
    const duplicity = await fetchSonarDuplicity();
    res.send(renderHtml(results, duplicity)); // Render the HTML with visualization including duplicity
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Function to render HTML with visualization
function renderHtml(results, duplicity) {
  const jsonData = JSON.stringify(results);
  return `
    <html>
      <head>
        <title>Code Analysis Results</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body>
        <h1>Code Analysis Results</h1>
        <canvas id="complexityChart" width="800" height="400"></canvas>
        <canvas id="maintainabilityChart" width="800" height="400"></canvas>
        <canvas id="duplicityChart" width="800" height="400"></canvas>
        <script>
          const data = ${jsonData};
          const duplicityData = ${duplicity};

          console.log("Data for charts:", data); // Debugging log
          console.log("Duplicity Data:", duplicityData);

          // Prepare data for Complexity Chart
          const complexityLabels = data.map(d => d.fileName);
          const complexityData = data.map(d => {
            if (Array.isArray(d.complexity)) {
              // Sum up complexity of each function in the file
              return d.complexity.reduce((acc, curr) => acc + (curr.complexity || 0), 0);
            } else {
              return 0; // Default to 0 if no complexity data is available
            }
          });

          console.log("Complexity Labels:", complexityLabels);
          console.log("Complexity Data:", complexityData);

          // Prepare data for Maintainability Index Chart
          const maintainabilityData = data.map(d => d.maintainabilityIndex?.mi || 0);

          // Draw Complexity Chart
          new Chart(document.getElementById('complexityChart'), {
            type: 'bar',
            data: {
              labels: complexityLabels,
              datasets: [{
                label: 'Cyclomatic Complexity',
                data: complexityData,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }
          });

          // Draw Maintainability Index Chart
          new Chart(document.getElementById('maintainabilityChart'), {
            type: 'bar',
            data: {
              labels: complexityLabels,
              datasets: [{
                label: 'Maintainability Index',
                data: maintainabilityData,
                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }
          });

          // Draw Duplicity Chart
          new Chart(document.getElementById('duplicityChart'), {
            type: 'bar',
            data: {
              labels: ['Duplicity'],
              datasets: [{
                label: 'Duplicity Percentage',
                data: [duplicityData],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
              }]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }
          });

        </script>
      </body>
    </html>
  `;
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
