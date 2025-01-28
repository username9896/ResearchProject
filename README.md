Real-time Data Analysis of Pandas Codebase
Introduction
This project provides real-time analysis of the Pandas codebase, allowing users to extract, analyze, and visualize key metrics such as Cyclomatic Complexity, Maintainability Index, and Duplicity. The analysis is performed directly from the Pandas GitHub repository using a combination of tools, including Radon for complexity analysis and maintainability index and SonarCloud for duplicity detection. The results are displayed in a web interface using dynamic charts for better visualization.

Features
Real-time Data Fetching: Directly fetches Python files from the Pandas GitHub repository.
Cyclomatic Complexity Analysis: Calculates the complexity of functions in the codebase using Radon.
Maintainability Index: Provides a maintainability score for the codebase.
Duplicity Analysis: Detects code duplicity using SonarCloud.
Visualization: Displays results in dynamic bar charts on a web interface using Chart.js and Bootstrap.
Configurable File Limits: Limits the number of Python files analyzed per run.
Prerequisites
Before you begin, ensure that you have met the following requirements:

Node.js (Latest version)
Python 3.x (Latest version)
Git for cloning the repository
A GitHub Personal Access Token with read permissions for public repositories.
SonarCloud account and token for duplicity detection.

Setup and Installation
1. Clone the Repository
Clone the repository using Git:
git clone https://github.com/your-username/pandas-real-time-analysis.git
cd pandas-real-time-analysis

2. Install Dependencies
For Node.js (Server-side)
npm install

python -m venv env
source env/bin/activate  # On Windows, use: env\Scripts\activate
pip install radon

3. Configuration
GitHub Token
Create a GitHub Personal Access Token (PAT) with read permissions for public repositories. Replace the token in the server configuration:

File: server.js
Line: Replace GITHUB_TOKEN with your GitHub token.
SonarCloud Setup
Create a project in SonarCloud for the Pandas repository.
Obtain your SonarCloud token, Project Key, and Organization Key.
Replace the following variables in server.js:
SONAR_PROJECT_KEY: Your project key from SonarCloud.
SONAR_ORGANIZATION_KEY: Your organization key from SonarCloud.
SONAR_TOKEN: Your SonarCloud token.

Running the Project
1. Start the Server
To start the Node.js server:
node server.js
This will start the server on port 3000. You can access the application via http://localhost:3000.

2. Viewing the Analysis
Once the server is running, navigate to:

Home Page (Complexity Analysis): The default page shows the complexity analysis of the codebase.
Duplicity Page: Shows the results fetched from SonarCloud for code duplicity.
Maintainability Index Page: Displays the maintainability index scores for the analyzed files.
The results will be displayed as bar charts for each metric.

pandas-real-time-analysis/
├── public/                # Contains static assets such as HTML, CSS, and JS files
│   ├── index.html         # Home page (Complexity results)
│   ├── duplicity.html     # Duplicity analysis results page
│   ├── maintainability.html  # Maintainability index results page
│   ├── js/
│       └── charts.js      # JavaScript logic for Chart.js
├── server.js              # Node.js server handling API calls and analysis
├── package.json           # Node.js project dependencies and scripts
├── sonar-project.properties  # SonarCloud configuration
└── README.md              # This file

Configuration Details
GitHub API Configuration
GitHub Token: You need to set your GitHub token in server.js for API access.
File Limit: You can configure the number of files to analyze by adjusting the FILE_LIMIT constant in server.js.
SonarCloud API Configuration
Ensure that the SonarCloud Project Key, Organization Key, and Token are set properly in server.js.


How It Works
GitHub API: The project fetches Python files from the Pandas codebase on GitHub in real-time.
Radon: The Python files are analyzed for complexity and maintainability using Radon.
SonarCloud: Duplicity is fetched from SonarCloud based on the analysis of the Pandas repository.
Web Interface: The results are displayed in bar charts on the web interface using Chart.js and Bootstrap.

Troubleshooting
Missing Token Errors: Ensure that you have correctly set your GitHub and SonarCloud tokens.
File Fetching Limit: The FILE_LIMIT restricts the number of files fetched per request. Increase this value if needed, but be aware of GitHub API rate limits.
SonarCloud API Errors: Ensure your project and organization keys are correct
