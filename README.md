# Real-time Data Analysis of the Pandas Codebase

## Introduction
This project enables real-time analysis of the Pandas codebase, providing users with the ability to extract, analyze, and visualize key metrics such as Cyclomatic Complexity, Maintainability Index, and Duplicity. The analysis directly accesses the Pandas GitHub repository and utilizes tools such as Radon for complexity and maintainability metrics and SonarCloud for duplicity detection. Results are presented in a dynamic web interface for improved understanding and insights.

---

## Features
- **Real-time Data Fetching**: Directly fetches Python files from the Pandas GitHub repository.
- **Cyclomatic Complexity Analysis**: Measures the complexity of functions in the codebase using Radon.
- **Maintainability Index**: Computes a maintainability score for the codebase.
- **Duplicity Analysis**: Detects code duplicity using SonarCloud.
- **Visualization**: Displays results in dynamic bar charts using Chart.js and Bootstrap.
- **Configurable File Limits**: Allows customization of the number of Python files analyzed per run.

---

## Prerequisites
Before proceeding, ensure you have the following installed:
- **Node.js** (Latest version)
- **Python 3.x** (Latest version)
- **Git** for cloning the repository
- A **GitHub Personal Access Token** with read permissions for public repositories
- A **SonarCloud account** and token for duplicity detection

---

## Setup and Installation

### Clone the Repository
Clone the repository using Git and navigate to the project directory:
```bash
git clone https://github.com/your-username/pandas-real-time-analysis.git
cd pandas-real-time-analysis
```

### Install Dependencies
#### For Node.js (Server-side)
```bash
npm install
```
#### For Python
```bash
python -m venv env
source env/bin/activate  # On Windows, use: env\Scripts\activate
pip install radon
```

---

## Configuration

### GitHub Token
1. Create a GitHub Personal Access Token (PAT) with read permissions for public repositories.
2. Replace the placeholder in the server configuration with your GitHub token:
   - **File**: `server.js`
   - **Line**: Replace `GITHUB_TOKEN` with your actual token.

### SonarCloud Setup
1. Create a project in SonarCloud for the Pandas repository.
2. Obtain your SonarCloud token, Project Key, and Organization Key.
3. Replace the following variables in `server.js`:
   - `SONAR_PROJECT_KEY`: Your project key from SonarCloud.
   - `SONAR_ORGANIZATION_KEY`: Your organization key from SonarCloud.
   - `SONAR_TOKEN`: Your SonarCloud token.

---

## Running the Project

### Start the Server
Start the Node.js server:
```bash
node server.js
```
The server will run on port 3000, accessible at [http://localhost:3000](http://localhost:3000).

### Viewing the Analysis
Once the server is running, navigate to:
- **Home Page**: Displays complexity analysis results.
- **Duplicity Page**: Shows duplicity results fetched from SonarCloud.
- **Maintainability Index Page**: Displays maintainability index scores.

Results are displayed as dynamic bar charts for each metric.

---

## Project Structure
```
pandas-real-time-analysis/
├── public/                # Contains static assets such as HTML, CSS, and JS files
│   ├── index.html         # Home page (Complexity results)
│   ├── duplicity.html     # Duplicity analysis results page
│   ├── maintainability.html  # Maintainability index results page
│   ├── js/
│   └── charts.js          # JavaScript logic for Chart.js
├── server.js              # Node.js server handling API calls and analysis
├── package.json           # Node.js project dependencies and scripts
├── sonar-project.properties  # SonarCloud configuration
└── README.md              # This file
```

---

## Configuration Details

### GitHub API Configuration
- **GitHub Token**: Set your GitHub token in `server.js` for API access.
- **File Limit**: Adjust the number of files to analyze by modifying the `FILE_LIMIT` constant in `server.js`.

### SonarCloud API Configuration
Ensure the following variables are properly configured in `server.js`:
- `SONAR_PROJECT_KEY`
- `SONAR_ORGANIZATION_KEY`
- `SONAR_TOKEN`

---

## How It Works
1. **GitHub API**: Fetches Python files from the Pandas codebase on GitHub in real-time.
2. **Radon**: Analyzes the Python files for Cyclomatic Complexity and Maintainability Index.
3. **SonarCloud**: Provides duplicity analysis based on the Pandas repository.
4. **Web Interface**: Displays results in dynamic bar charts using Chart.js and Bootstrap.

---

## Troubleshooting

### Common Issues
1. **Missing Token Errors**:
   - Ensure your GitHub and SonarCloud tokens are set correctly.
2. **File Fetching Limit**:
   - Increase the `FILE_LIMIT` value in `server.js` if needed, but be mindful of GitHub API rate limits.
3. **SonarCloud API Errors**:
   - Verify that your project and organization keys are correctly set in `server.js`.

---

## Future Enhancements
- Add support for additional programming languages.
- Include more visualization options (e.g., pie charts, heatmaps).
- Implement caching for repeated analyses.
- Enhance error handling and logging.

---

Feel free to contribute to the project or report issues via GitHub!

