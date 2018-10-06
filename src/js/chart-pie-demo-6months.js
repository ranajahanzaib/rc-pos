// Set new default font family and font color to mimic Bootstrap's default styling
Chart.defaults.global.defaultFontFamily = '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
Chart.defaults.global.defaultFontColor = '#292b2c';

// Pie Chart Example
var ctx = document.getElementById("myPieChart6Months");
var myPieChart = new Chart(ctx, {
  type: 'pie',
  data: {
    labels: ["Routers", "Chargers & Cables", "USB Storage", "Display Monitors", "CPU", "Speakers", "Mouse & Pointing Devices", "Power Supplies", "Windows Installation", "Linux Installation", "Others"],
    datasets: [{
      data: [5.21, 9.58, 11.25, 1.32, 2.32, 4.32, 11.32, 24.32, 30.32, 14.32, 5.32],
      backgroundColor: ['#d35400', '#00a63f', '#900C3F', '#2e4053', '#1a5276', '#f4d03f','#8e44ad','#DAF7A6','#34eb13','#eb1d13','#0a0101'],
    }],
  },
});
