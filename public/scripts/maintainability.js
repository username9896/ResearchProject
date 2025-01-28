document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/analyze-maintainability');
    const data = await response.json();
    console.log('Response Data:', data);

    // Handle empty data
    if (!data || data.length === 0) {
      console.error('No maintainability data available.');
      document.getElementById('chartContainer').innerHTML = '<p>No maintainability data available.</p>';
      return;
    }

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
        plugins: {
          title: {
            display: true,
            text: 'Maintainability Index for Files'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Maintainability Index: ${context.raw}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Maintainability Index'
            }
          },
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 90,
              minRotation: 45
            },
            title: {
              display: true,
              text: 'File Names'
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching maintainability data:', error);
    document.getElementById('chartContainer').innerHTML = '<p>Error loading maintainability data. Please try again later.</p>';
  }
});
