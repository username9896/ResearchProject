document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('/analyze-complexity');
      const data = await response.json();
  
      // Prepare data for the chart
      const labels = data.map(d => d.fileName);
      const complexityData = data.map(d => {
        return Array.isArray(d.complexity) ? d.complexity.reduce((acc, curr) => acc + (curr.complexity || 0), 0) : 0;
      });
  
      // Render chart
      new Chart(document.getElementById('complexityChart'), {
        type: 'bar',
        data: {
          labels: labels,
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
    } catch (error) {
      console.error('Error fetching complexity data:', error);
    }
  });
  