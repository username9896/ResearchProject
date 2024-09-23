document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('/fetch-duplicity');
      const { duplicity } = await response.json();
  
      // Render chart
      new Chart(document.getElementById('duplicityChart'), {
        type: 'bar',
        data: {
          labels: ['Duplicity'],
          datasets: [{
            label: 'Duplicity Percentage',
            data: [duplicity],
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
    } catch (error) {
      console.error('Error fetching duplicity data:', error);
    }
  });
  