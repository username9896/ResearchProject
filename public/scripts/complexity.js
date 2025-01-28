document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch complexity data
    const complexityResponse = await fetch('/analyze-complexity');
    const complexityData = await complexityResponse.json();

    // Prepare data for the chart
    const labels = complexityData.map(d => d.fileName);
    const complexityValues = complexityData.map(d => {
      return Array.isArray(d.complexity) ? d.complexity.reduce((acc, curr) => acc + (curr.complexity || 0), 0) : 0;
    });

    // Render the complexity chart
    new Chart(document.getElementById('complexityChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cyclomatic Complexity',
          data: complexityValues,
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
    
    // Fetch feedback data for files exceeding the threshold
    const feedbackResponse = await fetch('/generate-feedback');
    const feedbackData = await feedbackResponse.json();

    // Display feedback in a separate section
    const feedbackSection = document.getElementById('feedbackSection');
    if (feedbackData.message) {
      feedbackSection.innerHTML = `<p>${feedbackData.message}</p>`;
    } else {
      feedbackData.forEach(feedback => {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.classList.add('feedback-item');
        feedbackDiv.innerHTML = `
                      <h3>File: ${feedback.fileName}</h3>
                      <p>${feedback.feedback}</p>
                  `;
        feedbackSection.appendChild(feedbackDiv);
      });
    }
  } catch (error) {
    console.error('Error fetching complexity or feedback data:', error);
  }




});
