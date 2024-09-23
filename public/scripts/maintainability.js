document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('/analyze-maintainability');
      const data = await response.json();
  
      // Prepare data for the chart
      const labels = data.map(d => d.fileName);
      const maintainabilityData = data.map(d => d.maintainabilityIndex?.mi || 0);
  
      // Render chart
      new Chart(document.getElementById('maintainabilityChart'), {
        type: 'bar',
        data: {
          labels: labels,
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
    } catch (error) {
      console.error('Error fetching maintainability data:', error);
    }
  });
  