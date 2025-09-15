# GraphQL Profile Application

A modern, interactive profile page built with GraphQL that displays student information from Tomorrow School's API. This application demonstrates GraphQL querying, JWT authentication, and data visualization using SVG graphs.

## Project Requirements Compliance

This project fulfills all the requirements for the Tomorrow School GraphQL profile assignment:

### ✅ Login Page
- **JWT Authentication**: Uses Tomorrow School's signin endpoint with Basic authentication
- **Dual Login Support**: Works with both username:password and email:password
- **Error Handling**: Displays appropriate error messages for invalid credentials
- **Logout Functionality**: Complete session management with logout capability

### ✅ Profile Information Display
- **Basic User Identification**: User ID, login, name, and email
- **XP Amount**: Total XP with detailed breakdown by type (projects vs exercises)
- **Grades/Audits**: Audit performance with success rates and statistics
- **Additional Features**: Rank and level system, progress overview

### ✅ Statistics Graphs (SVG)
- **6 Interactive SVG Graphs** (exceeds minimum requirement of 2):
  1. **XP Progression Graph** - Your progress compared to all students
  2. **XP Over Time Graph** - Cumulative XP progression with area chart
  3. **Success Rate Graph** - Project pass/fail ratio with pie chart
  4. **XP by Type Graph** - Project vs exercise XP breakdown
  5. **Monthly Progress Graph** - Monthly XP earnings with bar chart
  6. **Audit Ratio Graph** - Audit performance visualization
- **Interactive Features**: Time period selection, population filtering
- **Animations**: Smooth transitions and hover effects
- **Modern UI**: Gradient backgrounds, responsive design

### ✅ GraphQL Integration
- **Proper GraphQL Client**: Custom implementation with error handling
- **JWT Bearer Authentication**: Secure API access with user-specific data
- **User Data Filtering**: Only displays data belonging to authenticated user
- **Comprehensive Queries**: Fetches user, transaction, progress, result, and object data

## Features

### 🔐 Authentication
- **JWT-based authentication** with the Tomorrow School API
- **Dual login support** for both username and email
- **Secure token storage** in localStorage
- **Automatic session management** with logout functionality

### 📊 Profile Information
- **Basic user identification** (ID, login)
- **Experience Points (XP)** tracking and breakdown
- **Progress overview** with success rates
- **Real-time data** from GraphQL API

### 📈 Interactive Statistics
- **XP Over Time** - Line chart showing cumulative XP progression
- **Project Success Rate** - Pie chart displaying pass/fail ratios
- **XP by Type** - Bar chart comparing project vs exercise XP
- **Monthly Progress** - Bar chart showing monthly XP earnings

### 🎨 Modern UI/UX
- **Responsive design** that works on all devices
- **Beautiful gradient backgrounds** and modern styling
- **Interactive SVG graphs** with hover effects
- **Loading states** and error handling
- **Smooth animations** and transitions

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Data Visualization**: D3.js v7
- **API**: GraphQL with JWT authentication
- **Styling**: Custom CSS with modern design principles

## Project Structure

```
graphql/
├── index.html          # Main application page
├── test.html           # API testing page
├── css/
│   └── styles.css      # Modern styling and responsive design
├── js/
│   ├── graphql-client.js  # GraphQL API client
│   ├── auth.js            # Authentication management
│   ├── profile.js         # Profile data management
│   └── graphs.js          # SVG graph generation
└── README.md           # This file
```

## Getting Started

### Prerequisites
- A web browser with JavaScript enabled
- Valid Tomorrow School credentials (username/email and password)
- A local web server (for CORS compliance)

### Installation

1. **Clone or download** this repository
2. **Start a local web server** in the project directory:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```
3. **Open your browser** and navigate to `http://localhost:8000`

### Testing the API

Before using the main application, you can test the API connection:

1. Open `test.html` in your browser
2. Test the connection to verify the GraphQL endpoint is accessible
3. Enter your credentials to test authentication
4. Run sample queries to verify data access

## Usage

### Login
1. Enter your Tomorrow School username or email
2. Enter your password
3. Click "Sign In" to authenticate

### Viewing Your Profile
Once logged in, you'll see:
- **Basic Information**: Your user ID and login
- **Experience Points**: Total XP with breakdown by type
- **Progress Overview**: Project statistics and success rates
- **Statistics & Analytics**: Interactive graphs showing your journey

### Logout
Click the "Logout" button in the top-right corner to end your session.

## GraphQL Queries Used

The application demonstrates various GraphQL query patterns:

### Simple Queries
```graphql
{
  user {
    id
    login
  }
}
```

### Queries with Arguments
```graphql
query GetObject($objectId: Int!) {
  object(where: { id: { _eq: $objectId } }) {
    id
    name
    type
  }
}
```

### Nested Queries
```graphql
{
  result {
    id
    grade
    user {
      id
      login
    }
  }
}
```

## API Endpoints

- **GraphQL Endpoint**: `https://01.tomorrow-school.ai/api/graphql-engine/v1/graphql`
- **Authentication Endpoint**: `https://01.tomorrow-school.ai/api/auth/signin`

## Data Tables Used

- **user**: Basic user information
- **transaction**: XP transactions and audit data
- **progress**: Project and exercise progress
- **result**: Detailed results and grades
- **object**: Exercise and project metadata

## Hosting

This application can be hosted on any static hosting service:

- **GitHub Pages**: Push to a GitHub repository and enable Pages
- **Netlify**: Drag and drop the folder or connect to Git
- **Vercel**: Deploy directly from Git repository
- **Any web server**: Upload files to any web hosting service

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Development

### Adding New Graphs
1. Add a new graph container in `index.html`
2. Create the graph function in `graphs.js`
3. Add data processing in `profile.js`
4. Call the graph function in `createAllGraphs()`

### Customizing Styles
- Modify `css/styles.css` for visual changes
- Update color schemes in the CSS variables
- Adjust responsive breakpoints as needed

## Security Notes

- JWT tokens are stored in localStorage (consider using httpOnly cookies for production)
- All API calls use HTTPS
- Credentials are transmitted using Basic Authentication over HTTPS
- No sensitive data is logged to the console

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure you're running the app from a web server, not opening the HTML file directly
2. **Authentication Fails**: Verify your credentials are correct
3. **Graphs Not Loading**: Check browser console for JavaScript errors
4. **No Data Displayed**: Ensure you have completed projects/exercises in the system

### Debug Mode
Open browser developer tools (F12) to see detailed error messages and API responses.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this application.

## License

This project is created for educational purposes as part of the Tomorrow School curriculum.