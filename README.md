# Garmin Health Dashboard

A privacy-focused web application for analyzing Garmin health data exports. All data processing happens in your browser - no data is sent to any server.

![Garmin Health Dashboard](https://img.shields.io/badge/Privacy-First-green)
![TypeScript](https://img.shields.io/badge/TypeScript-blue)
![React](https://img.shields.io/badge/React-61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC)

## Features

### 📊 Comprehensive Health Analysis
- **Sleep Analysis**: Track sleep duration, stages (REM, Deep, Light), efficiency, and patterns
- **Health Correlations**: Discover relationships between metrics like stress, sleep, exercise, and recovery
- **Weekly Patterns**: Identify your best days for sleep, activity, and stress management
- **Personalized Insights**: Get actionable recommendations based on your data patterns

### 🔒 Privacy-First Design
- All processing happens in your browser
- No data is uploaded to any server
- No account or login required
- Your data stays on your device

### 📈 Advanced Analytics
- Pearson correlation calculations with statistical significance
- Time-lag analysis (e.g., yesterday's stress → tonight's sleep)
- Moving averages and trend detection
- Quartile analysis for optimal ranges

### 🎨 Modern Interface
- Responsive design for desktop, tablet, and mobile
- Dark mode support
- Interactive charts with zoom and hover details
- Clean, intuitive navigation

## Getting Started

### Using the Live App

1. Visit [https://RichardAtCT.github.io/garmin-health-dashboard](https://RichardAtCT.github.io/garmin-health-dashboard)
2. Click on the upload area or drag and drop your Garmin export ZIP file
3. Wait for processing (happens in your browser)
4. Explore your health data insights!

### Getting Your Garmin Data

1. Log in to [Garmin Connect](https://connect.garmin.com)
2. Go to Account Settings → Data Management
3. Request "Export Your Data"
4. Download the ZIP file when ready (usually within 24-48 hours)

## Understanding Your Data

### Sleep Analysis
- **Total Sleep**: Aim for 7-9 hours per night
- **REM Sleep**: Should be 20-25% of total sleep
- **Deep Sleep**: Critical for physical recovery
- **Sleep Efficiency**: Higher percentage means less time awake

### Correlations
- **Strong Positive** (r > 0.5): Metrics increase together
- **Strong Negative** (r < -0.5): One increases as other decreases
- **p-value < 0.05**: Statistically significant relationship

### Key Metrics Analyzed
- Sleep stages and duration
- Stress levels
- Body Battery (energy)
- Resting heart rate
- Daily steps and activities
- Hydration levels

## Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup
```bash
# Clone the repository
git clone https://github.com/RichardAtCT/garmin-health-dashboard.git
cd garmin-health-dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **Data Processing**: Web Workers for heavy calculations
- **File Handling**: JSZip for ZIP extraction
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Build Tool**: Vite

### Project Structure
```
src/
├── components/
│   ├── Dashboard/      # Main dashboard container
│   ├── FileUpload/     # ZIP file upload component
│   ├── Analysis/       # Analysis components (Sleep, Correlations, etc.)
│   ├── Charts/         # Reusable chart components
│   └── Layout/         # Layout components
├── services/
│   ├── dataParser/     # Garmin data parsing logic
│   ├── analytics/      # Statistical calculations
│   └── export/         # PDF/CSV export functionality
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines
1. Maintain privacy-first approach (no external data transmission)
2. Follow existing code style and TypeScript conventions
3. Add tests for new features
4. Update documentation as needed

## Privacy & Security

This application is designed with privacy as the top priority:
- ✅ No backend servers
- ✅ No data collection or analytics
- ✅ No cookies or tracking
- ✅ All processing in-browser
- ✅ Open source for transparency

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Garmin Connect for providing data export functionality
- The open-source community for the amazing tools and libraries

## Support

If you encounter any issues or have suggestions:
1. Check the [Issues](https://github.com/RichardAtCT/garmin-health-dashboard/issues) page
2. Create a new issue with detailed information
3. For general questions, use the Discussions tab

---

Made with ❤️ for the Garmin community. Stay healthy! 🏃‍♂️🏃‍♀️